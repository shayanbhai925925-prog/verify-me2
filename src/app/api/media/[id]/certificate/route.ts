import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const mediaId = resolvedParams?.id;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID parameter is missing or invalid' },
        { status: 400 }
      );
    }

    // 1. Fetch asset registration details
    const { data: media, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .eq('id', mediaId)
      .maybeSingle();

    if (mediaError || !media) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Media lookup error:', mediaError?.message || `No media record found matching ID: ${mediaId}`);
      } else {
        console.error('[API_ERROR]', { endpoint: '/api/media/[id]/certificate', code: mediaError?.code || 'NOT_FOUND' });
      }
      return NextResponse.json(
        { error: 'Media record not found or inaccessible.' },
        { status: 404 }
      );
    }

    // 2. Fetch immutable vault records
    const { data: vaultHistory } = await supabase
      .from('evidence_vault')
      .select('id, event_type, status, created_at')
      .eq('media_id', mediaId)
      .order('created_at', { ascending: true });

    // 3. Assemble base payload
    const issuedAt = new Date().toISOString();
    const payload = {
      schemaVersion: '1.0.0',
      network: 'ProtectMedia Proof-of-Authenticity Network',
      issuedAt,
      asset: {
        id: media.id,
        fileName: media.file_name,
        fileSize: media.file_size,
        mediaType: media.media_type,
        registeredAt: media.created_at,
        integrity: {
          sha256: media.sha256,
          perceptualHash64: media.phash,
        },
      },
      auditChain: vaultHistory || [],
    };

    // 4. Generate HMAC-SHA256 signature over payload
    const secret = process.env.PROTECTMEDIA_SIGNING_SECRET || 'fallback-secret-protect-media';
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    // 5. Return signed certificate package
    return NextResponse.json(
      {
        ...payload,
        proof: {
          algorithm: 'HMAC-SHA256',
          signature,
          ledgerAnchor: 'Supabase-Postgres-Vault',
          status: 'AUTHENTICATED',
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Certificate generation failure:', err);
    } else {
      console.error('[API_ERROR]', { endpoint: '/api/media/[id]/certificate', code: 'INTERNAL_ERROR' });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}