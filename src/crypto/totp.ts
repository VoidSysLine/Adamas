import CryptoJS from 'crypto-js';

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s period) — pure JS, Expo-Go safe. */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_PERIOD = 30;

function base32ToBytes(seed: string): number[] | null {
  const clean = seed.toUpperCase().replace(/[\s=-]/g, '');
  if (!clean) return null;
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return bytes.length > 0 ? bytes : null;
}

function bytesToWordArray(bytes: number[]): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] = (words[i >>> 2] || 0) | (bytes[i] << (24 - (i % 4) * 8));
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

export function isValidTotpSeed(seed: string): boolean {
  return base32ToBytes(seed) !== null;
}

/** Returns the current 6-digit code, or null for an invalid seed. */
export function totpCode(seed: string, nowMs: number = Date.now()): string | null {
  const keyBytes = base32ToBytes(seed);
  if (!keyBytes) return null;

  const counter = Math.floor(nowMs / 1000 / TOTP_PERIOD);
  const counterBytes: number[] = new Array(8).fill(0);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }

  const hmac = CryptoJS.HmacSHA1(bytesToWordArray(counterBytes), bytesToWordArray(keyBytes));
  const digest: number[] = [];
  for (let i = 0; i < hmac.sigBytes; i++) {
    digest.push((hmac.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
  }

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}

/** Seconds until the current code rolls over. */
export function totpSecondsRemaining(nowMs: number = Date.now()): number {
  return TOTP_PERIOD - (Math.floor(nowMs / 1000) % TOTP_PERIOD);
}
