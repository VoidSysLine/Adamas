/**
 * Lightweight password strength estimation (zxcvbn-inspired, ~1 KB instead of
 * ~400 KB): effective entropy from character-class pool size and length, with
 * penalties for repeats, sequences and keyboard runs.
 */

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface Strength {
  level: StrengthLevel;
  /** Approximate entropy in bits after penalties. */
  bits: number;
}

const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'qwertzuiop',
  '0123456789',
];

const COMMON = new Set([
  'password', 'passwort', 'qwerty', 'qwertz', 'letmein', 'welcome', 'admin', 'login',
  'iloveyou', 'monkey', 'dragon', 'master', 'hallo', 'sommer', 'winter', 'schalke',
  '123456', '12345678', '123456789', '1234567890', 'geheim', 'test',
]);

function poolSize(password: string): number {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/\d/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 30;
  return pool || 1;
}

function sequencePenalty(password: string): number {
  const lower = password.toLowerCase();
  let penalty = 0;
  for (const seq of SEQUENCES) {
    const reversed = [...seq].reverse().join('');
    for (let len = 4; len <= lower.length; len++) {
      for (let i = 0; i + len <= lower.length; i++) {
        const slice = lower.slice(i, i + len);
        if (seq.includes(slice) || reversed.includes(slice)) penalty = Math.max(penalty, len * 3);
      }
    }
  }
  return penalty;
}

export function estimateStrength(password: string): Strength {
  if (!password) return { level: 0, bits: 0 };
  if (COMMON.has(password.toLowerCase())) return { level: 0, bits: 4 };

  let bits = password.length * Math.log2(poolSize(password));

  // Repeated characters add little real entropy.
  const unique = new Set(password).size;
  bits *= Math.min(1, 0.4 + (0.6 * unique) / password.length);
  // Straight runs (abcd, qwer, 1234) are nearly free for attackers.
  bits -= sequencePenalty(password);
  // Same character repeated 3+ times.
  if (/(.)\1{2,}/.test(password)) bits -= 8;

  bits = Math.max(1, Math.round(bits));
  const level: StrengthLevel = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  return { level, bits };
}

export const STRENGTH_LABEL_KEYS = [
  'strength.veryWeak',
  'strength.weak',
  'strength.fair',
  'strength.strong',
  'strength.veryStrong',
] as const;
