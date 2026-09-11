/**
 * VerifyMe Public Developer SDK (@verifyme/sdk)
 * Allows external AI platforms, generators, and services to easily verify media authenticity,
 * check operation permissions, request permission, validate tokens, and verify certificates.
 */

export interface VerifyMeClientConfig {
  baseUrl?: string;
  apiKey?: string;
}

export interface VerificationResult {
  verified: boolean;
  client?: string;
  query?: {
    fileName?: string;
    sha256?: string | null;
    phash?: string | null;
  };
  ownership: {
    isRegistered: boolean;
    mediaId?: string;
    fileName?: string;
    creatorId?: string;
    registeredAt?: string;
    message?: string;
  };
  matches: Array<{
    mediaId: string;
    fileName: string;
    creatorId: string;
    hammingDistance: number;
    confidence: number;
    registeredAt?: string;
  }>;
}

export interface PermissionCheckResult {
  mediaId: string;
  fileName: string;
  creatorId: string;
  operation: string;
  status: 'ALLOWED' | 'DENIED' | 'REQUIRES_PERMISSION';
  policyAction: 'allow' | 'deny' | 'require_approval';
  requiresManualRequest: boolean;
  message: string;
  availablePolicies?: Record<string, string>;
}

export interface RequestPermissionParams {
  mediaId: string;
  operation: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterPurpose?: string;
}

export interface RequestPermissionResult {
  success: boolean;
  authorized: boolean;
  status: 'PENDING' | 'AUTO_APPROVED' | 'AUTO_DENIED' | 'APPROVED' | 'DENIED';
  message: string;
  requestId: string;
  mediaId: string;
  mediaTitle: string;
  operation: string;
  token?: string | null;
  tokenExpiresAt?: string | null;
}

export interface TokenValidationResult {
  valid: boolean;
  code: 'VALID' | 'EXPIRED' | 'REVOKED' | 'INVALID_SIGNATURE' | 'INVALID_MEDIA' | 'OPERATION_NOT_PERMITTED' | string;
  reason: string;
  mediaId?: string;
  creatorId?: string;
  requesterApp?: string;
  permissions?: string[] | Record<string, boolean>;
  expiresAt?: string;
  payload?: any;
}

export interface CertificateVerificationResult {
  valid: boolean;
  reason?: string;
  client?: string;
  asset?: {
    id?: string;
    fileName?: string;
    fileSize?: number;
    mediaType?: string;
    registeredAt?: string;
    integrity?: {
      sha256?: string;
      perceptualHash64?: string;
    };
  };
  provenance?: {
    issuedAt?: string;
    network?: string;
    ledgerAnchor?: string;
    auditEventsCount?: number;
    chainIntegrity?: {
      valid: boolean;
      chainLength: number;
      details?: string;
    };
  };
}

export class VerifyMeClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: VerifyMeClientConfig | string = '') {
    if (typeof config === 'string') {
      this.baseUrl = config;
    } else {
      this.baseUrl = config.baseUrl || '';
      this.apiKey = config.apiKey;
    }
  }

  private getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = { ...extraHeaders };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  /**
   * 1. Verify Media Ownership & Authenticity
   * Can accept a File, Blob, Buffer, or hash dictionary { sha256, phash }.
   */
  async verifyMedia(
    input: File | Blob | { sha256?: string; phash?: string; fileName?: string }
  ): Promise<VerificationResult> {
    if ('sha256' in input || 'phash' in input) {
      const res = await fetch(`${this.baseUrl}/api/v1/media/verify`, {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `Media verification failed (${res.status})`);
      }
      return res.json();
    } else {
      const formData = new FormData();
      formData.append('file', input as Blob);

      const res = await fetch(`${this.baseUrl}/api/v1/media/verify`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `Media verification failed (${res.status})`);
      }
      return res.json();
    }
  }

  /**
   * 2. Check Operation Permission
   * Checks whether an operation (e.g. ai_editing, ai_training, commercial_use) is permitted.
   */
  async checkPermission(mediaId: string, operation: string): Promise<PermissionCheckResult> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/permissions/check?mediaId=${encodeURIComponent(mediaId)}&operation=${encodeURIComponent(operation)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Permission check failed (${res.status})`);
    }

    return res.json();
  }

  /**
   * 3. Request Operation Permission
   * Requests creator permission for an operation.
   */
  async requestPermission(params: RequestPermissionParams): Promise<RequestPermissionResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/permissions/request`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Permission request failed (${res.status})`);
    }

    return res.json();
  }

  /**
   * 4. Validate Cryptographic Authorization Token
   * Checks cryptographic validity, expiration, revocation, media binding, and operation authorization.
   */
  async validateToken(
    token: string,
    options?: { mediaId?: string; operation?: string }
  ): Promise<TokenValidationResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/tokens/validate`, {
      method: 'POST',
      headers: this.getHeaders({
        'Content-Type': 'application/json',
        'X-VerifyMe-Token': token,
      }),
      body: JSON.stringify({
        token,
        mediaId: options?.mediaId,
        operation: options?.operation,
      }),
    });

    return res.json();
  }

  /**
   * 5. Verify Cryptographic Authenticity Certificate
   * Validates certificate digital signature and ledger vault chain integrity.
   */
  async verifyCertificate(certificate: Record<string, any>): Promise<CertificateVerificationResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/certificates/verify`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(certificate),
    });

    return res.json();
  }

  /**
   * 6. Legacy Token Issuance (for backward compatibility)
   */
  async issueToken(
    mediaId: string,
    requesterApp: string,
    durationMinutes = 60,
    permissions?: Record<string, boolean>
  ) {
    const res = await fetch(`${this.baseUrl}/api/tokens`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ mediaId, requesterApp, durationMinutes, permissions }),
    });

    if (!res.ok) throw new Error(`Token issuance error: ${res.statusText}`);
    return res.json();
  }
}

export const verifyMeClient = new VerifyMeClient();