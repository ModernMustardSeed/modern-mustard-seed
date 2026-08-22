/**
 * "Order it right there" catalog for the forged-demo surfaces.
 *
 * A prospect watching their own demo buys on the spot: monthly plan + one-time
 * setup, month to month, cancel anytime, no trials (the demo was the trial).
 * We customize after purchase and release within 7 days.
 *
 * Every piece is individually purchasable. The Business Command Center has its
 * own price ($497 + $197/mo) and it is WAIVED (free) in exactly one place: THE
 * TALKING WEBSITE, where the buyer takes both paid pieces. One paid piece alone
 * does not earn it.
 *
 * Pricing locked by Sarah 2026-07-11; command center made free-with-either
 * 2026-07-22, kept individually purchasable (price waived when paired).
 * REPRICED by Sarah 2026-07-29: voice $397/$397, website $497/$147, command
 * center unchanged, and the pair became THE TALKING WEBSITE at $497/$497.
 * NARROWED by Sarah 2026-08-13: the command center is free with the website AND
 * the voice agent, not with either one. It is the reward for taking the whole
 * system, which is what makes the flagship the flagship. All amounts in cents.
 */

import { sidekickTiers } from '@/data/sidekick';

export type DemoProductKey = 'voice' | 'site' | 'os';

export type DemoProduct = {
  key: DemoProductKey;
  name: string;
  setupCents: number;
  monthlyCents: number;
  blurb: string;
  finePrint?: string;
  /** Its price is waived (free) only inside the bundle, where both paid pieces ride. */
  freeInBundle?: boolean;
};

export const DEMO_PRODUCTS: Record<DemoProductKey, DemoProduct> = {
  voice: {
    key: 'voice',
    name: 'Voice Agent',
    setupCents: 39700,
    monthlyCents: 39700,
    blurb: 'The voice that answered your demo, answering your calls, 24/7.',
    finePrint: `${sidekickTiers[0].minutesCap.toLocaleString()} answered minutes a month, then message-taking mode. Add the website and the command center comes free with both.`,
  },
  site: {
    key: 'site',
    name: 'Your New Website',
    setupCents: 49700,
    monthlyCents: 14700,
    blurb: 'The site you just toured, customized to your business and put live on your domain.',
    // Edits are unlimited and never metered (migration 078). Domain, hosting and
    // care ride along; the command center does not, it comes free with both pieces.
    finePrint: 'Unlimited edits, before it goes live and forever after. Your domain, hosting, and care all included.',
  },
  os: {
    key: 'os',
    name: 'Business Command Center',
    setupCents: 49700,
    monthlyCents: 19700,
    freeInBundle: true,
    blurb: 'Your back office: every call transcribed, your website traffic and leads, customers, reviews, and money on one board.',
    finePrint: 'Free when you take the website and the voice agent together. On its own, or alongside one piece, it is its own price.',
  },
};

/**
 * THE TALKING WEBSITE: BOTH paid pieces, and the command center rides free
 * inside it. A website that answers its own phone, in the same voice, off the
 * same brain. This is the flagship offer and the whole cross-sell.
 *
 * The bundle must stay AT OR ABOVE the priciest single AND below the
 * two-paid-piece sum, or a la carte becomes irrational and every bundle leaks.
 * Repriced 2026-07-29 (Sarah): $497 + $497/mo. Ladder check: setup $497 = $497
 * (site, the priciest single) and < $894 (pair), so the bundle absorbs the
 * voice build for free but is never cheaper than a piece of it; monthly $497 >
 * $397 (voice, the priciest single) and < $544 (pair). No path buys more for
 * less. Re-run this check every time a single price moves. All surfaces derive
 * from DEMO_PRODUCTS / DEMO_BUNDLE.
 *
 * Since 2026-08-13 the command center is billable outside this bundle, which
 * makes one cart dominated on purpose: voice + a paid command center is $894
 * setup and $594 a month, more money for less product than the whole system at
 * $497 and $497. That is a signpost, not a trap, so commandCenterUpsell() exists
 * and every ordering surface must show it. A buyer who lands in that cart has to
 * be told the bundle costs less, in the moment, before they pay.
 */
export const DEMO_BUNDLE = {
  key: 'bundle' as const,
  name: 'The Talking Website',
  setupCents: 49700,
  monthlyCents: 49700,
  blurb:
    'A website that answers its own phone. Your site and your voice agent built as one thing, off one brain, with the command center that runs both, free.',
};

/** Every orderable piece, in display order. Each can be bought on its own. */
export const DEMO_ORDER_KEYS: DemoProductKey[] = ['voice', 'site', 'os'];

/** The command center is free (its price waived) only when BOTH paid pieces are
 *  in the selection, which is the bundle. Surfaces use this to strike its price
 *  through. Changed 2026-08-13: it used to be either piece. */
export function isCommandCenterFree(selection: string[]): boolean {
  return selection.includes('os') && selection.includes('voice') && selection.includes('site');
}

/**
 * When the buyer is ONE piece away from the command center being free, name the
 * piece they are missing. Surfaces turn this into the nudge that makes the new
 * rule feel like an offer instead of a takeaway.
 *
 * This also handles the one dominated cart the narrowed rule creates: voice plus
 * a paid command center is $894 setup and $594 a month, which is more money for
 * less product than the $497/$497 bundle. Never let a buyer sit in that cart
 * without being told the whole system costs less.
 */
export function commandCenterUpsell(selection: string[]): DemoProduct | null {
  if (!selection.includes('os')) return null;
  if (isCommandCenterFree(selection)) return null;
  const hasVoice = selection.includes('voice');
  const hasSite = selection.includes('site');
  if (hasVoice && !hasSite) return DEMO_PRODUCTS.site;
  if (hasSite && !hasVoice) return DEMO_PRODUCTS.voice;
  return null;
}

export type DemoOrderQuote = {
  /** normalized selection; ['bundle'] when both paid pieces are picked */
  products: string[];
  label: string;
  setupCents: number;
  monthlyCents: number;
  isBundle: boolean;
};

/**
 * Normalize a selection into a priced quote. Both paid pieces = the bundle, and
 * the command center rides free inside it whether or not it was ticked. Any
 * other selection bills every piece in it at its own price, the command center
 * included. Returns null when nothing is picked.
 */
export function quoteDemoOrder(selection: string[]): DemoOrderQuote | null {
  const picked = DEMO_ORDER_KEYS.filter((k) => selection.includes(k));
  if (picked.length === 0) return null;
  const hasVoice = picked.includes('voice');
  const hasSite = picked.includes('site');
  // The Talking Website: both paid pieces, command center free inside it.
  if (hasVoice && hasSite) {
    return {
      products: ['bundle'],
      label: DEMO_BUNDLE.name,
      setupCents: DEMO_BUNDLE.setupCents,
      monthlyCents: DEMO_BUNDLE.monthlyCents,
      isBundle: true,
    };
  }
  // Outside the bundle nothing is waived: every picked piece is billable.
  const billable = picked;
  const items = billable.map((k) => DEMO_PRODUCTS[k]);
  return {
    products: billable,
    label: items.map((i) => i.name).join(' + '),
    setupCents: items.reduce((s, i) => s + i.setupCents, 0),
    monthlyCents: items.reduce((s, i) => s + i.monthlyCents, 0),
    isBundle: false,
  };
}

export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}
