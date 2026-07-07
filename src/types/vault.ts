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
  | 'healthInsurance'
  | 'pension'
  | 'creditCard'
  | 'bankAccount'
  | 'crypto'
  | 'hardwareWallet'
  | 'wifi'
  | 'sim'
  | 'server'
  | 'vpn'
  | 'softwareLicense'
  | 'apiKey'
  | 'accessCode'
  | 'securityKey'
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
  email?: string;
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

export interface HealthInsuranceData {
  /** Krankenkasse / insurer. */
  insurer?: string;
  /** Versichertennummer (KVNR) — 1 letter + 9 digits on the health card. */
  number?: string;
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

export interface HardwareWalletData {
  /** e.g. "Ledger Nano X". */
  deviceModel?: string;
  /** Device unlock PIN (4–8 digits on Ledger/Trezor). */
  pin?: string;
  /** BIP-39 recovery phrase backing the device. */
  seedPhrase?: string;
  /** Optional 25th-word passphrase. */
  passphrase?: string;
  serialNumber?: string;
}

export interface SecurityKeyData {
  /** e.g. "YubiKey 5C NFC". */
  deviceModel?: string;
  serialNumber?: string;
  /** FIDO2/PIV PIN. */
  pin?: string;
  /** PIV unblock key. */
  puk?: string;
  /** Where the key is registered — vital when replacing a lost key. */
  registeredServices?: string;
}

export interface VpnData {
  /** WireGuard / OpenVPN / IKEv2 … (select). */
  protocol?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  /** WireGuard private key / IPsec PSK / inline config. */
  privateKey?: string;
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
  healthInsurance: HealthInsuranceData;
  pension: PensionData;
  creditCard: CreditCardData;
  bankAccount: BankAccountData;
  crypto: CryptoData;
  hardwareWallet: HardwareWalletData;
  wifi: WifiData;
  sim: SimData;
  server: ServerData;
  vpn: VpnData;
  softwareLicense: SoftwareLicenseData;
  apiKey: ApiKeyData;
  accessCode: AccessCodeData;
  securityKey: SecurityKeyData;
  note: NoteData;
}

/** Types a user can pick for self-defined fields (subset of the schema's FieldType). */
export type CustomFieldType =
  | 'text'
  | 'multiline'
  | 'password'
  | 'pin'
  | 'date'
  | 'url'
  | 'email'
  | 'phone'
  | 'number'
  | 'code';

/** A user-defined extra field on an entry (à la Bitwarden custom fields). */
export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  value: string;
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
  customFields?: CustomField[];
  attachments?: AttachmentMeta[];
  /** Attachment id used as the entry's avatar (identities' profile photo). */
  avatarId?: string;
  /** Previous passwords, newest first — captured when the password changes. */
  passwordHistory?: { value: string; changedAt: number }[];
  /** Set when the entry is in the trash (soft-deleted). */
  deletedAt?: number;
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
  /** Soft-deleted entries awaiting restore or auto-purge. */
  trash?: VaultEntry[];
}
