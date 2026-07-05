import { isValidTotpSeed } from '@/crypto/totp';
import { extractDomain } from '@/lib/favicon';
import type { VaultEntry } from '@/types/vault';

/**
 * TOTP seed import from otpauth:// URI lists — the plain-text export format
 * of Ente Auth, Aegis (txt), FreeOTP and friends. The parser scans the whole
 * file for otpauth URIs, so both plain line lists and JSON exports that embed
 * the URIs work. (Google Authenticator's otpauth-migration:// protobuf format
 * is intentionally not supported.)
 */

export interface ImportedTotp {
  /** Service name, e.g. "GitHub". */
  issuer: string;
  /** Account label, often the email/username. */
  account?: string;
  /** Base32 seed, validated. */
  seed: string;
}

export interface TotpMatch {
  item: ImportedTotp;
  entryId: string;
  entryTitle: string;
}

export interface TotpMatchResult {
  /** Seed goes into this existing login's empty totpSeed field. */
  matches: TotpMatch[];
  /** No fitting login — offered as new login entries. */
  unmatched: ImportedTotp[];
  /** Matching login already carries a TOTP seed — left untouched. */
  alreadySet: number;
}

/**
 * Parses a single scanned value into a TOTP seed. Accepts a full
 * `otpauth://totp/…?secret=…` URI (from a 2FA setup QR) or a bare Base32
 * seed. Returns null when it holds no usable seed.
 */
export function parseTotpScan(value: string): ImportedTotp | null {
  const trimmed = value.trim();
  if (/^otpauth:\/\//i.test(trimmed)) return parseOtpauthUri(trimmed);
  if (isValidTotpSeed(trimmed)) return { issuer: 'TOTP', seed: trimmed };
  return null;
}

function parseOtpauthUri(uri: string): ImportedTotp | null {
  const match = /^otpauth:\/\/totp\/([^?]*)\?(.*)$/i.exec(uri.trim());
  if (!match) return null;

  const params = new Map<string, string>();
  for (const pair of match[2].split('&')) {
    const [key, ...rest] = pair.split('=');
    if (key) params.set(key.toLowerCase(), decodeURIComponent(rest.join('=') ?? ''));
  }
  const seed = params.get('secret')?.trim();
  if (!seed || !isValidTotpSeed(seed)) return null;

  const label = decodeURIComponent(match[1]);
  const [labelIssuer, labelAccount] = label.includes(':')
    ? [label.slice(0, label.indexOf(':')), label.slice(label.indexOf(':') + 1)]
    : ['', label];
  const issuer = (params.get('issuer') || labelIssuer || labelAccount).trim();

  return {
    issuer: issuer || 'TOTP',
    account: labelAccount.trim() || undefined,
    seed,
  };
}

/** Extracts every valid otpauth://totp entry from arbitrary file content. */
export function parseOtpauthExport(content: string): ImportedTotp[] {
  const uris = content.match(/otpauth:\/\/totp\/[^\s"'\\]+/gi) ?? [];
  const seen = new Set<string>();
  const items: ImportedTotp[] = [];
  for (const uri of uris) {
    const parsed = parseOtpauthUri(uri);
    if (!parsed) continue;
    const key = normalizeSeed(parsed.seed);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(parsed);
  }
  return items;
}

const normalize = (value: string) => value.toLowerCase().replace(/[\s._-]+/g, '');
const normalizeSeed = (seed: string) => seed.toUpperCase().replace(/[\s=-]/g, '');

/** Similarity score between an imported TOTP and a login entry. */
function scoreCandidate(item: ImportedTotp, entry: VaultEntry): number {
  if (entry.kind !== 'login') return 0;
  const issuer = normalize(item.issuer);
  if (issuer.length < 2) return 0;

  const title = normalize(entry.title);
  const domain = extractDomain(entry.data.url);
  const domainBase = domain ? normalize(domain.split('.')[0]) : '';

  let score = 0;
  if (title === issuer) score = 4;
  else if (domainBase && domainBase === issuer) score = 4;
  else if (title.length >= 3 && (title.includes(issuer) || issuer.includes(title))) score = 3;
  else if (domainBase.length >= 3 && (domainBase.includes(issuer) || issuer.includes(domainBase))) score = 3;

  if (score > 0 && item.account) {
    const account = normalize(item.account);
    const email = normalize(entry.data.email ?? '');
    const username = normalize(entry.data.username ?? '');
    if (account && (account === email || account === username)) score += 2;
  }
  return score;
}

/**
 * Assigns each imported seed to the best-matching login. Only logins WITHOUT
 * an existing seed receive one (never overwrites); every login gets at most
 * one seed. Ambiguity resolves by score, ties by vault order.
 */
export function matchTotpToLogins(items: ImportedTotp[], entries: VaultEntry[]): TotpMatchResult {
  const logins = entries.filter((e) => e.kind === 'login');
  const claimed = new Set<string>();
  const matches: TotpMatch[] = [];
  const unmatched: ImportedTotp[] = [];
  let alreadySet = 0;

  for (const item of items) {
    let best: VaultEntry | null = null;
    let bestScore = 0;
    for (const entry of logins) {
      if (claimed.has(entry.id)) continue;
      const score = scoreCandidate(item, entry);
      if (score > bestScore) {
        best = entry;
        bestScore = score;
      }
    }
    if (!best || bestScore < 3) {
      unmatched.push(item);
      continue;
    }
    const existing = best.kind === 'login' ? best.data.totpSeed : undefined;
    if (existing) {
      // Login already carries a seed (same or different) — never overwrite silently.
      claimed.add(best.id);
      alreadySet++;
      continue;
    }
    claimed.add(best.id);
    matches.push({ item, entryId: best.id, entryTitle: best.title });
  }

  return { matches, unmatched, alreadySet };
}
