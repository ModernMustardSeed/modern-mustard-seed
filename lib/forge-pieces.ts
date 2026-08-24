/**
 * WHICH PIECES A CALLER ASKED FOR, AND THE ONLY PLACE THAT DECIDES IT.
 *
 * Split out of `lib/voice-forge-suite.ts` so it can be unit tested without
 * dragging in `next/server`, Supabase and Resend. That is not a cosmetic
 * refactor: this is the function that decides what gets built for a live caller
 * and it went eleven days with nothing exercising it at all (see below).
 *
 * Sarah 2026-08-13: "it is currently making the whole demo forge, so even the
 * website and command center even if they just want a voice agent and not a
 * website. i want to make just the one thing they asked for, so have him ask
 * sales questions to see exactly what they need and just make that."
 *
 * Two reasons that matters beyond the obvious. A website build is the only
 * expensive leg (a headless builder plus a film cut, ~20-40 min of worker
 * floor), so forging one nobody asked for burns the daily ceiling on a lead who
 * will never look at it. And since 2026-08-13 the command center is billable
 * outside the bundle, so shipping it unasked contradicts the price he just
 * quoted on the phone.
 *
 * The wire words are his words; the values are the SAME keys the order card,
 * `quoteDemoOrder` and `demo-provision` already use, so a partial forge prices
 * and provisions itself with no translation layer.
 */

export const FORGE_PIECES = {
  voice_agent: 'voice',
  website: 'site',
  command_center: 'os',
} as const;

export type ForgePiece = (typeof FORGE_PIECES)[keyof typeof FORGE_PIECES];

/** Canonical order, so two callers who asked for the same things get the same
 *  answer regardless of what order they said them in. */
export const PIECE_ORDER: ForgePiece[] = ['voice', 'site', 'os'];

/** What each piece is called out loud, for his instruction field and the email. */
export const PIECE_LABEL: Record<ForgePiece, string> = {
  voice: 'voice agent',
  site: 'website',
  os: 'command center',
};

/** Instant vs queued. Only the website goes to the worker floor, and only the
 *  website earns the "within the hour" promise or a walkthrough film. */
export const INSTANT: Record<ForgePiece, boolean> = { voice: true, site: false, os: true };

/**
 * THIS IS THE ONLY ENFORCEMENT POINT FOR `build`, AND IT IS PERMISSIVE ON PURPOSE.
 *
 * The tool schema used to carry an enum inside `items` so the shape was
 * "guaranteed" at the edge. It was not. Vapi handed the model a tool it could
 * select and could not fill, and `forge_demo_suite` arrived at the webhook as
 * the literal `{}` on 16 attempts out of 16 across 4 real calls between
 * 2026-08-13 and 2026-08-24. A schema violation on a phone line is not a 400
 * anybody sees: it is a caller being apologized to.
 *
 * So the schema now declares a plain array of strings (see the comment on
 * `build` in scripts/setup-vapi-mustard.mjs) and every ounce of validation
 * lives here, where a near miss costs nothing. Anything a language model might
 * plausibly say for one of the three pieces resolves to that piece. Anything
 * genuinely unrecognisable still returns empty and still bounces, because
 * building a piece nobody asked for is the one failure that is worse than
 * asking one more question.
 */
export function piecesFrom(build: unknown): ForgePiece[] {
  /* Flatten whatever arrived. An array is the contract, but a model that writes
   * "voice_agent, website" or "voice agent and a website" as ONE string has
   * still told us exactly what to build, and splitting on separators is free.
   * Nested arrays and objects are flattened for the same reason. */
  const flat: string[] = [];
  const push = (v: unknown): void => {
    if (Array.isArray(v)) {
      v.forEach(push);
      return;
    }
    if (v === null || v === undefined) return;
    if (typeof v === 'object') {
      Object.values(v as Record<string, unknown>).forEach(push);
      return;
    }
    /* Split on commas, slashes, pipes, plus signs, ampersands and the
     * standalone word "and". ⚠️ The word boundaries on `\band\b` are load
     * bearing: without them this splits "command_center" into "comm" and
     * "_center" and the most common value in the whole vocabulary stops
     * resolving. */
    for (const part of String(v).split(/\s*(?:,|\/|\||\+|&|\band\b)\s*/i)) {
      const t = part.trim();
      if (t) flat.push(t);
    }
  };
  push(build);

  const out = new Set<ForgePiece>();
  for (const raw of flat) {
    const k = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');

    // The exact wire vocabulary first, so the happy path never touches a regex.
    if (k in FORGE_PIECES) {
      out.add(FORGE_PIECES[k as keyof typeof FORGE_PIECES]);
      continue;
    }

    /* ⚠️ THE "EVERYTHING" TEST RUNS BEFORE THE INDIVIDUAL ONES, and the order is
     * load bearing. "the whole talking website" contains "website", so checking
     * the individual patterns first would resolve the flagship to a bare site
     * and quietly drop the two pieces the caller actually asked for. None of
     * these words appear in `voice_agent`, `website` or `command_center`, so
     * putting this first cannot swallow a single-piece request. */
    if (/(^|_)(all|everything|whole|suite|bundle|talking_website|the_lot)($|_)/.test(k)) {
      PIECE_ORDER.forEach((p) => out.add(p));
      continue;
    }

    // He is a language model on a phone line, so accept the obvious near misses
    // rather than bouncing a real request back at a live caller.
    if (/(voice|agent|phone|receptionist|answering)/.test(k)) out.add('voice');
    else if (/(site|web)/.test(k)) out.add('site');
    else if (/(^os$|command|back_?office|dashboard|crm)/.test(k)) out.add('os');
  }

  return PIECE_ORDER.filter((p) => out.has(p));
}

/** "a voice agent", "a website and a command center", "all three". */
export function listPieces(pieces: ForgePiece[]): string {
  const names = pieces.map((p) => PIECE_LABEL[p]);
  if (names.length <= 1) return names[0] ?? 'nothing';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}
