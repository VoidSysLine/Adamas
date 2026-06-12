import * as Crypto from 'expo-crypto';
import { WORDLIST } from './wordlist';

/** Cryptographically secure generators backed by expo-crypto's CSPRNG. */

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/~';
const AMBIGUOUS = new Set('Il1O0o`\'"|');

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export const DEFAULT_PASSWORD: PasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
};

export const DEFAULT_PASSPHRASE: PassphraseOptions = {
  words: 5,
  separator: '-',
  capitalize: true,
  includeNumber: false,
};

/** Unbiased random integer in [0, max) via rejection sampling. */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const bytes = Crypto.getRandomBytes(4);
    const value = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    if (value < limit) return value % max;
  }
}

function pick(pool: string): string {
  return pool[randomInt(pool.length)];
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function filterAmbiguous(pool: string): string {
  return [...pool].filter((c) => !AMBIGUOUS.has(c)).join('');
}

export function generatePassword(options: PasswordOptions): string {
  let pools: string[] = [];
  if (options.lowercase) pools.push(LOWER);
  if (options.uppercase) pools.push(UPPER);
  if (options.digits) pools.push(DIGITS);
  if (options.symbols) pools.push(SYMBOLS);
  if (pools.length === 0) pools = [LOWER];
  if (options.excludeAmbiguous) pools = pools.map(filterAmbiguous);

  const all = pools.join('');
  // Guarantee at least one character from every active class, then fill and shuffle.
  const chars = pools.map(pick);
  while (chars.length < options.length) chars.push(pick(all));
  return shuffle(chars.slice(0, Math.max(options.length, pools.length))).join('');
}

export function generatePassphrase(options: PassphraseOptions): string {
  const words: string[] = [];
  for (let i = 0; i < options.words; i++) {
    let word = WORDLIST[randomInt(WORDLIST.length)];
    if (options.capitalize) word = word[0].toUpperCase() + word.slice(1);
    words.push(word);
  }
  if (options.includeNumber) words.push(String(randomInt(100)));
  return words.join(options.separator);
}

export function generatePin(length: number): string {
  return Array.from({ length }, () => pick(DIGITS)).join('');
}

/** Theoretical entropy of the generator settings (not of one concrete output). */
export function passwordEntropyBits(options: PasswordOptions): number {
  let pool = 0;
  if (options.lowercase) pool += options.excludeAmbiguous ? filterAmbiguous(LOWER).length : 26;
  if (options.uppercase) pool += options.excludeAmbiguous ? filterAmbiguous(UPPER).length : 26;
  if (options.digits) pool += options.excludeAmbiguous ? filterAmbiguous(DIGITS).length : 10;
  if (options.symbols) pool += options.excludeAmbiguous ? filterAmbiguous(SYMBOLS).length : SYMBOLS.length;
  if (pool === 0) pool = 26;
  return Math.round(options.length * Math.log2(pool));
}

export function passphraseEntropyBits(options: PassphraseOptions): number {
  let bits = options.words * Math.log2(WORDLIST.length);
  if (options.includeNumber) bits += Math.log2(100);
  return Math.round(bits);
}
