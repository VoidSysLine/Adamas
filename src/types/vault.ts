/**
 * Adamas vault data model.
 *
 * Design goals:
 *  - Zero redundancy: an entry stores only its `kind`; the category, icon,
 *    colors and field layout are all derived from the kind via the schema
 *    registry (`src/constants/schema.ts`).
 *  - Strong typing: `VaultEntry` is a discriminated union, so narrowing on
 *    `entry.kind` gives fully typed access to `entry.data`.
 *  - Forward compatible: unknown keys inside `data` are preserved on
 *    (de)serialization because each data shape is a plain string record.
 */

export type EntryKind =
  | 'login'
  | 'identity'
  | 'nationalId'
  | 'driversLicense'
  | 'passport'
  | 'taxId'
  | 'socialSecurity'
  | 'creditCard'
  | 'bankAccount'
  | 'wifi'
  | 'sim'
  | 'server'
  | 'note';

export type Category = 'logins' | 'identity' | 'documents' | 'finance' | 'tech' | 'notes';

/** All field values are strings; empty/undefined fields are simply omitted. */
export interface LoginData {
  url?: string;
  username?: string;
  email?: string;
  password?: string;
  /** Base32 TOTP seed (otpauth secret). */
  totpSeed?: string;
}

export interface IdentityData {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
}

export interface NationalIdData {
  number?: string;
  expiryDate?: string;
  authority?: string;
}

export interface DriversLicenseData {
  number?: string;
  classes?: string;
  expiryDate?: string;
  authority?: string;
}

export interface PassportData {
  number?: string;
  nationality?: string;
  expiryDate?: string;
  authority?: string;
}

export interface TaxIdData {
  number?: string;
}

export interface SocialSecurityData {
  number?: string;
  provider?: string;
}

export interface CreditCardData {
  holder?: string;
  number?: string;
  /** MM/YY */
  expiryDate?: string;
  cvv?: string;
  pin?: string;
}

export interface BankAccountData {
  holder?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
}

export interface WifiData {
  ssid?: string;
  password?: string;
  encryption?: string;
}

export interface SimData {
  phoneNumber?: string;
  pin?: string;
  puk?: string;
  iccid?: string;
  provider?: string;
}

export interface ServerData {
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  privateKey?: string;
}

export interface NoteData {
  body?: string;
}

export interface EntryDataMap {
  login: LoginData;
  identity: IdentityData;
  nationalId: NationalIdData;
  driversLicense: DriversLicenseData;
  passport: PassportData;
  taxId: TaxIdData;
  socialSecurity: SocialSecurityData;
  creditCard: CreditCardData;
  bankAccount: BankAccountData;
  wifi: WifiData;
  sim: SimData;
  server: ServerData;
  note: NoteData;
}

interface VaultEntryBase {
  id: string;
  title: string;
  favorite: boolean;
  notes?: string;
  /** Unix ms timestamps. */
  createdAt: number;
  updatedAt: number;
  /** When the primary secret (password/PIN) last changed — drives the audit. */
  secretUpdatedAt?: number;
}

export type VaultEntryOf<K extends EntryKind> = VaultEntryBase & {
  kind: K;
  data: EntryDataMap[K];
};

export type VaultEntry = { [K in EntryKind]: VaultEntryOf<K> }[EntryKind];

/** The decrypted vault payload persisted (encrypted) to disk. */
export interface VaultDocument {
  version: 1;
  entries: VaultEntry[];
}
