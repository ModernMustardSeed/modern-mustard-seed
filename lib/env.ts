/**
 * READING AN ENVIRONMENT VARIABLE THAT MIGHT BE A PLACEHOLDER.
 *
 * ── THE BUG THIS EXISTS TO KILL ──────────────────────────────────────────────
 * `vercel env pull` writes the literal string `[SENSITIVE]` in place of any
 * value marked sensitive. On 2026-08-12 that overwrote 63 of 85 variables in
 * this repo's .env.local. The damage was not that the values went missing; it
 * was that they went missing WHILE STAYING TRUTHY.
 *
 * So this, which looks careful and is not:
 *
 *   (process.env.VAPI_MUSTARD_ASSISTANT_ID || '').trim() || MUSTARD_FALLBACK
 *
 * sails straight past its own fallback, because "[SENSITIVE]" is not empty. It
 * then sends the string "[SENSITIVE]" to Vapi as an assistant id, gets a 404,
 * and reports `assistant_unavailable`, which reads exactly like the assistant
 * being deleted. It cost an afternoon of looking in the wrong place.
 *
 * A missing value should behave like a missing value. That is all this does.
 *
 * ── ALSO CATCHES THE OTHER PLACEHOLDERS ──────────────────────────────────────
 * The same class of failure comes from a .env.example copied without editing,
 * so the obvious stand-ins are treated as absent too. Being wrong in this
 * direction is cheap: the caller falls back or reports "not configured".
 * Being wrong in the other direction is a 404 nobody can explain.
 */

const PLACEHOLDER = /^(\[SENSITIVE\]|changeme|your[_-]?\w*[_-]?(key|token|id|secret)[_-]?here|xxx+|todo|tbd|<[^>]+>)$/i;

/** The value, or null if it is absent, blank, or an obvious placeholder. */
export function env(name: string): string | null {
  const raw = process.env[name];
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v || PLACEHOLDER.test(v)) return null;
  return v;
}

/** The first name that holds a real value, or null. For aliased variables. */
export function envAny(...names: string[]): string | null {
  for (const n of names) {
    const v = env(n);
    if (v) return v;
  }
  return null;
}

/** True when a placeholder is sitting where a real value should be. */
export function isPlaceholder(value: string | null | undefined): boolean {
  const v = String(value ?? '').trim();
  return Boolean(v) && PLACEHOLDER.test(v);
}

/**
 * Every name that is present but holding a placeholder.
 *
 * Reported by the preflight and the rehearsal so a clobbered environment says
 * so out loud, rather than being discovered one confusing 404 at a time.
 */
export function placeholderVars(names: string[]): string[] {
  return names.filter((n) => isPlaceholder(process.env[n]));
}
