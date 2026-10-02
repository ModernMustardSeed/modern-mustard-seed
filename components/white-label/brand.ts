/** Small brand helpers shared by the white label demo's client components. */

export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** Black or white text on a brand color, by relative luminance. */
export function inkFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#111111' : '#ffffff';
}

/** A brand color dark enough to read as text on white; light brands fall back to near-black. */
export function textOnWhite(hex: string): string {
  return inkFor(hex) === '#111111' ? '#1f2937' : hex;
}

export function initials(name: string): string {
  const w = name.replace(/[^A-Za-z0-9 &]/g, ' ').split(/\s+/).filter((x) => x && x !== '&');
  return ((w[0]?.[0] ?? 'A') + (w[1]?.[0] ?? '')).toUpperCase();
}

export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}’` : `${name}’s`;
}
