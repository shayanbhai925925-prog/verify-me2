import crypto from 'crypto';
import { Resend } from 'resend';
import { logVaultEvent } from './evidenceVault';

export type NotificationEventType =
  | 'new_permission_request'
  | 'permission_approved'
  | 'permission_denied'
  | 'token_issued'
  | 'token_revoked'
  | 'suspicious_derivative_detected'
  | 'verification_result';

export interface NotificationPayload {
  eventType: NotificationEventType;
  idempotencyKey?: string;
  mediaId?: string;
  creatorId?: string;
  recipientEmail?: string;
  subject?: string;
  title: string;
  message: string;
  data: Record<string, any>;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface NotificationResult {
  success: boolean;
  emailDispatched: boolean;
  emailProvider?: 'resend' | 'smtp' | 'console_mock';
  webhookDispatched: boolean;
  webhookStatus?: number;
  deduplicated?: boolean;
  details?: string;
  signature?: string;
}

// In-memory idempotency deduplication cache
const idempotencyStore = new Map<string, number>();
const DEDUPE_TTL_MS = 60 * 1000; // 60 seconds

function checkAndSetIdempotency(key: string): boolean {
  const now = Date.now();
  const lastTime = idempotencyStore.get(key);
  if (lastTime && now - lastTime < DEDUPE_TTL_MS) {
    return true; // Is duplicate
  }
  idempotencyStore.set(key, now);
  // Cleanup old keys periodically
  if (idempotencyStore.size > 1000) {
    for (const [k, v] of idempotencyStore.entries()) {
      if (now - v >= DEDUPE_TTL_MS) idempotencyStore.delete(k);
    }
  }
  return false;
}

/**
 * Computes an HMAC-SHA256 signature for webhook verification.
 * Format: t=<timestamp>,v1=<hex_signature>
 */
export function generateWebhookSignature(payload: string, secret: string, timestamp: number): string {
  const signatureInput = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret).update(signatureInput).digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

/**
 * Verifies an incoming webhook signature using constant-time comparison.
 */
export function verifyWebhookSignature(payload: string, signatureHeader: string, secret: string, toleranceSeconds = 300): boolean {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(',');
  let timestampStr: string | null = null;
  let v1Sig: string | null = null;

  for (const part of parts) {
    const [key, val] = part.split('=');
    if (key === 't') timestampStr = val;
    if (key === 'v1') v1Sig = val;
  }

  if (!timestampStr || !v1Sig) return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Check tolerance against replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  const bufA = Buffer.from(v1Sig, 'hex');
  const bufB = Buffer.from(expectedSig, 'hex');

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Dispatches an email notification via configured provider (Resend, SMTP, or console mock fallback).
 */
async function sendEmailNotification(
  recipient: string,
  subject: string,
  bodyHtml: string,
  bodyText: string
): Promise<{ success: boolean; provider: 'resend' | 'smtp' | 'console_mock'; id?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim() || 'VerifyMe Security <onboarding@resend.dev>';

  // 1. Resend Provider
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to: recipient,
        subject,
        html: bodyHtml,
        text: bodyText,
      });

      if (error) {
        console.warn('[NotificationEngine] Resend API dispatch error:', error);
        return { success: false, provider: 'resend', error: error.message };
      }

      return { success: true, provider: 'resend', id: data?.id };
    } catch (err: any) {
      console.warn('[NotificationEngine] Resend client error:', err?.message || err);
      return { success: false, provider: 'resend', error: err?.message || 'Resend error' };
    }
  }

  // 2. Mock / Console Fallback (Ensures offline / development runs never fail)
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_MOCK_NOTIFICATIONS === 'true') {
    console.log(`\n================== [VERIFYME EMAIL NOTIFICATION] ==================`);
    console.log(`To: ${recipient}`);
    console.log(`From: ${emailFrom}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${bodyText}`);
    console.log(`===================================================================\n`);
    return { success: true, provider: 'console_mock', id: `mock_email_${Date.now()}` };
  }

  return { success: false, provider: 'console_mock', error: 'No email service credentials configured.' };
}

/**
 * Dispatches a webhook to the external endpoint with HMAC-SHA256 signature and 3x exponential backoff retries.
 */
async function sendWebhookWithRetry(
  url: string,
  secret: string,
  payload: Record<string, any>,
  maxRetries = 3
): Promise<{ success: boolean; status?: number; signature?: string; error?: string }> {
  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateWebhookSignature(payloadString, secret, timestamp);

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VerifyMe-Webhook-Dispatcher/2.0',
          'X-VerifyMe-Signature': signature,
          'X-VerifyMe-Event': payload.eventType || 'notification',
          'X-VerifyMe-Delivery-Attempt': String(attempt),
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return { success: true, status: res.status, signature };
      }

      lastError = `HTTP ${res.status}: ${res.statusText}`;

      // If client error (4xx except 429), do not retry
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        break;
      }
    } catch (err: any) {
      lastError = err?.message || 'Network error';
    }

    if (attempt < maxRetries) {
      // Exponential backoff: 100ms, 200ms, 400ms...
      const backoffDelay = Math.pow(2, attempt - 1) * 100;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, signature, error: lastError };
}

/**
 * Universal Notification Dispatcher
 * Handles all 7 events with idempotency, email dispatch, signed webhooks, and Evidence Vault auditing.
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const {
    eventType,
    idempotencyKey,
    mediaId,
    recipientEmail,
    subject = `VerifyMe Security Alert: ${payload.title}`,
    title,
    message,
    data,
    webhookUrl = process.env.WEBHOOK_URL,
    webhookSecret = process.env.WEBHOOK_SECRET || 'verifyme-webhook-default-secret',
  } = payload;

  // 1. Deduplication via idempotency check
  const dedupeKey = idempotencyKey || `${eventType}:${mediaId || 'none'}:${JSON.stringify(data)}`;
  if (checkAndSetIdempotency(dedupeKey)) {
    return {
      success: true,
      emailDispatched: false,
      webhookDispatched: false,
      deduplicated: true,
      details: `Skipped duplicate notification (idempotency key: ${dedupeKey}).`,
    };
  }

  let emailDispatched = false;
  let emailProvider: 'resend' | 'smtp' | 'console_mock' | undefined;
  let webhookDispatched = false;
  let webhookStatus: number | undefined;
  let signature: string | undefined;

  // 2. Email Notification Dispatch
  if (recipientEmail && recipientEmail.includes('@')) {
    const html = `
      <div style="font-family: monospace, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 24px; border-radius: 8px;">
        <h2 style="color: #38bdf8; margin-top: 0;">🛡️ VerifyMe Alert: ${title}</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">${message}</p>
        <div style="background-color: #1e293b; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #334155;">
          <h4 style="margin: 0 0 10px 0; color: #94a3b8; text-transform: uppercase; font-size: 11px;">Event Details</h4>
          <pre style="color: #38bdf8; margin: 0; font-size: 12px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
        </div>
        <p style="font-size: 11px; color: #64748b; margin-top: 24px;">VerifyMe Content Provenance & Rights Network</p>
      </div>
    `;

    const text = `VerifyMe Alert: ${title}\n\n${message}\n\nDetails:\n${JSON.stringify(data, null, 2)}`;
    const emailResult = await sendEmailNotification(recipientEmail, subject, html, text);
    emailDispatched = emailResult.success;
    emailProvider = emailResult.provider;
  }

  // 3. Webhook Dispatch
  if (webhookUrl) {
    const webhookPayload = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      eventType,
      timestamp: new Date().toISOString(),
      mediaId,
      title,
      message,
      data,
    };

    const webhookResult = await sendWebhookWithRetry(webhookUrl, webhookSecret, webhookPayload);
    webhookDispatched = webhookResult.success;
    webhookStatus = webhookResult.status;
    signature = webhookResult.signature;

    // Log webhook to Evidence Vault (non-blocking)
    try {
      await logVaultEvent({
        mediaId,
        eventType: 'WEBHOOK_DISPATCHED',
        status: webhookResult.success ? 'APPROVED' : 'FLAGGED',
        metadata: {
          notificationEvent: eventType,
          webhookUrl,
          webhookSuccess: webhookResult.success,
          httpStatus: webhookResult.status,
          signature: webhookResult.signature,
        },
      });
    } catch {
      // Ignore vault log failure
    }
  }

  // 4. Record event in Evidence Vault
  try {
    await logVaultEvent({
      mediaId,
      eventType: 'NOTIFICATION_DISPATCHED',
      status: 'APPROVED',
      metadata: {
        notificationEvent: eventType,
        recipientEmail: recipientEmail ? recipientEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined,
        emailDispatched,
        emailProvider,
        webhookDispatched,
      },
    });
  } catch (vaultErr) {
    console.warn('[NotificationEngine] Vault event record skipped:', vaultErr);
  }

  return {
    success: emailDispatched || webhookDispatched || (!recipientEmail && !webhookUrl),
    emailDispatched,
    emailProvider,
    webhookDispatched,
    webhookStatus,
    signature,
    details: 'Notification processed successfully.',
  };
}
