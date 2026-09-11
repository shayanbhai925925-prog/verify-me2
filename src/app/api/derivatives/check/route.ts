import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { generatePHash, calculateHammingDistance } from '@/lib/derivativeEngine';
import { logVaultEvent } from '@/lib/evidenceVault';
import { dispatchNotification } from '@/lib/notificationEngine';

const HAMMING_THRESHOLD = 10;
const HASH_BIT_LENGTH = 64;
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

// ---------------------------------------------------------------------------
// Sliding-window rate limiter — 15 requests per 60-second window per IP.
// Uses an in-memory Map; resets on server restart (suitable for single-instance
// deployments; replace with Redis for multi-instance).
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60_000; // 60 seconds

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const entry = rateLimitStore.get(ip) ?? { timestamps: [] };
  // Evict timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(ip, entry);
    return false; // limit exceeded
  }

  entry.timestamps.push(now);
  rateLimitStore.set(ip, entry);
  return true; // allowed
}

function validateImageBuffer(buf: Buffer): boolean {
  if (buf.byteLength > MAX_BYTES) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return true;
  // WebP: RIFF (52 49 46 46) at 0, WEBP (57 45 42 50) at 8
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    // Rate limiting — must be checked before any expensive pHash computation
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided for verification.' },
        { status: 400 }
      );
    }

    // 1. Compute perceptual hash
    const buffer = Buffer.from(await file.arrayBuffer());

    if (!validateImageBuffer(buffer)) {
      return NextResponse.json(
        { error: 'Invalid or unsupported image file format.' },
        { status: 400 }
      );
    }

    const queryHash = await generatePHash(buffer);

    // 2a. Exact-match fast path: check for a zero-distance hit via an indexed
    //     equality lookup before doing any Hamming scan. If the identical hash
    //     is already registered this short-circuits the entire paginated scan.
    const { data: exactMatches, error: exactError } = await supabase
      .from('media')
      .select('id, file_name, user_id')
      .eq('phash', queryHash)
      .limit(10);

    if (exactError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Exact-match query error:', exactError.message);
      } else {
        console.error('[API_ERROR]', { endpoint: '/api/derivatives/check', code: exactError.code || 'INTERNAL_ERROR' });
      }
      return NextResponse.json(
        { error: 'An unexpected database error occurred.' },
        { status: 500 }
      );
    }

    if (exactMatches && exactMatches.length > 0) {
      const exactMatchResults = exactMatches.map((record) => ({
        mediaId: record.id,
        fileName: record.file_name,
        creatorId: record.user_id || '',
        hammingDistance: 0,
        confidence: 100,
      }));

      const topMatch = exactMatchResults[0];
      try {
        await logVaultEvent({
          mediaId: topMatch.mediaId,
          eventType: 'DERIVATIVE_FLAGGED',
          status: 'FLAGGED',
          metadata: {
            incomingFileName: file.name,
            fileSize: file.size,
            hammingDistance: 0,
            confidence: 100,
            matchedOriginalId: topMatch.mediaId,
          },
        });
      } catch (vaultErr) {
        console.warn('Vault logging skipped for exact-match derivative alert:', vaultErr);
      }

      try {
        await dispatchNotification({
          eventType: 'suspicious_derivative_detected',
          idempotencyKey: `deriv_${topMatch.mediaId}_exact_${queryHash}`,
          mediaId: topMatch.mediaId,
          creatorId: topMatch.creatorId,
          title: 'Suspicious Derivative Detected (Exact Match)',
          message: `An identical or exact-match visual duplicate of your registered media was detected during verification scan.`,
          data: {
            incomingFileName: file.name,
            matchedOriginalId: topMatch.mediaId,
            hammingDistance: 0,
            confidence: 100,
          },
        });
      } catch (notifErr) {
        console.warn('Notification skipped for exact derivative:', notifErr);
      }

      return NextResponse.json({
        matchesFound: true,
        queryHash,
        matches: exactMatchResults,
      });
    }

    // 2b. Paginated Hamming scan — fetch in pages of PAGE_SIZE rows, stopping
    //     once either a match is found or the hard cap of MAX_SCAN_ROWS is reached.
    //     Only the fields required for matching and the response are selected.
    const PAGE_SIZE = 500;
    const MAX_SCAN_ROWS = 5000;

    const matches = [];
    let offset = 0;
    let exhausted = false;

    while (offset < MAX_SCAN_ROWS && !exhausted) {
      const { data: page, error: pageError } = await supabase
        .from('media')
        .select('id, file_name, phash, user_id')
        .range(offset, offset + PAGE_SIZE - 1);

      if (pageError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Paginated scan query error:', pageError.message);
        } else {
          console.error('[API_ERROR]', { endpoint: '/api/derivatives/check', code: pageError.code || 'INTERNAL_ERROR' });
        }
        return NextResponse.json(
          { error: 'An unexpected database error occurred.' },
          { status: 500 }
        );
      }

      if (!page || page.length === 0) {
        exhausted = true;
        break;
      }

      for (const record of page) {
        if (!record.phash || typeof record.phash !== 'string' || record.phash.length !== HASH_BIT_LENGTH) {
          continue;
        }

        const distance = calculateHammingDistance(queryHash, record.phash);

        if (distance <= HAMMING_THRESHOLD) {
          const confidence = Math.round(
            ((HASH_BIT_LENGTH - distance) / HASH_BIT_LENGTH) * 100
          );
          matches.push({
            mediaId: record.id,
            fileName: record.file_name,
            creatorId: record.user_id || '',
            hammingDistance: distance,
            confidence,
          });
        }
      }

      // Stop scanning as soon as we have matches — avoid unnecessary pages
      if (matches.length > 0) break;

      if (page.length < PAGE_SIZE) {
        exhausted = true;
      } else {
        offset += PAGE_SIZE;
      }
    }

    // Guard: handle the case where there are no records at all
    if (offset === 0 && exhausted && matches.length === 0) {
      return NextResponse.json({
        matchesFound: false,
        queryHash,
        matches: [],
        message: 'No registered media found in the database.',
      });
    }

    matches.sort((a, b) => a.hammingDistance - b.hammingDistance);

    // 3. Log alert to Evidence Vault if a matching derivative is found
    if (matches.length > 0) {
      const topMatch = matches[0];
      try {
        await logVaultEvent({
          mediaId: topMatch.mediaId,
          eventType: 'DERIVATIVE_FLAGGED',
          status: 'FLAGGED',
          metadata: {
            incomingFileName: file.name,
            fileSize: file.size,
            hammingDistance: topMatch.hammingDistance,
            confidence: topMatch.confidence,
            matchedOriginalId: topMatch.mediaId,
          },
        });
      } catch (vaultErr) {
        console.warn('Vault logging skipped for derivative alert:', vaultErr);
      }

      try {
        await dispatchNotification({
          eventType: 'suspicious_derivative_detected',
          idempotencyKey: `deriv_${topMatch.mediaId}_hamming_${queryHash}`,
          mediaId: topMatch.mediaId,
          creatorId: topMatch.creatorId,
          title: 'Suspicious Derivative Detected (Near Match)',
          message: `A visual derivative with ${topMatch.confidence}% similarity (Hamming dist: ${topMatch.hammingDistance}) was detected for '${topMatch.fileName}'.`,
          data: {
            incomingFileName: file.name,
            matchedOriginalId: topMatch.mediaId,
            hammingDistance: topMatch.hammingDistance,
            confidence: topMatch.confidence,
          },
        });
      } catch (notifErr) {
        console.warn('Notification skipped for derivative near match:', notifErr);
      }
    }

    return NextResponse.json({
      matchesFound: matches.length > 0,
      queryHash,
      matches,
    });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Derivative check failure:', err);
    } else {
      console.error('[API_ERROR]', { endpoint: '/api/derivatives/check', code: 'INTERNAL_ERROR' });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}