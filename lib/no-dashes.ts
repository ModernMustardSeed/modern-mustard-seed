/**
 * NO LONG DASHES REACH A HUMAN. EVER.
 *
 * Sarah's writing standard bans the em dash and the en-dash-used-as-a-dash in
 * everything the studio sends. For copy we write ourselves that is a review
 * item. For text a language model composes at call time it cannot be, because
 * a prompt rule is a request and the model refuses it roughly one subject line
 * in three: on 2026-08-20, with "never use a long dash of any kind, in any text
 * you write" live in his prompt, Mr. Mustard still produced the subject
 * "Your Voice Agent - Ready to Get Started" with an en dash, addressed to a
 * paying customer.
 *
 * So the rule stops being advice and becomes code. Anything a model composes
 * that a person will read passes through here first.
 *
 * The replacement is chosen to read naturally rather than to merely delete the
 * character: a dash separating a title from its tagline becomes a colon, which
 * is what it was standing in for; anywhere else it becomes a comma.
 */

/** Em dash, en dash, horizontal bar, minus sign, and the double hyphen. */
const LONG_DASH = /\s*(?:--|[\u2010-\u2015\u2212])\s*/g;

/**
 * Strip long dashes from a line that titles something (an email subject).
 * The first one becomes a colon, since that is the job it was doing. Any
 * further ones become commas, because two colons in a subject reads worse
 * than the dash did.
 */
export function noDashesTitle(input: string): string {
  let first = true;
  return input
    .replace(LONG_DASH, () => {
      if (first) {
        first = false;
        return ': ';
      }
      return ', ';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Strip long dashes from running prose. Always a comma. */
export function noDashes(input: string): string {
  return input
    .replace(LONG_DASH, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();
}

/** True if the text still contains a long dash. For tests and audits. */
export function hasLongDash(input: string): boolean {
  return /(?:--|[\u2010-\u2015\u2212])/.test(input);
}
