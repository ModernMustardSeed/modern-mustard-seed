/**
 * Shared prompter primitives for Sarah's recording studios.
 *
 * There are two studios and they are deliberately NOT the same house:
 *   /sarah      Modern Mustard Seed  -> bucket `booth`,     publisher /admin/youtube
 *   /sarahcxc   Cross + Covenant     -> bucket `booth-cxc`, no publisher yet
 *
 * What lives here is only the part that is genuinely brand-agnostic: the shape
 * of a script, the spoken-word math, and the config a studio hands the shared
 * Prompter. Script CONTENT, storage, tabs, and theme all stay inside each
 * studio's own folder so the two can never bleed into each other. In
 * particular, MMS surfaces (the YouTube publisher and its metadata brain) read
 * the MMS script list directly, so CXC videos can never turn up in a YouTube
 * draft by accident.
 */

export type PrompterScript = {
  id: string;
  /** Studio-defined tab key, e.g. MMS 'episode' | CXC 'reel'. */
  kind: string;
  episode: string;
  session: string;
  publish: string;
  /** Studio-defined pillar label; each studio supplies its own chip styles. */
  pillar: string;
  title: string;
  hook: string;
  directorNote: string;
  /**
   * Spoken lines, in reading order. CONVENTION: a paragraph that is wholly
   * wrapped in parentheses is DIRECTION, not a spoken line. The prompter
   * renders those as a dashed "don't read aloud" block so they can never be
   * read on camera by accident. Mid-sentence parentheticals (spoken asides)
   * are left alone.
   */
  sections: { heading: string; paragraphs: string[] }[];
};

/**
 * A whole paragraph wrapped in parentheses is DIRECTION, not a spoken line.
 * Single source of truth for both the render and the spoken-word math.
 */
export function isDirectionLine(p: string): boolean {
  const t = p.trim();
  return t.length > 2 && t.startsWith('(') && t.endsWith(')');
}

export function scriptWordCount(s: PrompterScript): number {
  return s.sections
    .flatMap((sec) => sec.paragraphs)
    .filter((p) => !isDirectionLine(p)) // direction is not spoken
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Spoken-delivery estimate at ~140 wpm, returned in seconds. */
export function scriptEstSeconds(s: PrompterScript): number {
  return Math.round((scriptWordCount(s) / 140) * 60);
}

export function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const sec = Math.max(0, Math.round(totalSeconds % 60));
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export type StudioTheme = {
  /** Page and prompter background. Dark on purpose: it is a reading surface. */
  night: string;
  /** Big spoken text, and the paper of the library cards. */
  cream: string;
  /** Primary accent: reading line, play button, active tab. */
  accent: string;
  /** Border/type color that sits on the accent and on cream. */
  ink: string;
  /** Secondary accent used for the card shadow and the eyebrow label. */
  accentAlt: string;
  /** Solid panel behind the takes drawer and pre-roll callouts. */
  panel: string;
  /** rgba() of `cream`, precomputed so the two brands can differ. */
  creamRgb: string;
  /** rgba() of `night`, for the focus masks. */
  nightRgb: string;
};

export type StudioConfig = {
  /** Stable id; also namespaces localStorage so settings never cross studios. */
  id: string;
  /** API base for this studio's OWN pipeline, e.g. '/api/booth-cxc'. */
  apiBase: string;
  /** Where takes land, shown to Sarah so the pipeline is never a mystery. */
  bucketLabel: string;
  kicker: string;
  title: string;
  blurb: string;
  /** Tab key -> label, in display order. */
  tabs: readonly (readonly [string, string])[];
  /** Pillar -> Tailwind chip classes. Unknown pillars fall back safely. */
  pillarStyles: Record<string, string>;
  scripts: PrompterScript[];
  theme: StudioTheme;
  /** Which reading-line mark to draw. */
  mark: 'seed' | 'cross' | 'sun';
  endCard: { title: string; creed: string };
  /** The finished-cuts destination. Null when the studio has no publisher yet. */
  publisher: { href: string; label: string } | null;
  /** Copy for the finished-cuts empty state. */
  finalsEmpty: string;
};
