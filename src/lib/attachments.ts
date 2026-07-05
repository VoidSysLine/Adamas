import * as FileSystem from 'expo-file-system/legacy';
import { decrypt, encrypt, type CipherBlob } from '@/crypto/cipher';

/**
 * Encrypted image attachments (ID cards, passports, …).
 *
 * Each attachment is stored as its own file under documentDirectory,
 * AES-encrypted with the vault key — only lightweight metadata lives inside
 * the vault blob (which is a single AsyncStorage value and must stay small).
 * Photos are recompressed on import, which also strips EXIF/GPS metadata.
 */

export const MAX_ATTACHMENTS_PER_ENTRY = 2;
/** Hard ceiling for the base64 payload (~1.5 MB image). */
export const MAX_BASE64_LENGTH = 2_000_000;

const DIR = `${FileSystem.documentDirectory}attachments/`;

function pathFor(id: string): string {
  return `${DIR}${id}.enc`;
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

/** Encrypts and persists a base64 image; caller stores the returned nothing — id comes from caller. */
export async function saveAttachment(id: string, base64: string, vaultKey: string): Promise<void> {
  await ensureDir();
  await FileSystem.writeAsStringAsync(pathFor(id), JSON.stringify(encrypt(base64, vaultKey)));
}

/** Decrypts an attachment back to base64. Throws if missing or tampered. */
export async function loadAttachment(id: string, vaultKey: string): Promise<string> {
  const raw = await FileSystem.readAsStringAsync(pathFor(id));
  return decrypt(JSON.parse(raw) as CipherBlob, vaultKey);
}

export async function deleteAttachment(id: string): Promise<void> {
  await FileSystem.deleteAsync(pathFor(id), { idempotent: true });
}

/** Wipes every stored attachment (vault erase). */
export async function deleteAllAttachments(): Promise<void> {
  await FileSystem.deleteAsync(DIR, { idempotent: true });
}
