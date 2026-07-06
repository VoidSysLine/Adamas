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

interface VaultState {
  status: VaultStatus;
  entries: VaultEntry[];
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
  removeEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;
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
  /** Builds a password-encrypted backup string of the whole vault. */
  exportBackup: (password: string) => Promise<string | null>;
  /** Merges a decrypted backup into the vault; returns imported entry count. */
  importBackup: (payload: BackupPayload) => Promise<number>;
}

/** Field keys whose change should refresh `secretUpdatedAt` (audit input). */
function secretKeys(kind: EntryKind): string[] {
  return fieldsOf(kind)
    .filter((f) => f.type === 'password' || f.type === 'pin')
    .map((f) => f.key);
}

function persist(get: () => VaultState) {
  const { entries, vaultKey } = get();
  if (!vaultKey) return;
  service.saveVault({ version: 1, entries }, vaultKey).catch((err) => {
    console.error('[adamas] vault persist failed', err);
  });
}

export const useVault = create<VaultState>()((set, get) => ({
  status: 'loading',
  entries: [],
  vaultKey: null,

  initialize: async () => {
    set({ status: (await service.vaultExists()) ? 'locked' : 'none' });
  },

  createVault: async (masterPassword) => {
    const { vaultKey, doc } = await service.createVault(masterPassword);
    set({ status: 'unlocked', vaultKey, entries: doc.entries });
  },

  unlockWithPassword: async (masterPassword) => {
    const result = await service.unlockWithPassword(masterPassword);
    if (!result) return false;
    set({ status: 'unlocked', vaultKey: result.vaultKey, entries: result.doc.entries });
    return true;
  },

  unlockWithBiometrics: async (promptMessage) => {
    const result = await service.unlockWithBiometrics(promptMessage);
    if (!result) return false;
    set({ status: 'unlocked', vaultKey: result.vaultKey, entries: result.doc.entries });
    return true;
  },

  lock: () => {
    if (get().status !== 'unlocked') return;
    set({ status: 'locked', vaultKey: null, entries: [] });
  },

  erase: async () => {
    await attachments.deleteAllAttachments().catch(() => {});
    await service.eraseVault();
    set({ status: 'none', vaultKey: null, entries: [] });
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
          next.data = patch.data as never;
        }
        return next;
      }),
    });
    persist(get);
  },

  removeEntry: (id) => {
    const entry = get().entries.find((e) => e.id === id);
    // Best-effort cleanup of encrypted attachment + avatar files.
    for (const meta of entry?.attachments ?? []) {
      attachments.deleteAttachment(meta.id).catch(() => {});
    }
    if (entry?.avatarId) attachments.deleteAttachment(entry.avatarId).catch(() => {});
    set({ entries: get().entries.filter((e) => e.id !== id) });
    persist(get);
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
}));
