import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('mediaId');

    let query = supabase
      .from('evidence_vault')
      .select('id, media_id, event_type, status, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(25);

    if (mediaId) {
      query = query.eq('media_id', mediaId);
    }

    const { data, error } = await query;

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Evidence vault fetch error:', error.message);
      } else {
        console.error('[API_ERROR]', { endpoint: '/api/vault', code: error.code || 'INTERNAL_ERROR' });
      }
      return NextResponse.json({ error: 'An unexpected database error occurred.' }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Vault retrieval error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}