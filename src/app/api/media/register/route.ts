import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabaseClient';
import { generatePHash } from '@/lib/derivativeEngine';
import { logVaultEvent } from '@/lib/evidenceVault';

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
    // Rate limiting — must be checked before any expensive computation
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
        { error: 'No file provided for registration.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!validateImageBuffer(buffer)) {
      return NextResponse.json(
        { error: 'Invalid or unsupported image file format.' },
        { status: 400 }
      );
    }

    // 1. Generate SHA-256 integrity hash
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 1a. Deduplication check — abort early if this exact file is already registered.
    //     The sha256 column should carry a UNIQUE index in Postgres; this application-
    //     level check prevents a redundant storage upload and returns a useful 409.
    const { data: existing, error: dedupError } = await supabase
      .from('media')
      .select('id')
      .eq('sha256', sha256Hash)
      .maybeSingle();

    if (dedupError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Deduplication query error:', dedupError.message);
      } else {
        console.error('[API_ERROR]', { endpoint: '/api/media/register', code: dedupError.code || 'INTERNAL_ERROR' });
      }
      return NextResponse.json(
        { error: 'An unexpected database error occurred.' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error: 'This exact media file has already been registered.',
          mediaId: existing.id,
        },
        { status: 409 }
      );
    }

    // 2. Generate 64-bit binary Perceptual Hash (pHash)
    const phashString = await generatePHash(buffer);

    // 3. Resolve user identity if authenticated
    let userId: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch {
      userId = null;
    }

    // 4. Upload raw file to Supabase Storage
    const storagePath = `uploads/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('media_assets')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Storage bucket upload skipped/failed:', uploadError.message);
      } else {
        console.warn('[API_WARN]', { endpoint: '/api/media/register', code: uploadError.statusCode || 'STORAGE_ERROR' });
      }
    }

    // 5. Insert registry record into PostgreSQL
    // If your column has a foreign key to auth.users, userId must be valid or the column must allow NULL.
    const insertPayload: Record<string, any> = {
      file_name: file.name,
      storage_path: storagePath,
      phash: phashString,
      sha256: sha256Hash,
      file_size: file.size,
      media_type: file.type,
    };

    if (userId) {
      insertPayload.user_id = userId;
    }

    const { data: mediaRecord, error: insertError } = await supabase
      .from('media')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Database insert error:', insertError.message);
      } else {
        console.error('[API_ERROR]', { endpoint: '/api/media/register', code: insertError.code || 'INTERNAL_ERROR' });
      }
      return NextResponse.json(
        { error: 'An unexpected database error occurred.' },
        { status: 500 }
      );
    }

    // 6. Log registration entry to the Immutable Evidence Vault
    try {
      await logVaultEvent({
        mediaId: mediaRecord.id,
        eventType: 'MEDIA_REGISTERED',
        status: 'APPROVED',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          mediaType: file.type,
          sha256: sha256Hash,
          phash: phashString,
          storagePath,
        },
      });
    } catch (vaultErr) {
      console.warn('Vault logging skipped during media registration:', vaultErr);
    }

    return NextResponse.json({
      success: true,
      mediaId: mediaRecord.id,
      fileName: mediaRecord.file_name,
      phash: mediaRecord.phash,
      sha256: mediaRecord.sha256,
    });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Registration failure:', err);
    } else {
      console.error('[API_ERROR]', { endpoint: '/api/media/register', code: 'INTERNAL_ERROR' });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}