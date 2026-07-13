/**
 * Make the command center wear the same clothes as the business's own forged
 * website, so the two demos read as one product THEY own (Sarah, 2026-07-12).
 *
 * Two ways in, in order of trust:
 *   1. The worker is instructed (see buildSiteBrief) to emit an explicit
 *      <meta name="mms-palette" content='{"bg":"#0b0f14","accent":"#e4572e",...}'>
 *      in the site it builds. That is the ground truth: the designer telling us
 *      its own palette, no guessing.
 *   2. Older sites (and any build that forgets the tag) get scraped: count the
 *      colors the CSS actually uses, take the dominant background and the most
 *      saturated non-neutral as the accent.
 *
 * Everything downstream is DERIVED (surfaces, hairlines, text, contrast), so a
 * site can hand us two colors and still get a legible, on-brand command center.
 * A dark site yields a dark OS, a cream site yields a light OS.
 */

export type SitePalette = {
  bg: string;
  accent: string;
};

/** The full token set the OS renders against. */
export type OsTheme = {
  ink: string; // app canvas
  panel: string; // card surface
  panelSoft: string; // inset surface
  line: string; // hairline
  text: string; // primary text
  dim: string; // secondary text
  accent: string; // the business's own accent
  accentSoft: string; // accent at low alpha, for fills
  accentInk: string; // text that sits ON the accent
  isDark: boolean;
};

/** The house midnight deck. Used whenever there is no site to borrow from. */
export const DEFAULT_OS_THEME: OsTheme = {
  ink: '#0e1220',
  panel: '#161c30',
  panelSoft: '#1c2338',
  line: 'rgba(232,236,248,0.09)',
  text: '#e8ecf8',
  dim: 'rgba(232,236,248,0.55)',
  accent: '#f5b700',
  accentSoft: 'rgba(245,183,0,0.12)',
  accentInk: '#161616',
  isDark: true,
};

/* ────────────────────────────── color math ────────────────────────────── */

function parseHex(raw: string): [number, number, number] | null {
  let h = raw.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** WCAG relative luminance. */
function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Distance from gray. Neutrals make terrible accents. */
function saturation(rgb: [number, number, number]): number {
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  return max === 0 ? 0 : (max - min) / max;
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${a})`;
}

/* ────────────────────────────── extraction ────────────────────────────── */

/**
 * The content is JSON, so it is full of double quotes and is normally delimited
 * with single quotes: content='{"bg":"#0b0f14"}'. A naive ["']([^"']+)["'] stops
 * dead at the first quote INSIDE the JSON, so the delimiters must be matched as
 * a pair. (This was silently broken and only looked fine because the scraper
 * happened to read the colors back out of the tag's own text.)
 */
const META_RE = /<meta[^>]+name=["']mms-palette["'][^>]*content=(?:'([^']*)'|"([^"]*)")/i;
const HEX_RE = /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi;

/**
 * Pull the site's palette out of the HTML the worker wrote. Returns null when
 * the HTML gives us nothing usable, so the caller falls back to the house deck
 * rather than rendering something illegible.
 */
export function extractPalette(html: string | null | undefined): SitePalette | null {
  if (!html) return null;

  // 1. The explicit tag: the designer told us directly.
  const meta = html.match(META_RE);
  if (meta) {
    try {
      const raw = JSON.parse((meta[1] ?? meta[2] ?? '').replace(/&quot;/g, '"')) as Record<string, string>;
      const bg = parseHex(raw.bg ?? '');
      const accent = parseHex(raw.accent ?? '');
      if (bg && accent) return { bg: toHex(bg), accent: toHex(accent) };
    } catch {
      /* malformed tag: fall through to scraping */
    }
  }

  // 2. Scrape (legacy sites built before we required the tag).
  //
  // Frequency alone is a trap. Ranking by "most-used low-saturation color" picks
  // the TEXT color on a white site (#222 is written more often than #fff), and a
  // site whose only muted color is its ink ends up treating the orange CTA as the
  // page background. So do not guess the background: read it. If the document
  // does not actually declare one, return null and let the caller fall back to
  // the house deck. A wrong theme is worse than the default one.
  // The worker writes real design systems: `:root{--cream:#F6EEE1}` and then
  // `body{background:var(--cream)}`. Without resolving var() every forged site
  // looks like it declares no background at all, and the whole feature no-ops.
  const vars = new Map<string, string>();
  for (const v of html.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{3,8})\b/gi)) {
    vars.set(v[1].toLowerCase(), v[2]);
  }
  const resolve = (value: string): [number, number, number] | null => {
    const direct = value.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i)?.[0];
    if (direct) return parseHex(direct);
    const ref = value.match(/var\(\s*(--[\w-]+)/i)?.[1]?.toLowerCase();
    const mapped = ref ? vars.get(ref) : undefined;
    return mapped ? parseHex(mapped) : null;
  };

  let bgRgb: [number, number, number] | null = null;
  for (const rule of html.matchAll(/(?:^|[^\w-])(?:html|body)[^{}]*\{([^{}]*)\}/gi)) {
    const decl = rule[1].match(/background(?:-color)?\s*:\s*([^;}]+)/i);
    const rgb = decl ? resolve(decl[1]) : null;
    if (rgb) {
      bgRgb = rgb;
      break;
    }
  }
  if (!bgRgb) return null;
  const bg = toHex(bgRgb);

  const counts = new Map<string, number>();
  for (const m of html.matchAll(HEX_RE)) {
    const rgb = parseHex(m[0]);
    if (!rgb) continue;
    const key = toHex(rgb);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // The accent is the most-used color that is actually vivid and actually reads
  // against that background.
  const accent = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .find(([hex]) => {
      const rgb = parseHex(hex)!;
      return saturation(rgb) > 0.35 && contrast(rgb, bgRgb) > 1.6;
    })?.[0];

  if (!accent) return null;
  return { bg, accent };
}

/* ────────────────────────────── derivation ────────────────────────────── */

/**
 * Turn two colors into the whole command center. Surfaces are lifted off the
 * background toward its opposite, so a dark site gets lighter cards and a light
 * site gets subtly deeper ones. Text is chosen for contrast, never assumed, and
 * the accent is nudged until it is actually legible on the canvas (a brand color
 * that looks great on white can vanish on its own dark site).
 */
export function themeFromPalette(p: SitePalette | null): OsTheme {
  if (!p) return DEFAULT_OS_THEME;
  const bg = parseHex(p.bg);
  let accent = parseHex(p.accent);
  if (!bg || !accent) return DEFAULT_OS_THEME;

  const isDark = luminance(bg) < 0.35;
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  const toward = isDark ? white : black;

  // Surfaces: lift off the canvas just enough to separate.
  const panel = mix(bg, toward, isDark ? 0.06 : 0.035);
  const panelSoft = mix(bg, toward, isDark ? 0.1 : 0.06);

  // Text: pick the side that actually reads, then soften the secondary.
  const text = contrast(white, bg) >= contrast(black, bg) ? white : black;
  const dim = rgba(text, 0.58);
  const line = rgba(text, isDark ? 0.09 : 0.12);

  // A brand accent is chosen against the SITE, which may not be this canvas.
  // Push it toward the readable side until it clears a real contrast bar.
  let guard = 0;
  while (contrast(accent, bg) < 2.6 && guard < 12) {
    accent = mix(accent, toward, 0.1);
    guard++;
  }

  // Text ON the accent: whichever of black/white survives it.
  const accentInk = contrast(black, accent) >= contrast(white, accent) ? '#161616' : '#ffffff';

  return {
    ink: toHex(bg),
    panel: toHex(panel),
    panelSoft: toHex(panelSoft),
    line,
    text: toHex(text),
    dim,
    accent: toHex(accent),
    accentSoft: rgba(accent, isDark ? 0.14 : 0.1),
    accentInk,
    isDark,
  };
}

/** Convenience: HTML in, theme out. */
export function themeFromSiteHtml(html: string | null | undefined): OsTheme {
  return themeFromPalette(extractPalette(html));
}
