/**
 * US and Canadian phone numbers only, in E.164.
 *
 * Why this exists (2026-09-24): on 2026-09-19 one IP asked Mr. Mustard to call
 * (649) 345-2024 and (664) 494-1200, eighteen seconds apart, and he dialed both.
 * Those look like US numbers but ring in Turks and Caicos and Montserrat, where
 * a call bills at international rates and the fraudster takes a cut of every
 * minute. Twenty-odd Caribbean and Pacific area codes share the +1 prefix, so a
 * check that only counts ten digits lets all of them through.
 *
 * Every dialer, SMS sender and callback form converts numbers through here, so
 * one list closes the hole everywhere.
 */

/** +1 area codes that ring outside the US and Canada, or bill as premium. */
const BLOCKED_AREA_CODES = new Set([
  // Caribbean nations and territories on the +1 plan
  '242', // Bahamas
  '246', // Barbados
  '264', // Anguilla
  '268', // Antigua and Barbuda
  '284', // British Virgin Islands
  '345', // Cayman Islands
  '441', // Bermuda
  '473', // Grenada
  '649', // Turks and Caicos
  '658', // Jamaica
  '664', // Montserrat
  '721', // Sint Maarten
  '758', // Saint Lucia
  '767', // Dominica
  '784', // Saint Vincent and the Grenadines
  '809', // Dominican Republic
  '829', // Dominican Republic
  '849', // Dominican Republic
  '868', // Trinidad and Tobago
  '869', // Saint Kitts and Nevis
  '876', // Jamaica
  // Pacific territories, billed well above domestic rates
  '670', // Northern Mariana Islands
  '671', // Guam
  '684', // American Samoa
  // Premium rate
  '900',
]);

/** The ten national digits, or null when the input is not a +1 number. */
function nationalDigits(raw: string | null | undefined): string | null {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 10) return d;
  if (d.length === 11 && d[0] === '1') return d.slice(1);
  return null;
}

/**
 * "(406) 202-1451" -> "+14062021451". Null for anything that is not a real,
 * dialable US or Canadian number, including the premium area codes above.
 */
export function toE164(raw: string | null | undefined): string | null {
  const n = nationalDigits(raw);
  if (!n) return null;
  // A real area code and exchange never start with 0 or 1.
  if (n[0] < '2' || n[3] < '2') return null;
  // N11 codes (211, 311 ... 911) are service codes, never area codes.
  if (n[1] === '1' && n[2] === '1') return null;
  if (BLOCKED_AREA_CODES.has(n.slice(0, 3))) return null;
  return `+1${n}`;
}

/** True when the input is a +1 number refused only because of where it rings. */
export function isBlockedPremiumNumber(raw: string | null | undefined): boolean {
  const n = nationalDigits(raw);
  return !!n && BLOCKED_AREA_CODES.has(n.slice(0, 3));
}
