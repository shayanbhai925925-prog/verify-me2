import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = createServerSupabaseClient();

    const [mediaRes, policyRes, vaultRes] = await Promise.all([
      db.from('media').select('*').eq('id', id).single(),
      db.from('media_policies').select('*').eq('media_id', id).maybeSingle(),
      db.from('evidence_vault').select('*').eq('media_id', id).order('created_at', { ascending: false })
    ]);

    if (mediaRes.error || !mediaRes.data) {
      return NextResponse.json({ error: 'Asset not found in VerifyMe registry' }, { status: 404 });
    }

    return NextResponse.json({
      passport: {
        identity: {
          id: mediaRes.data.id,
          title: mediaRes.data.title,
          sha256: mediaRes.data.sha256,
          phash: mediaRes.data.phash,
          createdAt: mediaRes.data.created_at,
          c2paStatus: mediaRes.data.c2pa_status || 'verified'
        },
        policies: policyRes.data || {
          ai_editing: 'deny',
          commercial_use: 'deny',
          ai_training: 'deny'
        },
        timeline: vaultRes.data || []
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Passport query failed' }, { status: 500 });
  }
}
