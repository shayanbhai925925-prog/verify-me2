/**
 * verify-derivatives.mjs
 *
 * Standalone smoke-test for the /api/derivatives/check perceptual-hashing
 * and indexing optimisations. Runs entirely in-process — no live server,
 * no database, no network required.
 *
 * Tests the three core scenarios:
 *   1. Exact duplicate   → fast-path (hammingDistance === 0, confidence === 100)
 *   2. Visual derivative → paginated Hamming scan (1 ≤ distance ≤ 10)
 *   3. Unrelated image   → bounded fallback (matchesFound === false)
 *
 * Usage:
 *   node scripts/verify-derivatives.mjs
 */

import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Inline pHash engine — mirrors src/lib/derivativeEngine.ts exactly so the
// test validates the same algorithm without needing tsx or path aliases.
// ---------------------------------------------------------------------------

/** 1-D DCT-II */
function dct1d(signal) {
  const N = signal.length;
  const result = new Array(N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += signal[n] * Math.cos((Math.PI / N) * (n + 0.5) * k);
    }
    result[k] = sum;
  }
  return result;
}

/** Generates a 64-bit DCT-based pHash binary string from a Buffer. */
async function generatePHash(buffer) {
  const DCT_SIZE = 32;
  const HASH_SIZE = 8;

  const { data } = await sharp(buffer)
    .resize(DCT_SIZE, DCT_SIZE, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Row pass
  const rowDct = [];
  for (let row = 0; row < DCT_SIZE; row++) {
    rowDct.push(dct1d(Array.from(data.subarray(row * DCT_SIZE, (row + 1) * DCT_SIZE))));
  }

  // Column pass
  const dct2d = Array.from({ length: DCT_SIZE }, () => new Array(DCT_SIZE).fill(0));
  for (let col = 0; col < DCT_SIZE; col++) {
    const column = rowDct.map((r) => r[col]);
    const colResult = dct1d(column);
    for (let row = 0; row < DCT_SIZE; row++) {
      dct2d[row][col] = colResult[row];
    }
  }

  // Top-left 8×8 low-frequency block
  const lowFreq = [];
  for (let u = 0; u < HASH_SIZE; u++) {
    for (let v = 0; v < HASH_SIZE; v++) {
      lowFreq.push(dct2d[u][v]);
    }
  }

  // Median threshold
  const sorted = [...lowFreq].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  return lowFreq.map((v) => (v >= median ? '1' : '0')).join('');
}

/** Hamming distance between two equal-length binary strings. */
function calculateHammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

// ---------------------------------------------------------------------------
// Inline route logic — mirrors the matching pipeline in
// src/app/api/derivatives/check/route.ts.
// The "database" is replaced by an in-memory array of fixture records.
// ---------------------------------------------------------------------------

const HAMMING_THRESHOLD = 10;
const HASH_BIT_LENGTH = 64;

/**
 * Simulate the route handler against an in-memory media registry.
 *
 * @param {Buffer} buffer          - Image buffer to check.
 * @param {Array}  registryRecords - Array of { id, file_name, phash, user_id }.
 * @returns {object} Response payload matching the real route's JSON shape.
 */
async function simulateDerivativesCheck(buffer, registryRecords) {
  const queryHash = await generatePHash(buffer);

  // 2a. Exact-match fast path
  const exactMatches = registryRecords.filter((r) => r.phash === queryHash);
  if (exactMatches.length > 0) {
    return {
      matchesFound: true,
      queryHash,
      matches: exactMatches.map((r) => ({
        mediaId: r.id,
        fileName: r.file_name,
        creatorId: r.user_id || '',
        hammingDistance: 0,
        confidence: 100,
      })),
      _path: 'exact',
    };
  }

  // 2b. Paginated Hamming scan (simulated — all records in one pass for tests)
  const PAGE_SIZE = 500;
  const MAX_SCAN_ROWS = 5000;
  const matches = [];
  const capped = registryRecords.slice(0, MAX_SCAN_ROWS);

  for (let offset = 0; offset < capped.length; offset += PAGE_SIZE) {
    const page = capped.slice(offset, offset + PAGE_SIZE);
    for (const record of page) {
      if (
        !record.phash ||
        typeof record.phash !== 'string' ||
        record.phash.length !== HASH_BIT_LENGTH
      ) continue;

      const distance = calculateHammingDistance(queryHash, record.phash);
      if (distance <= HAMMING_THRESHOLD) {
        const confidence = Math.round(
          ((HASH_BIT_LENGTH - distance) / HASH_BIT_LENGTH) * 100
        );
        matches.push({
          mediaId: record.id,
          fileName: record.file_name,
          creatorId: record.user_id || '',
          hammingDistance: distance,
          confidence,
        });
      }
    }
    if (matches.length > 0) break;
  }

  matches.sort((a, b) => a.hammingDistance - b.hammingDistance);

  return {
    matchesFound: matches.length > 0,
    queryHash,
    matches,
    _path: 'paginated',
  };
}

// ---------------------------------------------------------------------------
// Image fixture factory
// ---------------------------------------------------------------------------

/**
 * 128×128 multi-channel gradient PNG.
 * Uses spatially varying RGB values so the DCT low-frequency block has
 * meaningful variation — necessary for JPEG re-compression to produce a
 * Hamming distance in [1, 10] rather than 0 (flat image) or >10 (solid colour).
 */
async function makeGradientImage() {
  const width = 128;
  const height = 128;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      raw[idx]     = Math.round((x / width) * 200 + 30);           // R
      raw[idx + 1] = Math.round((y / height) * 180 + 20);          // G
      raw[idx + 2] = Math.round(((x + y) / (width + height)) * 160 + 40); // B
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

/**
 * Distinct synthetic image — solid mid-grey, visually unrelated to the gradient.
 * Chosen to produce a Hamming distance well above HAMMING_THRESHOLD (10)
 * vs. the gradient original.
 */
async function makeUnrelatedImage() {
  return sharp({
    create: { width: 128, height: 128, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .png()
    .toBuffer();
}

/**
 * Slight derivative: JPEG re-compression at quality 85.
 * Empirically produces hammingDistance ≈ 6 vs. the gradient original —
 * safely within [1, HAMMING_THRESHOLD].
 */
async function makeDerivative(sourceBuffer) {
  return sharp(sourceBuffer).jpeg({ quality: 85 }).toBuffer();
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`    ✓ ${label}`);
    passed++;
  } else {
    console.error(`    ✗ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function runTest(name, fn) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('─'.repeat(60));
  const start = Date.now();
  try {
    await fn();
  } catch (err) {
    console.error(`  THREW: ${err.message}`);
    failed++;
  }
  console.log(`  ⏱  ${Date.now() - start} ms`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  verify-derivatives.mjs — pHash smoke-test suite         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // ── Build fixtures ──────────────────────────────────────────────────────
  console.log('\nBuilding image fixtures…');
  const originalBuffer  = await makeGradientImage();
  const derivativeBuffer = await makeDerivative(originalBuffer);
  const unrelatedBuffer  = await makeUnrelatedImage();

  // Pre-compute the hash for the registered original so the registry fixture
  // is consistent with what the route would have stored.
  const originalHash = await generatePHash(originalBuffer);
  console.log(`  original pHash   : ${originalHash}`);
  console.log(`  original hash len: ${originalHash.length} bits`);

  // In-memory registry — one registered asset
  const registry = [
    { id: 'fixture-media-001', file_name: 'original.png', phash: originalHash, user_id: 'user-abc' },
  ];

  // ── TEST 1: Exact duplicate — fast-path ─────────────────────────────────
  await runTest('Exact Duplicate Check (Fast-Path)', async () => {
    const result = await simulateDerivativesCheck(originalBuffer, registry);

    console.log('  Payload:', JSON.stringify(result, null, 4).split('\n').map(l => '  ' + l).join('\n'));

    assert(result.matchesFound === true, 'matchesFound is true');
    assert(Array.isArray(result.matches) && result.matches.length > 0, 'matches array is non-empty');
    assert(result.matches[0].hammingDistance === 0, 'hammingDistance === 0 (exact match)');
    assert(result.matches[0].confidence === 100, 'confidence === 100');
    assert(result._path === 'exact', 'fast-path branch taken');
    assert(result.queryHash.length === 64, 'queryHash is 64 bits');
  });

  // ── TEST 2: Visual derivative — paginated Hamming scan ──────────────────
  await runTest('Visual Derivative Check (Paginated Hamming Scan)', async () => {
    const result = await simulateDerivativesCheck(derivativeBuffer, registry);

    console.log('  Payload:', JSON.stringify(result, null, 4).split('\n').map(l => '  ' + l).join('\n'));

    assert(result.matchesFound === true, 'matchesFound is true');
    assert(Array.isArray(result.matches) && result.matches.length > 0, 'matches array is non-empty');

    const dist = result.matches[0].hammingDistance;
    const conf = result.matches[0].confidence;
    assert(dist >= 1 && dist <= HAMMING_THRESHOLD, `hammingDistance in [1, ${HAMMING_THRESHOLD}] — got ${dist}`);

    const expectedConf = Math.round(((HASH_BIT_LENGTH - dist) / HASH_BIT_LENGTH) * 100);
    assert(conf === expectedConf, `confidence formula correct (expected ${expectedConf}, got ${conf})`);
    assert(result._path === 'paginated', 'paginated scan branch taken');
  });

  // ── TEST 3: Unrelated image — bounded fallback ──────────────────────────
  await runTest('Unrelated Image Check (Bounded Fallback)', async () => {
    const start = Date.now();
    const result = await simulateDerivativesCheck(unrelatedBuffer, registry);
    const elapsed = Date.now() - start;

    console.log('  Payload:', JSON.stringify(result, null, 4).split('\n').map(l => '  ' + l).join('\n'));

    assert(result.matchesFound === false, 'matchesFound is false');
    assert(Array.isArray(result.matches) && result.matches.length === 0, 'matches is []');
    assert(elapsed < 5000, `completed within 5 s (took ${elapsed} ms)`);
    assert(result._path === 'paginated', 'paginated scan branch taken (no match)');
  });

  // ── Additional unit assertions on the hash engine itself ────────────────
  await runTest('Hash Engine Unit Assertions', async () => {
    // Identical inputs must produce identical hashes
    const hashA = await generatePHash(originalBuffer);
    const hashB = await generatePHash(originalBuffer);
    assert(hashA === hashB, 'same buffer → same hash (deterministic)');

    // Hash length is always exactly 64
    assert(hashA.length === 64, 'hash length is exactly 64 bits');

    // Hash is a binary string (only '0' and '1')
    assert(/^[01]+$/.test(hashA), 'hash contains only 0 and 1 characters');

    // Unrelated images should have high Hamming distance
    const unrelatedHash = await generatePHash(unrelatedBuffer);
    const dist = calculateHammingDistance(originalHash, unrelatedHash);
    assert(dist > HAMMING_THRESHOLD, `unrelated images have distance > ${HAMMING_THRESHOLD} (got ${dist})`);

    // Hamming distance to self is always 0
    assert(calculateHammingDistance(hashA, hashA) === 0, 'self-distance is 0');

    // Mismatched length guard returns 64
    assert(calculateHammingDistance('0'.repeat(64), '0'.repeat(32)) === 64, 'mismatched length returns 64');
  });

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
