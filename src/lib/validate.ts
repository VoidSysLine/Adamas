/**
 * Soft checksum validation for masked fields. All checks return `null` while
 * the value is still incomplete (no nagging mid-typing) and only report
 * true/false once the value has its final length — shown as a non-blocking
 * warning in the edit form, saving is never prevented.
 */

/** Official IBAN lengths for the countries the app is likely to see. */
const IBAN_LENGTHS: Record<string, number> = {
  DE: 22, AT: 20, CH: 21, LI: 21, FR: 27, IT: 27, ES: 24, PT: 25, NL: 18,
  BE: 16, LU: 20, GB: 22, IE: 22, DK: 18, NO: 15, SE: 24, FI: 18, PL: 28,
  CZ: 24, SK: 24, HU: 28, RO: 24, BG: 22, HR: 21, SI: 19, EE: 20, LV: 21,
  LT: 20, GR: 27, CY: 28, MT: 31, IS: 26, TR: 26,
};

/**
 * ISO 13616 mod-97 check. `raw` is the unspaced uppercase IBAN.
 * null = incomplete or unknown country (don't judge), true/false otherwise.
 */
export function ibanValid(raw: string): boolean | null {
  const country = raw.slice(0, 2);
  const expected = IBAN_LENGTHS[country];
  if (!expected || raw.length < expected) return null;
  if (raw.length > expected) return false;
  // Move the first four chars to the end, then letters → numbers (A=10 … Z=35).
  const rearranged = raw.slice(4) + raw.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** Luhn check over a digit string. */
export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Card number check at the network's canonical length (Amex 15, Diners 14,
 * others 16). Longer formats (19-digit Visa/Maestro) are never flagged —
 * a wrong warning is worse than none.
 */
export function cardNumberValid(digits: string): boolean | null {
  if (digits.length < 14) return null;
  const canonical = /^3[47]/.test(digits) ? 15 : /^3(0[0-5]|[68])/.test(digits) ? 14 : 16;
  if (digits.length !== canonical) return null;
  return luhnValid(digits);
}

/**
 * German Steuer-Identifikationsnummer: 11 digits, the last one is an
 * ISO 7064 MOD 11,10 check digit.
 */
export function taxIdValid(digits: string): boolean | null {
  if (digits.length < 11) return null;
  if (digits.length > 11 || digits[0] === '0') return false;
  let product = 10;
  for (let i = 0; i < 10; i++) {
    let sum = (Number(digits[i]) + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  let check = 11 - product;
  if (check === 10) check = 0;
  return check === Number(digits[10]);
}
