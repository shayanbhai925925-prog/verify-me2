import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { decidePermissionRequest } from '@/lib/permissionService';
import { notifyRequesterOfDecision } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { requestId, mediaId, decision, decisionNote } = body;

        if (!requestId || !mediaId || !decision) {
            return NextResponse.json(
                { error: 'Missing required parameters: requestId, mediaId, and decision.' },
                { status: 400 }
            );
        }

        if (decision !== 'APPROVED' && decision !== 'DENIED') {
            return NextResponse.json(
                { error: "Invalid decision. Must be 'APPROVED' or 'DENIED'." },
                { status: 400 }
            );
        }

        // 1. Authenticate the request via Supabase Auth Session
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

        let authenticatedUserId: string | null = null;

        if (token) {
            const { data: userData, error: userErr } = await supabase.auth.getUser(token);
            if (!userErr && userData?.user) {
                authenticatedUserId = userData.user.id;
            }
        }

        // Fallback: check session from cookie if available or allow explicit verified server context
        if (!authenticatedUserId && body.creatorId) {
            // Check if current active session user matches
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user && sessionData.session.user.id === body.creatorId) {
                authenticatedUserId = sessionData.session.user.id;
            }
        }

        // If no authenticated identity could be verified
        if (!authenticatedUserId) {
            return NextResponse.json(
                { error: 'Unauthorized: A valid authenticated creator session is required.' },
                { status: 401 }
            );
        }

        // 2. Load associated media from Supabase and verify ownership
        const { data: media, error: mediaErr } = await supabase
            .from('media')
            .select('id, user_id')
            .eq('id', mediaId)
            .single();

        if (mediaErr || !media) {
            return NextResponse.json(
                { error: 'Media asset not found in database.' },
                { status: 404 }
            );
        }

        // 3. Strict ownership boundary check
        if (media.user_id !== authenticatedUserId) {
            return NextResponse.json(
                { error: 'Forbidden: You do not own this media asset and cannot decide permission requests for it.' },
                { status: 403 }
            );
        }

        // 4. Resolve the decision in Supabase
        const updatedRequest = await decidePermissionRequest({
            requestId,
            mediaId,
            creatorId: authenticatedUserId,
            decision,
            decisionNote,
        });

        // 5. Asynchronously notify requester of creator's decision without blocking response
        if (updatedRequest && updatedRequest.requester_email) {
            notifyRequesterOfDecision({
                requesterEmail: updatedRequest.requester_email,
                mediaTitle: updatedRequest.media_title,
                requestId: updatedRequest.id,
                operation: updatedRequest.operation,
                decision: updatedRequest.status as 'APPROVED' | 'DENIED',
                decisionNote: updatedRequest.decision_note,
                resolvedAt: updatedRequest.resolved_at || undefined,
            }).catch((emailErr) => {
                console.warn('[EmailService] Background requester notification failed:', emailErr);
            });
        }

        return NextResponse.json({
            success: true,
            request: updatedRequest,
        });
    } catch (err: any) {
        console.error('Error in /api/permissions/decision route:', err);
        return NextResponse.json(
            { error: err.message || 'Internal server error during permission decision.' },
            { status: 500 }
        );
    }
}
