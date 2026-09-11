import { Resend } from 'resend';
import { PermissionOperation, OPERATION_LABELS } from './permissionTypes';

// Dynamic configuration reader
function getResendConfig() {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const resend = apiKey ? new Resend(apiKey) : null;
    const emailFrom = process.env.EMAIL_FROM?.trim() || 'VerifyMe <onboarding@resend.dev>';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
    return { resend, emailFrom, appUrl, hasKey: !!apiKey };
}

// In-memory deduplication cache to prevent duplicate dispatches in rapid succession
const sentNotifications = new Map<string, number>();
const DEDUPE_TTL_MS = 60 * 1000; // 1 minute window

function isDuplicate(key: string): boolean {
    const now = Date.now();
    const lastSent = sentNotifications.get(key);
    if (lastSent && now - lastSent < DEDUPE_TTL_MS) {
        return true;
    }
    sentNotifications.set(key, now);
    return false;
}

export interface CreatorNotificationParams {
    creatorEmail?: string | null;
    creatorId: string;
    mediaTitle: string;
    requestId: string;
    requesterName: string;
    requesterEmail: string;
    requesterPurpose: string;
    operation: PermissionOperation;
}

export interface RequesterDecisionParams {
    requesterEmail: string;
    mediaTitle: string;
    requestId: string;
    operation: PermissionOperation;
    decision: 'APPROVED' | 'DENIED';
    decisionNote?: string;
    resolvedAt?: string;
}

export interface EmailDispatchResult {
    success: boolean;
    id?: string;
    reason?: string;
    error?: string;
}

/**
 * Dispatches an email notification to the media creator when a new PENDING request is submitted.
 * Non-blocking: Failures will never throw errors or interrupt API handlers.
 */
export async function notifyCreatorOfPermissionRequest(
    params: CreatorNotificationParams
): Promise<EmailDispatchResult> {
    const {
        creatorEmail,
        creatorId,
        mediaTitle,
        requestId,
        requesterName,
        requesterEmail,
        requesterPurpose,
        operation,
    } = params;

    const { resend, emailFrom, appUrl } = getResendConfig();

    const dedupeKey = `creator_req_${requestId}`;
    if (isDuplicate(dedupeKey)) {
        console.log(`[EmailService] Skipping duplicate creator notification for request ${requestId}`);
        return { success: true, reason: 'deduplicated' };
    }

    if (!resend) {
        console.log(
            `[EmailService] RESEND_API_KEY is not configured. Creator notification skipped for request ${requestId} (Target creator: ${creatorEmail || creatorId}).`
        );
        return { success: false, reason: 'RESEND_API_KEY not configured' };
    }

    const recipient = creatorEmail?.trim();
    if (!recipient || !recipient.includes('@')) {
        console.log(
            `[EmailService] No valid creator email address available for creatorId ${creatorId}. Notification skipped.`
        );
        return { success: false, reason: 'No valid creator email address' };
    }

    const opMeta = OPERATION_LABELS[operation];
    const opLabel = opMeta?.label || operation;
    const dashboardUrl = `${appUrl}/`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Permission Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 20px 24px; color: #ffffff;">
            <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #38bdf8;">VerifyMe Network</div>
            <h1 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 700;">Action Required: New Permission Request</h1>
        </div>

        <!-- Body -->
        <div style="padding: 24px;">
            <p style="margin-top: 0; font-size: 14px; line-height: 1.5; color: #334155;">
                A new usage authorization request has been submitted for your protected media asset <strong>${mediaTitle}</strong>.
            </p>

            <!-- Details Card -->
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Requested Rights:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${opLabel}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Media Asset:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${mediaTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Requester:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${requesterName} (${requesterEmail})</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Stated Purpose:</td>
                        <td style="padding: 6px 0; color: #334155; font-style: italic;">"${requesterPurpose}"</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Request ID:</td>
                        <td style="padding: 6px 0; font-family: monospace; color: #64748b; font-size: 11px;">${requestId}</td>
                    </tr>
                </table>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                    Review Request in Dashboard
                </a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                Log in to your VerifyMe Creator Dashboard to approve, deny, or add license terms.
            </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding: 14px 24px; background-color: #fafafa; font-size: 11px; color: #94a3b8; text-align: center;">
            VerifyMe Cryptographic Provenance &amp; Permission Network
        </div>
    </div>
</body>
</html>
    `;

    const textContent = `
VerifyMe Network: Action Required: New Permission Request

A new usage authorization request has been submitted for your protected media asset "${mediaTitle}".

Requested Rights: ${opLabel}
Requester: ${requesterName} (${requesterEmail})
Stated Purpose: "${requesterPurpose}"
Request ID: ${requestId}

Review & Decide in your Creator Dashboard:
${dashboardUrl}
    `.trim();

    try {
        const response = await resend.emails.send({
            from: emailFrom,
            to: recipient,
            subject: `[VerifyMe] Action Required: Permission Request for "${mediaTitle}"`,
            html: htmlContent,
            text: textContent,
        });

        console.log(`[EmailService] Creator notification sent successfully to ${recipient} (ID: ${response.data?.id})`);
        return { success: true, id: response.data?.id };
    } catch (err: any) {
        console.error(`[EmailService] Failed to send creator notification email to ${recipient}:`, err?.message || err);
        return { success: false, error: err?.message || 'Failed to send email' };
    }
}

/**
 * Dispatches an email notification to the requester when a creator APPROVES or DENIES their request.
 * Non-blocking: Failures will never throw errors or interrupt API handlers.
 */
export async function notifyRequesterOfDecision(
    params: RequesterDecisionParams
): Promise<EmailDispatchResult> {
    const {
        requesterEmail,
        mediaTitle,
        requestId,
        operation,
        decision,
        decisionNote,
        resolvedAt,
    } = params;

    const { resend, emailFrom } = getResendConfig();

    const dedupeKey = `requester_dec_${requestId}_${decision}`;
    if (isDuplicate(dedupeKey)) {
        console.log(`[EmailService] Skipping duplicate requester notification for request ${requestId}`);
        return { success: true, reason: 'deduplicated' };
    }

    if (!resend) {
        console.log(
            `[EmailService] RESEND_API_KEY is not configured. Requester notification skipped for request ${requestId} (${decision}).`
        );
        return { success: false, reason: 'RESEND_API_KEY not configured' };
    }

    const recipient = requesterEmail?.trim();
    if (!recipient || !recipient.includes('@')) {
        console.log(`[EmailService] No valid requester email provided for request ${requestId}. Notification skipped.`);
        return { success: false, reason: 'No valid requester email address' };
    }

    const isApproved = decision === 'APPROVED';
    const opMeta = OPERATION_LABELS[operation];
    const opLabel = opMeta?.label || operation;
    const dateStr = resolvedAt ? new Date(resolvedAt).toUTCString() : new Date().toUTCString();

    const statusBadgeColor = isApproved ? '#16a34a' : '#e11d48';
    const statusBgColor = isApproved ? '#f0fdf4' : '#fff1f2';
    const statusBorderColor = isApproved ? '#bbf7d0' : '#fecdd3';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Permission Request ${decision}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 20px 24px; color: #ffffff;">
            <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #38bdf8;">VerifyMe Network</div>
            <h1 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 700;">
                Permission Request ${isApproved ? 'Approved ✓' : 'Denied ✕'}
            </h1>
        </div>

        <!-- Body -->
        <div style="padding: 24px;">
            <!-- Status Badge Box -->
            <div style="background-color: ${statusBgColor}; border: 1px solid ${statusBorderColor}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <div style="display: inline-block; font-size: 12px; font-weight: 800; text-transform: uppercase; color: ${statusBadgeColor}; letter-spacing: 0.05em;">
                    Status: ${decision}
                </div>
                <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 600; color: #1e293b;">
                    ${
                        isApproved
                            ? `The creator has granted authorization for "${opLabel}".`
                            : `The creator has denied the request for "${opLabel}".`
                    }
                </p>
            </div>

            <!-- Details Card -->
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Media Asset:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${mediaTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Operation:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${opLabel}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Creator Note:</td>
                        <td style="padding: 6px 0; color: #334155; font-style: italic;">
                            "${decisionNote || (isApproved ? 'Authorization granted.' : 'Request declined.')}"
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Resolved At:</td>
                        <td style="padding: 6px 0; color: #334155;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Request ID:</td>
                        <td style="padding: 6px 0; font-family: monospace; color: #64748b; font-size: 11px;">${requestId}</td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
                This decision is recorded in the VerifyMe Permission Ledger. Keep this email for your licensing and compliance records.
            </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding: 14px 24px; background-color: #fafafa; font-size: 11px; color: #94a3b8; text-align: center;">
            VerifyMe Cryptographic Provenance &amp; Permission Network
        </div>
    </div>
</body>
</html>
    `;

    const textContent = `
VerifyMe Network: Permission Request ${decision}

Target Asset: ${mediaTitle}
Operation: ${opLabel}
Decision: ${decision}
Creator Note: "${decisionNote || (isApproved ? 'Authorization granted.' : 'Request declined.')}"
Resolved At: ${dateStr}
Request ID: ${requestId}

This decision is recorded in the VerifyMe Permission Ledger. Keep this record for compliance.
    `.trim();

    try {
        const response = await resend.emails.send({
            from: emailFrom,
            to: recipient,
            subject: `[VerifyMe] Permission Request ${decision}: "${mediaTitle}"`,
            html: htmlContent,
            text: textContent,
        });

        console.log(`[EmailService] Requester notification sent successfully to ${recipient} (ID: ${response.data?.id})`);
        return { success: true, id: response.data?.id };
    } catch (err: any) {
        console.error(`[EmailService] Failed to send requester notification email to ${recipient}:`, err?.message || err);
        return { success: false, error: err?.message || 'Failed to send email' };
    }
}
