import {
  decrypt,
  deriveKeyHex,
  encrypt,
  KDF_ITERATIONS,
  randomHex,
  type CipherBlob,
} from '@/crypto/cipher';
import type { VaultEntry } from '@/types/vault';

/**
 * Portable, password-encrypted vault backup.
 *
 * The whole vault — entries plus the decrypted attachment/avatar payloads — is
 * serialized and AES-256 + HMAC encrypted under a key derived from a backup
 * password (independent of the master password's salt). The resulting `.adamas`
 * file is self-contained and can be restored on any device. Since it holds
 * every secret in one decryptable blob, the user is warned to store it safely.
 */

export const BACKUP_FORMAT = 'adamas-backup';

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: 1;
  createdAt: number;
  saltHex: string;
  iterations: number;
  payload: CipherBlob;
}

export interface BackupPayload {
  entries: VaultEntry[];
  /** attachmentId → base64 image data. */
  attachments: Record<string, string>;
}

export async function createBackup(
  password: string,
  payload: BackupPayload,
  now: number,
): Promise<string> {
  const saltHex = randomHex(16);
  const key = await deriveKeyHex(password, saltHex, KDF_ITERATIONS);
  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: 1,
    createdAt: now,
    saltHex,
    iterations: KDF_ITERATIONS,
    payload: encrypt(JSON.stringify(payload), key),
  };
  return JSON.stringify(envelope);
}

export type BackupReadResult =
  | { ok: true; payload: BackupPayload; createdAt: number }
  | { ok: false; reason: 'invalid' | 'wrongPassword' };

export async function readBackup(password: string, json: string): Promise<BackupReadResult> {
  let envelope: BackupEnvelope;
  try {
    envelope = JSON.parse(json) as BackupEnvelope;
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (envelope?.format !== BACKUP_FORMAT || !envelope.payload || !envelope.saltHex) {
    return { ok: false, reason: 'invalid' };
  }
  const key = await deriveKeyHex(password, envelope.saltHex, envelope.iterations);
  try {
    const parsed = JSON.parse(decrypt(envelope.payload, key)) as BackupPayload;
    if (!Array.isArray(parsed.entries)) return { ok: false, reason: 'invalid' };
    return {
      ok: true,
      payload: { entries: parsed.entries, attachments: parsed.attachments ?? {} },
      createdAt: envelope.createdAt,
    };
  } catch {
    // MAC mismatch → wrong password (or a tampered file).
    return { ok: false, reason: 'wrongPassword' };
  }
}
