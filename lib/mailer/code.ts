/**
 * The short code printed on a postcard.
 *
 * It gets typed by hand off paper, sometimes by a 58-year-old roofer standing
 * at a truck, so the alphabet has no 0/O, no 1/I/L, and no vowels (an alphabet
 * with vowels eventually prints a word somebody complains about). Seven
 * characters over a 29-letter alphabet is 17 billion codes: unguessable enough
 * that a stranger cannot walk the list, short enough to read aloud.
 *
 * modernmustardseed.com/y/K7HFM2Q
 */

const ALPHABET = '23456789BCDFGHJKMNPQRSTVWXYZ';

export function newMailCode(): string {
  let out = '';
  const bytes = new Uint8Array(7);
  (globalThis.crypto as Crypto).getRandomValues(bytes);
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/**
 * Accept what a human types: lowercase, spaces, and the four confusions the
 * alphabet was designed to avoid. Someone reading "K7HFM2Q" off a card in bad
 * light will type an O for a Q about one time in fifty, and that visit is worth
 * more than the purity of the input.
 */
export function normalizeMailCode(raw: string): string | null {
  const up = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fixed = up
    .replace(/[O0]/g, 'Q')
    .replace(/[IL1]/g, 'J')
    .replace(/U/g, 'V');
  if (fixed.length !== 7) return null;
  if (![...fixed].every((c) => ALPHABET.includes(c))) return null;
  return fixed;
}

export function mailUrl(code: string, origin = 'https://modernmustardseed.com'): string {
  return `${origin}/y/${code}`;
}
