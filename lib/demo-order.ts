/**
 * "Order it right there" catalog for the forged-demo surfaces.
 *
 * A prospect watching their own demo buys on the spot: monthly plan + one-time
 * setup, month to month, cancel anytime, no trials (the demo was the trial).
 * We customize after purchase and release within 7 days.
 *
 * Every piece is individually purchasable. The Business Command Center has its
 * own price ($497 + $197/mo) BUT it is WAIVED (free) whenever a paid piece rides
 * with it, because a website needs a back office and so does a receptionist. So
 * the command center's price is shown, struck through, the moment the buyer adds
 * the website or the receptionist. Picking both paid pieces = the bundle.
 *
 * Pricing locked by Sarah 2026-07-11; command center made free-with-either
 * 2026-07-22, kept individually purchasable (price waived when paired).
 * All amounts in cents.
 */

export type DemoProductKey = 'voice' | 'site' | 'os';

export type DemoProduct = {
  key: DemoProductKey;
  name: string;
  setupCents: number;
  monthlyCents: number;
  blurb: string;
  finePrint?: string;
  /** Its price is waived (free) whenever a paid piece is in the same order. */
  freeWithPaid?: boolean;
};

export const DEMO_PRODUCTS: Record<DemoProductKey, DemoProduct> = {
  voice: {
    key: 'voice',
    name: 'AI Receptionist',
    setupCents: 39700,
    monthlyCents: 29700,
    blurb: 'The voice that answered your demo, on your real number, 24/7.',
    finePrint: '250 answered minutes a month, then message-taking mode. Your command center is included free.',
  },
  site: {
    key: 'site',
    name: 'Your New Website',
    setupCents: 49700,
    monthlyCents: 9700,
    blurb: 'The site you just toured, customized to your business and put live on your domain.',
    // The two free edits are now a real, counted thing (claim_revision, migration 049),
    // so the offer may finally say so out loud. Domain, hosting, care, and the command
    // center all ride along.
    finePrint: 'Two free edits before it goes live. Your domain, hosting, care, and command center all included.',
  },
  os: {
    key: 'os',
    name: 'Business Command Center',
    setupCents: 49700,
    monthlyCents: 19700,
    freeWithPaid: true,
    blurb: 'Your back office: every call transcribed, your website traffic and leads, customers, reviews, and money on one board.',
    finePrint: 'Free with your website or receptionist. Buy it on its own, or add either and it is on the house.',
  },
};

/**
 * The whole-system bundle: BOTH paid pieces, and the command center rides free
 * inside it. The bundle must stay ABOVE the priciest single AND below the
 * two-paid-piece sum, or a la carte becomes irrational and every bundle leaks.
 * Set 2026-07-22: $797 + $349/mo, a real discount on the pair ($97 off the $894
 * a la carte setup, $45/mo off the $394/mo total). Ladder check: setup $797 >
 * $497 (site) and < $894 (pair); monthly $349 > $297 (voice) and < $394 (pair).
 * Re-run this check every time a single price moves. All surfaces derive from
 * DEMO_PRODUCTS / DEMO_BUNDLE.
 */
export const DEMO_BUNDLE = {
  key: 'bundle' as const,
  name: 'The Whole System',
  setupCents: 79700,
  monthlyCents: 34900,
  blurb: 'Receptionist + website, and the command center that ties them together, free. One system, one login.',
};

/** Every orderable piece, in display order. Each can be bought on its own. */
export const DEMO_ORDER_KEYS: DemoProductKey[] = ['voice', 'site', 'os'];

/** The command center is free (its price waived) whenever a paid piece is in
 *  the same selection. Surfaces use this to strike its price through. */
export function isCommandCenterFree(selection: string[]): boolean {
  return selection.includes('os') && (selection.includes('voice') || selection.includes('site'));
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
 * Normalize a selection into a priced quote. Both paid pieces = the bundle
 * (command center free inside it). Otherwise sum the billable pieces, dropping
 * the command center when a paid piece waives it. The command center on its own
 * is a real order at its standalone price. Returns null when nothing is picked.
 */
export function quoteDemoOrder(selection: string[]): DemoOrderQuote | null {
  const picked = DEMO_ORDER_KEYS.filter((k) => selection.includes(k));
  if (picked.length === 0) return null;
  const hasVoice = picked.includes('voice');
  const hasSite = picked.includes('site');
  // The whole system: both paid pieces, command center free inside it.
  if (hasVoice && hasSite) {
    return {
      products: ['bundle'],
      label: DEMO_BUNDLE.name,
      setupCents: DEMO_BUNDLE.setupCents,
      monthlyCents: DEMO_BUNDLE.monthlyCents,
      isBundle: true,
    };
  }
  // Command center is waived whenever a paid piece is present; drop it then.
  const osWaived = isCommandCenterFree(picked);
  const billable = picked.filter((k) => !(k === 'os' && osWaived));
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
