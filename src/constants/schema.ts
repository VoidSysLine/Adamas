import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { Category, EntryDataMap, EntryKind } from '@/types/vault';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type FieldType =
  | 'text'
  | 'email'
  | 'url'
  | 'password'
  | 'pin'
  | 'totp'
  | 'date'
  | 'monthYear'
  | 'number'
  | 'phone'
  | 'multiline';

export interface FieldDef<K extends EntryKind = EntryKind> {
  key: keyof EntryDataMap[K] & string;
  /** i18n key under `fields.` */
  label: string;
  type: FieldType;
  /** Masked at rest in the detail view; revealed on demand. */
  secure?: boolean;
  /** Hidden from the detail view copy rows (only shown via dedicated UI). */
  copyable?: boolean;
  /** Show the inline generator on the edit screen. */
  generator?: 'password' | 'pin';
  /** Marks the field used for "expired document/card" audits. */
  expiry?: boolean;
}

interface KindMeta<K extends EntryKind> {
  category: Category;
  icon: IoniconName;
  fields: readonly FieldDef<K>[];
}

/**
 * Single source of truth for every entry kind: which category it belongs to,
 * how it is rendered and which fields it carries. Detail view, edit form,
 * search and audit all derive from this registry — nothing is duplicated.
 */
export const KIND_REGISTRY: { [K in EntryKind]: KindMeta<K> } = {
  login: {
    category: 'logins',
    icon: 'globe-outline',
    fields: [
      { key: 'url', label: 'url', type: 'url' },
      { key: 'username', label: 'username', type: 'text' },
      { key: 'email', label: 'email', type: 'email' },
      { key: 'password', label: 'password', type: 'password', secure: true, generator: 'password' },
      { key: 'totpSeed', label: 'totpSeed', type: 'totp', secure: true },
    ],
  },
  identity: {
    category: 'identity',
    icon: 'person-outline',
    fields: [
      { key: 'firstName', label: 'firstName', type: 'text' },
      { key: 'lastName', label: 'lastName', type: 'text' },
      { key: 'birthDate', label: 'birthDate', type: 'date' },
      { key: 'gender', label: 'gender', type: 'text' },
    ],
  },
  nationalId: {
    category: 'documents',
    icon: 'id-card-outline',
    fields: [
      { key: 'number', label: 'documentNumber', type: 'text' },
      { key: 'expiryDate', label: 'expiryDate', type: 'date', expiry: true },
      { key: 'authority', label: 'authority', type: 'text' },
    ],
  },
  driversLicense: {
    category: 'documents',
    icon: 'car-outline',
    fields: [
      { key: 'number', label: 'documentNumber', type: 'text' },
      { key: 'classes', label: 'licenseClasses', type: 'text' },
      { key: 'expiryDate', label: 'expiryDate', type: 'date', expiry: true },
      { key: 'authority', label: 'authority', type: 'text' },
    ],
  },
  passport: {
    category: 'documents',
    icon: 'airplane-outline',
    fields: [
      { key: 'number', label: 'documentNumber', type: 'text' },
      { key: 'nationality', label: 'nationality', type: 'text' },
      { key: 'expiryDate', label: 'expiryDate', type: 'date', expiry: true },
      { key: 'authority', label: 'authority', type: 'text' },
    ],
  },
  taxId: {
    category: 'documents',
    icon: 'document-text-outline',
    fields: [{ key: 'number', label: 'taxNumber', type: 'text', secure: true }],
  },
  socialSecurity: {
    category: 'documents',
    icon: 'medkit-outline',
    fields: [
      { key: 'number', label: 'ssn', type: 'text', secure: true },
      { key: 'provider', label: 'provider', type: 'text' },
    ],
  },
  creditCard: {
    category: 'finance',
    icon: 'card-outline',
    fields: [
      { key: 'holder', label: 'cardHolder', type: 'text' },
      { key: 'number', label: 'cardNumber', type: 'number', secure: true },
      { key: 'expiryDate', label: 'expiryDate', type: 'monthYear', expiry: true },
      { key: 'cvv', label: 'cvv', type: 'pin', secure: true },
      { key: 'pin', label: 'pin', type: 'pin', secure: true, generator: 'pin' },
    ],
  },
  bankAccount: {
    category: 'finance',
    icon: 'business-outline',
    fields: [
      { key: 'holder', label: 'accountHolder', type: 'text' },
      { key: 'iban', label: 'iban', type: 'text', secure: true },
      { key: 'bic', label: 'bic', type: 'text' },
      { key: 'bankName', label: 'bankName', type: 'text' },
    ],
  },
  wifi: {
    category: 'tech',
    icon: 'wifi-outline',
    fields: [
      { key: 'ssid', label: 'ssid', type: 'text' },
      { key: 'password', label: 'password', type: 'password', secure: true, generator: 'password' },
      { key: 'encryption', label: 'encryption', type: 'text' },
    ],
  },
  sim: {
    category: 'tech',
    icon: 'cellular-outline',
    fields: [
      { key: 'phoneNumber', label: 'phoneNumber', type: 'phone' },
      { key: 'pin', label: 'pin', type: 'pin', secure: true, generator: 'pin' },
      { key: 'puk', label: 'puk', type: 'pin', secure: true },
      { key: 'iccid', label: 'iccid', type: 'number' },
      { key: 'provider', label: 'provider', type: 'text' },
    ],
  },
  server: {
    category: 'tech',
    icon: 'terminal-outline',
    fields: [
      { key: 'host', label: 'host', type: 'url' },
      { key: 'port', label: 'port', type: 'number' },
      { key: 'username', label: 'username', type: 'text' },
      { key: 'password', label: 'password', type: 'password', secure: true, generator: 'password' },
      { key: 'privateKey', label: 'privateKey', type: 'multiline', secure: true },
    ],
  },
  note: {
    category: 'notes',
    icon: 'reader-outline',
    fields: [{ key: 'body', label: 'noteBody', type: 'multiline' }],
  },
};

export interface CategoryMeta {
  icon: IoniconName;
  /** Accent gradient used for badges and chips. */
  gradient: readonly [string, string];
  kinds: EntryKind[];
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  logins: { icon: 'globe-outline', gradient: ['#67E8F9', '#3B82F6'], kinds: ['login'] },
  identity: { icon: 'person-outline', gradient: ['#F0ABFC', '#A855F7'], kinds: ['identity'] },
  documents: {
    icon: 'id-card-outline',
    gradient: ['#FDE68A', '#F59E0B'],
    kinds: ['nationalId', 'driversLicense', 'passport', 'taxId', 'socialSecurity'],
  },
  finance: { icon: 'card-outline', gradient: ['#6EE7B7', '#10B981'], kinds: ['creditCard', 'bankAccount'] },
  tech: { icon: 'hardware-chip-outline', gradient: ['#A5B4FC', '#6366F1'], kinds: ['wifi', 'sim', 'server'] },
  notes: { icon: 'reader-outline', gradient: ['#FDA4AF', '#F43F5E'], kinds: ['note'] },
};

export const CATEGORY_ORDER: Category[] = ['logins', 'identity', 'documents', 'finance', 'tech', 'notes'];

export const ALL_KINDS = Object.keys(KIND_REGISTRY) as EntryKind[];

export function categoryOf(kind: EntryKind): Category {
  return KIND_REGISTRY[kind].category;
}

export function fieldsOf<K extends EntryKind>(kind: K): readonly FieldDef<K>[] {
  return KIND_REGISTRY[kind].fields;
}

export function kindIcon(kind: EntryKind): IoniconName {
  return KIND_REGISTRY[kind].icon;
}

export function kindGradient(kind: EntryKind): readonly [string, string] {
  return CATEGORIES[categoryOf(kind)].gradient;
}
