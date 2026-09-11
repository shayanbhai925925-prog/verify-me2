# VerifyMe Developer API & SDK Documentation

The **VerifyMe Public Developer API & SDK** provides external AI platforms, generative studios, and developer tools with cryptographic verification, real-time copyright authorization, media provenance tracking, and tamper-evident ledger audits.

> ### Implemented Capabilities
> The following features are fully operational in this release:
> - **SHA-256 deduplication** — cryptographic fingerprint checked on every registration
> - **DCT-based perceptual hashing (pHash)** — 64-bit visual fingerprint resistant to resizing, re-encoding, and light modifications
> - **Bounded Hamming distance derivative detection** — scans up to 5,000 registered records with a configurable bit-distance threshold
> - **HMAC-SHA256 signed permission tokens** — cryptographically bound to a specific media asset and set of permitted operations
> - **Tamper-evident Evidence Vault** — SHA-256 hash-chain audit log; all events are linked and chain integrity is verifiable
> - **Creator permission workflows** — policy evaluation (allow / deny / require approval) with email notification via Resend
> - **Signed webhooks** — HMAC-SHA256 signatures with replay-attack tolerance window
>
> ### Not Yet Available
> - **AI / Deepfake detection** — the Python microservice (`ai_service/`) provides the integration architecture but currently operates as a development stub. No machine learning model is loaded; the `/api/detect` proxy endpoint returns a placeholder response until a model is integrated.

---

## 1. Authentication

All public `/api/v1/*` endpoints require authentication using an API key. 
You can pass your API key via either header:

```http
X-API-Key: vm_live_your_api_key_here
```
*or*
```http
Authorization: Bearer vm_live_your_api_key_here
```

### Environment Configuration
Configure authorized keys on your VerifyMe instance using the `VERIFYME_API_KEYS` environment variable:
```bash
VERIFYME_API_KEYS="vm_live_abc123:OpenAI,vm_live_xyz789:Midjourney,vm_live_dev_test_key:Development"
```

---

## 2. API Endpoints

### 2.1 Media Ownership & Authenticity Verification
Verifies whether an image or video asset has been registered on the VerifyMe network, checking SHA-256 integrity and perceptual hash (pHash) visual derivatives.

- **Endpoint**: `POST /api/v1/media/verify`
- **Content-Type**: `multipart/form-data` or `application/json`

#### Request (Multipart File Upload)
```bash
curl -X POST https://api.verifyme.io/api/v1/media/verify \
  -H "X-API-Key: vm_live_dev_test_key" \
  -F "file=@artwork.jpg"
```

#### Request (Hash Query)
```bash
curl -X POST https://api.verifyme.io/api/v1/media/verify \
  -H "X-API-Key: vm_live_dev_test_key" \
  -H "Content-Type: application/json" \
  -d '{
    "sha256": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
    "phash": "a5c29496695b2d1c",
    "fileName": "artwork.jpg"
  }'
```

#### Response
```json
{
  "verified": true,
  "client": "VerifyMe Development Client",
  "query": {
    "fileName": "artwork.jpg",
    "sha256": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
    "phash": "a5c29496695b2d1c"
  },
  "ownership": {
    "isRegistered": true,
    "mediaId": "34c38d22-1d54-4f51-b0db-fc2f1a6c4b21",
    "fileName": "artwork.jpg",
    "creatorId": "usr_912838120",
    "registeredAt": "2026-08-30T14:20:00.000Z"
  },
  "matches": [
    {
      "mediaId": "34c38d22-1d54-4f51-b0db-fc2f1a6c4b21",
      "fileName": "artwork.jpg",
      "creatorId": "usr_912838120",
      "hammingDistance": 0,
      "confidence": 100
    }
  ]
}
```

---

### 2.2 Check Operation Permission
Queries the creator's saved governance policy to determine whether an AI operation is pre-authorized.

- **Endpoint**: `GET /api/v1/permissions/check` or `POST /api/v1/permissions/check`
- **Supported Operations**:
  - `ai_editing`: Inpainting, generative fill, style editing
  - `face_swapping`: Facial identity modification or morphing
  - `image_to_video`: Camera animation or video synthesis
  - `style_transfer`: Aesthetic LoRA training or remixing
  - `commercial_use`: Monetized or advertising deployment
  - `redistribution`: Syndication or third-party re-hosting
  - `ai_training`: Foundation model dataset inclusion

#### Request
```bash
curl -X GET "https://api.verifyme.io/api/v1/permissions/check?mediaId=34c38d22-1d54-4f51-b0db-fc2f1a6c4b21&operation=ai_editing" \
  -H "X-API-Key: vm_live_dev_test_key"
```

#### Response
```json
{
  "mediaId": "34c38d22-1d54-4f51-b0db-fc2f1a6c4b21",
  "fileName": "artwork.jpg",
  "creatorId": "usr_912838120",
  "operation": "ai_editing",
  "status": "REQUIRES_PERMISSION",
  "policyAction": "require_approval",
  "requiresManualRequest": true,
  "message": "Operation 'AI Editing & Inpainting' requires creator approval. Submit a request via POST /api/v1/permissions/request."
}
```

---

### 2.3 Request Operation Permission
Submits a formal permission request to the creator's inbox and queues notification dispatch. If the creator's policy was set to `allow`, a cryptographic token is automatically issued immediately.

- **Endpoint**: `POST /api/v1/permissions/request`

#### Request
```bash
curl -X POST https://api.verifyme.io/api/v1/permissions/request \
  -H "X-API-Key: vm_live_dev_test_key" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaId": "34c38d22-1d54-4f51-b0db-fc2f1a6c4b21",
    "operation": "ai_editing",
    "requesterName": "Studio GenAI",
    "requesterEmail": "licensing@studiogenai.com",
    "requesterPurpose": "Generative background replacement for editorial article."
  }'
```

#### Response (Pending Approval)
```json
{
  "success": true,
  "authorized": false,
  "status": "PENDING",
  "message": "Operation 'AI Editing & Inpainting' requires creator permission. Request submitted to creator's queue.",
  "requestId": "req_1788894120_abc123",
  "mediaId": "34c38d22-1d54-4f51-b0db-fc2f1a6c4b21",
  "mediaTitle": "artwork.jpg",
  "operation": "ai_editing",
  "token": null
}
```

---

### 2.4 Validate Authorization Token
Performs strict, multi-step cryptographic verification of a VerifyMe authorization token (`pm_auth_...`).

- **Endpoint**: `POST /api/v1/tokens/validate`

#### Validation Checks:
1. **Cryptographic Tamper Check**: Re-computes HMAC-SHA256 digital signature.
2. **Expiration Check**: Validates token expiration timestamp.
3. **Database Revocation Check**: Confirms token status has not been revoked in `auth_tokens`.
4. **Media Binding Check**: Confirms token was issued for the specific target media.
5. **Operation Authorization Check**: Confirms requested operation is in the token's permitted operations list.

#### Response Codes:
- `VALID`: Token is fully authentic, unexpired, and permitted.
- `EXPIRED`: Token validity period has lapsed.
- `REVOKED`: Creator has manually revoked the token.
- `INVALID_SIGNATURE`: Cryptographic signature mismatch (forged or altered payload).
- `INVALID_MEDIA`: Token is not valid for the supplied media ID.
- `OPERATION_NOT_PERMITTED`: Token was not granted permission for the requested operation.

#### Request
```bash
curl -X POST https://api.verifyme.io/api/v1/tokens/validate \
  -H "X-API-Key: vm_live_dev_test_key" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "pm_auth_eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOiJ0b2tfMTIzIiwibWlkIjoiMzRjMzhkMjIifQ.sig...",
    "mediaId": "34c38d22-1d54-4f51-b0db-fc2f1a6c4b21",
    "operation": "ai_editing"
  }'
```

#### Response
```json
{
  "valid": true,
  "code": "VALID",
  "reason": "Token is cryptographically valid, active, and authorized.",
  "mediaId": "34c38d22-1d54-4f51-b0db-fc2f1a6c4b21",
  "creatorId": "usr_912838120",
  "requesterApp": "Studio GenAI",
  "permissions": ["ai_editing"],
  "expiresAt": "2026-08-30T16:20:00.000Z"
}
```

---

### 2.5 Verify Authenticity Certificate
Independently verifies a signed VerifyMe cryptographic certificate file (`.json`) including HMAC-SHA256 signature integrity and Evidence Vault hash-chain audit.

> **Note:** The Evidence Vault is a **tamper-evident cryptographic audit log**. Each event is linked via a SHA-256 hash chain, making modifications detectable. It is not a blockchain or distributed immutable ledger — events are stored in a managed database and chain integrity can be verified end-to-end via this endpoint.

- **Endpoint**: `POST /api/v1/certificates/verify`

#### Request
```bash
curl -X POST https://api.verifyme.io/api/v1/certificates/verify \
  -H "X-API-Key: vm_live_dev_test_key" \
  -H "Content-Type: application/json" \
  -d @certificate.json
```

#### Response
```json
{
  "valid": true,
  "client": "VerifyMe Development Client",
  "asset": {
    "id": "34c38d22-1d54-4f51-b0db-fc2f1a6c4b21",
    "fileName": "artwork.jpg",
    "fileSize": 1048576,
    "registeredAt": "2026-08-30T14:20:00.000Z"
  },
  "provenance": {
    "issuedAt": "2026-08-30T15:00:00.000Z",
    "network": "ProtectMedia Tamper-Evident Audit Network",
    "auditEventsCount": 4,
    "chainIntegrity": {
      "valid": true,
      "chainLength": 4,
      "details": "All 4 vault events passed cryptographic SHA-256 hash-chain verification. (Tamper-evident audit log — not a distributed blockchain.)"
    }
  }
}
```

---

## 3. Webhooks & Notifications

VerifyMe dispatches real-time webhooks for critical events.

### Webhook Signature Verification
Every webhook includes an HMAC-SHA256 signature header:
```http
X-VerifyMe-Signature: t=1788894120,v1=4f3a8b291c9...
X-VerifyMe-Event: new_permission_request
```

#### Verification Example (Node.js)
```javascript
import crypto from 'crypto';

function verifyVerifyMeWebhook(payloadRawString, signatureHeader, secret) {
  const parts = signatureHeader.split(',');
  let timestamp = null;
  let signature = null;

  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === 't') timestamp = v;
    if (k === 'v1') signature = v;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadRawString}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
```

---

## 4. TypeScript SDK (`@verifyme/sdk`)

```typescript
import { VerifyMeClient } from '@/lib/sdk/VerifyMeClient';

const client = new VerifyMeClient({
  baseUrl: 'https://api.verifyme.io',
  apiKey: 'vm_live_your_key_here',
});

// 1. Verify media
const result = await client.verifyMedia({ sha256: '4a5e1e...' });

// 2. Check permission
const perm = await client.checkPermission('media_123', 'ai_editing');

// 3. Request permission
if (perm.requiresManualRequest) {
  const req = await client.requestPermission({
    mediaId: 'media_123',
    operation: 'ai_editing',
    requesterName: 'My AI Studio',
  });
}

// 4. Validate token
const validation = await client.validateToken('pm_auth_...', {
  mediaId: 'media_123',
  operation: 'ai_editing',
});

if (validation.valid) {
  console.log('Operation is cryptographically authorized!');
}
```
