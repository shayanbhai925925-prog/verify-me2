import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyService';
import { requestPermission } from '@/lib/permissionService';
import { issueCryptoToken } from '@/lib/cryptoTokens';
import { PermissionOperation } from '@/lib/permissionTypes';

export const dynamic = 'force-dynamic';

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

    const body = await req.json();
    const {
      mediaId,
      operation,
      requesterName = authResult.clientName || 'External AI Agent',
      requesterEmail = 'api-client@external.platform',
      requesterPurpose = 'External AI generation and transformation pipeline',
    } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Field mediaId is required.' },
        { status: 400 }
      );
    }

    if (!operation) {
      return NextResponse.json(
        { error: 'Field operation is required.' },
        { status: 400 }
      );
    }

    // 2. Delegate to the Core Permission Service
    const result = await requestPermission({
      mediaId,
      operation: operation as PermissionOperation,
      requesterId: authResult.keyId || null,
      requesterName,
      requesterEmail,
      requesterPurpose,
    });

    let tokenResult: any = null;

    // 3. If policy auto-approved the request, immediately issue a cryptographic token
    if (result.authorized && result.status === 'AUTO_APPROVED') {
      tokenResult = await issueCryptoToken({
        mediaId,
        creatorId: result.request.creator_id,
        requesterApp: requesterName,
        operations: [operation],
        durationMinutes: 120,
      });
    }

    return NextResponse.json({
      success: true,
      authorized: result.authorized,
      status: result.status,
      message: result.message,
      requestId: result.request.id,
      mediaId: result.request.media_id,
      mediaTitle: result.request.media_title,
      operation: result.request.operation,
      decisionNote: result.request.decision_note,
      createdAt: result.request.created_at,
      token: tokenResult ? tokenResult.token : null,
      tokenExpiresAt: tokenResult ? tokenResult.expiresAt : null,
    });
  } catch (err: any) {
    console.error('Permission request error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error processing permission request.' },
      { status: 500 }
    );
  }
}
