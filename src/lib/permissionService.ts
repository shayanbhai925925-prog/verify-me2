import { supabase } from './supabaseClient';
import { logVaultEvent } from './evidenceVault';
import { dispatchNotification } from './notificationEngine';
import {
    PermissionOperation,
    PermissionRequest,
    PermissionRequestStatus,
    parseStoredPolicy,
    parseStoredRequests,
    serializePolicy,
    GranularPolicyState,
    OPERATION_LABELS,
} from './permissionTypes';

export interface SubmitRequestParams {
    mediaId: string;
    operation: PermissionOperation;
    requesterId?: string | null;
    requesterName: string;
    requesterEmail: string;
    requesterPurpose: string;
}

export interface DecisionParams {
    requestId: string;
    mediaId: string;
    creatorId: string; // Authenticated user ID verified by server
    decision: 'APPROVED' | 'DENIED';
    decisionNote?: string;
}

/**
 * Evaluates and records an operation request for a media asset based on the creator's saved policy in Supabase.
 * Single source of truth: Supabase database.
 */
export async function requestPermission(params: SubmitRequestParams): Promise<{
    authorized: boolean;
    status: PermissionRequestStatus;
    request: PermissionRequest;
    message: string;
}> {
    const { mediaId, operation, requesterId, requesterName, requesterEmail, requesterPurpose } = params;

    // 1. Fetch target media and creator policies from Supabase
    const { data: media, error: mediaErr } = await supabase
        .from('media')
        .select(`
            id,
            file_name,
            sha256_hash,
            user_id,
            media_policies (
                id,
                allow_ai_training,
                allow_ai_editing,
                allow_face_swap,
                allow_commercial,
                updated_at
            )
        `)
        .eq('id', mediaId)
        .single();

    if (mediaErr || !media) {
        throw new Error(`Media asset not found for ID: ${mediaId}`);
    }

    const creatorId = media.user_id;
    const policyRecord = media.media_policies?.[0] || null;
    const policy: GranularPolicyState = parseStoredPolicy(policyRecord);
    const existingRequests: PermissionRequest[] = parseStoredRequests(policyRecord);
    const action = policy[operation] || 'require_approval';

    // 2. Evaluate Policy
    let status: PermissionRequestStatus = 'PENDING';
    let authorized = false;
    let resolvedAt: string | null = null;
    let decisionNote = '';
    let message = '';

    const opLabel = OPERATION_LABELS[operation]?.label || operation;

    if (action === 'allow') {
        status = 'AUTO_APPROVED';
        authorized = true;
        resolvedAt = new Date().toISOString();
        decisionNote = `Automatically authorized per creator policy (Allow for ${opLabel})`;
        message = `Operation '${opLabel}' has been automatically authorized by the creator's policy.`;
    } else if (action === 'deny') {
        status = 'AUTO_DENIED';
        authorized = false;
        resolvedAt = new Date().toISOString();
        decisionNote = `Automatically rejected per creator policy (Deny for ${opLabel})`;
        message = `Operation '${opLabel}' is prohibited by the creator's policy.`;
    } else {
        status = 'PENDING';
        authorized = false;
        resolvedAt = null;
        decisionNote = `Pending creator manual review`;
        message = `Operation '${opLabel}' requires creator permission. Request submitted to creator's queue.`;
    }

    // 3. Construct Request Record
    const newRequest: PermissionRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        media_id: media.id,
        media_title: media.file_name,
        media_hash: media.sha256_hash,
        creator_id: creatorId,
        requester_name: requesterName || 'Anonymous Requester',
        requester_email: requesterEmail || 'unspecified@client.local',
        requester_purpose: requesterPurpose || 'Standard permission request',
        operation,
        status,
        created_at: new Date().toISOString(),
        resolved_at: resolvedAt,
        decision_note: decisionNote,
    };

    // 4. Persist to Supabase
    // A. Attempt insert into public.permission_requests table
    try {
        const { data: insertedRow } = await supabase
            .from('permission_requests')
            .insert({
                media_id: media.id,
                creator_id: creatorId,
                requester_id: requesterId || null,
                requester_name: newRequest.requester_name,
                requester_email: newRequest.requester_email,
                requester_purpose: newRequest.requester_purpose,
                operation: newRequest.operation,
                status: newRequest.status,
                created_at: newRequest.created_at,
                resolved_at: newRequest.resolved_at,
                creator_decision: newRequest.status,
                decision_note: newRequest.decision_note,
            })
            .select()
            .single();

        if (insertedRow?.id) {
            newRequest.id = insertedRow.id;
        }
    } catch {
        // Continue to sync with policy record
    }

    // B. Also sync to media_policies metadata for guaranteed relational durability
    try {
        const updatedRequests = [newRequest, ...existingRequests];
        const serialized = serializePolicy(policy, updatedRequests);
        await supabase
            .from('media_policies')
            .update({
                ...serialized,
                updated_at: new Date().toISOString(),
            })
            .eq('media_id', media.id);
    } catch (saveErr) {
        console.warn('Notice: Failed to sync requests to media_policies:', saveErr);
    }

    // 5. Evidence Vault logging
    try {
        await logVaultEvent({
            mediaId: media.id,
            eventType: 'PERMISSION_REQUESTED',
            status: authorized ? 'APPROVED' : status === 'AUTO_DENIED' ? 'REJECTED' : 'FLAGGED',
            metadata: {
                requestId: newRequest.id,
                operation,
                requesterName: newRequest.requester_name,
                requesterEmail: newRequest.requester_email,
                status,
            },
        });
    } catch (vErr) {
        console.warn('[PermissionService] Vault logging skipped:', vErr);
    }

    // 6. Notification Dispatch
    try {
        const notifEvent =
            status === 'AUTO_APPROVED'
                ? 'permission_approved'
                : status === 'AUTO_DENIED'
                ? 'permission_denied'
                : 'new_permission_request';

        await dispatchNotification({
            eventType: notifEvent,
            idempotencyKey: `perm_req_${newRequest.id}_${status}`,
            mediaId: media.id,
            creatorId,
            recipientEmail: status === 'PENDING' ? undefined : requesterEmail,
            title: `Permission ${status}: ${opLabel}`,
            message,
            data: {
                requestId: newRequest.id,
                mediaId: media.id,
                mediaTitle: media.file_name,
                operation,
                status,
                requesterName,
                requesterEmail,
            },
        });
    } catch (nErr) {
        console.warn('[PermissionService] Notification dispatch skipped:', nErr);
    }

    return {
        authorized,
        status,
        request: newRequest,
        message,
    };
}

/**
 * Retrieves all permission requests across all media owned by the authenticated creator from Supabase.
 */
export async function getCreatorRequests(creatorId: string): Promise<PermissionRequest[]> {
    try {
        // 1. Try querying public.permission_requests table directly
        const { data: dbRequests, error: dbErr } = await supabase
            .from('permission_requests')
            .select('*')
            .eq('creator_id', creatorId)
            .order('created_at', { ascending: false });

        if (!dbErr && dbRequests && dbRequests.length > 0) {
            return dbRequests.map((r: any) => ({
                id: r.id,
                media_id: r.media_id,
                media_title: r.media_title || 'Protected Asset',
                media_hash: r.media_hash || '',
                creator_id: r.creator_id,
                requester_name: r.requester_name || 'Anonymous',
                requester_email: r.requester_email || '',
                requester_purpose: r.requester_purpose || '',
                operation: r.operation as PermissionOperation,
                status: r.status as PermissionRequestStatus,
                created_at: r.created_at,
                resolved_at: r.resolved_at,
                decision_note: r.decision_note || '',
            }));
        }

        // 2. Query media joined with media_policies in Supabase
        const { data: mediaList, error } = await supabase
            .from('media')
            .select(`
                id,
                file_name,
                sha256_hash,
                media_policies (
                    allow_ai_editing
                )
            `)
            .eq('user_id', creatorId);

        if (error || !mediaList) return [];

        const allRequests: PermissionRequest[] = [];
        for (const item of mediaList) {
            const policyRecord = item.media_policies?.[0];
            const requests = parseStoredRequests(policyRecord);
            allRequests.push(...requests);
        }

        // Sort descending by created_at
        return allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
        console.error('Error fetching creator requests from Supabase:', err);
        return [];
    }
}

/**
 * Records an authenticated creator's approval or denial on a pending permission request in Supabase.
 */
export async function decidePermissionRequest(params: DecisionParams): Promise<PermissionRequest> {
    const { requestId, mediaId, creatorId, decision, decisionNote } = params;

    // 1. Verify media ownership from Supabase
    const { data: media, error: mediaErr } = await supabase
        .from('media')
        .select(`
            id,
            file_name,
            sha256_hash,
            user_id,
            media_policies (
                allow_ai_editing,
                allow_ai_training,
                allow_face_swap,
                allow_commercial
            )
        `)
        .eq('id', mediaId)
        .single();

    if (mediaErr || !media) {
        throw new Error('Media asset not found in database.');
    }

    if (media.user_id !== creatorId) {
        throw new Error('Unauthorized: You do not have permission to decide requests for this media asset.');
    }

    const policyRecord = media.media_policies?.[0];
    const policy = parseStoredPolicy(policyRecord);
    const requests = parseStoredRequests(policyRecord);
    const targetIdx = requests.findIndex((r) => r.id === requestId);

    let updatedRequest: PermissionRequest;

    if (targetIdx !== -1) {
        const targetRequest = requests[targetIdx];

        // Prevent reverting resolved requests back to PENDING
        if (
            (targetRequest.status === 'APPROVED' ||
                targetRequest.status === 'DENIED' ||
                targetRequest.status === 'AUTO_APPROVED' ||
                targetRequest.status === 'AUTO_DENIED') &&
            (decision as any) === 'PENDING'
        ) {
            throw new Error('Invalid transition: Cannot revert a resolved permission request back to PENDING.');
        }

        updatedRequest = {
            ...targetRequest,
            status: decision,
            resolved_at: new Date().toISOString(),
            decision_note: decisionNote || `Manually ${decision === 'APPROVED' ? 'Approved' : 'Denied'} by creator`,
        };
        requests[targetIdx] = updatedRequest;
    } else {
        // If not in parsed array, construct updated object
        updatedRequest = {
            id: requestId,
            media_id: mediaId,
            media_title: media.file_name,
            media_hash: media.sha256_hash,
            creator_id: creatorId,
            requester_name: 'Requester',
            requester_email: '',
            requester_purpose: '',
            operation: 'image_to_video',
            status: decision,
            created_at: new Date().toISOString(),
            resolved_at: new Date().toISOString(),
            decision_note: decisionNote || `Manually ${decision === 'APPROVED' ? 'Approved' : 'Denied'} by creator`,
        };
        requests.unshift(updatedRequest);
    }

    // 2. Persist decision to Supabase
    // A. Update public.permission_requests table if exists
    try {
        await supabase
            .from('permission_requests')
            .update({
                status: decision,
                resolved_at: updatedRequest.resolved_at,
                creator_decision: decision,
                decision_note: updatedRequest.decision_note,
            })
            .eq('id', requestId);
    } catch {
        // Fall through to policy record update
    }

    // B. Update media_policies in Supabase
    const serialized = serializePolicy(policy, requests);
    await supabase
        .from('media_policies')
        .update({
            ...serialized,
            updated_at: new Date().toISOString(),
        })
        .eq('media_id', mediaId);

    // 3. Evidence Vault logging
    try {
        await logVaultEvent({
            mediaId: media.id,
            eventType: 'PERMISSION_DECIDED',
            status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
            metadata: {
                requestId: updatedRequest.id,
                decision,
                creatorId,
                decisionNote: updatedRequest.decision_note,
            },
        });
    } catch (vErr) {
        console.warn('[PermissionService] Decision vault log skipped:', vErr);
    }

    // 4. Notification Dispatch
    try {
        const notifEvent = decision === 'APPROVED' ? 'permission_approved' : 'permission_denied';
        await dispatchNotification({
            eventType: notifEvent,
            idempotencyKey: `perm_decision_${updatedRequest.id}_${decision}`,
            mediaId: media.id,
            creatorId,
            recipientEmail: updatedRequest.requester_email,
            title: `Permission ${decision}: ${updatedRequest.operation}`,
            message: `Your request to perform '${updatedRequest.operation}' on '${media.file_name}' has been ${decision.toLowerCase()} by the creator.`,
            data: {
                requestId: updatedRequest.id,
                mediaId: media.id,
                mediaTitle: media.file_name,
                decision,
                decisionNote: updatedRequest.decision_note,
            },
        });
    } catch (nErr) {
        console.warn('[PermissionService] Decision notification skipped:', nErr);
    }

    return updatedRequest;
}
