/**
 * WHAT A PRICE LOOKS LIKE ON A PUBLIC PAGE.
 *
 * The studio stopped publishing prices on 2026-09-11 (see the boutique pass).
 * A published number is a ceiling: it anchors every conversation, including the
 * ones that should have ended in a much larger engagement.
 *
 * Six department pages kept rendering their tier prices after that pass, which
 * meant a visitor could read "no price list" on one page and a price ladder on
 * the next. These are the phrases that replace the number, in one place so the
 * whole site says it the same way.
 *
 * The real prices still live in their own data files and reach a buyer in a
 * proposal. Nothing here deletes them.
 *
 * What is NOT a price for these purposes: what a competitor charges, what a
 * human hire costs, the client's own ad spend, a market cost-per-lead. Those
 * are the buyer's numbers and they stay on the page.
 */

/** The headline that takes the price's slot on a tier card. */
export const PRICE_HEADLINE = 'Set package price';

/** The line under it. Keep it short: it sits in a mono caps slot. */
export const PRICE_CADENCE_ONCE = 'Quoted privately · One time';
export const PRICE_CADENCE_MONTHLY = 'Quoted privately · Monthly';

/** The sentence for body copy, where there is room for the whole promise. */
export const PRICE_SENTENCE =
  'Scoped in one conversation and quoted privately as a set package price, agreed in writing before work starts.';

/** Cadence helper for tier cards that carry a `cadence` field. */
export function priceCadence(cadence?: string): string {
  return cadence === 'monthly' ? PRICE_CADENCE_MONTHLY : PRICE_CADENCE_ONCE;
}
