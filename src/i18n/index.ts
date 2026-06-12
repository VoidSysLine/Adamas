import { getLocales } from 'expo-localization';
import { useSettings } from '@/store/settingsStore';
import { translations, type Language, type Translations } from './translations';

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Translations>;

export function systemLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return code === 'de' ? 'de' : 'en';
}

export function resolveLanguage(pref: Language | 'system'): Language {
  return pref === 'system' ? systemLanguage() : pref;
}

export function translate(lang: Language, key: TKey, params?: Record<string, string | number>): string {
  let node: unknown = translations[lang];
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown>)?.[part];
  }
  let text = typeof node === 'string' ? node : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

/** Returns a stable `t()` bound to the active language. */
export function useT() {
  const pref = useSettings((s) => s.language);
  const lang = resolveLanguage(pref);
  return (key: TKey, params?: Record<string, string | number>) => translate(lang, key, params);
}
