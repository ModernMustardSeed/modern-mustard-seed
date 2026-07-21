/**
 * THE MOODBOARD, SHARED SHAPES. After a client pays and finishes intake, Sarah forges
 * a direction board from their real assets (logo, colors, photos, trade,
 * town) elevated by studio taste, sends it to their portal, and the client
 * approves it BEFORE the official site goes live.
 *
 * Taste law (Sarah, 2026-07-21): the board must never be ho-hum because the
 * client's raw assets are. Weak inputs get refined into an adjacent,
 * sophisticated direction that still feels like them.
 *
 * Mirrors lib/mustard-launch.ts: Anthropic SDK, JSON out, truncation guard,
 * sanitize hard before anything reaches a client.
 */


/* ------------------------------------------------------------------ */
/* Curated type pairings. Google Fonts only, so both the admin preview  */
/* and the portal board can actually render the letters, not name them. */
/* ------------------------------------------------------------------ */
export type FontPairing = {
  id: string;
  display: string;
  body: string;
  /** css string for a one-off <link> load of both families */
  googleQuery: string;
  vibe: string;
};

export const FONT_PAIRINGS: FontPairing[] = [
  { id: 'warm-editorial', display: 'Fraunces', body: 'Outfit', googleQuery: 'family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,400&family=Outfit:wght@300..700', vibe: 'warm editorial: cafes, bakeries, boutiques, makers' },
  { id: 'classic-luxury', display: 'Playfair Display', body: 'DM Sans', googleQuery: 'family=Playfair+Display:ital,wght@0,400..800;1,400..700&family=DM+Sans:opsz,wght@9..40,300..700', vibe: 'classic luxury: interiors, weddings, real estate, salons' },
  { id: 'modern-grotesk', display: 'Space Grotesk', body: 'Sora', googleQuery: 'family=Space+Grotesk:wght@300..700&family=Sora:wght@300..700', vibe: 'modern tech: software, studios, agencies, smart trades' },
  { id: 'soft-serif', display: 'Cormorant Garamond', body: 'Karla', googleQuery: 'family=Cormorant+Garamond:ital,wght@0,300..700;1,400..600&family=Karla:wght@300..700', vibe: 'soft and serene: spas, wellness, florists, faith' },
  { id: 'bold-worksite', display: 'Archivo Black', body: 'Archivo', googleQuery: 'family=Archivo+Black&family=Archivo:wght@300..700', vibe: 'bold worksite: roofing, concrete, auto, gyms' },
  { id: 'heritage-trust', display: 'Libre Caslon Text', body: 'Work Sans', googleQuery: 'family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Work+Sans:wght@300..700', vibe: 'heritage trust: law, finance, insurance, medicine' },
  { id: 'statement-modern', display: 'Unbounded', body: 'Manrope', googleQuery: 'family=Unbounded:wght@300..800&family=Manrope:wght@300..800', vibe: 'statement modern: launches, entertainment, youth brands' },
  { id: 'storybook-warm', display: 'Lora', body: 'Nunito Sans', googleQuery: 'family=Lora:ital,wght@0,400..700;1,400..600&family=Nunito+Sans:opsz,wght@6..12,300..800', vibe: 'storybook warmth: family care, pediatric, pets, nonprofits' },
  { id: 'industrial-condensed', display: 'Oswald', body: 'Source Sans 3', googleQuery: 'family=Oswald:wght@400..700&family=Source+Sans+3:wght@300..700', vibe: 'industrial condensed: manufacturing, logistics, outdoor' },
  { id: 'quiet-confidence', display: 'Newsreader', body: 'Figtree', googleQuery: 'family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,400&family=Figtree:wght@300..700', vibe: 'quiet confidence: consultants, architects, photographers' },
];

export function getPairing(id: string): FontPairing {
  return FONT_PAIRINGS.find((p) => p.id === id) || FONT_PAIRINGS[1];
}

/* ------------------------------------------------------------------ */
/* Payload                                                             */
/* ------------------------------------------------------------------ */
export type MoodboardSwatch = { name: string; hex: string; role: string };

export type Moodboard = {
  directionName: string;      // "Cedar and Daylight"
  directionLine: string;      // one sentence a client can say yes to
  vibeWords: [string, string, string];
  pairingId: string;          // FONT_PAIRINGS id
  palette: MoodboardSwatch[]; // 5 swatches, hex verified
  heroLine: string;           // sample headline in THEIR voice
  heroSub: string;            // sample subline
  imageryNotes: string;       // how their photos get treated
  signatureMoment: string;    // the one unforgettable thing their site gets
  motionNotes: string;        // how the site moves
  voiceNote: string;          // how the site talks
};

export type MoodboardStatus = 'none' | 'draft' | 'sent' | 'changes' | 'approved';

/* ------------------------------------------------------------------ */
/* Sanitizer. Nothing unvalidated reaches a paying client.             */
/* ------------------------------------------------------------------ */
function str(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  const clean = v.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  // Cut at a word boundary so a guard-rail truncation never shows mid-word.
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function sanitizeMoodboard(input: unknown): Moodboard | null {
  if (!input || typeof input !== 'object') return null;
  const m = input as Record<string, unknown>;

  const pairingId = FONT_PAIRINGS.some((p) => p.id === m.pairingId)
    ? (m.pairingId as string)
    : 'classic-luxury';

  const rawPalette = Array.isArray(m.palette) ? m.palette : [];
  const palette: MoodboardSwatch[] = rawPalette
    .map((s) => {
      const sw = (s || {}) as Record<string, unknown>;
      const hex = str(sw.hex, 7);
      return { name: str(sw.name, 28), hex, role: str(sw.role, 90) };
    })
    .filter((s) => HEX_RE.test(s.hex) && s.name)
    .slice(0, 6);

  const rawWords = Array.isArray(m.vibeWords) ? m.vibeWords.map((w) => str(w, 18)).filter(Boolean) : [];
  const vibeWords = [rawWords[0] || 'Warm', rawWords[1] || 'Confident', rawWords[2] || 'Handmade'] as [string, string, string];

  const board: Moodboard = {
    directionName: str(m.directionName, 44),
    directionLine: str(m.directionLine, 280),
    vibeWords,
    pairingId,
    palette,
    heroLine: str(m.heroLine, 100),
    heroSub: str(m.heroSub, 200),
    imageryNotes: str(m.imageryNotes, 480),
    signatureMoment: str(m.signatureMoment, 480),
    motionNotes: str(m.motionNotes, 280),
    voiceNote: str(m.voiceNote, 260),
  };

  if (!board.directionName || !board.directionLine || !board.heroLine || board.palette.length < 4) return null;
  return board;
}

