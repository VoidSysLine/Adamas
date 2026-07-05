/**
 * Smart favicon resolution. Primary source is Google's S2 service (good
 * coverage, 128 px), with DuckDuckGo as fallback — `FaviconBadge` walks this
 * chain on load errors and finally falls back to a monogram.
 */

export function extractDomain(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  let input = rawUrl.trim();
  if (!input) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input)) input = `https://${input}`;
  try {
    const host = new URL(input).hostname.replace(/^www\./, '');
    return host.includes('.') ? host.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function faviconSources(domain: string): string[] {
  return [
    `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
  ];
}

/** Deterministic monogram fallback (first letter of the title). */
export function monogram(title: string): string {
  const ch = title.trim().charAt(0);
  return ch ? ch.toUpperCase() : '•';
}

/** Normalizes user input into an openable URL (adds https:// when schemeless). */
export function normalizeWebUrl(raw: string | undefined): string | null {
  const input = raw?.trim();
  if (!input) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input) ? input : `https://${input}`;
  try {
    // Validates it parses as a URL at all.
    new URL(withScheme);
    return withScheme;
  } catch {
    return null;
  }
}
