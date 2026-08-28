/**
 * The business's own name, rendered the way the owner would write it.
 *
 * Every built surface talks ABOUT the business constantly ("this is X's
 * command center", "X's demos are being built", "puts me on X's real line"),
 * and every one of them built the possessive by hand as `${business}'s`. That
 * is wrong for the large share of real business names that already end in s:
 * Olivia's Chocolates became "Olivia's Chocolates's command center" on the
 * command center's welcome screen (found 2026-08-03 in the funnel test). A name
 * we get wrong on the first screen is the fastest way to look like a template.
 *
 * The rule, in the order it is applied:
 *   1. Already possessive ("Joe's", "Sadie's") -> leave it alone. "This is
 *      Joe's command center" is already the sentence you wanted.
 *   2. Ends in s ("Olivia's Chocolates", "The Palmers") -> bare apostrophe.
 *      Correct for plurals and the accepted house style for singulars.
 *   3. Anything else -> 's.
 *
 * Use `possessive()` when the name is followed by a noun. Never hand-write
 * `${name}'s` again; that is the bug this file exists to end.
 */

/** "Olivia's Chocolates" -> "Olivia's Chocolates'". "Miller Roofing" -> "Miller Roofing's". */
export function possessive(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  if (!n) return '';
  // Straight or curly apostrophe, either case: the name already reads possessive.
  if (/['’]s$/i.test(n)) return n;
  if (/s$/i.test(n)) return `${n}'`;
  return `${n}'s`;
}

/**
 * The same thing when the sentence needs a lowercase joiner instead: "the
 * command center for X". Kept beside possessive() so a caller who finds the
 * apostrophe form awkward has the honest alternative in reach rather than
 * inventing a third spelling.
 */
export function forBusiness(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  return n ? `for ${n}` : '';
}

/**
 * A person's name, cased the way a person writes it.
 *
 * We greet clients with whatever string the payment processor or a form gave
 * us, and people type their own name in lowercase constantly. A buyer paid on
 * 2026-08-03 and their portal opened with "Welcome back, peter." three times
 * over, which reads like a database talking, not a studio.
 *
 * Only ALL-lowercase words are touched. A name the owner deliberately cased
 * (McDonald, DeAngelo, van Ruysdael, JJ) is left exactly as written, because
 * naive title case mangles far more real names than it fixes.
 */
export function properName(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .split(/(\s+|-)/)
    .map((part) => (/^[a-z][a-z'’]*$/.test(part) ? part[0].toUpperCase() + part.slice(1) : part))
    .join('');
}

/**
 * "a" or "an" for a word we do not know until render time.
 *
 * Same family of bug as the possessive: our copy hard-codes the article and the
 * trade fills the noun. Four of the trade presets have a jobWord starting with a
 * vowel (order, and appointment three times over), so the command center demo
 * shipped "wants a quote on a order", "Pricing on a order" and "Emergency a
 * appointment" to every bakery, dental, medspa and salon lead we built.
 *
 * Heuristic, deliberately: English articles follow SOUND, not spelling, and no
 * trade noun we ship needs more than this. The exceptions below are the ones
 * that actually bite ("a one-off", "an hour", "a used unit").
 */
const SOUNDS_CONSONANT = /^(one|once|uni|use|user|usual|utili|euro|ewe)/i;
const SOUNDS_VOWEL = /^(hour|honest|honor|heir)/i;

export function article(word: string | null | undefined): string {
  const w = (word ?? '').trim();
  if (!w) return 'a';
  if (SOUNDS_VOWEL.test(w)) return 'an';
  if (SOUNDS_CONSONANT.test(w)) return 'a';
  return /^[aeiou]/i.test(w) ? 'an' : 'a';
}

/** "an order", "a job". Capitalized input keeps its capital: "An order". */
export function withArticle(word: string | null | undefined): string {
  const w = (word ?? '').trim();
  if (!w) return '';
  const art = article(w);
  return `${/^[A-Z]/.test(w) ? art[0].toUpperCase() + art.slice(1) : art} ${w}`;
}

/**
 * Fill a `{job}`-style token AND repair the article our template hard-coded in
 * front of it. Do this rather than fixing the twenty template strings by hand:
 * the strings are the copy, and copy gets rewritten by whoever is closest to it.
 * The grammar should not be their problem.
 */
export function fillNoun(text: string, token: string, word: string): string {
  const tok = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .replace(new RegExp(`\\b([Aa])n?\\s+${tok}`, 'g'), (_m, a: string) => {
      const art = article(word);
      return `${a === 'A' ? art[0].toUpperCase() + art.slice(1) : art} ${word}`;
    })
    .replace(new RegExp(tok, 'g'), word);
}
