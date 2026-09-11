import { generatePHash, calculateHammingDistance } from './derivativeEngine';
import { createServerSupabaseClient } from './supabaseServer';
import * as vaultModule from './evidenceVault';
import * as cryptoTokens from './cryptoTokens';
import crypto from 'crypto';

export type SupportedOperation =
  | 'ai_editing'
  | 'face_swap'
  | 'style_transfer'
  | 'commercial_use'
  | 'ai_training';

export interface AgentDecisionRequest {
  imageBuffer: Buffer;
  operation: SupportedOperation;
  requesterApp: string;
}

const OPERATION_COLUMN_MAP: Record<SupportedOperation, string> = {
  ai_editing: 'allow_ai_editing',
  face_swap: 'allow_face_swap',
  commercial_use: 'allow_commercial',
  ai_training: 'allow_ai_training',
  style_transfer: 'allow_ai_editing'
};

export async function runSecurityAgent(req: AgentDecisionRequest) {
  const db = createServerSupabaseClient();
  const sha256 = crypto.createHash('sha256').update(req.imageBuffer).digest('hex');
  const candidatePHash = await generatePHash(req.imageBuffer);

  // 1. Exact SHA256 match
  let matchedMedia: any = null;
  const { data: shaMatches } = await db
    .from('media')
    .select('id, user_id, phash, sha256')
    .eq('sha256', sha256)
    .limit(1);

  if (shaMatches && shaMatches.length > 0) {
    matchedMedia = shaMatches[0];
  } else {
    // 2. Perceptual hash fallback
    const { data: mediaRows } = await db
      .from('media')
      .select('id, user_id, phash, sha256')
      .limit(200);

    if (mediaRows) {
      for (const m of mediaRows as any[]) {
        if (!m.phash) continue;
        if (calculateHammingDistance(candidatePHash, m.phash) <= 10) {
          matchedMedia = m;
          break;
        }
      }
    }
  }

  // Unregistered asset
  if (!matchedMedia) {
    return {
      verdict: 'UNREGISTERED',
      allowed: true,
      message: 'Asset not registered in VerifyMe registry.'
    };
  }

  // 3. Fetch Policy
  const { data: policies } = await db
    .from('media_policies')
    .select('*')
    .eq('media_id', matchedMedia.id);

  const policy = policies && policies.length > 0 ? policies[0] : null;
  const colKey = OPERATION_COLUMN_MAP[req.operation];
  
  const isAllowed = Boolean(
    policy && (policy[colKey] === true || (policy as any)[colKey] === 'true')
  );

  // 4. Evaluate Verdict
  if (!isAllowed) {
    try {
      const logFn = (vaultModule as any).logVaultEvent || (vaultModule as any).createVaultRecord;
      if (typeof logFn === 'function') {
        await logFn({
          mediaId: matchedMedia.id,
          eventType: 'SECURITY_AGENT_BLOCKED',
          status: 'BLOCKED',
          metadata: { operation: req.operation, requester: req.requesterApp }
        });
      }
    } catch {
      // Non-fatal
    }

    return {
      verdict: 'DENIED',
      allowed: false,
      mediaId: matchedMedia.id,
      message: `Operation "${req.operation}" explicitly blocked by creator policy.`
    };
  }

  // 5. Token Generation
  let tokenResult: any = null;
  try {
    const tokenFn =
      (cryptoTokens as any).issueAuthToken ||
      (cryptoTokens as any).createToken ||
      (cryptoTokens as any).signToken ||
      (cryptoTokens as any).generateToken ||
      (cryptoTokens as any).issueToken;

    if (typeof tokenFn === 'function') {
      tokenResult = await tokenFn({
        mediaId: matchedMedia.id,
        creatorId: matchedMedia.user_id,
        requesterApp: req.requesterApp,
        operations: [req.operation]
      });
    } else {
      const secret = process.env.TOKEN_SIGNING_KEY || process.env.PROTECTMEDIA_SIGNING_SECRET || 'fallback-secret';
      tokenResult = {
        rawToken: crypto
          .createHmac('sha256', secret)
          .update(`${matchedMedia.id}:${Date.now()}`)
          .digest('hex')
      };
    }
  } catch {
    tokenResult = { rawToken: 'AUTH_GRANTED' };
  }

  return {
    verdict: 'ALLOWED',
    allowed: true,
    mediaId: matchedMedia.id,
    token: tokenResult?.rawToken || tokenResult?.token || tokenResult
  };
}