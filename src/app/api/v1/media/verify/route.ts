import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateApiKey } from '@/lib/apiKeyService';
import { supabase } from '@/lib/supabaseClient';
import { generatePHash, calculateHammingDistance } from '@/lib/derivativeEngine';
import { logVaultEvent } from '@/lib/evidenceVault';
import { dispatchNotification } from '@/lib/notificationEngine';

export const dynamic = 'force-dynamic';

const HAMMING_THRESHOLD = 10;
const HASH_BIT_LENGTH = 64;

export async function POST(req: Request) {
  try {
    // 1. API Key Authentication
    const authResult = await validateApiKey(req);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error, code: 'UNAUTHORIZED' },
        { status: authResult.statusCode || 401 }
      );
    }

    let buffer: Buffer | null = null;
    let fileName = 'unknown_file';
    let querySha256: string | null = null;
    let queryPHash: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    // 2. Parse input: either multipart form-data or JSON payload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No media file provided in multipart form data.' },
          { status: 400 }
        );
      }

      fileName = file.name;
      buffer = Buffer.from(await file.arrayBuffer());
      querySha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      try {
        queryPHash = await generatePHash(buffer);
      } catch (err) {
        console.warn('pHash calculation failed on input:', err);
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      querySha256 = body.sha256 || body.sha256_hash || null;
      queryPHash = body.phash || null;
      fileName = body.fileName || 'hash_query';

      if (!querySha256 && !queryPHash) {
        return NextResponse.json(
          { error: 'Either sha256 or phash must be provided in JSON payload.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' },
        { status: 400 }
      );
    }

    // 3. Exact SHA-256 match check
    let exactMatch: any = null;
    if (querySha256) {
      const { data: shaMatch } = await supabase
        .from('media')
        .select('id, file_name, user_id, phash, sha256_hash, created_at')
        .eq('sha256_hash', querySha256)
        .maybeSingle();

      if (shaMatch) {
        exactMatch = shaMatch;
      }
    }

    // 4. pHash derivative scan
    const matches: Array<{
      mediaId: string;
      fileName: string;
      creatorId: string;
      hammingDistance: number;
      confidence: number;
      registeredAt?: string;
    }> = [];

    if (queryPHash) {
      // Check exact pHash
      const { data: exactPHashMatches } = await supabase
        .from('media')
        .select('id, file_name, user_id, phash, sha256_hash, created_at')
        .eq('phash', queryPHash)
        .limit(5);

      if (exactPHashMatches && exactPHashMatches.length > 0) {
        for (const item of exactPHashMatches) {
          matches.push({
            mediaId: item.id,
            fileName: item.file_name,
            creatorId: item.user_id || '',
            hammingDistance: 0,
            confidence: 100,
            registeredAt: item.created_at,
          });
        }
      }

      // If no exact match, scan nearby hashes
      if (matches.length === 0) {
        const { data: allMedia } = await supabase
          .from('media')
          .select('id, file_name, user_id, phash, created_at')
          .limit(200);

        if (allMedia) {
          for (const item of allMedia) {
            if (item.phash && item.phash.length === HASH_BIT_LENGTH) {
              const distance = calculateHammingDistance(queryPHash, item.phash);
              if (distance <= HAMMING_THRESHOLD) {
                const confidence = Math.round(((HASH_BIT_LENGTH - distance) / HASH_BIT_LENGTH) * 100);
                matches.push({
                  mediaId: item.id,
                  fileName: item.file_name,
                  creatorId: item.user_id || '',
                  hammingDistance: distance,
                  confidence,
                  registeredAt: item.created_at,
                });
              }
            }
          }
        }
      }
    }

    matches.sort((a, b) => a.hammingDistance - b.hammingDistance);

    const primaryRecord = exactMatch || (matches.length > 0 ? matches[0] : null);
    const isRegistered = !!primaryRecord;

    // 5. Evidence Vault logging
    try {
      await logVaultEvent({
        mediaId: primaryRecord?.id || primaryRecord?.mediaId || null,
        eventType: 'VERIFICATION_ATTEMPT',
        status: isRegistered ? 'APPROVED' : 'REJECTED',
        metadata: {
          client: authResult.clientName,
          keyId: authResult.keyId,
          fileName,
          querySha256,
          queryPHash,
          isRegistered,
          topMatchConfidence: matches.length > 0 ? matches[0].confidence : exactMatch ? 100 : 0,
        },
      });
    } catch (vErr) {
      console.warn('[V1MediaVerify] Vault log skipped:', vErr);
    }

    // 6. Dispatch verification_result notification
    try {
      await dispatchNotification({
        eventType: 'verification_result',
        idempotencyKey: `verif_res_${querySha256 || queryPHash}_${isRegistered}`,
        mediaId: primaryRecord?.id || primaryRecord?.mediaId,
        creatorId: primaryRecord?.user_id || primaryRecord?.creatorId,
        title: `Verification Audit Complete: ${fileName}`,
        message: isRegistered
          ? `Media verification confirmed authenticity and ownership for '${fileName}'.`
          : `Media verification found no matching registrations for '${fileName}'.`,
        data: {
          fileName,
          isRegistered,
          querySha256,
          matchesCount: matches.length,
          client: authResult.clientName,
        },
      });
    } catch (nErr) {
      console.warn('[V1MediaVerify] Notification skipped:', nErr);
    }

    return NextResponse.json({
      verified: isRegistered,
      client: authResult.clientName,
      query: {
        fileName,
        sha256: querySha256,
        phash: queryPHash,
      },
      ownership: isRegistered
        ? {
            isRegistered: true,
            mediaId: primaryRecord.id || primaryRecord.mediaId,
            fileName: primaryRecord.file_name || primaryRecord.fileName,
            creatorId: primaryRecord.user_id || primaryRecord.creatorId,
            registeredAt: primaryRecord.created_at || primaryRecord.registeredAt,
          }
        : {
            isRegistered: false,
            message: 'No cryptographic ownership or hash match found in VerifyMe registry.',
          },
      matches,
    });
  } catch (err: unknown) {
    console.error('V1 media verify error:', err);
    return NextResponse.json(
      { error: 'An unexpected internal error occurred during verification.' },
      { status: 500 }
    );
  }
}
