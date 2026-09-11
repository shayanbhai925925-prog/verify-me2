import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createServerSupabaseClient, extractBearerToken } from '@/lib/supabaseServer';
import { logVaultEvent } from '@/lib/evidenceVault';
import { issueCryptoToken, verifyCryptoToken } from '@/lib/cryptoTokens';
import { dispatchNotification } from '@/lib/notificationEngine';

// GET: Validate an authorization token (called by external platforms/verifiers)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requiredMediaId = url.searchParams.get('mediaId') || undefined;
    const requiredOperation = url.searchParams.get('operation') || undefined;

    const authHeader = req.headers.get('authorization') ?? '';
    const token =
      (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
      req.headers.get('x-access-token');

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          code: 'INVALID_SIGNATURE',
          reason: 'Token is required. Supply via Authorization: Bearer <token> or x-access-token header.',
        },
        { status: 400 }
      );
    }

    const validation = await verifyCryptoToken(token, {
      requiredMediaId,
      requiredOperation,
    });

    const statusCode = validation.valid ? 200 : validation.code === 'INVALID_SIGNATURE' ? 401 : 403;

    return NextResponse.json(
      {
        valid: validation.valid,
        code: validation.code,
        reason: validation.reason,
        mediaId: validation.mediaId,
        creatorId: validation.creatorId,
        requesterApp: validation.requesterApp,
        permissions: validation.permittedOperations,
        expiresAt: validation.expiresAt,
        payload: validation.payload,
      },
      { status: statusCode }
    );
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Token validation failure:', err);
    } else {
      console.error('[API_ERROR]', { endpoint: '/api/tokens GET', code: 'INTERNAL_ERROR' });
    }
    return NextResponse.json({ valid: false, code: 'INTERNAL_ERROR', reason: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST: Issue a new cryptographically generated token
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mediaId,
      requesterApp = 'External-AI-Agent',
      durationMinutes = 120,
      permissions = { allow_display: true, allow_training: false },
      operations: requestedOps,
    } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'mediaId is required to issue a token' },
        { status: 400 }
      );
    }

    // Verify the referenced media asset actually exists
    const { data: mediaRecord, error: mediaLookupError } = await supabase
      .from('media')
      .select('id, user_id, file_name')
      .eq('id', mediaId)
      .maybeSingle();

    if (mediaLookupError || !mediaRecord) {
      return NextResponse.json(
        { error: 'Media asset not found.' },
        { status: 404 }
      );
    }

    // Determine normalized operations list
    let operations: string[] = [];
    if (Array.isArray(requestedOps) && requestedOps.length > 0) {
      operations = requestedOps;
    } else if (permissions && typeof permissions === 'object') {
      operations = Object.keys(permissions).filter((k) => permissions[k] === true);
      if (operations.length === 0) operations = ['ai_editing'];
    } else {
      operations = ['ai_editing'];
    }

    // Issue cryptographically signed token
    const tokenResult = await issueCryptoToken({
      mediaId,
      creatorId: mediaRecord.user_id,
      requesterApp,
      operations,
      durationMinutes,
    });

    // Dispatch real-time token_issued notification
    try {
      await dispatchNotification({
        eventType: 'token_issued',
        idempotencyKey: `tok_issue_${tokenResult.tokenId}`,
        mediaId,
        creatorId: mediaRecord.user_id,
        title: `Authorization Token Issued: ${requesterApp}`,
        message: `A cryptographic authorization token was generated for media '${mediaRecord.file_name}' to ${requesterApp} for operations: [${operations.join(', ')}].`,
        data: {
          tokenId: tokenResult.tokenId,
          mediaId,
          mediaTitle: mediaRecord.file_name,
          requesterApp,
          operations,
          expiresAt: tokenResult.expiresAt,
        },
      });
    } catch (notifErr) {
      console.warn('[TokensRoute] Notification dispatch notice:', notifErr);
    }

    return NextResponse.json({
      success: true,
      token: tokenResult.token,
      tokenId: tokenResult.tokenId,
      expiresAt: tokenResult.expiresAt,
      permissions: tokenResult.permissions,
      payload: tokenResult.payload,
    });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Token issuance failure:', err);
    } else {
      console.error('[API_ERROR]', { endpoint: '/api/tokens POST', code: 'INTERNAL_ERROR' });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PATCH: Revoke an active token immediately
export async function PATCH(req: Request) {
  try {
    const { token, reason = 'Manually revoked by creator' } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 1. Authenticate the caller
    const serverClient = createServerSupabaseClient();
    const jwt = extractBearerToken(req);
    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: { user }, error: authError } = await serverClient.auth.getUser(jwt);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Look up the token record to find the linked media asset
    const { data: tokenRecord, error: tokenLookupError } = await supabase
      .from('auth_tokens')
      .select('id, media_id, requester_app')
      .eq('token', token)
      .maybeSingle();

    if (tokenLookupError || !tokenRecord) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // 3. Verify the caller owns the media asset linked to this token
    const { data: mediaRecord, error: mediaLookupError } = await supabase
      .from('media')
      .select('id, user_id, file_name')
      .eq('id', tokenRecord.media_id)
      .maybeSingle();

    if (mediaLookupError || !mediaRecord) {
      return NextResponse.json({ error: 'Associated media asset not found.' }, { status: 404 });
    }

    if (mediaRecord.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to revoke tokens for this asset.' },
        { status: 403 }
      );
    }

    const { data: updatedToken, error: updateError } = await supabase
      .from('auth_tokens')
      .update({ status: 'REVOKED' })
      .eq('token', token)
      .select()
      .single();

    if (updateError || !updatedToken) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Token revocation update error:', updateError?.message);
      } else {
        console.error('[API_ERROR]', { endpoint: '/api/tokens PATCH', code: updateError?.code || 'INTERNAL_ERROR' });
      }
      return NextResponse.json(
        { error: updateError ? 'An unexpected database error occurred.' : 'Token not found' },
        { status: updateError ? 500 : 404 }
      );
    }

    // Log revocation to the immutable Evidence Vault
    try {
      await logVaultEvent({
        mediaId: updatedToken.media_id,
        eventType: 'TOKEN_REVOKED',
        status: 'REJECTED',
        metadata: {
          action: 'REVOKE',
          tokenId: updatedToken.id,
          tokenSnippet: token.slice(0, 16) + '...',
          reason,
          revokedAt: new Date().toISOString(),
        },
      });
    } catch (vaultErr) {
      console.warn('Vault logging skipped during revocation:', vaultErr);
    }

    // Dispatch real-time token_revoked notification
    try {
      await dispatchNotification({
        eventType: 'token_revoked',
        idempotencyKey: `tok_revoke_${updatedToken.id}`,
        mediaId: updatedToken.media_id,
        creatorId: user.id,
        title: `Token Revoked: ${tokenRecord.requester_app}`,
        message: `An authorization token for media '${mediaRecord.file_name}' was revoked by creator. Reason: ${reason}.`,
        data: {
          tokenId: updatedToken.id,
          mediaId: updatedToken.media_id,
          mediaTitle: mediaRecord.file_name,
          reason,
          revokedAt: new Date().toISOString(),
        },
      });
    } catch (notifErr) {
      console.warn('[TokensRoute] Revocation notification skipped:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Token successfully revoked',
      status: 'REVOKED',
    });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Token revocation failure:', err);
    } else {
      console.error('[API_ERROR]', { endpoint: '/api/tokens PATCH', code: 'INTERNAL_ERROR' });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}