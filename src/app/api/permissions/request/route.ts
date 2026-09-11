import { NextRequest, NextResponse } from 'next/server';
import { requestPermission } from '@/lib/permissionService';
import { PermissionOperation } from '@/lib/permissionTypes';
import { notifyCreatorOfPermissionRequest } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { mediaId, operation, requesterName, requesterEmail, requesterPurpose } = body;

        if (!mediaId || !operation) {
            return NextResponse.json(
                { error: 'Missing required parameters: mediaId and operation.' },
                { status: 400 }
            );
        }

        const validOperations: PermissionOperation[] = [
            'ai_editing',
            'face_swapping',
            'image_to_video',
            'style_transfer',
            'commercial_use',
            'redistribution',
            'ai_training',
        ];

        if (!validOperations.includes(operation)) {
            return NextResponse.json(
                { error: `Invalid operation '${operation}'. Valid operations: ${validOperations.join(', ')}` },
                { status: 400 }
            );
        }

        const result = await requestPermission({
            mediaId,
            operation,
            requesterName: requesterName || 'Anonymous Requester',
            requesterEmail: requesterEmail || 'unspecified@client.local',
            requesterPurpose: requesterPurpose || 'Standard permission request',
        });

        // Trigger asynchronous email notification to creator if status is PENDING
        if (result.status === 'PENDING' && result.request) {
            notifyCreatorOfPermissionRequest({
                creatorEmail: body.creatorEmail || null,
                creatorId: result.request.creator_id,
                mediaTitle: result.request.media_title,
                requestId: result.request.id,
                requesterName: result.request.requester_name,
                requesterEmail: result.request.requester_email,
                requesterPurpose: result.request.requester_purpose,
                operation: result.request.operation,
            }).catch((emailErr) => {
                console.warn('[EmailService] Background creator notification failed:', emailErr);
            });
        }

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (err: any) {
        console.error('Error in /api/permissions/request route:', err);
        return NextResponse.json(
            { error: err.message || 'Internal server error during permission evaluation.' },
            { status: 500 }
        );
    }
}
