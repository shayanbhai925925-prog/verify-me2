const MAX_IMAGE_SIZE_MB = 15;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, WEBP, and GIF are supported.',
    };
  }

  const sizeInMB = file.size / (1024 * 1024);
  if (sizeInMB > MAX_IMAGE_SIZE_MB) {
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${MAX_IMAGE_SIZE_MB}MB.`,
    };
  }

  return { valid: true };
}

export function isValidAuthTokenFormat(token: string): boolean {
  return typeof token === 'string' && token.startsWith('pm_auth_') && token.length === 56;
}