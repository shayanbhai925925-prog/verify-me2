/**
 * Perceptual Hash (pHash) implementation using Discrete Cosine Transform (DCT)
 * Produces a 64-bit hexadecimal perceptual hash (16 hex chars) from an image file.
 * Returns null if the file is a video, unsupported format, or cannot be decoded.
 */

export async function calculatePHash(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
        return null; // Perceptual hashing is only applicable to visual image files
    }

    try {
        // Read file as ArrayBuffer and create an ImageBitmap or HTMLImageElement
        const img = await createImageElement(file);
        const size = 32;

        // Create an offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        // Draw and scale image to 32x32
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;

        // Convert RGB to 32x32 grayscale luminance matrix
        const grayMatrix: number[][] = [];
        for (let y = 0; y < size; y++) {
            const row: number[] = [];
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                // ITU-R BT.601 standard luminance formula
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                row.push(lum);
            }
            grayMatrix.push(row);
        }

        // Compute 2D Discrete Cosine Transform (DCT)
        const dctMatrix = applyDCT(grayMatrix, size);

        // Extract top-left 8x8 low frequency coefficients (excluding [0,0] DC term)
        const lowFreq: number[] = [];
        for (let u = 0; u < 8; u++) {
            for (let v = 0; v < 8; v++) {
                if (u === 0 && v === 0) continue; // Skip DC component
                lowFreq.push(dctMatrix[u][v]);
            }
        }

        // Calculate median of 8x8 low frequencies
        const sorted = [...lowFreq].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];

        // Construct 64-bit binary hash string
        let binaryHash = '';
        for (let u = 0; u < 8; u++) {
            for (let v = 0; v < 8; v++) {
                if (u === 0 && v === 0) {
                    binaryHash += '1';
                } else {
                    binaryHash += dctMatrix[u][v] >= median ? '1' : '0';
                }
            }
        }

        // Convert 64-bit binary string into 16-character hexadecimal string
        let hexHash = '';
        for (let i = 0; i < 64; i += 4) {
            const nibble = binaryHash.substring(i, i + 4);
            hexHash += parseInt(nibble, 2).toString(16);
        }

        return hexHash;
    } catch (err) {
        console.warn('Perceptual hash computation notice:', err);
        return null;
    }
}

function createImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
}

function applyDCT(matrix: number[][], N: number): number[][] {
    const dct: number[][] = [];
    for (let u = 0; u < N; u++) {
        dct[u] = [];
        for (let v = 0; v < N; v++) {
            let sum = 0;
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    sum += matrix[i][j] *
                        Math.cos(((2 * i + 1) * u * Math.PI) / (2 * N)) *
                        Math.cos(((2 * j + 1) * v * Math.PI) / (2 * N));
                }
            }
            const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
            const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
            dct[u][v] = (1 / Math.sqrt(2 * N)) * cu * cv * sum;
        }
    }
    return dct;
}
