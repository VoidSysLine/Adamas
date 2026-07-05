import { fieldsOf } from '@/constants/schema';
import { daysUntil, parseFieldDate } from '@/lib/dates';
import { estimateStrength } from '@/lib/strength';
import type { VaultEntry } from '@/types/vault';

/** Security audit engine — every check derives from the schema registry. */

export type AuditIssueType = 'pwned' | 'weak' | 'reused' | 'old' | 'expired' | 'expiring' | 'noTotp';

export interface AuditFinding {
  type: AuditIssueType;
  entry: VaultEntry;
  /** Extra context, e.g. days until expiry or breach count. */
  detail?: string;
}

export interface AuditReport {
  /** Percentage (0–100) of logins with no critical finding — the ring value. */
  score: number;
  loginCount: number;
  secureLogins: number;
  findings: Record<AuditIssueType, AuditFinding[]>;
  totalIssues: number;
  checkedEntries: number;
}

const OLD_SECRET_DAYS = 365;
const EXPIRY_WARNING_DAYS = 30;

/**
 * Findings that make a login count as "not secure" for the percentage.
 * `noTotp` and expiry hints are surfaced as sections but stay informational.
 */
const CRITICAL_TYPES: AuditIssueType[] = ['pwned', 'weak', 'reused', 'old'];

/** 2FA handled outside Adamas, or the service simply offers none (N/A). */
function twoFactorHandledElsewhere(twoFactor: string | undefined): boolean {
  return twoFactor === 'external' || twoFactor === 'sms' || twoFactor === 'unavailable';
}

function passwordsOf(entry: VaultEntry): string[] {
  const data = entry.data as Record<string, string | undefined>;
  return fieldsOf(entry.kind)
    .filter((f) => f.type === 'password')
    .map((f) => data[f.key])
    .filter((v): v is string => !!v);
}

export function runAudit(
  entries: VaultEntry[],
  now: number = Date.now(),
  /** Optional HIBP results: password → breach count (from the opt-in check). */
  pwnedCounts?: Map<string, number>,
): AuditReport {
  const findings: Record<AuditIssueType, AuditFinding[]> = {
    pwned: [],
    weak: [],
    reused: [],
    old: [],
    expired: [],
    expiring: [],
    noTotp: [],
  };

  const byPassword = new Map<string, VaultEntry[]>();

  for (const entry of entries) {
    const data = entry.data as Record<string, string | undefined>;
    const passwords = passwordsOf(entry);

    for (const password of passwords) {
      const breachCount = pwnedCounts?.get(password);
      if (breachCount) {
        findings.pwned.push({ type: 'pwned', entry, detail: `${breachCount.toLocaleString()}×` });
        break;
      }
    }

    for (const password of passwords) {
      if (estimateStrength(password).level <= 1) {
        findings.weak.push({ type: 'weak', entry });
        break;
      }
    }

    for (const password of passwords) {
      const list = byPassword.get(password) ?? [];
      list.push(entry);
      byPassword.set(password, list);
    }

    if (passwords.length > 0 && entry.secretUpdatedAt) {
      const ageDays = (now - entry.secretUpdatedAt) / (24 * 60 * 60 * 1000);
      if (ageDays > OLD_SECRET_DAYS) {
        findings.old.push({ type: 'old', entry, detail: `${Math.floor(ageDays)}d` });
      }
    }

    for (const field of fieldsOf(entry.kind)) {
      if (!field.expiry) continue;
      const date = parseFieldDate(data[field.key]);
      if (!date) continue;
      const days = daysUntil(date, now);
      if (days < 0) {
        findings.expired.push({ type: 'expired', entry, detail: `${-days}d` });
      } else if (days <= EXPIRY_WARNING_DAYS) {
        findings.expiring.push({ type: 'expiring', entry, detail: `${days}d` });
      }
    }

    if (
      entry.kind === 'login' &&
      entry.data.password &&
      !entry.data.totpSeed &&
      !twoFactorHandledElsewhere(entry.data.twoFactor)
    ) {
      findings.noTotp.push({ type: 'noTotp', entry });
    }
  }

  const reusedSeen = new Set<string>();
  for (const group of byPassword.values()) {
    if (group.length < 2) continue;
    for (const entry of group) {
      if (reusedSeen.has(entry.id)) continue;
      reusedSeen.add(entry.id);
      findings.reused.push({ type: 'reused', entry });
    }
  }

  let totalIssues = 0;
  for (const type of Object.keys(findings) as AuditIssueType[]) {
    totalIssues += findings[type].length;
  }

  // Score = share of logins untouched by any critical finding.
  const loginCount = entries.filter((e) => e.kind === 'login').length;
  const insecureLoginIds = new Set<string>();
  for (const type of CRITICAL_TYPES) {
    for (const finding of findings[type]) {
      if (finding.entry.kind === 'login') insecureLoginIds.add(finding.entry.id);
    }
  }
  const secureLogins = loginCount - insecureLoginIds.size;

  return {
    score: loginCount === 0 ? 100 : Math.round((secureLogins / loginCount) * 100),
    loginCount,
    secureLogins,
    findings,
    totalIssues,
    checkedEntries: entries.length,
  };
}
