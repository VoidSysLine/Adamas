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
  | 'vehicle'
  | 'taxId'
  | 'socialSecurity'
  | 'pension'
  | 'creditCard'
  | 'bankAccount'
  | 'crypto'
  | 'wifi'
  | 'sim'
  | 'server'
  | 'softwareLicense'
  | 'apiKey'
  | 'accessCode'
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
  /**
   * 2FA status when the seed is NOT stored in Adamas:
   * 'external' (authenticator app), 'sms' (SMS/email codes),
   * 'unavailable' (service offers no 2FA → N/A for the audit).
   */
  twoFactor?: string;
}

export interface IdentityData {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
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

export interface VehicleData {
  /** Make & model, e.g. "BMW 320d". */
  model?: string;
  licensePlate?: string;
  /** VIN — 17 chars, letters I/O/Q excluded by standard. */
  vin?: string;
  /** Next general inspection (HU/TÜV/MOT) — feeds the expiry audit. */
  inspectionDate?: string;
  insuranceNumber?: string;
}

export interface TaxIdData {
  /** Steuer-Identifikationsnummer (IdNr, lifelong, 11 digits). */
  number?: string;
  /** Steuernummer (assigned by the local tax office, format varies by state). */
  taxNumber?: string;
  taxOffice?: string;
}

export interface PensionData {
  /** Rentenversicherungsnummer — same format as the German SVNR. */
  number?: string;
  provider?: string;
  referenceNumber?: string;
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

export interface CryptoData {
  /** Chain/network, e.g. Bitcoin, Ethereum. */
  blockchain?: string;
  /** Public wallet address. */
  address?: string;
  /** BIP-39 recovery phrase (12–24 words). */
  seedPhrase?: string;
  privateKey?: string;
  /** Optional 25th-word passphrase. */
  passphrase?: string;
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

export interface SoftwareLicenseData {
  licenseKey?: string;
  licensedTo?: string;
  version?: string;
  purchaseDate?: string;
  url?: string;
}

export interface ApiKeyData {
  key?: string;
  secret?: string;
  /** API endpoint or console URL. */
  url?: string;
}

export interface AccessCodeData {
  /** What the code opens (safe, alarm, door, …) — select options. */
  lockType?: string;
  code?: string;
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
  vehicle: VehicleData;
  taxId: TaxIdData;
  socialSecurity: SocialSecurityData;
  pension: PensionData;
  creditCard: CreditCardData;
  bankAccount: BankAccountData;
  crypto: CryptoData;
  wifi: WifiData;
  sim: SimData;
  server: ServerData;
  softwareLicense: SoftwareLicenseData;
  apiKey: ApiKeyData;
  accessCode: AccessCodeData;
  note: NoteData;
}

/** Metadata of an encrypted image attachment; the payload lives on disk. */
export interface AttachmentMeta {
  id: string;
  name: string;
  mime: string;
  /** Size of the (unencrypted) base64 payload in bytes. */
  size: number;
  addedAt: number;
}

interface VaultEntryBase {
  id: string;
  title: string;
  favorite: boolean;
  notes?: string;
  attachments?: AttachmentMeta[];
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
