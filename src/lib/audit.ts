import { fieldsOf } from '@/constants/schema';
import { daysUntil, parseFieldDate } from '@/lib/dates';
import { estimateStrength } from '@/lib/strength';
import type { VaultEntry } from '@/types/vault';

/** Security audit engine — every check derives from the schema registry. */

export type AuditIssueType = 'weak' | 'reused' | 'old' | 'expired' | 'expiring' | 'noTotp';

export interface AuditFinding {
  type: AuditIssueType;
  entry: VaultEntry;
  /** Extra context, e.g. days until expiry. */
  detail?: string;
}

export interface AuditReport {
  /** 0–100, animated on the audit screen. */
  score: number;
  findings: Record<AuditIssueType, AuditFinding[]>;
  totalIssues: number;
  checkedEntries: number;
}

const OLD_SECRET_DAYS = 365;
const EXPIRY_WARNING_DAYS = 30;

/** Issue weights for the score; informational findings weigh less. */
const WEIGHTS: Record<AuditIssueType, number> = {
  weak: 14,
  reused: 12,
  expired: 10,
  old: 6,
  expiring: 4,
  noTotp: 2,
};

/**
 * Per-category penalty ceiling. "No 2FA" is informational — without a cap,
 * a large imported vault would flatline the score at 0 from this alone.
 */
const PENALTY_CAPS: Partial<Record<AuditIssueType, number>> = {
  noTotp: 15,
};

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

export function runAudit(entries: VaultEntry[], now: number = Date.now()): AuditReport {
  const findings: Record<AuditIssueType, AuditFinding[]> = {
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

  let penalty = 0;
  let totalIssues = 0;
  for (const type of Object.keys(findings) as AuditIssueType[]) {
    totalIssues += findings[type].length;
    const typePenalty = findings[type].length * WEIGHTS[type];
    penalty += Math.min(typePenalty, PENALTY_CAPS[type] ?? Number.POSITIVE_INFINITY);
  }

  return {
    score: entries.length === 0 ? 100 : Math.max(0, Math.round(100 - penalty)),
    findings,
    totalIssues,
    checkedEntries: entries.length,
  };
}
