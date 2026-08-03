/**
 * The business's own name, rendered the way the owner would write it.
 *
 * Every forged surface talks ABOUT the business constantly ("this is X's
 * command center", "X's demos are being forged", "puts me on X's real line"),
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
