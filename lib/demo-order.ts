/**
 * "Order it right there" catalog for the forged-demo surfaces.
 *
 * A prospect watching their own demo buys on the spot: monthly plan + one-time
 * setup, month to month, cancel anytime, no trials (the demo was the trial).
 * We customize after purchase and release within 7 days.
 *
 * Every piece is individually purchasable.
 *
 * THE COMMAND CENTER IS OFF THE SUITE AND OFF THE BUNDLE (Sarah, 2026-08-22).
 * It is still sold, at its own price, on its own page, through its own pay
 * link. What it is no longer is bundled, waived, forged automatically, or
 * suggested alongside anything else. Her reason, in her words: clients just
 * want it done, most already run software for it, and it is not perfected yet.
 * An offer that cannot ship clean poisons the two that can.
 *
 * So DEMO_ORDER_KEYS (what the demo suite offers) and PRICEABLE_KEYS (what a
 * pay link can quote) are now DIFFERENT LISTS, and that gap is the feature.
 * Anything that suggests, forges, bundles or waives the command center is a
 * regression, not an improvement.
 *
 * Pricing locked by Sarah 2026-07-11. REPRICED 2026-07-29: voice $397/$397,
 * website $497/$147, and the pair became THE TALKING WEBSITE at $497/$497. The
 * bundle price did NOT move when the command center came out of it on
 * 2026-08-22: it was always priced as the two paid pieces, and the ladder check
 * below still holds. All amounts in cents.
 */

import { demoAgentTiers } from '@/data/demo-agent';

export type DemoProductKey = 'voice' | 'site' | 'os' | 'cornerstone';

export type DemoProduct = {
  key: DemoProductKey;
  name: string;
  setupCents: number;
  monthlyCents: number;
  blurb: string;
  finePrint?: string;
  /** True when this piece is sold but deliberately kept OUT of the demo suite
   *  and out of every bundle. Surfaces render a standalone price with no
   *  cross-sell attached. */
  standaloneOnly?: boolean;
};

export const DEMO_PRODUCTS: Record<DemoProductKey, DemoProduct> = {
  voice: {
    key: 'voice',
    name: 'Voice Agent',
    setupCents: 39700,
    monthlyCents: 39700,
    blurb: 'The voice that answered your demo, answering your calls, 24/7.',
    finePrint: `${demoAgentTiers[0].minutesCap.toLocaleString()} answered minutes a month, then message-taking mode.`,
  },
  site: {
    key: 'site',
    name: 'Your New Website',
    setupCents: 49700,
    monthlyCents: 14700,
    blurb: 'The site you just toured, customized to your business and put live on your domain.',
    // Edits are unlimited and never metered (migration 078). Domain, hosting and
    // care ride along.
    finePrint: 'Unlimited edits, before it goes live and forever after. Your domain, hosting, and care all included.',
  },
  cornerstone: {
    key: 'cornerstone',
    name: 'Cornerstone',
    setupCents: 49700,
    monthlyCents: 39700,
    standaloneOnly: true,
    blurb:
      'A crew of agents that works your jobs overnight and hands you one report at 5am. Your jobs, your money, your paperwork and the enquiries off your website, on one board.',
    // standaloneOnly for the same reason as the command center: it is scoped
    // with the builder first, it is not part of the demo suite, and it must
    // never be bundled. The ladder invariant above only governs the suite, and
    // this sits outside it.
    finePrint:
      'Set up with your jobs, your subs and your contracts loaded before you sign in. Unlimited changes, always included.',
  },
  os: {
    key: 'os',
    name: 'Business Command Center',
    setupCents: 49700,
    monthlyCents: 19700,
    standaloneOnly: true,
    blurb: 'Your back office: every call transcribed, your website traffic and leads, customers, reviews, and money on one board.',
    finePrint: 'Sold on its own and built by hand, scoped with you first. It is not part of the demo suite and it is never bundled.',
  },
};

/**
 * THE TALKING WEBSITE: both paid pieces, built as one thing. A website that
 * answers its own phone, in the same voice, off the same brain. This is the
 * flagship offer.
 *
 * The bundle must stay AT OR ABOVE the priciest single AND below the two-piece
 * sum, or a la carte becomes irrational and every bundle leaks. Ladder check at
 * $497 + $497/mo: setup $497 = $497 (site, the priciest single) and < $894
 * (pair), so the bundle absorbs the voice build but is never cheaper than a
 * piece of it; monthly $497 > $397 (voice, the priciest single) and < $544
 * (pair). No path buys more for less. Re-run this check every time a single
 * price moves. All surfaces derive from DEMO_PRODUCTS / DEMO_BUNDLE.
 *
 * THE PRICE DID NOT MOVE when the command center left the bundle on 2026-08-22,
 * because the bundle was always priced as the two paid pieces and the ladder
 * above never counted the command center. What went away is a freebie on top,
 * not a discount, and the dominated cart that freebie created went with it.
 */
export const DEMO_BUNDLE = {
  key: 'bundle' as const,
  name: 'The Talking Website',
  setupCents: 49700,
  monthlyCents: 49700,
  blurb:
    'A website that answers its own phone. Your site and your voice agent built as one thing, off one brain, so every call and every form lands in the same place.',
};

/**
 * What the demo suite offers, in display order.
 *
 * THE COMMAND CENTER IS NOT ON THIS LIST and must not go back on it without
 * Sarah saying so. It is still sold; it is just not part of the suite, not in
 * the bundle, and never suggested alongside anything. See PRICEABLE_KEYS.
 */
export const DEMO_ORDER_KEYS: DemoProductKey[] = ['voice', 'site'];

/**
 * What a price can be quoted for, which is wider than what the suite offers.
 *
 * The command center lives here and not in DEMO_ORDER_KEYS: /pay/command-center
 * still has to mint a real Stripe session at a real price, and Sarah still
 * builds them by hand. Taking something off the menu is not the same as taking
 * it off the price list.
 */
export const PRICEABLE_KEYS: DemoProductKey[] = ['voice', 'site', 'os', 'cornerstone'];

export type DemoOrderQuote = {
  /** normalized selection; ['bundle'] when both paid pieces are picked */
  products: string[];
  label: string;
  setupCents: number;
  monthlyCents: number;
  isBundle: boolean;
};

/**
 * Normalize a selection into a priced quote. Both paid pieces on their own = the
 * bundle. Every other selection bills each piece in it at its own price.
 * NOTHING IS EVER WAIVED ANY MORE. Returns null when nothing is picked.
 *
 * It filters against PRICEABLE_KEYS rather than DEMO_ORDER_KEYS, so a
 * standalone command center still quotes even though the suite no longer
 * offers it.
 */
export function quoteDemoOrder(selection: string[]): DemoOrderQuote | null {
  const picked = PRICEABLE_KEYS.filter((k) => selection.includes(k));
  if (picked.length === 0) return null;
  const hasVoice = picked.includes('voice');
  const hasSite = picked.includes('site');
  // The Talking Website is exactly the two paid pieces. A command center added
  // deliberately alongside them is not part of it and bills on top, because
  // there is no waiver left anywhere in this file.
  if (hasVoice && hasSite && picked.length === 2) {
    return {
      products: ['bundle'],
      label: DEMO_BUNDLE.name,
      setupCents: DEMO_BUNDLE.setupCents,
      monthlyCents: DEMO_BUNDLE.monthlyCents,
      isBundle: true,
    };
  }
  // Nothing is waived anywhere: every picked piece is billable at its own price.
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
