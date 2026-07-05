import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { MaskKind } from '@/lib/masks';
import type { Category, EntryDataMap, EntryKind } from '@/types/vault';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type FieldType =
  | 'text'
  /** Handles like text but without auto-capitalization/correction (usernames). */
  | 'username'
  /** Technical identifier: monospaced, no auto-capitalization/correction (wallet address, keys). */
  | 'code'
  | 'email'
  | 'url'
  | 'password'
  | 'pin'
  | 'totp'
  | 'date'
  | 'monthYear'
  | 'number'
  | 'phone'
  | 'select'
  | 'multiline';

export interface SelectOption {
  /** Stored value. */
  value: string;
  /** i18n key under `options.`. */
  label: string;
}

export interface FieldDef<K extends EntryKind = EntryKind> {
  key: keyof EntryDataMap[K] & string;
  /** i18n key under `fields.` */
  label: string;
  type: FieldType;
  /** Live input mask (grouping, uppercasing, digit limits). */
  mask?: MaskKind;
  /** i18n key under `hints.` — a concrete format example shown as placeholder. */
  hint?: string;
  /** Chips shown for `select` fields. */
  options?: readonly SelectOption[];
  /** Masked at rest in the detail view; revealed on demand. */
  secure?: boolean;
  /** Hidden from the detail view copy rows (only shown via dedicated UI). */
  copyable?: boolean;
  /** Show the inline generator on the edit screen. */
  generator?: 'password' | 'pin';
  /** Marks the field used for "expired document/card" audits. */
  expiry?: boolean;
}

export const GENDER_OPTIONS: readonly SelectOption[] = [
  { value: 'female', label: 'genderFemale' },
  { value: 'male', label: 'genderMale' },
  { value: 'diverse', label: 'genderDiverse' },
  { value: 'unspecified', label: 'genderUnspecified' },
];

export const WIFI_ENCRYPTION_OPTIONS: readonly SelectOption[] = [
  { value: 'WPA3', label: 'wpa3' },
  { value: 'WPA2', label: 'wpa2' },
  { value: 'WPA', label: 'wpa' },
  { value: 'WEP', label: 'wep' },
  { value: 'none', label: 'wifiOpen' },
];

export const TWO_FACTOR_OPTIONS: readonly SelectOption[] = [
  { value: 'external', label: 'twoFactorExternal' },
  { value: 'sms', label: 'twoFactorSms' },
  { value: 'unavailable', label: 'twoFactorUnavailable' },
];

export const LOCK_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: 'safe', label: 'lockSafe' },
  { value: 'alarm', label: 'lockAlarm' },
  { value: 'door', label: 'lockDoor' },
  { value: 'gate', label: 'lockGate' },
  { value: 'garage', label: 'lockGarage' },
  { value: 'locker', label: 'lockLocker' },
  { value: 'other', label: 'lockOther' },
];

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
      { key: 'url', label: 'url', type: 'url', hint: 'urlExample' },
      { key: 'username', label: 'username', type: 'username', hint: 'usernameExample' },
      { key: 'email', label: 'email', type: 'email', hint: 'emailExample' },
      { key: 'password', label: 'password', type: 'password', secure: true, generator: 'password' },
      { key: 'totpSeed', label: 'totpSeed', type: 'totp', mask: 'base32', hint: 'totpExample', secure: true },
      { key: 'twoFactor', label: 'twoFactor', type: 'select', options: TWO_FACTOR_OPTIONS },
    ],
  },
  identity: {
    category: 'identity',
    icon: 'person-outline',
    fields: [
      { key: 'firstName', label: 'firstName', type: 'text', hint: 'firstNameExample' },
      { key: 'lastName', label: 'lastName', type: 'text', hint: 'lastNameExample' },
      { key: 'birthDate', label: 'birthDate', type: 'date' },
      { key: 'gender', label: 'gender', type: 'select', options: GENDER_OPTIONS },
      { key: 'street', label: 'street', type: 'text', hint: 'streetExample' },
      { key: 'postalCode', label: 'postalCode', type: 'number', mask: 'digits5', hint: 'postalCodeExample' },
      { key: 'city', label: 'city', type: 'text', hint: 'cityExample' },
      { key: 'country', label: 'country', type: 'text', hint: 'countryExample' },
    ],
  },
  nationalId: {
    category: 'documents',
    icon: 'id-card-outline',
    fields: [
      { key: 'number', label: 'documentNumber', type: 'text', mask: 'upperAlnum', hint: 'nationalIdExample' },
      { key: 'expiryDate', label: 'expiryDate', type: 'date', expiry: true },
      { key: 'authority', label: 'authority', type: 'text', hint: 'authorityExample' },
    ],
  },
  driversLicense: {
    category: 'documents',
    icon: 'car-outline',
    fields: [
      { key: 'number', label: 'documentNumber', type: 'text', mask: 'upperAlnum', hint: 'licenseNumberExample' },
      { key: 'classes', label: 'licenseClasses', type: 'text', mask: 'upperText', hint: 'licenseClassesExample' },
      { key: 'expiryDate', label: 'expiryDate', type: 'date', expiry: true },
      { key: 'authority', label: 'authority', type: 'text', hint: 'authorityExample' },
    ],
  },
  passport: {
    category: 'documents',
    icon: 'airplane-outline',
    fields: [
      { key: 'number', label: 'documentNumber', type: 'text', mask: 'upperAlnum', hint: 'passportExample' },
      { key: 'nationality', label: 'nationality', type: 'text', hint: 'nationalityExample' },
      { key: 'expiryDate', label: 'expiryDate', type: 'date', expiry: true },
      { key: 'authority', label: 'authority', type: 'text', hint: 'authorityExample' },
    ],
  },
  vehicle: {
    category: 'documents',
    icon: 'car-sport-outline',
    fields: [
      { key: 'model', label: 'vehicleModel', type: 'text', hint: 'vehicleModelExample' },
      { key: 'licensePlate', label: 'licensePlate', type: 'text', mask: 'upperText', hint: 'licensePlateExample' },
      { key: 'vin', label: 'vin', type: 'code', mask: 'vin', hint: 'vinExample' },
      { key: 'inspectionDate', label: 'inspectionDate', type: 'date', expiry: true },
      { key: 'insuranceNumber', label: 'insuranceNumber', type: 'code', hint: 'insuranceNumberExample' },
    ],
  },
  taxId: {
    category: 'documents',
    icon: 'document-text-outline',
    fields: [
      { key: 'number', label: 'taxId', type: 'number', mask: 'taxIdDe', hint: 'taxIdExample', secure: true },
      { key: 'taxNumber', label: 'taxNumber', type: 'code', mask: 'taxNumberDe', hint: 'taxNumberExample', secure: true },
      { key: 'taxOffice', label: 'taxOffice', type: 'text', hint: 'taxOfficeExample' },
    ],
  },
  pension: {
    category: 'documents',
    icon: 'umbrella-outline',
    fields: [
      { key: 'number', label: 'rvnr', type: 'text', mask: 'svnrDe', hint: 'ssnExample', secure: true },
      { key: 'provider', label: 'pensionProvider', type: 'text', hint: 'pensionProviderExample' },
      { key: 'referenceNumber', label: 'referenceNumber', type: 'code', hint: 'referenceNumberExample' },
    ],
  },
  healthInsurance: {
    category: 'documents',
    icon: 'medkit-outline',
    fields: [
      { key: 'insurer', label: 'insurer', type: 'text', hint: 'insuranceExample' },
      { key: 'number', label: 'kvnr', type: 'code', mask: 'kvnrDe', hint: 'kvnrExample', secure: true },
    ],
  },
  creditCard: {
    category: 'finance',
    icon: 'card-outline',
    fields: [
      { key: 'holder', label: 'cardHolder', type: 'text', mask: 'upperText', hint: 'cardHolderExample' },
      { key: 'number', label: 'cardNumber', type: 'number', mask: 'cardNumber', hint: 'cardNumberExample', secure: true },
      { key: 'expiryDate', label: 'expiryDate', type: 'monthYear', mask: 'monthYear', hint: 'monthYearExample', expiry: true },
      { key: 'cvv', label: 'cvv', type: 'pin', mask: 'digits4', hint: 'cvvExample', secure: true },
      { key: 'pin', label: 'pin', type: 'pin', mask: 'digits4', hint: 'pinExample', secure: true, generator: 'pin' },
    ],
  },
  bankAccount: {
    category: 'finance',
    icon: 'business-outline',
    fields: [
      { key: 'holder', label: 'accountHolder', type: 'text', hint: 'accountHolderExample' },
      { key: 'iban', label: 'iban', type: 'code', mask: 'iban', hint: 'ibanExample', secure: true },
      { key: 'bic', label: 'bic', type: 'code', mask: 'bic', hint: 'bicExample' },
      { key: 'bankName', label: 'bankName', type: 'text', hint: 'bankNameExample' },
    ],
  },
  crypto: {
    category: 'finance',
    icon: 'logo-bitcoin',
    fields: [
      { key: 'blockchain', label: 'blockchain', type: 'text', hint: 'blockchainExample' },
      { key: 'address', label: 'walletAddress', type: 'code', hint: 'walletAddressExample' },
      { key: 'seedPhrase', label: 'seedPhrase', type: 'multiline', hint: 'seedPhraseExample', secure: true },
      { key: 'privateKey', label: 'privateKey', type: 'code', hint: 'walletKeyExample', secure: true },
      { key: 'passphrase', label: 'walletPassphrase', type: 'password', secure: true, generator: 'password' },
    ],
  },
  wifi: {
    category: 'tech',
    icon: 'wifi-outline',
    fields: [
      { key: 'ssid', label: 'ssid', type: 'text', hint: 'ssidExample' },
      { key: 'password', label: 'password', type: 'password', secure: true, generator: 'password' },
      { key: 'encryption', label: 'encryption', type: 'select', options: WIFI_ENCRYPTION_OPTIONS },
    ],
  },
  sim: {
    category: 'tech',
    icon: 'cellular-outline',
    fields: [
      { key: 'phoneNumber', label: 'phoneNumber', type: 'phone', mask: 'phone', hint: 'phoneExample' },
      { key: 'pin', label: 'pin', type: 'pin', mask: 'digits4', hint: 'simPinExample', secure: true, generator: 'pin' },
      { key: 'puk', label: 'puk', type: 'pin', mask: 'digits8', hint: 'pukExample', secure: true },
      { key: 'iccid', label: 'iccid', type: 'number', mask: 'iccid', hint: 'iccidExample' },
      { key: 'provider', label: 'provider', type: 'text', hint: 'simProviderExample' },
    ],
  },
  server: {
    category: 'tech',
    icon: 'terminal-outline',
    fields: [
      { key: 'host', label: 'host', type: 'url', hint: 'hostExample' },
      { key: 'port', label: 'port', type: 'number', mask: 'port', hint: 'portExample' },
      { key: 'username', label: 'username', type: 'username', hint: 'serverUserExample' },
      { key: 'password', label: 'password', type: 'password', secure: true, generator: 'password' },
      { key: 'privateKey', label: 'privateKey', type: 'multiline', hint: 'privateKeyExample', secure: true },
    ],
  },
  softwareLicense: {
    category: 'tech',
    icon: 'cube-outline',
    fields: [
      { key: 'licenseKey', label: 'licenseKey', type: 'code', hint: 'licenseKeyExample', secure: true },
      { key: 'licensedTo', label: 'licensedTo', type: 'text', hint: 'licensedToExample' },
      { key: 'version', label: 'version', type: 'text', hint: 'versionExample' },
      { key: 'purchaseDate', label: 'purchaseDate', type: 'date' },
      { key: 'url', label: 'url', type: 'url', hint: 'urlExample' },
    ],
  },
  apiKey: {
    category: 'tech',
    icon: 'code-slash-outline',
    fields: [
      { key: 'key', label: 'apiKeyValue', type: 'code', hint: 'apiKeyExample', secure: true },
      { key: 'secret', label: 'apiSecret', type: 'code', hint: 'apiSecretExample', secure: true },
      { key: 'url', label: 'apiUrl', type: 'url', hint: 'apiUrlExample' },
    ],
  },
  accessCode: {
    category: 'tech',
    icon: 'keypad-outline',
    fields: [
      { key: 'lockType', label: 'lockType', type: 'select', options: LOCK_TYPE_OPTIONS },
      { key: 'code', label: 'accessCodeValue', type: 'pin', hint: 'accessCodeExample', secure: true, generator: 'pin' },
    ],
  },
  note: {
    category: 'notes',
    icon: 'reader-outline',
    fields: [{ key: 'body', label: 'noteBody', type: 'multiline', hint: 'noteExample' }],
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
    kinds: ['nationalId', 'driversLicense', 'passport', 'vehicle', 'taxId', 'healthInsurance', 'pension'],
  },
  finance: { icon: 'card-outline', gradient: ['#6EE7B7', '#10B981'], kinds: ['creditCard', 'bankAccount', 'crypto'] },
  tech: {
    icon: 'hardware-chip-outline',
    gradient: ['#A5B4FC', '#6366F1'],
    kinds: ['wifi', 'sim', 'server', 'softwareLicense', 'apiKey', 'accessCode'],
  },
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

/** Encrypted photo attachments (front/back of a card) — documents & credit cards. */
export function kindAllowsAttachments(kind: EntryKind): boolean {
  return categoryOf(kind) === 'documents' || kind === 'creditCard';
}
