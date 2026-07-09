/**
 * Unit-Tests für die reine App-Logik. Läuft via `npm test`
 * (scripts/test.sh kopiert die Module in .testbuild und führt sie in Node aus).
 */
import { runAudit, passwordsOf } from './audit';
import { bankDomain, cardNetwork, cryptoMark, insurerDomain, pensionDomain, securityKeyDomain, simProviderDomain, vehicleBrandDomain } from './brandIcons';
import { extractDomain, publicHostDomain } from './favicon';
import { applyMask, MASKS } from './masks';
import { totpCode, totpSecondsRemaining, isValidTotpSeed } from './totp';
import { cardNumberValid, ibanValid, luhnValid, taxIdValid } from './validate';
import { buildWifiQrValue } from './wifiQr';
import { extractTotpSeed, parseBitwardenExport } from './bitwarden';
import { matchTotpToLogins, parseOtpauthExport, parseTotpScan } from './totpImport';
import type { VaultEntry } from './vault';

let failed = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (erwartet ${JSON.stringify(expected)})`}`,
  );
}

// ── Masken ───────────────────────────────────────────────────────────────
eq(MASKS.iban.strip('DE89 3704 0044 0532 0130 00'), 'DE89370400440532013000', 'iban strip');
eq(MASKS.iban.format('DE89370400440532013000'), 'DE89 3704 0044 0532 0130 00', 'iban format');
eq(MASKS.svnrDe.format(MASKS.svnrDe.strip('12 070649 C 103')), '12 070649 C 103', 'svnr roundtrip');
eq(MASKS.monthYear.strip('00'), '0', 'monthYear 00 blockiert');
eq(MASKS.monthYear.strip('9'), '09', 'monthYear Auto-Null');
eq(MASKS.monthYear.strip('13'), '12', 'monthYear Klemme');
eq(applyMask(MASKS.monthYear, '', '1226'), '12/26', 'monthYear Format');
// Backspace über den Trenner ("4111 1111" → Leerzeichen gelöscht) muss die
// davorliegende Ziffer entfernen, sonst formatiert die Maske ihn sofort zurück.
eq(applyMask(MASKS.cardNumber, '4111 1111', '41111111'), '4111 111', 'Backspace über Trenner');

// ── Prüfsummen ───────────────────────────────────────────────────────────
eq(ibanValid('DE89370400440532013000'), true, 'IBAN DE gültig');
eq(ibanValid('DE89370400440532013001'), false, 'IBAN DE Zahlendreher');
eq(ibanValid('DE8937040044053201300'), null, 'IBAN unvollständig → null');
eq(ibanValid('XX89370400440532013000'), null, 'IBAN unbekanntes Land → null');
eq(luhnValid('4111111111111111'), true, 'Luhn Visa');
eq(cardNumberValid('4111111111111112'), false, 'Karte Zahlendreher');
eq(cardNumberValid('378282246310005'), true, 'Amex 15-stellig');
eq(cardNumberValid('4111111111111111111'), null, '19-stellig nie gewarnt');
eq(taxIdValid('12345678911'), true, 'Steuer-ID Prüfziffer ok');
eq(taxIdValid('12345678912'), false, 'Steuer-ID Prüfziffer falsch');
eq(taxIdValid('1234567891'), null, 'Steuer-ID unvollständig → null');

// ── TOTP (RFC-6238-Testvektor) ───────────────────────────────────────────
const RFC_SEED = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
eq(totpCode(RFC_SEED, 59_000), '287082', 'TOTP RFC-Vektor t=59s');
eq(totpCode(RFC_SEED, 1111111109_000), '081804', 'TOTP RFC-Vektor t=1111111109s');
eq(isValidTotpSeed('JBSWY3DPEHPK3PXP'), true, 'TOTP Seed gültig');
eq(isValidTotpSeed('not base32 !!'), false, 'TOTP Seed ungültig');
eq(totpSecondsRemaining(30_000), 30, 'TOTP Restzeit an Periodengrenze');

// ── Marken-Icons ─────────────────────────────────────────────────────────
eq(bankDomain('Sparkasse Köln'), 'sparkasse.de', 'bank Sparkasse');
eq(bankDomain('n26.com'), 'n26.com', 'bank direkte Domain');
eq(cardNetwork('4111 1111 1111 1111'), 'visa', 'cardNetwork Visa');
eq(cardNetwork('5500 0000 0000 0004'), 'mastercard', 'cardNetwork Mastercard');
eq(cryptoMark('Bitcoin')?.label, '₿', 'cryptoMark BTC');
eq(insurerDomain('Techniker Krankenkasse'), 'tk.de', 'insurer TK');
eq(pensionDomain('Deutsche Rentenversicherung Bund'), 'deutsche-rentenversicherung.de', 'pension DRV');
eq(vehicleBrandDomain('VW Golf 8'), 'vw.de', 'vehicle VW');
eq(simProviderDomain('o2'), 'o2online.de', 'sim o2');
eq(simProviderDomain('Hellblau Mobil'), null, 'sim Wortgrenzen');
eq(securityKeyDomain('YubiKey 5C NFC'), 'yubico.com', 'key YubiKey');

// ── Favicon / Host-Privacy ───────────────────────────────────────────────
eq(extractDomain('https://www.amazon.de/konto'), 'amazon.de', 'extractDomain');
eq(publicHostDomain('vpn.mullvad.net'), 'vpn.mullvad.net', 'host öffentlich');
eq(publicHostDomain('192.168.1.10'), null, 'host IPv4 → null');
eq(publicHostDomain('nas.local'), null, 'host .local → null');
eq(publicHostDomain('fritz.box'), null, 'host fritz.box → null');

// ── WLAN-QR ──────────────────────────────────────────────────────────────
eq(buildWifiQrValue({ ssid: 'My;Net', password: 'p"w:1', encryption: 'WPA2' }), 'WIFI:T:WPA;S:My\\;Net;P:p\\"w\\:1;;', 'wifi QR Escaping');
eq(buildWifiQrValue({ ssid: 'Open', encryption: 'none' }), 'WIFI:T:nopass;S:Open;;', 'wifi QR offen');
eq(buildWifiQrValue({ ssid: '' }), null, 'wifi QR ohne SSID → null');

// ── Audit ────────────────────────────────────────────────────────────────
const now = Date.now();
function login(id: string, password: string, extra?: object): VaultEntry {
  return {
    id, kind: 'login', title: id, favorite: false, createdAt: now, updatedAt: now,
    secretUpdatedAt: now, data: { password, twoFactor: 'external' }, ...extra,
  } as VaultEntry;
}
const selfDup = login('selbst', 'Xk9#mQ2$vL8@wP5!', {
  customFields: [{ id: 'c1', label: 'Zweit', type: 'password', value: 'Xk9#mQ2$vL8@wP5!' }],
});
eq(runAudit([selfDup], now).findings.reused.length, 0, 'audit kein reused bei Selbst-Duplikat');
eq(runAudit([login('a', 'Xk9#mQ2$vL8@wP5!'), login('b', 'Xk9#mQ2$vL8@wP5!')], now).findings.reused.length, 2, 'audit reused über 2 Einträge');
eq(passwordsOf(selfDup).length, 2, 'passwordsOf Schema + Custom');
eq(runAudit([login('w', 'abc'), login('st', 'Xk9#mQ2$vL8@wP5!zz')], now).score, 50, 'audit Score 50%');

// ── Bitwarden-Import ─────────────────────────────────────────────────────
const bw = parseBitwardenExport(JSON.stringify({
  items: [
    { type: 1, name: 'GitHub', favorite: true, login: { uris: [{ uri: 'https://github.com' }], username: 'max@example.com', password: 'pw1', totp: 'otpauth://totp/GitHub?secret=JBSWY3DPEHPK3PXP' } },
    { type: 2, name: 'Notiz' },
  ],
}));
eq(bw.ok, true, 'bitwarden parse ok');
if (bw.ok) {
  eq(bw.logins.length, 1, 'bitwarden 1 Login');
  eq(bw.skippedOther, 1, 'bitwarden 1 übersprungen');
  eq(bw.logins[0].data.email, 'max@example.com', 'bitwarden E-Mail-Routing');
  eq(bw.logins[0].data.totpSeed, 'JBSWY3DPEHPK3PXP', 'bitwarden TOTP-Seed');
}
eq(parseBitwardenExport(JSON.stringify({ encrypted: true, items: [] })).ok, false, 'bitwarden verschlüsselt abgelehnt');
eq(extractTotpSeed('JBSWY3DPEHPK3PXP'), 'JBSWY3DPEHPK3PXP', 'extractTotpSeed roh');

// ── TOTP-Import / Matching ───────────────────────────────────────────────
const scan = parseTotpScan('otpauth://totp/GitHub:max?secret=JBSWY3DPEHPK3PXP&issuer=GitHub');
eq(scan?.issuer, 'GitHub', 'otpauth Issuer');
eq(scan?.seed, 'JBSWY3DPEHPK3PXP', 'otpauth Seed');
const exported = parseOtpauthExport('otpauth://totp/GitHub?secret=JBSWY3DPEHPK3PXP\notpauth://totp/GitHub?secret=JBSWY3DPEHPK3PXP');
eq(exported.length, 1, 'otpauth Export dedupliziert');
const gh = login('GitHub', 'pw');
const match = matchTotpToLogins(exported, [gh]);
eq(match.matches.length, 1, 'TOTP-Match auf Login');
eq(match.matches[0]?.entryId, 'GitHub', 'TOTP-Match richtige ID');

console.log(failed === 0 ? '\nALLE TESTS OK' : `\n${failed} TEST(S) FEHLGESCHLAGEN`);
if (failed !== 0) throw new Error('Tests fehlgeschlagen');
