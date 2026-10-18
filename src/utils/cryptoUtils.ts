/**
 * Cryptographic helpers for Staff Authentication using standard Web Crypto API (crypto.subtle).
 * SHA-256 with per-user unique random salt.
 */

export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Web Cryptography API (crypto.subtle) is unavailable in this environment.');
}

export async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  if (!password || !salt || !storedHash) return false;
  try {
    const computed = await hashPassword(password, salt);
    return computed === storedHash;
  } catch (e) {
    console.error('Password verification error:', e);
    return false;
  }
}
