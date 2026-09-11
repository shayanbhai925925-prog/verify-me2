import { createServerSupabaseClient } from '../src/lib/supabaseServer';

async function checkColumns() {
  const db = createServerSupabaseClient();
  
  // Query PostgreSQL information schema via RPC / raw query if available,
  // or introspect via an existing media record
  const { data: mediaRow } = await db.from('media').select('id').limit(1);

  if (!mediaRow || mediaRow.length === 0) {
    console.log('No media record found to test insertion.');
    return;
  }

  const testMediaId = mediaRow[0].id;

  // Insert an empty payload using a valid foreign key to see what columns are required
  const { error } = await db.from('media_policies').insert({
    media_id: testMediaId
  } as any);

  if (error) {
    console.log('Postgres response:', error.message);
  } else {
    // Read back the row we just inserted to inspect all column keys
    const { data: inserted } = await db
      .from('media_policies')
      .select('*')
      .eq('media_id', testMediaId)
      .limit(1);

    if (inserted && inserted.length > 0) {
      console.log('Columns in media_policies:', Object.keys(inserted[0]));
      // Clean up test entry
      await db.from('media_policies').delete().eq('media_id', testMediaId);
    }
  }
}

checkColumns();
