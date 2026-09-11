import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyService';
import { verifyCryptoToken } from '@/lib/cryptoTokens';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. API Key Authentication (Optional if token itself is provided as Bearer, but checked if present)
    const apiKeyHeader = req.headers.get('x-api-key');
    if (apiKeyHeader) {
      const auth = await validateApiKey(req);
      if (!auth.valid) {
        return NextResponse.json(
          { error: auth.error, code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
    }

    // 2. Extract Token and Verification Constraints
    let token: string | null = null;
    let mediaId: string | undefined;
    let operation: string | undefined;

    const authHeader = req.headers.get('authorization') || '';
    const tokenHeader = req.headers.get('x-verifyme-token');

    if (tokenHeader) {
      token = tokenHeader.trim();
    } else if (authHeader.startsWith('Bearer pm_auth_') || (!apiKeyHeader && authHeader.startsWith('Bearer '))) {
      token = authHeader.slice(7).trim();
    }

    try {
      const body = await req.json();
      if (body.token) token = body.token;
      if (body.mediaId) mediaId = body.mediaId;
      if (body.operation) operation = body.operation;
    } catch {
      // Body may be empty if token passed in headers
    }

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          code: 'INVALID_SIGNATURE',
          reason: 'Token is required. Provide via JSON body or X-VerifyMe-Token / Authorization headers.',
        },
        { status: 400 }
      );
    }

    // 3. Cryptographic and Integrity Validation
    const validation = await verifyCryptoToken(token, {
      requiredMediaId: mediaId,
      requiredOperation: operation,
    });

    const httpStatus = validation.valid ? 200 : validation.code === 'INVALID_SIGNATURE' ? 401 : 403;

    return NextResponse.json(
      {
        valid: validation.valid,
        code: validation.code,
        reason: validation.reason,
        mediaId: validation.mediaId,
        creatorId: validation.creatorId,
        requesterApp: validation.requesterApp,
        permittedOperations: validation.permittedOperations,
        expiresAt: validation.expiresAt,
        payload: validation.payload,
      },
      { status: httpStatus }
    );
  } catch (err: any) {
    console.error('Token validation endpoint error:', err);
    return NextResponse.json(
      { valid: false, code: 'INTERNAL_ERROR', reason: 'Internal error validating token.' },
      { status: 500 }
    );
  }
}
