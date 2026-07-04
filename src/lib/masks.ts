/**
 * Input masks for vault fields. Each mask is a pure (strip, format) pair:
 * `strip` reduces a display string to its raw characters, `format` renders
 * raw characters for display. The form field reformats on every keystroke
 * and handles separator-deletion (backspace over a space removes the
 * preceding raw character instead of being swallowed by re-formatting).
 */

export type MaskKind =
  | 'iban'
  | 'bic'
  | 'cardNumber'
  | 'monthYear'
  | 'iccid'
  | 'taxIdDe'
  | 'svnrDe'
  | 'base32'
  | 'digits4'
  | 'digits8'
  | 'port'
  | 'phone'
  | 'upperAlnum'
  | 'upperText';

export interface Mask {
  strip: (formatted: string) => string;
  format: (raw: string) => string;
  /** Copy the stripped raw value instead of the grouped display value. */
  copyRaw?: boolean;
}

function groupEvery(raw: string, size: number): string {
  return raw.replace(new RegExp(`(.{${size}})(?=.)`, 'g'), '$1 ');
}

/** Groups raw characters at the given cumulative positions: [2,8,9] → "12 070649 C…". */
function groupAt(raw: string, positions: number[]): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    if (positions.includes(i)) out += ' ';
    out += raw[i];
  }
  return out;
}

const onlyDigits = (s: string) => s.replace(/\D/g, '');
const onlyUpperAlnum = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Enforces per-position character classes (L = letter, D = digit, A = either). */
function shape(raw: string, pattern: string): string {
  let out = '';
  for (const char of raw) {
    const slot = pattern[out.length] ?? pattern[pattern.length - 1];
    if (out.length >= pattern.length && pattern[pattern.length - 1] !== '*') break;
    if (slot === 'L' && /[A-Z]/.test(char)) out += char;
    else if (slot === 'D' && /[0-9]/.test(char)) out += char;
    else if ((slot === 'A' || slot === '*') && /[A-Z0-9]/.test(char)) out += char;
  }
  return out;
}

export const MASKS: Record<MaskKind, Mask> = {
  // 2 letters country, 2 check digits, then alphanumeric; grouped in fours.
  iban: {
    strip: (s) => shape(onlyUpperAlnum(s), 'LLDD' + '*'.repeat(30)),
    format: (raw) => groupEvery(raw.slice(0, 34), 4),
    copyRaw: true,
  },
  bic: {
    strip: (s) => shape(onlyUpperAlnum(s), 'LLLLLL' + '*'.repeat(5)).slice(0, 11),
    format: (raw) => raw,
  },
  cardNumber: {
    strip: (s) => onlyDigits(s).slice(0, 19),
    format: (raw) => groupEvery(raw, 4),
    copyRaw: true,
  },
  // MM/YY with auto zero-padding: typing "9" yields "09/".
  monthYear: {
    strip: (s) => {
      let raw = onlyDigits(s).slice(0, 4);
      if (raw.length >= 1 && raw[0] > '1') raw = `0${raw}`.slice(0, 4);
      if (raw.length >= 2 && Number(raw.slice(0, 2)) > 12) raw = `12${raw.slice(2)}`;
      return raw;
    },
    format: (raw) => (raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw),
  },
  iccid: {
    strip: (s) => onlyDigits(s).slice(0, 20),
    format: (raw) => groupEvery(raw, 4),
    copyRaw: true,
  },
  // German Steuer-ID: 11 digits, displayed as "12 345 678 901".
  taxIdDe: {
    strip: (s) => onlyDigits(s).slice(0, 11),
    format: (raw) => groupAt(raw, [2, 5, 8]),
    copyRaw: true,
  },
  // German SV-Nummer: 8 digits, 1 letter, 3 digits → "12 070649 C 103".
  svnrDe: {
    strip: (s) => shape(onlyUpperAlnum(s), 'DDDDDDDDLDDD'),
    format: (raw) => groupAt(raw, [2, 8, 9]),
    copyRaw: true,
  },
  // Base32 TOTP seed, grouped for readability; decoder ignores spaces.
  base32: {
    strip: (s) => s.toUpperCase().replace(/[^A-Z2-7]/g, '').slice(0, 64),
    format: (raw) => groupEvery(raw, 4),
    copyRaw: true,
  },
  digits4: {
    strip: (s) => onlyDigits(s).slice(0, 4),
    format: (raw) => raw,
  },
  digits8: {
    strip: (s) => onlyDigits(s).slice(0, 8),
    format: (raw) => raw,
  },
  port: {
    strip: (s) => onlyDigits(s).slice(0, 5),
    format: (raw) => raw,
  },
  // Free-form phone input restricted to plausible characters.
  phone: {
    strip: (s) => s.replace(/[^\d+ ()/-]/g, '').slice(0, 20),
    format: (raw) => raw,
  },
  upperAlnum: {
    strip: (s) => onlyUpperAlnum(s).slice(0, 12),
    format: (raw) => raw,
  },
  // Uppercase free text (license classes, card holder).
  upperText: {
    strip: (s) => s.toUpperCase().replace(/[^A-Z0-9ÄÖÜ ,.-]/g, '').slice(0, 40),
    format: (raw) => raw,
  },
};

/**
 * Applies a mask to a change event. When the user deletes a separator that
 * `format` would immediately re-insert, the preceding raw character is
 * removed so backspace always makes progress.
 */
export function applyMask(mask: Mask, previousDisplay: string, nextDisplay: string): string {
  let raw = mask.strip(nextDisplay);
  if (nextDisplay.length < previousDisplay.length && raw === mask.strip(previousDisplay)) {
    raw = raw.slice(0, -1);
  }
  return mask.format(raw);
}
