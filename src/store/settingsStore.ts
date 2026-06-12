import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Language } from '@/i18n/translations';

export type ThemePref = 'system' | 'dark' | 'light';
export type LanguagePref = Language | 'system';
/** Minutes in background before the vault locks. 0 = immediately, -1 = never. */
export type AutoLockPref = 0 | 1 | 5 | 15 | -1;

interface SettingsState {
  theme: ThemePref;
  /** Mirrors the OS scheme; kept in the store so theme changes re-render everywhere. */
  systemScheme: 'dark' | 'light';
  language: LanguagePref;
  autoLock: AutoLockPref;
  biometricsEnabled: boolean;
  appIcon: 'obsidian' | 'ice' | 'gold';
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      systemScheme: 'dark',
      language: 'system',
      autoLock: 5,
      biometricsEnabled: true,
      appIcon: 'obsidian',
      set: (key, value) => set({ [key]: value } as Pick<SettingsState, typeof key>),
    }),
    {
      name: 'adamas.settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, language, autoLock, biometricsEnabled, appIcon }) => ({
        theme,
        language,
        autoLock,
        biometricsEnabled,
        appIcon,
      }),
    },
  ),
);
