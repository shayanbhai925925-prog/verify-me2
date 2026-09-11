import crypto from 'crypto';
import { supabase } from '@/lib/supabaseClient';
import { logVaultEvent } from '@/lib/evidenceVault';

export type TokenValidationCode =
  | 'VALID'
  | 'EXPIRED'
  | 'REVOKED'
  | 'INVALID_SIGNATURE'
  | 'INVALID_MEDIA'
  | 'OPERATION_NOT_PERMITTED';

export interface TokenPayload {
  tid: string;          // Token ID (UUID / unique id)
  mid: string;          // Media ID
  cid: string;          // Creator ID
  app: string;          // Requester App / Client
  ops: string[];        // Permitted Operations
  iat: number;          // Issued at (timestamp ms)
  exp: number;          // Expires at (timestamp ms)
  status: 'ACTIVE' | 'REVOKED';
  nonce: string;        // Entropy / replay prevention
}

export interface TokenValidationResult {
  valid: boolean;
  code: TokenValidationCode;
  reason: string;
  mediaId?: string;
  creatorId?: string;
  requesterApp?: string;
  permittedOperations?: string[];
  expiresAt?: string;
  payload?: TokenPayload;
}

export interface IssueTokenParams {
  mediaId: string;
  creatorId?: string;
  requesterApp?: string;
  operations: string[];
  durationMinutes?: number;
}

function getSigningSecret(): string {
  const secret =
    process.env.TOKEN_SIGNING_KEY ||
    process.env.PROTECTMEDIA_SIGNING_SECRET;

  if (!secret) {
    throw new Error(
      'FATAL: Signing secret is not configured. ' +
      'Missing TOKEN_SIGNING_KEY / PROTECTMEDIA_SIGNING_SECRET.'
    );
  }

  return secret;
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Issues a cryptographically signed authorization token for AI operations on protected media.
 * Token Format: pm_auth_<header_b64url>.<payload_b64url>.<signature_b64url>
 */
export async function issueCryptoToken(params: IssueTokenParams): Promise<{
  token: string;
  tokenId: string;
  expiresAt: string;
  permissions: Record<string, boolean>;
  payload: TokenPayload;
}> {
  const {
    mediaId,
    creatorId = '',
    requesterApp = 'External-AI-Agent',
    operations,
    durationMinutes = 120,
  } = params;

  const now = Date.now();
  const expiresAtMs = now + durationMinutes * 60 * 1000;
  const tokenId = `tok_${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')}`;
  const nonce = crypto.randomBytes(16).toString('hex');

  const header = {
    alg: 'HS256',
    typ: 'PM-AUTH',
  };

  const payload: TokenPayload = {
    tid: tokenId,
    mid: mediaId,
    cid: creatorId,
    app: requesterApp,
    ops: operations,
    iat: now,
    exp: expiresAtMs,
    status: 'ACTIVE',
    nonce,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const secret = getSigningSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest();
  const signatureB64 = base64UrlEncode(signature);

  const token = `pm_auth_${headerB64}.${payloadB64}.${signatureB64}`;

  // Permissions dictionary format for backward compatibility with auth_tokens table
  const permissionsDict: Record<string, boolean> = {};
  for (const op of operations) {
    permissionsDict[op] = true;
  }

  const expiresAtIso = new Date(expiresAtMs).toISOString();

  // Persist token record into Supabase auth_tokens table
  try {
    await supabase.from('auth_tokens').insert({
      media_id: mediaId,
      token,
      requester_app: requesterApp,
      permissions: permissionsDict,
      status: 'ACTIVE',
      expires_at: expiresAtIso,
    });
  } catch (dbErr) {
    console.warn('[CryptoTokens] Database persistence notice:', dbErr);
  }

  // Record issuance event into Evidence Vault
  try {
    await logVaultEvent({
      mediaId,
      eventType: 'TOKEN_ISSUED',
      status: 'APPROVED',
      metadata: {
        tokenId,
        requesterApp,
        operations,
        expiresAt: expiresAtIso,
        nonce,
      },
    });
  } catch (vaultErr) {
    console.warn('[CryptoTokens] Vault event logging skipped:', vaultErr);
  }

  return {
    token,
    tokenId,
    expiresAt: expiresAtIso,
    permissions: permissionsDict,
    payload,
  };
}

/**
 * Validates a cryptographic token against tampering, expiration, revocation, wrong media, and unauthorized operations.
 */
export async function verifyCryptoToken(
  tokenString: string,
  options?: {
    requiredMediaId?: string;
    requiredOperation?: string;
  }
): Promise<TokenValidationResult> {
  if (!tokenString || typeof tokenString !== 'string') {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      reason: 'Token is required and must be a valid string.',
    };
  }

  const trimmedToken = tokenString.trim();

  // Legacy fallback: if someone supplies an old 48-char hex token or non-pm_auth token, check DB
  if (!trimmedToken.startsWith('pm_auth_')) {
    return verifyLegacyDbToken(trimmedToken, options);
  }

  const rawToken = trimmedToken.slice('pm_auth_'.length);
  const parts = rawToken.split('.');

  if (parts.length !== 3) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      reason: 'Malformed token structure. Expected 3 segments.',
    };
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const secret = getSigningSecret();

  // Verify HMAC-SHA256 signature with constant-time equality
  const expectedSig = crypto.createHmac('sha256', secret).update(signingInput).digest();
  const expectedSigB64 = base64UrlEncode(expectedSig);

  const sigBufA = Buffer.from(signatureB64);
  const sigBufB = Buffer.from(expectedSigB64);

  if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      reason: 'Cryptographic signature mismatch. Token is forged or tampered.',
    };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      reason: 'Token payload could not be decoded as JSON.',
    };
  }

  // 1. Expiration Check
  const now = Date.now();
  if (now > payload.exp) {
    return {
      valid: false,
      code: 'EXPIRED',
      reason: `Token expired at ${new Date(payload.exp).toISOString()}.`,
      mediaId: payload.mid,
      requesterApp: payload.app,
      payload,
    };
  }

  // 2. Database Revocation Check
  try {
    const { data: dbRecord } = await supabase
      .from('auth_tokens')
      .select('status')
      .eq('token', trimmedToken)
      .maybeSingle();

    if (dbRecord && dbRecord.status === 'REVOKED') {
      return {
        valid: false,
        code: 'REVOKED',
        reason: 'Token has been explicitly revoked by the creator.',
        mediaId: payload.mid,
        requesterApp: payload.app,
        payload,
      };
    }
  } catch (dbErr) {
    console.warn('[CryptoTokens] Database revocation check skipped:', dbErr);
  }

  // 3. Media Binding Check
  if (options?.requiredMediaId && payload.mid !== options.requiredMediaId) {
    return {
      valid: false,
      code: 'INVALID_MEDIA',
      reason: `Token is authorized for media '${payload.mid}', not requested media '${options.requiredMediaId}'.`,
      mediaId: payload.mid,
      requesterApp: payload.app,
      payload,
    };
  }

  // 4. Operation Permission Check
  if (options?.requiredOperation && !payload.ops.includes(options.requiredOperation)) {
    return {
      valid: false,
      code: 'OPERATION_NOT_PERMITTED',
      reason: `Operation '${options.requiredOperation}' is not permitted by this token. Permitted operations: [${payload.ops.join(', ')}].`,
      mediaId: payload.mid,
      requesterApp: payload.app,
      permittedOperations: payload.ops,
      payload,
    };
  }

  return {
    valid: true,
    code: 'VALID',
    reason: 'Token is cryptographically valid, active, and authorized.',
    mediaId: payload.mid,
    creatorId: payload.cid,
    requesterApp: payload.app,
    permittedOperations: payload.ops,
    expiresAt: new Date(payload.exp).toISOString(),
    payload,
  };
}

/**
 * Fallback validator for non-signed legacy tokens stored in Supabase
 */
async function verifyLegacyDbToken(
  token: string,
  options?: { requiredMediaId?: string; requiredOperation?: string }
): Promise<TokenValidationResult> {
  const { data: tokenRecord, error } = await supabase
    .from('auth_tokens')
    .select('id, media_id, requester_app, permissions, expires_at, status')
    .eq('token', token)
    .maybeSingle();

  if (error || !tokenRecord) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      reason: 'Token not found in authorization ledger.',
    };
  }

  if (tokenRecord.status === 'REVOKED') {
    return {
      valid: false,
      code: 'REVOKED',
      reason: 'Token has been revoked by the creator.',
      mediaId: tokenRecord.media_id,
      requesterApp: tokenRecord.requester_app,
    };
  }

  const now = new Date();
  const expiresAt = new Date(tokenRecord.expires_at);
  if (now > expiresAt) {
    return {
      valid: false,
      code: 'EXPIRED',
      reason: 'Token has expired.',
      mediaId: tokenRecord.media_id,
      requesterApp: tokenRecord.requester_app,
    };
  }

  if (options?.requiredMediaId && tokenRecord.media_id !== options.requiredMediaId) {
    return {
      valid: false,
      code: 'INVALID_MEDIA',
      reason: `Token is linked to media ${tokenRecord.media_id}, not ${options.requiredMediaId}.`,
    };
  }

  const permissions = tokenRecord.permissions || {};
  if (options?.requiredOperation && !permissions[options.requiredOperation]) {
    return {
      valid: false,
      code: 'OPERATION_NOT_PERMITTED',
      reason: `Operation '${options.requiredOperation}' is not permitted by this token.`,
    };
  }

  return {
    valid: true,
    code: 'VALID',
    reason: 'Legacy database token is valid.',
    mediaId: tokenRecord.media_id,
    requesterApp: tokenRecord.requester_app,
    permittedOperations: Object.keys(permissions).filter((k) => permissions[k]),
    expiresAt: tokenRecord.expires_at,
  };
}
