/**
 * THE SWITCHBOARD — the franchise / multi-location offer, single source of truth.
 *
 * One AI voice concierge answers for every location of a brand, and one dark
 * Command Board shows the recovered revenue across all of them. Sold once to the
 * brand, priced PER LOCATION, discounted at volume. Approved direction + pricing
 * 2026-07-15 (moodboard sign-off). Lives inside the MMS pop-art brand.
 */

export const SWITCHBOARD = {
  name: 'The Switchboard',
  by: 'by Modern Mustard Seed',
  metaTitle: 'The Switchboard — one AI voice concierge for every location of your franchise',
  metaDescription:
    'Give every location of your franchise or multi-location brand a 24/7 AI voice concierge in one on-brand voice, and watch the recovered revenue from all of them on a single Command Board. Priced per location, discounted at volume.',
  promise:
    'Every location gets a 24/7 AI concierge in one on-brand voice. You get one board that shows the money it saved across all of them.',
  statement: 'One voice answers for all of them.',
  // A live home-services concierge to hear on the phone (book a walkthrough is the primary CTA).
  walkthroughPath: '/book',
} as const;

/** One-time franchise build: brand voice template + master Command Board + rollout. */
export const BUILD_FEE_USD = 3500;

export type PriceTier = { min: number; max: number | null; perLocationUsd: number; label: string };

/** Per-location monthly, discounted at volume. The higher the count, the lower the door price. */
export const PRICE_TIERS: PriceTier[] = [
  { min: 1, max: 5, perLocationUsd: 349, label: '1 to 5 locations' },
  { min: 6, max: 20, perLocationUsd: 299, label: '6 to 20 locations' },
  { min: 21, max: 50, perLocationUsd: 249, label: '21 to 50 locations' },
  { min: 51, max: null, perLocationUsd: 199, label: '51+ locations' },
];

export type Quote = {
  locations: number;
  tier: PriceTier;
  perLocationUsd: number;
  monthlyUsd: number;
  annualUsd: number;
  buildUsd: number;
  firstInvoiceUsd: number; // build + first month
};

/** The one pricing function used by the page, the interactive board, and the admin minter. */
export function quoteFor(locationsRaw: number): Quote {
  const locations = Math.max(1, Math.min(9999, Math.round(locationsRaw || 1)));
  const tier = PRICE_TIERS.find((t) => locations >= t.min && (t.max === null || locations <= t.max)) ?? PRICE_TIERS[PRICE_TIERS.length - 1];
  const perLocationUsd = tier.perLocationUsd;
  const monthlyUsd = perLocationUsd * locations;
  return {
    locations,
    tier,
    perLocationUsd,
    monthlyUsd,
    annualUsd: monthlyUsd * 12,
    buildUsd: BUILD_FEE_USD,
    firstInvoiceUsd: monthlyUsd + BUILD_FEE_USD,
  };
}

export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export const whatShips: { title: string; body: string }[] = [
  { title: 'One brand voice, cloned to every door', body: 'We build one on-brand AI concierge template and deploy it to every location, so a caller in Tampa and a caller in Tempe hear the same brand.' },
  { title: 'A master number that routes', body: 'One number the whole brand can advertise. Each caller is routed to the right location, answered, qualified, and booked, day or night.' },
  { title: 'The live Command Board', body: 'One login shows every location at a glance: calls answered after hours, appointments booked, and the recovered revenue rolled up across the whole chain.' },
  { title: 'A monthly rollup the owner forwards', body: 'A clean "recovered across all locations" report every month, built to be screenshotted and sent to the COO.' },
  { title: 'A callable demo for the pitch', body: 'A real line your team can dial to hear a location answer before a single dollar is spent.' },
];

export const howItWorks: { step: string; body: string }[] = [
  { step: 'Map the brand', body: 'We take your locations, hours, and booking rules, and write one concierge voice that fits your brand.' },
  { step: 'Wire every location', body: 'Every door gets the same concierge and the master number routing. Live in weeks, not a rollout that takes a year.' },
  { step: 'Watch the board', body: 'Open one Command Board and see the recovered revenue climb across every location, live.' },
];

export const faq: { q: string; a: string }[] = [
  {
    q: 'How is this priced?',
    a: 'Per location, discounted the more locations you have: $349 each for 1 to 5, $299 for 6 to 20, $249 for 21 to 50, and $199 each at 51+. Plus a one-time $3,500 franchise build that covers the brand voice template, the master Command Board, and the rollout. You see your exact number before you commit.',
  },
  {
    q: 'Is the concierge an AI?',
    a: 'Yes, and it says so. Each location is answered by an AI concierge in your brand voice that qualifies callers and books appointments around the clock. It will happily tell any caller it is an AI. It is your brand answering, consistently, at every door.',
  },
  {
    q: 'What does one number for every location mean?',
    a: 'You get one master number your whole brand can advertise. When someone calls, they are routed to the right location automatically, or you can keep each location on its own line. Either way, every call is answered and every booking lands on the Command Board.',
  },
  {
    q: 'How fast can a whole chain go live?',
    a: 'Weeks, not a year. We build one template and clone it, so adding your 40th location is as fast as your 1st. New locations you open later are added in days.',
  },
  {
    q: 'What is the Command Board?',
    a: 'One login that rolls up every location: calls answered after hours, appointments booked, and the recovered revenue across the whole chain, with a per-location heatmap so you see which stores are hot and which need attention. It is the pitch, and the login you keep after you buy.',
  },
  {
    q: 'Can we start with a few locations?',
    a: 'Yes. Start with a region or a handful of stores, see the board fill with recovered revenue, then roll it out to the rest at the better per-location price.',
  },
];
