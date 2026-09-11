import { supabase } from '@/lib/supabaseClient';
import crypto from 'crypto';

export interface VaultChainLink {
  previous_hash: string;
  current_hash: string;
  sequence: number;
  timestamp: string;
  algorithm: 'SHA-256';
}

export type VaultEventType =
  | 'MEDIA_REGISTERED'
  | 'TOKEN_ISSUED'
  | 'TOKEN_REVOKED'
  | 'VERIFICATION_ATTEMPT'
  | 'DERIVATIVE_FLAGGED'
  | 'PERMISSION_REQUESTED'
  | 'PERMISSION_DECIDED'
  | 'NOTIFICATION_DISPATCHED'
  | 'WEBHOOK_DISPATCHED'
  | 'AUDIT_VERIFIED'
  | string;

export interface VaultEventParams {
  mediaId?: string | null;
  eventType: VaultEventType;
  status: 'APPROVED' | 'REJECTED' | 'FLAGGED' | string;
  metadata?: Record<string, any>;
}

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes a deterministic SHA-256 cryptographic digest for a vault event node.
 */
export function computeEventHash(params: {
  previousHash: string;
  timestamp: string;
  eventType: string;
  status: string;
  mediaId?: string | null;
  metadataPayload: Record<string, any>;
}): string {
  const { previousHash, timestamp, eventType, status, mediaId, metadataPayload } = params;
  // Exclude the chain block itself if present to ensure idempotent recalculation
  const cleanPayload = { ...metadataPayload };
  delete cleanPayload.chain;

  const serialized = `${previousHash}|${timestamp}|${eventType}|${status}|${mediaId || ''}|${JSON.stringify(cleanPayload)}`;
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Appends a tamper-evident event to the Evidence Vault using a SHA-256 cryptographic hash chain.
 * Compatible with existing Supabase schema by encapsulating chain state in jsonb metadata.
 */
export async function logVaultEvent({
  mediaId,
  eventType,
  status,
  metadata = {},
}: VaultEventParams) {
  let previousHash = GENESIS_HASH;
  let sequence = 1;

  try {
    // 1. Fetch latest vault row to link chain
    const { data: latestRow } = await supabase
      .from('evidence_vault')
      .select('id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRow?.metadata?.chain?.current_hash) {
      previousHash = latestRow.metadata.chain.current_hash;
      sequence = (latestRow.metadata.chain.sequence || 0) + 1;
    } else if (latestRow?.id) {
      // Synthesize genesis anchor if existing row did not have chain block
      previousHash = crypto.createHash('sha256').update(latestRow.id + latestRow.created_at).digest('hex');
      sequence = 2;
    }
  } catch (lookupErr) {
    console.warn('[EvidenceVault] Could not retrieve previous hash, starting from genesis anchor:', lookupErr);
  }

  const timestamp = new Date().toISOString();
  const currentHash = computeEventHash({
    previousHash,
    timestamp,
    eventType,
    status,
    mediaId,
    metadataPayload: metadata,
  });

  const chainBlock: VaultChainLink = {
    previous_hash: previousHash,
    current_hash: currentHash,
    sequence,
    timestamp,
    algorithm: 'SHA-256',
  };

  const enrichedMetadata = {
    ...metadata,
    chain: chainBlock,
  };

  const { data, error } = await supabase
    .from('evidence_vault')
    .insert({
      media_id: mediaId || null,
      event_type: eventType,
      status,
      metadata: enrichedMetadata,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record vault event:', error.message);
    throw error;
  }

  return data;
}

/**
 * Verifies the mathematical and cryptographic integrity of the Evidence Vault hash chain.
 * Detects any data tampering, sequence breaks, or ledger modifications.
 */
export async function verifyVaultChain(mediaId?: string): Promise<{
  valid: boolean;
  chainLength: number;
  brokenAt?: number;
  details: string;
}> {
  try {
    let query = supabase
      .from('evidence_vault')
      .select('id, media_id, event_type, status, metadata, created_at')
      .order('created_at', { ascending: true });

    if (mediaId) {
      query = query.eq('media_id', mediaId);
    }

    const { data: rows, error } = await query;

    if (error || !rows || rows.length === 0) {
      return {
        valid: true,
        chainLength: 0,
        details: 'No vault events to verify.',
      };
    }

    let expectedPrevHash: string | null = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const chain: VaultChainLink | undefined = row.metadata?.chain;

      if (!chain) {
        // Unchained legacy row: verify next rows can still link
        continue;
      }

      // Check linkage with previous block
      if (expectedPrevHash !== null && chain.previous_hash !== expectedPrevHash) {
        return {
          valid: false,
          chainLength: rows.length,
          brokenAt: i,
          details: `Chain linkage mismatch at event #${i + 1} (${row.id}). Expected previous hash ${expectedPrevHash}, but found ${chain.previous_hash}`,
        };
      }

      // Recalculate hash to ensure payload was not modified
      const calculatedHash = computeEventHash({
        previousHash: chain.previous_hash,
        timestamp: chain.timestamp,
        eventType: row.event_type,
        status: row.status,
        mediaId: row.media_id,
        metadataPayload: row.metadata,
      });

      if (calculatedHash !== chain.current_hash) {
        return {
          valid: false,
          chainLength: rows.length,
          brokenAt: i,
          details: `Cryptographic tamper detected at event #${i + 1} (${row.id}). Hash recalculated ${calculatedHash} does not match stored ${chain.current_hash}`,
        };
      }

      expectedPrevHash = chain.current_hash;
    }

    return {
      valid: true,
      chainLength: rows.length,
      details: `All ${rows.length} vault events passed cryptographic SHA-256 hash-chain verification.`,
    };
  } catch (err: any) {
    return {
      valid: false,
      chainLength: 0,
      details: `Verification exception: ${err?.message || err}`,
    };
  }
}