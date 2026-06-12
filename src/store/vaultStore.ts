import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import * as service from '@/crypto/vaultService';
import { fieldsOf } from '@/constants/schema';
import type { EntryDataMap, EntryKind, VaultEntry, VaultEntryOf } from '@/types/vault';

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
  ) => VaultEntry;
  updateEntry: <K extends EntryKind>(
    id: string,
    patch: { title?: string; notes?: string; data?: EntryDataMap[K] },
  ) => void;
  removeEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;
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
    await service.eraseVault();
    set({ status: 'none', vaultKey: null, entries: [] });
  },

  addEntry: (kind, title, data, notes) => {
    const now = Date.now();
    const entry: VaultEntryOf<typeof kind> = {
      id: Crypto.randomUUID(),
      kind,
      title: title.trim(),
      favorite: false,
      notes: notes?.trim() || undefined,
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
    set({ entries: get().entries.filter((e) => e.id !== id) });
    persist(get);
  },

  toggleFavorite: (id) => {
    set({
      entries: get().entries.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e)),
    });
    persist(get);
  },
}));
