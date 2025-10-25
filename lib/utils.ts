import { createHash } from 'crypto';

/**
 * Generate a consistent hash from a Spareroom URL
 * This is used to create dashboard URLs that anyone can access
 */
export function hashSpareroomUrl(url: string): string {
  return createHash('sha256')
    .update(url.toLowerCase().trim())
    .digest('hex')
    .substring(0, 16);
}
