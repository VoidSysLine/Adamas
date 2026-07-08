/**
 * Smart brand icons for finance & document entries:
 *  - bank accounts resolve the bank name to a domain → real favicon
 *  - credit cards detect the network from the card number prefix → brand tile
 *  - crypto wallets map the blockchain to its currency symbol + brand color
 *  - health insurance / pension resolve the insurer or provider to a domain
 *  - vehicles detect the manufacturer from the model name → brand favicon
 * Card/crypto marks render offline; only the logos need the favicon fetch.
 */

/** Shortcut shared by all name→domain resolvers: the user pasted a domain/URL. */
function directDomain(name: string): string | null {
  if (name.includes('.') && !name.includes(' ')) {
    return name.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
  return null;
}

/** Walks a [pattern, domain] table; first match wins. */
function matchDomain(name: string | undefined, table: [RegExp, string][]): string | null {
  const normalized = name?.trim().toLowerCase();
  if (!normalized) return null;
  const direct = directDomain(normalized);
  if (direct) return direct;
  for (const [pattern, domain] of table) {
    if (pattern.test(normalized)) return domain;
  }
  return null;
}

/** Well-known banks → domain for the favicon chain. Order matters (first match wins). */
const BANK_DOMAINS: [RegExp, string][] = [
  [/sparkasse/, 'sparkasse.de'],
  [/volksbank|raiffeisen(?!.*schweiz)/, 'vr.de'],
  [/commerzbank/, 'commerzbank.de'],
  [/deutsche\s*bank/, 'deutsche-bank.de'],
  [/postbank/, 'postbank.de'],
  [/ing(\s|-)?diba|\bing\b/, 'ing.de'],
  [/\bdkb\b|deutsche\s*kreditbank/, 'dkb.de'],
  [/n26/, 'n26.com'],
  [/comdirect/, 'comdirect.de'],
  [/consorsbank/, 'consorsbank.de'],
  [/targobank/, 'targobank.de'],
  [/santander/, 'santander.de'],
  [/hypovereinsbank|unicredit/, 'hypovereinsbank.de'],
  [/sparda/, 'sparda.de'],
  [/psd\s*bank/, 'psd-bank.de'],
  [/gls\s*bank|gls\b/, 'gls.de'],
  [/trade\s*republic/, 'traderepublic.com'],
  [/scalable/, 'scalable.capital'],
  [/revolut/, 'revolut.com'],
  [/bunq/, 'bunq.com'],
  [/wise|transferwise/, 'wise.com'],
  [/\bc24\b/, 'c24.de'],
  [/vivid/, 'vivid.money'],
  [/klarna/, 'klarna.com'],
  [/paypal/, 'paypal.com'],
  [/barclays/, 'barclays.de'],
  [/hsbc/, 'hsbc.com'],
  [/\bchase\b/, 'chase.com'],
  [/bank\s*of\s*america/, 'bankofamerica.com'],
  [/erste\s*bank/, 'erstegroup.com'],
  [/raiffeisen.*schweiz|\bzkb\b/, 'zkb.ch'],
  [/\bubs\b/, 'ubs.com'],
];

/** Resolves a bank name (or pasted domain) to a favicon-able domain. */
export function bankDomain(bankName: string | undefined): string | null {
  return matchDomain(bankName, BANK_DOMAINS);
}

/** German statutory + private health insurers → domain. Order matters (first match wins). */
const INSURER_DOMAINS: [RegExp, string][] = [
  [/techniker|\btk\b/, 'tk.de'],
  [/aok/, 'aok.de'],
  [/barmer/, 'barmer.de'],
  [/\bdak\b/, 'dak.de'],
  [/ikk\s*classic|\bikk\b/, 'ikkclassic.de'],
  [/kkh/, 'kkh.de'],
  [/hkk/, 'hkk.de'],
  [/\bhek\b/, 'hek.de'],
  [/knappschaft/, 'knappschaft.de'],
  [/\bsbk\b|siemens.*betriebskrankenkasse/, 'sbk.org'],
  [/big\s*direkt/, 'big-direkt.de'],
  [/viactiv/, 'viactiv.de'],
  [/mhplus/, 'mhplus.de'],
  [/debeka/, 'debeka.de'],
  [/allianz/, 'allianz.de'],
  [/\baxa\b/, 'axa.de'],
  [/huk/, 'huk.de'],
  [/ergo\b/, 'ergo.de'],
  [/signal\s*iduna/, 'signal-iduna.de'],
  [/hanse\s*merkur/, 'hansemerkur.de'],
  [/barmenia/, 'barmenia.de'],
  [/\bdkv\b/, 'dkv.com'],
  [/gothaer/, 'gothaer.de'],
  [/continentale/, 'continentale.de'],
  [/r\s*\+\s*v|r&v/, 'ruv.de'],
  [/generali/, 'generali.de'],
  [/w(ü|ue)rttembergische/, 'wuerttembergische.de'],
  [/hallesche/, 'hallesche.de'],
  [/arag/, 'arag.de'],
  [/ottonova/, 'ottonova.de'],
];

/** Resolves a health insurer name (or pasted domain) to a favicon-able domain. */
export function insurerDomain(insurerName: string | undefined): string | null {
  return matchDomain(insurerName, INSURER_DOMAINS);
}

/** Statutory pension carriers; private providers fall through to the insurer table. */
const PENSION_DOMAINS: [RegExp, string][] = [
  [/deutsche\s*rentenversicherung|rentenversicherung|\bdrv\b/, 'deutsche-rentenversicherung.de'],
  [/knappschaft/, 'knappschaft.de'],
];

/** Resolves a pension provider (statutory carrier or private insurer) to a domain. */
export function pensionDomain(providerName: string | undefined): string | null {
  return matchDomain(providerName, PENSION_DOMAINS) ?? insurerDomain(providerName);
}

/** Car manufacturers, matched inside the free-text model field ("VW Golf 8"). */
const VEHICLE_DOMAINS: [RegExp, string][] = [
  [/volkswagen|\bvw\b/, 'vw.de'],
  [/\bbmw\b/, 'bmw.de'],
  [/mercedes|\bamg\b|daimler/, 'mercedes-benz.de'],
  [/audi/, 'audi.de'],
  [/opel/, 'opel.de'],
  [/ford/, 'ford.de'],
  [/porsche/, 'porsche.com'],
  [/toyota/, 'toyota.de'],
  [/tesla/, 'tesla.com'],
  [/(š|s)koda/, 'skoda-auto.de'],
  [/cupra/, 'cupraofficial.de'],
  [/\bseat\b/, 'seat.de'],
  [/renault/, 'renault.de'],
  [/peugeot/, 'peugeot.de'],
  [/citro(ë|e)n/, 'citroen.de'],
  [/fiat/, 'fiat.de'],
  [/alfa\s*romeo/, 'alfaromeo.de'],
  [/hyundai/, 'hyundai.de'],
  [/\bkia\b/, 'kia.com'],
  [/mazda/, 'mazda.de'],
  [/honda/, 'honda.de'],
  [/nissan/, 'nissan.de'],
  [/mitsubishi/, 'mitsubishi-motors.de'],
  [/suzuki/, 'suzuki.de'],
  [/volvo/, 'volvocars.com'],
  [/polestar/, 'polestar.com'],
  [/\bmini\b/, 'mini.de'],
  [/\bsmart\b/, 'smart.com'],
  [/dacia/, 'dacia.de'],
  [/land\s*rover|range\s*rover/, 'landrover.de'],
  [/jaguar/, 'jaguar.de'],
  [/jeep/, 'jeep.de'],
  [/\bbyd\b/, 'byd.com'],
];

/** Detects the manufacturer in a vehicle model string → favicon-able domain. */
export function vehicleBrandDomain(model: string | undefined): string | null {
  const name = model?.trim().toLowerCase();
  if (!name) return null;
  // No directDomain shortcut here: model names are never domains.
  for (const [pattern, domain] of VEHICLE_DOMAINS) {
    if (pattern.test(name)) return domain;
  }
  return null;
}

export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb';

/** Detects the card network from the number prefix (IIN ranges). */
export function cardNetwork(cardNumber: string | undefined): CardNetwork | null {
  const digits = cardNumber?.replace(/\D/g, '') ?? '';
  if (digits.length < 2) return null;
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|22[2-9]|2[3-6]|27[01]|2720)/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'discover';
  if (/^3(0[0-5]|[68])/.test(digits)) return 'diners';
  if (/^35/.test(digits)) return 'jcb';
  return null;
}

export interface BrandMark {
  /** Short label or currency symbol rendered on the tile. */
  label: string;
  color: string;
  textColor: string;
  /** Slightly smaller font for word labels vs. single symbols. */
  isWord?: boolean;
}

export const CARD_MARKS: Record<Exclude<CardNetwork, 'mastercard'>, BrandMark> = {
  visa: { label: 'VISA', color: '#1A1F71', textColor: '#FFFFFF', isWord: true },
  amex: { label: 'AMEX', color: '#2E77BC', textColor: '#FFFFFF', isWord: true },
  discover: { label: 'DISC', color: '#E55C20', textColor: '#FFFFFF', isWord: true },
  diners: { label: 'DC', color: '#0079BE', textColor: '#FFFFFF', isWord: true },
  jcb: { label: 'JCB', color: '#0B4EA2', textColor: '#FFFFFF', isWord: true },
};

const CRYPTO_MARKS: [RegExp, BrandMark][] = [
  [/bitcoin\s*cash|bch/, { label: 'Ƀ', color: '#8DC351', textColor: '#FFFFFF' }],
  [/bitcoin|btc/, { label: '₿', color: '#F7931A', textColor: '#FFFFFF' }],
  [/ethereum|eth\b/, { label: 'Ξ', color: '#627EEA', textColor: '#FFFFFF' }],
  [/solana|sol\b/, { label: '◎', color: '#9945FF', textColor: '#FFFFFF' }],
  [/cardano|ada\b/, { label: '₳', color: '#0033AD', textColor: '#FFFFFF' }],
  [/litecoin|ltc/, { label: 'Ł', color: '#345D9D', textColor: '#FFFFFF' }],
  [/dogecoin|doge/, { label: 'Ð', color: '#C2A633', textColor: '#FFFFFF' }],
  [/ripple|xrp/, { label: 'X', color: '#23292F', textColor: '#FFFFFF' }],
  [/binance|bnb|bsc/, { label: '◆', color: '#F3BA2F', textColor: '#1A1A1A' }],
  [/polygon|matic/, { label: '⬡', color: '#8247E5', textColor: '#FFFFFF' }],
  [/tron|trx/, { label: 'T', color: '#EF0027', textColor: '#FFFFFF' }],
  [/monero|xmr/, { label: 'ɱ', color: '#F26822', textColor: '#FFFFFF' }],
  [/polkadot|dot\b/, { label: '●', color: '#E6007A', textColor: '#FFFFFF' }],
  [/avalanche|avax/, { label: 'A', color: '#E84142', textColor: '#FFFFFF' }],
  [/tether|usdt/, { label: '₮', color: '#26A17B', textColor: '#FFFFFF' }],
  [/usd\s*coin|usdc/, { label: '$', color: '#2775CA', textColor: '#FFFFFF' }],
];

/** Maps a blockchain/coin name to its brand mark; falls back to an initial tile. */
export function cryptoMark(blockchain: string | undefined): BrandMark | null {
  const name = blockchain?.trim().toLowerCase();
  if (!name) return null;
  for (const [pattern, mark] of CRYPTO_MARKS) {
    if (pattern.test(name)) return mark;
  }
  return { label: name.charAt(0).toUpperCase(), color: '#5566EE', textColor: '#FFFFFF' };
}
