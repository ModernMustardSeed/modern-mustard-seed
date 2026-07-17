/**
 * "Order it right there" catalog for the forged-demo surfaces.
 *
 * A prospect watching their own demo buys on the spot: monthly plan + one-time
 * setup, month to month, cancel anytime, no trials (the demo was the trial).
 * We customize after purchase and release within 7 days.
 *
 * Pricing locked by Sarah 2026-07-11. All amounts in cents.
 */

export type DemoProductKey = 'voice' | 'site' | 'os';

export type DemoProduct = {
  key: DemoProductKey;
  name: string;
  setupCents: number;
  monthlyCents: number;
  blurb: string;
  finePrint?: string;
};

export const DEMO_PRODUCTS: Record<DemoProductKey, DemoProduct> = {
  voice: {
    key: 'voice',
    name: 'AI Receptionist',
    setupCents: 39700,
    monthlyCents: 29700,
    blurb: 'The voice that answered your demo, on your real number, 24/7.',
    finePrint: '250 answered minutes a month, then message-taking mode. Never a surprise bill.',
  },
  site: {
    key: 'site',
    name: 'Your New Website',
    setupCents: 49700,
    monthlyCents: 9700,
    blurb: 'The site you just toured, customized to your business and put live on your domain.',
    // The two free edits are now a real, counted thing (claim_revision, migration 049),
    // so the offer may finally say so out loud. Domain, hosting and care are ours.
    finePrint: 'Two free edits before it goes live. Your domain, hosting, and care included.',
  },
  os: {
    key: 'os',
    name: 'Business Command Center',
    setupCents: 49700,
    monthlyCents: 19700,
    blurb: 'The command center from your demo, wired to your real calls, customers, and reviews.',
  },
};

/**
 * The bundle must stay ABOVE the priciest single piece AND above every
 * two-pack, or the a la carte prices become irrational and we leak revenue on
 * every bundle. Sarah re-set this on 2026-07-17: $997 + $497/mo, a real
 * discount on the whole suite ($394 off the $1,391 a la carte setup, $94/mo
 * off the $591/mo total). Ladder check at these numbers: the bundle sits $3
 * above the priciest pair on BOTH axes (voice+OS $494/mo, site+OS $994 setup),
 * which is deliberate: "the third piece is basically free" is the pitch, and
 * no subset ever costs more than the whole. Re-run this check every time a
 * single price moves.
 */
export const DEMO_BUNDLE = {
  key: 'bundle' as const,
  name: 'The Whole System',
  setupCents: 99700,
  monthlyCents: 49700,
  blurb: 'Receptionist + website + command center, one system, one login.',
};

export const DEMO_ORDER_KEYS: DemoProductKey[] = ['voice', 'site', 'os'];

export type DemoOrderQuote = {
  /** normalized selection; ['bundle'] when all three are picked */
  products: string[];
  label: string;
  setupCents: number;
  monthlyCents: number;
  isBundle: boolean;
};

/** Normalize a selection into a priced quote. All three products = the bundle. */
export function quoteDemoOrder(selection: string[]): DemoOrderQuote | null {
  const picked = DEMO_ORDER_KEYS.filter((k) => selection.includes(k));
  if (picked.length === 0) return null;
  if (picked.length === DEMO_ORDER_KEYS.length) {
    return {
      products: ['bundle'],
      label: DEMO_BUNDLE.name,
      setupCents: DEMO_BUNDLE.setupCents,
      monthlyCents: DEMO_BUNDLE.monthlyCents,
      isBundle: true,
    };
  }
  const items = picked.map((k) => DEMO_PRODUCTS[k]);
  return {
    products: picked,
    label: items.map((i) => i.name).join(' + '),
    setupCents: items.reduce((s, i) => s + i.setupCents, 0),
    monthlyCents: items.reduce((s, i) => s + i.monthlyCents, 0),
    isBundle: false,
  };
}

export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}
