import crypto from 'crypto';
import sharp from 'sharp';
import { runSecurityAgent } from '../src/lib/securityAgent';
import { createServerSupabaseClient } from '../src/lib/supabaseServer';
import { generatePHash } from '../src/lib/derivativeEngine';

async function runComprehensiveTests() {
  console.log('--- VerifyMe Diagnostic Suite ---\n');
  const db = createServerSupabaseClient();
  let passed = 0;
  let failed = 0;

  // Test 1: DB Connection
  try {
    const { error } = await db.from('media').select('id').limit(1);
    if (error) throw error;
    console.log('✔ [DB] Handshake & connection: PASS');
    passed++;
  } catch (err: any) {
    console.error('✘ [DB] Connection failed:', err.message);
    failed++;
  }

  // Test 2: Unregistered Fallback
  try {
    const unregisteredBuffer = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 50, g: 50, b: 50 } }
    }).png().toBuffer();

    const res = await runSecurityAgent({
      imageBuffer: unregisteredBuffer,
      operation: 'ai_editing',
      requesterApp: 'AutomatedSuite'
    });

    if (res.verdict === 'UNREGISTERED' && res.allowed === true) {
      console.log('✔ [SECURITY AGENT] Unregistered asset fallback: PASS');
      passed++;
    } else {
      throw new Error(`Expected UNREGISTERED, got: ${res.verdict}`);
    }
  } catch (err: any) {
    console.error('✘ [SECURITY AGENT] Unregistered check failed:', err.message);
    failed++;
  }

  // Retrieve valid user ID
  let validUserId: string | null = null;
  const { data: mediaSample } = await db.from('media').select('user_id').not('user_id', 'is', null).limit(1);
  if (mediaSample?.length && mediaSample[0].user_id) {
    validUserId = mediaSample[0].user_id;
  } else {
    const { data: authData } = await db.auth.admin.listUsers();
    if (authData?.users?.length) validUserId = authData.users[0].id;
  }

  // Test 3: Block Disallowed Edit
  let blockedMediaId: string | null = null;
  try {
    // Generate distinct buffer with random noise
    const blockedBuffer = await sharp(Buffer.from(
      `<svg width="32" height="32"><rect width="32" height="32" fill="#ff2200"/><circle cx="16" cy="16" r="10" fill="#000000"/></svg>`
    )).png().toBuffer();

    const blockedSha = crypto.createHash('sha256').update(blockedBuffer).digest('hex');
    const blockedPHash = await generatePHash(blockedBuffer);

    await db.from('media').delete().eq('sha256', blockedSha);

    const { data: mediaRow, error: mediaErr } = await db.from('media').insert({
      user_id: validUserId,
      file_name: 'test-block.png',
      storage_path: 'test/test-block.png',
      media_type: 'image/png',
      sha256: blockedSha,
      phash: blockedPHash
    }).select('id').single();

    if (mediaErr) throw mediaErr;
    blockedMediaId = mediaRow.id;

    await db.from('media_policies').delete().eq('media_id', blockedMediaId);
    await db.from('media_policies').insert({
      media_id: blockedMediaId,
      allow_ai_editing: false,
      allow_ai_training: false,
      allow_face_swap: false,
      allow_commercial: false
    });

    const res = await runSecurityAgent({
      imageBuffer: blockedBuffer,
      operation: 'ai_editing',
      requesterApp: 'AutomatedSuite'
    });

    if (res.verdict === 'DENIED' && res.allowed === false) {
      console.log('✔ [SECURITY AGENT] Block disallowed edit: PASS');
      passed++;
    } else {
      throw new Error(`Expected DENIED, got ${res.verdict}`);
    }
  } catch (err: any) {
    console.error('✘ [SECURITY AGENT] Block failed:', err.message);
    failed++;
  } finally {
    if (blockedMediaId) {
      await db.from('media_policies').delete().eq('media_id', blockedMediaId);
      await db.from('media').delete().eq('id', blockedMediaId);
    }
  }

  // Test 4: Allow Permitted Edit
  let allowedMediaId: string | null = null;
  try {
    // Distinct SVG pattern to prevent pHash collision
    const allowedBuffer = await sharp(Buffer.from(
      `<svg width="32" height="32"><rect width="32" height="32" fill="#00ff44"/><line x1="0" y1="0" x2="32" y2="32" stroke="#ffffff" stroke-width="4"/></svg>`
    )).png().toBuffer();

    const allowedSha = crypto.createHash('sha256').update(allowedBuffer).digest('hex');
    const allowedPHash = await generatePHash(allowedBuffer);

    await db.from('media').delete().eq('sha256', allowedSha);

    const { data: mediaRow, error: mediaErr } = await db.from('media').insert({
      user_id: validUserId,
      file_name: 'test-allow.png',
      storage_path: 'test/test-allow.png',
      media_type: 'image/png',
      sha256: allowedSha,
      phash: allowedPHash
    }).select('id').single();

    if (mediaErr) throw mediaErr;
    allowedMediaId = mediaRow.id;

    await db.from('media_policies').delete().eq('media_id', allowedMediaId);
    const { error: polErr } = await db.from('media_policies').insert({
      media_id: allowedMediaId,
      allow_ai_editing: true,
      allow_ai_training: false,
      allow_face_swap: false,
      allow_commercial: false
    });
    if (polErr) throw polErr;

    // Brief pause to allow the write to replicate
    await new Promise((resolve) => setTimeout(resolve, 300));

    const res = await runSecurityAgent({
      imageBuffer: allowedBuffer,
      operation: 'ai_editing',
      requesterApp: 'AutomatedSuite'
    });

    if (res.verdict === 'ALLOWED' && res.allowed === true && res.token) {
      console.log('✔ [SECURITY AGENT] Allow permitted edit & sign token: PASS');
      passed++;
    } else {
      throw new Error(`Expected ALLOWED, got: ${res.verdict} (allowed: ${res.allowed})`);
    }
  } catch (err: any) {
    console.error('✘ [SECURITY AGENT] Allow failed:', err.message);
    failed++;
  } finally {
    if (allowedMediaId) {
      await db.from('media_policies').delete().eq('media_id', allowedMediaId);
      await db.from('media').delete().eq('id', allowedMediaId);
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runComprehensiveTests();