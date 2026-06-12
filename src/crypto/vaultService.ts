import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import type { VaultDocument } from '@/types/vault';
import { decrypt, deriveKeyHex, encrypt, KDF_ITERATIONS, randomHex, type CipherBlob } from './cipher';

/**
 * Key & storage architecture:
 *
 *   master password ──KDF──▶ wrapping key ──unwraps──▶ vault key (random 256-bit)
 *                                                          │
 *                                          AES-256 + HMAC  ▼
 *   AsyncStorage['adamas.vault']  =  encrypted VaultDocument
 *
 * SecureStore (device keychain/keystore) holds only small key material:
 *   - 'adamas.meta'   salt, iterations, wrapped vault key  (~400 B)
 *   - 'adamas.biokey' raw vault key for biometric unlock, gated by
 *                     expo-local-authentication (optional)
 *
 * The vault key never changes when the master password does — changing the
 * password only re-wraps it. The decrypted vault and the vault key live in
 * memory only while the app is unlocked.
 */

const META_KEY = 'adamas.meta';
const BIO_KEY = 'adamas.biokey';
const VAULT_KEY = 'adamas.vault';

interface VaultMeta {
  version: 1;
  saltHex: string;
  iterations: number;
  wrappedKey: CipherBlob;
  createdAt: number;
}

const EMPTY_DOC: VaultDocument = { version: 1, entries: [] };

export async function vaultExists(): Promise<boolean> {
  return (await SecureStore.getItemAsync(META_KEY)) !== null;
}

export async function createVault(masterPassword: string): Promise<{ vaultKey: string; doc: VaultDocument }> {
  const saltHex = randomHex(16);
  const wrappingKey = await deriveKeyHex(masterPassword, saltHex, KDF_ITERATIONS);
  const vaultKey = randomHex(32);

  const meta: VaultMeta = {
    version: 1,
    saltHex,
    iterations: KDF_ITERATIONS,
    wrappedKey: encrypt(vaultKey, wrappingKey),
    createdAt: Date.now(),
  };
  await SecureStore.setItemAsync(META_KEY, JSON.stringify(meta));
  await SecureStore.setItemAsync(BIO_KEY, vaultKey);
  await saveVault(EMPTY_DOC, vaultKey);
  return { vaultKey, doc: EMPTY_DOC };
}

/** Resolves to null when the password is wrong. */
export async function unlockWithPassword(
  masterPassword: string,
): Promise<{ vaultKey: string; doc: VaultDocument } | null> {
  const rawMeta = await SecureStore.getItemAsync(META_KEY);
  if (!rawMeta) return null;
  const meta: VaultMeta = JSON.parse(rawMeta);
  const wrappingKey = await deriveKeyHex(masterPassword, meta.saltHex, meta.iterations);
  let vaultKey: string;
  try {
    vaultKey = decrypt(meta.wrappedKey, wrappingKey);
  } catch {
    return null;
  }
  return { vaultKey, doc: await loadVault(vaultKey) };
}

export async function biometricsAvailable(): Promise<boolean> {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

/** Resolves to null when biometric auth fails or is unavailable. */
export async function unlockWithBiometrics(
  promptMessage: string,
): Promise<{ vaultKey: string; doc: VaultDocument } | null> {
  if (!(await biometricsAvailable())) return null;
  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  if (!result.success) return null;
  const vaultKey = await SecureStore.getItemAsync(BIO_KEY);
  if (!vaultKey) return null;
  try {
    return { vaultKey, doc: await loadVault(vaultKey) };
  } catch {
    return null;
  }
}

async function loadVault(vaultKey: string): Promise<VaultDocument> {
  const raw = await AsyncStorage.getItem(VAULT_KEY);
  if (!raw) return EMPTY_DOC;
  return JSON.parse(decrypt(JSON.parse(raw) as CipherBlob, vaultKey)) as VaultDocument;
}

export async function saveVault(doc: VaultDocument, vaultKey: string): Promise<void> {
  await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(encrypt(JSON.stringify(doc), vaultKey)));
}

export async function eraseVault(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(META_KEY),
    SecureStore.deleteItemAsync(BIO_KEY),
    AsyncStorage.removeItem(VAULT_KEY),
  ]);
}
