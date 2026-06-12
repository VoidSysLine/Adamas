import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

/**
 * Adamas encryption layer (Expo-Go compatible, no native modules).
 *
 * - Vault payload: AES-256-CBC with a random IV, authenticated with
 *   HMAC-SHA-256 (encrypt-then-MAC, independent sub-keys).
 * - Key derivation: an iterated SHA-512 hash chain executed by the *native*
 *   expo-crypto digest. Pure-JS PBKDF2 (crypto-js) is an order of magnitude
 *   slower per iteration in Hermes, so the chain achieves a far higher
 *   effective work factor within the same unlock latency budget.
 * - The iteration count is persisted alongside the salt so it can be raised
 *   for new vaults without breaking existing ones.
 */

export const KDF_VERSION = 1;
export const KDF_ITERATIONS = 10_000;

export interface CipherBlob {
  /** Hex IV (16 bytes). */
  iv: string;
  /** Base64 ciphertext. */
  ct: string;
  /** Hex HMAC-SHA256 over iv + ct. */
  mac: string;
}

export function randomHex(byteCount: number): string {
  return Array.from(Crypto.getRandomBytes(byteCount))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Derives a 256-bit key (hex) from a master password and salt. */
export async function deriveKeyHex(
  password: string,
  saltHex: string,
  iterations: number = KDF_ITERATIONS,
): Promise<string> {
  let digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    `adamas/kdf/v${KDF_VERSION}|${saltHex}|${password}`,
  );
  for (let i = 0; i < iterations; i++) {
    digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA512,
      `${digest}|${password}|${i}`,
    );
  }
  return digest.slice(0, 64);
}

function subKey(keyHex: string, purpose: 'enc' | 'mac'): CryptoJS.lib.WordArray {
  return CryptoJS.SHA256(`adamas/${purpose}|${keyHex}`);
}

export function encrypt(plaintext: string, keyHex: string): CipherBlob {
  const iv = randomHex(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, subKey(keyHex, 'enc'), {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ct = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  const mac = CryptoJS.HmacSHA256(iv + ct, subKey(keyHex, 'mac')).toString(CryptoJS.enc.Hex);
  return { iv, ct, mac };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Throws on MAC mismatch (tampering or wrong key). */
export function decrypt(blob: CipherBlob, keyHex: string): string {
  const expectedMac = CryptoJS.HmacSHA256(blob.iv + blob.ct, subKey(keyHex, 'mac')).toString(
    CryptoJS.enc.Hex,
  );
  if (!timingSafeEqualHex(expectedMac, blob.mac)) {
    throw new Error('MAC verification failed');
  }
  const params = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(blob.ct),
  });
  const plaintext = CryptoJS.AES.decrypt(params, subKey(keyHex, 'enc'), {
    iv: CryptoJS.enc.Hex.parse(blob.iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8);
  if (!plaintext) throw new Error('Decryption produced empty plaintext');
  return plaintext;
}
