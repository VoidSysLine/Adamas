/** Date helpers for the DD.MM.YYYY (date) and MM/YY (monthYear) field formats. */

export function parseFieldDate(value: string | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();

  const dmy = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const my = /^(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
  if (my) {
    const year = my[2].length === 2 ? 2000 + Number(my[2]) : Number(my[2]);
    // Cards expire at the *end* of the printed month.
    return new Date(year, Number(my[1]), 0, 23, 59, 59);
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function formatTimestamp(ms: number, locale: string): string {
  return new Date(ms).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(date: Date, now: number = Date.now()): number {
  return Math.ceil((date.getTime() - now) / DAY_MS);
}
