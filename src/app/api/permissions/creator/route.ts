import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getCreatorRequests } from '@/lib/permissionService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        let creatorId = searchParams.get('creatorId');

        // Check if authorization token is provided
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

        if (token) {
            const { data: userData, error: userErr } = await supabase.auth.getUser(token);
            if (!userErr && userData?.user) {
                creatorId = userData.user.id;
            }
        }

        if (!creatorId) {
            return NextResponse.json(
                { error: 'Missing required parameter: creatorId or active session authorization token.' },
                { status: 400 }
            );
        }

        const requests = await getCreatorRequests(creatorId);

        return NextResponse.json({
            success: true,
            requests,
        });
    } catch (err: any) {
        console.error('Error in /api/permissions/creator route:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to fetch creator permission requests.' },
            { status: 500 }
        );
    }
}
