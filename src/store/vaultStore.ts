import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import * as service from '@/crypto/vaultService';
import { fieldsOf } from '@/constants/schema';
import * as attachments from '@/lib/attachments';
import { createBackup, type BackupPayload } from '@/lib/backup';
import type { ImportedLogin } from '@/lib/importers/bitwarden';
import type {
  AttachmentMeta,
  CustomField,
  EntryDataMap,
  EntryKind,
  VaultEntry,
  VaultEntryOf,
} from '@/types/vault';

export type VaultStatus = 'loading' | 'none' | 'locked' | 'unlocked';

/** Days a soft-deleted entry stays in the trash before auto-purge. */
export const TRASH_RETENTION_DAYS = 30;

interface VaultState {
  status: VaultStatus;
  entries: VaultEntry[];
  /** Soft-deleted entries awaiting restore or auto-purge. */
  trash: VaultEntry[];
  /** In-memory only; wiped on lock. */
  vaultKey: string | null;

  initialize: () => Promise<void>;
  createVault: (masterPassword: string) => Promise<void>;
  unlockWithPassword: (masterPassword: string) => Promise<boolean>;
  unlockWithBiometrics: (promptMessage: string) => Promise<boolean>;
  lock: () => void;
  erase: () => Promise<void>;

  addEntry: <K extends EntryKind>(
    kind: K,
    title: string,
    data: EntryDataMap[K],
    notes?: string,
    customFields?: CustomField[],
  ) => VaultEntry;
  updateEntry: <K extends EntryKind>(
    id: string,
    patch: { title?: string; notes?: string; data?: EntryDataMap[K]; customFields?: CustomField[] },
  ) => void;
  /** Soft-deletes: moves the entry to the trash. */
  removeEntry: (id: string) => void;
  /** Restores a trashed entry back into the vault. */
  restoreEntry: (id: string) => void;
  /** Permanently deletes a trashed entry (and its attachment files). */
  purgeEntry: (id: string) => void;
  /** Empties the whole trash permanently. */
  emptyTrash: () => void;
  toggleFavorite: (id: string) => void;
  /** Duplicates an entry's fields (not its attachments); returns the new id. */
  duplicateEntry: (id: string, copySuffix: string) => string | null;
  /** Batch import (e.g. Bitwarden): one persist, original timestamps kept. */
  importLogins: (logins: ImportedLogin[]) => number;
  /** TOTP import: fills empty totpSeed fields and creates logins for the rest. */
  importTotp: (
    matches: { entryId: string; seed: string }[],
    newLogins: { title: string; account?: string; seed: string }[],
  ) => { updated: number; created: number };
  /** Encrypts and stores an image; returns false when the entry is at its limit. */
  addAttachment: (entryId: string, input: { name: string; mime: string; base64: string }) => Promise<boolean>;
  removeAttachment: (entryId: string, attachmentId: string) => Promise<void>;
  /** Sets/replaces the entry's avatar image (e.g. identity profile photo). */
  setAvatar: (entryId: string, base64: string) => Promise<void>;
  removeAvatar: (entryId: string) => Promise<void>;
  /** Re-keys the vault to a new master password after verifying the current one. */
  changeMasterPassword: (current: string, next: string) => Promise<'ok' | 'wrongCurrent' | 'error'>;
  /** Builds a password-encrypted backup string of the whole vault. */
  exportBackup: (password: string) => Promise<string | null>;
  /** Merges a decrypted backup into the vault; returns imported entry count. */
  importBackup: (payload: BackupPayload) => Promise<number>;
  /**
   * Disaster recovery from the lock screen: replaces the (inaccessible)
   * vault with a fresh one under a NEW master password and fills it from a
   * decrypted backup. Returns the restored entry count.
   */
  recoverFromBackup: (payload: BackupPayload, newMasterPassword: string) => Promise<number>;
}

/** Field keys whose change should refresh `secretUpdatedAt` (audit input). */
function secretKeys(kind: EntryKind): string[] {
  return fieldsOf(kind)
    .filter((f) => f.type === 'password' || f.type === 'pin')
    .map((f) => f.key);
}

/** The primary password field key for a kind (for history tracking). */
function passwordKeyOf(kind: EntryKind): string | undefined {
  return fieldsOf(kind).find((f) => f.type === 'password')?.key;
}

const MAX_PASSWORD_HISTORY = 15;

function persist(get: () => VaultState) {
  const { entries, trash, vaultKey } = get();
  if (!vaultKey) return;
  service.saveVault({ version: 1, entries, trash }, vaultKey).catch((err) => {
    console.error('[adamas] vault persist failed', err);
  });
}

/** Drops trashed entries past the retention window and wipes their files. */
function pruneTrash(trash: VaultEntry[]): VaultEntry[] {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const kept: VaultEntry[] = [];
  for (const entry of trash) {
    if ((entry.deletedAt ?? 0) < cutoff) {
      for (const meta of entry.attachments ?? []) attachments.deleteAttachment(meta.id).catch(() => {});
      if (entry.avatarId) attachments.deleteAttachment(entry.avatarId).catch(() => {});
    } else {
      kept.push(entry);
    }
  }
  return kept;
}

export const useVault = create<VaultState>()((set, get) => ({
  status: 'loading',
  entries: [],
  trash: [],
  vaultKey: null,

  initialize: async () => {
    set({ status: (await service.vaultExists()) ? 'locked' : 'none' });
  },

  createVault: async (masterPassword) => {
    const { vaultKey, doc } = await service.createVault(masterPassword);
    set({ status: 'unlocked', vaultKey, entries: doc.entries, trash: doc.trash ?? [] });
  },

  unlockWithPassword: async (masterPassword) => {
    const result = await service.unlockWithPassword(masterPassword);
    if (!result) return false;
    set({ status: 'unlocked', vaultKey: result.vaultKey, entries: result.doc.entries, trash: pruneTrash(result.doc.trash ?? []) });
    persist(get);
    return true;
  },

  unlockWithBiometrics: async (promptMessage) => {
    const result = await service.unlockWithBiometrics(promptMessage);
    if (!result) return false;
    set({ status: 'unlocked', vaultKey: result.vaultKey, entries: result.doc.entries, trash: pruneTrash(result.doc.trash ?? []) });
    persist(get);
    return true;
  },

  lock: () => {
    if (get().status !== 'unlocked') return;
    set({ status: 'locked', vaultKey: null, entries: [], trash: [] });
  },

  erase: async () => {
    await attachments.deleteAllAttachments().catch(() => {});
    await service.eraseVault();
    set({ status: 'none', vaultKey: null, entries: [], trash: [] });
  },

  addEntry: (kind, title, data, notes, customFields) => {
    const now = Date.now();
    const entry: VaultEntryOf<typeof kind> = {
      id: Crypto.randomUUID(),
      kind,
      title: title.trim(),
      favorite: false,
      notes: notes?.trim() || undefined,
      customFields: customFields && customFields.length > 0 ? customFields : undefined,
      createdAt: now,
      updatedAt: now,
      secretUpdatedAt: now,
      data,
    };
    set({ entries: [entry as VaultEntry, ...get().entries] });
    persist(get);
    return entry as VaultEntry;
  },

  updateEntry: (id, patch) => {
    const now = Date.now();
    set({
      entries: get().entries.map((entry) => {
        if (entry.id !== id) return entry;
        const next = { ...entry, updatedAt: now } as VaultEntry;
        if (patch.title !== undefined) next.title = patch.title.trim();
        if (patch.notes !== undefined) next.notes = patch.notes.trim() || undefined;
        if (patch.customFields !== undefined) {
          next.customFields = patch.customFields.length > 0 ? patch.customFields : undefined;
        }
        if (patch.data !== undefined) {
          const keys = secretKeys(entry.kind);
          const oldData = entry.data as Record<string, string | undefined>;
          const newData = patch.data as Record<string, string | undefined>;
          if (keys.some((k) => oldData[k] !== newData[k])) {
            next.secretUpdatedAt = now;
          }
          // Archive the previous password when it actually changes to a new value.
          const pwKey = passwordKeyOf(entry.kind);
          const oldPw = pwKey ? oldData[pwKey] : undefined;
          const newPw = pwKey ? newData[pwKey] : undefined;
          if (pwKey && oldPw && newPw && oldPw !== newPw) {
            next.passwordHistory = [
              { value: oldPw, changedAt: now },
              ...(entry.passwordHistory ?? []),
            ].slice(0, MAX_PASSWORD_HISTORY);
          }
          next.data = patch.data as never;
        }
        return next;
      }),
    });
    persist(get);
  },

  removeEntry: (id) => {
    const entry = get().entries.find((e) => e.id === id);
    if (!entry) return;
    // Soft delete: move to trash (attachment files are kept until purge).
    const trashed = { ...entry, deletedAt: Date.now() } as VaultEntry;
    set({
      entries: get().entries.filter((e) => e.id !== id),
      trash: [trashed, ...get().trash],
    });
    persist(get);
  },

  restoreEntry: (id) => {
    const entry = get().trash.find((e) => e.id === id);
    if (!entry) return;
    const { deletedAt, ...restored } = entry;
    set({
      trash: get().trash.filter((e) => e.id !== id),
      entries: [{ ...restored, updatedAt: Date.now() } as VaultEntry, ...get().entries],
    });
    persist(get);
  },

  purgeEntry: (id) => {
    const entry = get().trash.find((e) => e.id === id);
    for (const meta of entry?.attachments ?? []) attachments.deleteAttachment(meta.id).catch(() => {});
    if (entry?.avatarId) attachments.deleteAttachment(entry.avatarId).catch(() => {});
    set({ trash: get().trash.filter((e) => e.id !== id) });
    persist(get);
  },

  emptyTrash: () => {
    for (const entry of get().trash) {
      for (const meta of entry.attachments ?? []) attachments.deleteAttachment(meta.id).catch(() => {});
      if (entry.avatarId) attachments.deleteAttachment(entry.avatarId).catch(() => {});
    }
    set({ trash: [] });
    persist(get);
  },

  duplicateEntry: (id, copySuffix) => {
    const source = get().entries.find((e) => e.id === id);
    if (!source) return null;
    const now = Date.now();
    // Copy data + custom fields; attachments/avatar stay with the original.
    const copy = {
      ...source,
      id: Crypto.randomUUID(),
      title: `${source.title} ${copySuffix}`.trim(),
      favorite: false,
      attachments: undefined,
      avatarId: undefined,
      passwordHistory: undefined,
      createdAt: now,
      updatedAt: now,
      secretUpdatedAt: now,
    } as VaultEntry;
    set({ entries: [copy, ...get().entries] });
    persist(get);
    return copy.id;
  },

  toggleFavorite: (id) => {
    set({
      entries: get().entries.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e)),
    });
    persist(get);
  },

  importLogins: (logins) => {
    if (logins.length === 0) return 0;
    const now = Date.now();
    const imported: VaultEntry[] = logins.map((login) => ({
      id: Crypto.randomUUID(),
      kind: 'login',
      title: login.title,
      favorite: login.favorite,
      notes: login.notes,
      createdAt: login.createdAt ?? now,
      updatedAt: login.updatedAt ?? now,
      // Bitwarden exports don't carry a password-change date; the revision
      // date is the closest honest signal for the "old passwords" audit.
      secretUpdatedAt: login.updatedAt ?? now,
      data: login.data,
    }));
    set({ entries: [...imported, ...get().entries] });
    persist(get);
    return imported.length;
  },

  importTotp: (matches, newLogins) => {
    const now = Date.now();
    const bySeedTarget = new Map(matches.map((m) => [m.entryId, m.seed]));
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const updated = get().entries.map((entry) => {
      const seed = bySeedTarget.get(entry.id);
      if (!seed || entry.kind !== 'login' || entry.data.totpSeed) return entry;
      return { ...entry, updatedAt: now, data: { ...entry.data, totpSeed: seed } } as VaultEntry;
    });

    const created: VaultEntry[] = newLogins.map((item) => ({
      id: Crypto.randomUUID(),
      kind: 'login',
      title: item.title,
      favorite: false,
      createdAt: now,
      updatedAt: now,
      data: {
        totpSeed: item.seed,
        email: item.account && EMAIL_RE.test(item.account) ? item.account : undefined,
        username: item.account && !EMAIL_RE.test(item.account) ? item.account : undefined,
      },
    }));

    set({ entries: [...created, ...updated] });
    persist(get);
    return { updated: bySeedTarget.size, created: created.length };
  },

  addAttachment: async (entryId, input) => {
    const { vaultKey, entries } = get();
    const entry = entries.find((e) => e.id === entryId);
    if (!vaultKey || !entry) return false;
    if ((entry.attachments?.length ?? 0) >= attachments.MAX_ATTACHMENTS_PER_ENTRY) return false;
    if (input.base64.length > attachments.MAX_BASE64_LENGTH) return false;

    const meta: AttachmentMeta = {
      id: Crypto.randomUUID(),
      name: input.name,
      mime: input.mime,
      size: input.base64.length,
      addedAt: Date.now(),
    };
    await attachments.saveAttachment(meta.id, input.base64, vaultKey);
    set({
      entries: get().entries.map((e) =>
        e.id === entryId
          ? { ...e, attachments: [...(e.attachments ?? []), meta], updatedAt: Date.now() }
          : e,
      ),
    });
    persist(get);
    return true;
  },

  removeAttachment: async (entryId, attachmentId) => {
    await attachments.deleteAttachment(attachmentId).catch(() => {});
    set({
      entries: get().entries.map((e) =>
        e.id === entryId
          ? { ...e, attachments: (e.attachments ?? []).filter((a) => a.id !== attachmentId), updatedAt: Date.now() }
          : e,
      ),
    });
    persist(get);
  },

  setAvatar: async (entryId, base64) => {
    const { vaultKey, entries } = get();
    const entry = entries.find((e) => e.id === entryId);
    if (!vaultKey || !entry || base64.length > attachments.MAX_BASE64_LENGTH) return;
    const previous = entry.avatarId;
    const avatarId = Crypto.randomUUID();
    await attachments.saveAttachment(avatarId, base64, vaultKey);
    if (previous) attachments.deleteAttachment(previous).catch(() => {});
    set({
      entries: get().entries.map((e) => (e.id === entryId ? { ...e, avatarId, updatedAt: Date.now() } : e)),
    });
    persist(get);
  },

  removeAvatar: async (entryId) => {
    const entry = get().entries.find((e) => e.id === entryId);
    if (entry?.avatarId) await attachments.deleteAttachment(entry.avatarId).catch(() => {});
    set({
      entries: get().entries.map((e) => (e.id === entryId ? { ...e, avatarId: undefined, updatedAt: Date.now() } : e)),
    });
    persist(get);
  },

  changeMasterPassword: async (current, next) => {
    // Verify the current password by unlocking a throwaway copy of the vault.
    const verified = await service.unlockWithPassword(current);
    if (!verified) return 'wrongCurrent';
    try {
      await service.changeMasterPassword(verified.vaultKey, next);
      return 'ok';
    } catch {
      return 'error';
    }
  },

  exportBackup: async (password) => {
    const { vaultKey, entries } = get();
    if (!vaultKey) return null;
    // Decrypt every attachment/avatar so the backup is fully self-contained.
    const payloadAttachments: Record<string, string> = {};
    for (const entry of entries) {
      const ids = [...(entry.attachments?.map((a) => a.id) ?? []), ...(entry.avatarId ? [entry.avatarId] : [])];
      for (const id of ids) {
        try {
          payloadAttachments[id] = await attachments.loadAttachment(id, vaultKey);
        } catch {
          // Skip a missing/corrupt attachment rather than failing the whole backup.
        }
      }
    }
    return createBackup(password, { entries, attachments: payloadAttachments }, Date.now());
  },

  importBackup: async (payload) => {
    const { vaultKey } = get();
    if (!vaultKey) return 0;
    const now = Date.now();

    // Re-encrypt attachment payloads under the current vault key with fresh ids.
    const idMap: Record<string, string> = {};
    for (const [oldId, base64] of Object.entries(payload.attachments)) {
      if (base64.length > attachments.MAX_BASE64_LENGTH) continue;
      const newId = Crypto.randomUUID();
      try {
        await attachments.saveAttachment(newId, base64, vaultKey);
        idMap[oldId] = newId;
      } catch {
        // Ignore a single failed attachment write.
      }
    }

    const imported: VaultEntry[] = payload.entries.map((entry) => ({
      ...entry,
      id: Crypto.randomUUID(),
      attachments: entry.attachments
        ?.filter((a) => idMap[a.id])
        .map((a) => ({ ...a, id: idMap[a.id] })),
      avatarId: entry.avatarId ? idMap[entry.avatarId] : undefined,
      createdAt: entry.createdAt ?? now,
      updatedAt: now,
    }));

    set({ entries: [...imported, ...get().entries] });
    persist(get);
    return imported.length;
  },

  recoverFromBackup: async (payload, newMasterPassword) => {
    // Wipe the inaccessible vault (keys + blob + attachment files) …
    await attachments.deleteAllAttachments().catch(() => {});
    await service.eraseVault();
    // … create a fresh one under the new master password …
    const { vaultKey } = await service.createVault(newMasterPassword);
    set({ status: 'unlocked', vaultKey, entries: [], trash: [] });
    // … and refill it from the backup (re-encrypts attachments under the new key).
    return get().importBackup(payload);
  },
}));
