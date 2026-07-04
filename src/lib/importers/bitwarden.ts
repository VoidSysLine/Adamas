import { isValidTotpSeed } from '@/crypto/totp';
import type { LoginData } from '@/types/vault';

/**
 * Parser for Bitwarden's unencrypted JSON export
 * (Bitwarden → Tools → Vault exportieren → Dateiformat ".json").
 *
 * Only login items (type 1) are imported for now; cards, identities and
 * secure notes are counted as skipped so the UI can report them honestly.
 */

interface BitwardenUri {
  uri?: string | null;
}

interface BitwardenLogin {
  uris?: BitwardenUri[] | null;
  username?: string | null;
  password?: string | null;
  totp?: string | null;
}

interface BitwardenItem {
  type?: number;
  name?: string | null;
  notes?: string | null;
  favorite?: boolean;
  login?: BitwardenLogin | null;
  creationDate?: string | null;
  revisionDate?: string | null;
}

interface BitwardenExport {
  encrypted?: boolean;
  passwordProtected?: boolean;
  items?: BitwardenItem[];
}

export interface ImportedLogin {
  title: string;
  favorite: boolean;
  notes?: string;
  data: LoginData;
  createdAt?: number;
  updatedAt?: number;
}

export type BitwardenParseResult =
  | { ok: true; logins: ImportedLogin[]; skippedOther: number }
  | { ok: false; reason: 'encrypted' | 'invalid' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Bitwarden stores TOTP either as a raw base32 seed or an otpauth:// URL. */
export function extractTotpSeed(totp: string | null | undefined): string | undefined {
  if (!totp) return undefined;
  const value = totp.trim();
  if (!value) return undefined;
  if (value.toLowerCase().startsWith('otpauth://')) {
    const match = /[?&]secret=([^&]+)/i.exec(value);
    if (!match) return undefined;
    const secret = decodeURIComponent(match[1]);
    return isValidTotpSeed(secret) ? secret : undefined;
  }
  return isValidTotpSeed(value) ? value : undefined;
}

function parseDate(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

export function parseBitwardenExport(json: string): BitwardenParseResult {
  let parsed: BitwardenExport;
  try {
    parsed = JSON.parse(json) as BitwardenExport;
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
    return { ok: false, reason: 'invalid' };
  }
  if (parsed.encrypted === true || parsed.passwordProtected === true) {
    return { ok: false, reason: 'encrypted' };
  }

  const logins: ImportedLogin[] = [];
  let skippedOther = 0;

  for (const item of parsed.items) {
    if (!item || typeof item !== 'object') continue;
    if (item.type !== 1 || !item.login) {
      skippedOther++;
      continue;
    }
    const login = item.login;
    const username = login.username?.trim() || undefined;
    const data: LoginData = {
      url: login.uris?.find((u) => u?.uri?.trim())?.uri?.trim() || undefined,
      // Bitwarden has a single username field; route emails into our email field.
      username: username && !EMAIL_RE.test(username) ? username : undefined,
      email: username && EMAIL_RE.test(username) ? username : undefined,
      password: login.password?.trim() || undefined,
      totpSeed: extractTotpSeed(login.totp),
    };
    logins.push({
      title: item.name?.trim() || data.url || 'Login',
      favorite: item.favorite === true,
      notes: item.notes?.trim() || undefined,
      data,
      createdAt: parseDate(item.creationDate),
      updatedAt: parseDate(item.revisionDate),
    });
  }

  return { ok: true, logins, skippedOther };
}

/** True when an equivalent login already exists (same title, user and password). */
export function isDuplicateLogin(
  candidate: ImportedLogin,
  existing: { kind: string; title: string; data: Record<string, string | undefined> }[],
): boolean {
  return existing.some(
    (entry) =>
      entry.kind === 'login' &&
      entry.title.toLowerCase() === candidate.title.toLowerCase() &&
      (entry.data.username ?? '') === (candidate.data.username ?? '') &&
      (entry.data.email ?? '') === (candidate.data.email ?? '') &&
      (entry.data.password ?? '') === (candidate.data.password ?? ''),
  );
}
