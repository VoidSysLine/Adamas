import * as Crypto from 'expo-crypto';

/**
 * Have I Been Pwned — Pwned Passwords check via the k-anonymity range API.
 *
 * Privacy model: the password is SHA-1-hashed on device and only the FIRST
 * FIVE hex characters of the hash are sent to the API. The API returns all
 * known breached hash suffixes for that prefix (with padding entries so the
 * server can't infer which one matched); matching happens locally. Neither
 * the password nor its full hash ever leaves the device. No API key needed.
 */

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const CONCURRENCY = 8;

interface HashedPassword {
  password: string;
  prefix: string;
  suffix: string;
}

/**
 * Checks the given passwords against known breaches.
 * Returns a map password → breach count (only breached passwords included).
 * Throws on network failure so the UI can show an honest error state.
 */
export async function checkPwnedPasswords(passwords: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(passwords.filter((p) => p.length > 0))];

  const hashed: HashedPassword[] = await Promise.all(
    unique.map(async (password) => {
      const hash = (
        await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, password)
      ).toUpperCase();
      return { password, prefix: hash.slice(0, 5), suffix: hash.slice(5) };
    }),
  );

  const byPrefix = new Map<string, HashedPassword[]>();
  for (const item of hashed) {
    const group = byPrefix.get(item.prefix) ?? [];
    group.push(item);
    byPrefix.set(item.prefix, group);
  }

  const result = new Map<string, number>();
  const prefixes = [...byPrefix.keys()];

  for (let i = 0; i < prefixes.length; i += CONCURRENCY) {
    await Promise.all(
      prefixes.slice(i, i + CONCURRENCY).map(async (prefix) => {
        const response = await fetch(`${RANGE_URL}${prefix}`, {
          // HIBP requires a User-Agent; padding hides which suffix matched.
          headers: { 'Add-Padding': 'true', 'User-Agent': 'Adamas-Password-Manager' },
        });
        if (!response.ok) throw new Error(`HIBP range query failed (${response.status})`);
        const body = await response.text();

        const counts = new Map<string, number>();
        for (const line of body.split('\n')) {
          const [suffix, count] = line.trim().split(':');
          if (suffix && count) counts.set(suffix.toUpperCase(), parseInt(count, 10) || 0);
        }
        for (const item of byPrefix.get(prefix) ?? []) {
          const count = counts.get(item.suffix);
          // Padding entries report 0 — only real breaches count.
          if (count && count > 0) result.set(item.password, count);
        }
      }),
    );
  }

  return result;
}
