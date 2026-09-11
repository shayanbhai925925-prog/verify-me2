import { logVaultEvent } from './evidenceVault';

export interface ApiKeyValidationResult {
  valid: boolean;
  keyId?: string;
  clientName?: string;
  error?: string;
  statusCode?: number;
}

// Configured API Keys mapping: key -> clientName
function getValidApiKeys(): Map<string, { id: string; name: string }> {
  const keysMap = new Map<string, { id: string; name: string }>();

  // Default dev key for seamless local testing and out-of-the-box evaluation
  keysMap.set('vm_live_dev_test_key', {
    id: 'key_dev_001',
    name: 'VerifyMe Development Client',
  });

  // Load from environment variable: VERIFYME_API_KEYS="vm_live_abc123:OpenAI,vm_live_xyz789:Anthropic"
  const envKeys = process.env.VERIFYME_API_KEYS || process.env.VERIFYME_API_KEY;
  if (envKeys) {
    const entries = envKeys.split(',');
    for (const entry of entries) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      if (trimmed.includes(':')) {
        const [k, name] = trimmed.split(':');
        keysMap.set(k.trim(), { id: `key_${k.slice(0, 10)}`, name: name.trim() });
      } else {
        keysMap.set(trimmed, { id: `key_${trimmed.slice(0, 10)}`, name: 'External AI Client' });
      }
    }
  }

  return keysMap;
}

/**
 * Extracts and validates an API key from incoming request headers:
 * 1. X-API-Key header
 * 2. Authorization: Bearer <key> header
 */
export async function validateApiKey(req: Request): Promise<ApiKeyValidationResult> {
  const headerApiKey = req.headers.get('x-api-key')?.trim();
  const authHeader = req.headers.get('authorization')?.trim();

  let extractedKey: string | null = headerApiKey || null;

  if (!extractedKey && authHeader?.startsWith('Bearer ')) {
    extractedKey = authHeader.slice(7).trim();
  }

  if (!extractedKey) {
    return {
      valid: false,
      error: 'Missing API Key. Provide via X-API-Key header or Authorization: Bearer <key>.',
      statusCode: 401,
    };
  }

  const validKeys = getValidApiKeys();
  const matchedClient = validKeys.get(extractedKey);

  if (!matchedClient) {
    // Audit failed attempt in vault (non-blocking)
    try {
      await logVaultEvent({
        eventType: 'VERIFICATION_ATTEMPT',
        status: 'REJECTED',
        metadata: {
          action: 'API_AUTH_FAILED',
          keySnippet: extractedKey.slice(0, 8) + '...',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Ignore vault log failure during auth check
    }

    return {
      valid: false,
      error: 'Invalid or revoked API Key.',
      statusCode: 401,
    };
  }

  return {
    valid: true,
    keyId: matchedClient.id,
    clientName: matchedClient.name,
  };
}
