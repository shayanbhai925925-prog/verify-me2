import sharp from 'sharp';

/**
 * Generates a standard 64-bit DCT-based perceptual hash (pHash).
 *
 * Algorithm:
 *  1. Resize to 32×32 grayscale (captures structure without fine detail).
 *  2. Compute a full 2-D DCT-II over the 32×32 pixel matrix.
 *  3. Extract the top-left 8×8 block of low-frequency DCT coefficients.
 *  4. Compute the median of all 64 extracted coefficients.
 *  5. Produce a 64-bit binary string: '1' where coeff ≥ median, '0' otherwise.
 *
 * This is consistent between registration and derivative-check routes, so
 * Hamming distance comparisons are always apples-to-apples.
 *
 * Previously this function implemented average hash (aHash) — a simpler
 * mean-pixel comparison that is more sensitive to brightness shifts and
 * gives false positives/negatives for common image derivatives.
 */
export async function generatePHash(buffer: Buffer): Promise<string> {
  const DCT_SIZE = 32; // resize target before DCT
  const HASH_SIZE = 8; // low-frequency block side length → 8×8 = 64 bits

  // Step 1: resize to 32×32 single-channel (grayscale) pixels
  const { data } = await sharp(buffer)
    .resize(DCT_SIZE, DCT_SIZE, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Step 2: 2-D DCT-II  (separable row-then-column for O(2·N³) instead of O(N⁴))
  // Row pass
  const rowDct: number[][] = [];
  for (let row = 0; row < DCT_SIZE; row++) {
    rowDct.push(dct1d(Array.from(data.subarray(row * DCT_SIZE, (row + 1) * DCT_SIZE))));
  }

  // Column pass on the row-transformed matrix
  const dct2d: number[][] = Array.from({ length: DCT_SIZE }, () => new Array(DCT_SIZE).fill(0));
  for (let col = 0; col < DCT_SIZE; col++) {
    const column = rowDct.map((r) => r[col]);
    const colResult = dct1d(column);
    for (let row = 0; row < DCT_SIZE; row++) {
      dct2d[row][col] = colResult[row];
    }
  }

  // Step 3: extract top-left 8×8 low-frequency coefficients (64 values)
  const lowFreq: number[] = [];
  for (let u = 0; u < HASH_SIZE; u++) {
    for (let v = 0; v < HASH_SIZE; v++) {
      lowFreq.push(dct2d[u][v]);
    }
  }

  // Step 4: median of the 64 coefficients
  const sorted = [...lowFreq].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  // Step 5: threshold against median → 64-bit binary string
  return lowFreq.map((v) => (v >= median ? '1' : '0')).join('');
}

/**
 * 1-D DCT-II over an array of N real values.
 * Uses the standard orthonormal definition so the separable 2-D DCT
 * is simply two sequential 1-D passes (rows then columns).
 */
function dct1d(signal: number[]): number[] {
  const N = signal.length;
  const result = new Array<number>(N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += signal[n] * Math.cos((Math.PI / N) * (n + 0.5) * k);
    }
    result[k] = sum;
  }
  return result;
}

export function calculateHammingDistance(hash1: string, hash2: string): number {
  // If either hash is missing or lengths don't match, treat as completely dissimilar
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return 64;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }

  return distance;
}