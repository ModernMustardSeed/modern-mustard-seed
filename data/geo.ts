/**
 * GEO DESK. The fourth offer, ruled in by judge panel (2026-07-07) as a
 * conversion module on the live /website-audit engine, NOT a fourth
 * department: it acquires no cold leads of its own, it monetizes the graded
 * report. Sells installed AI-findability signals, never rankings.
 *
 * COPY LAW (ship-gate enforced): never promise rankings, traffic, or "#1 on
 * ChatGPT". We sell the graded report, correctly installed signals, and
 * monitoring. Honest verbs only: install, structure, monitor.
 *
 * Stripe price ids come from env, never code:
 *   STRIPE_PRICE_GEO_FIXPACK    ($297 one-time)
 *   STRIPE_PRICE_GEO_FULLDESK   ($497 one-time)
 *   STRIPE_PRICE_GEO_INSTALLED  ($997 one-time, DARK until GEO_INSTALLED_OPEN=1)
 *   STRIPE_PRICE_GEO_WATCH      ($97/mo)
 *   STRIPE_PRICE_GEO_WATCHPRO   ($197/mo)
 */

export const GEO = {
  name: 'GEO DESK',
  wordmark: '[ THE EXAMINER’S DESK ]',
  tagline: 'Be the answer AI gives.',
  promise:
    'ChatGPT, Perplexity, and Google AI answer your customers’ questions by reading structured signals most local sites never installed. The free audit grades yours. The GEO DESK installs what’s missing: written for your business, ready to paste.',
  metaAddon: 'AI Findability (GEO) grading and fixes',
  freeRerunsPerPack: 3,
} as const;

export type GeoTier = {
  slug: 'geo-fixpack' | 'geo-fulldesk' | 'geo-installed' | 'geo-watch' | 'geo-watchpro';
  name: string;
  chip: string;
  priceUsd: number;
  cadence: 'once' | 'monthly';
  stripePriceEnv: string;
  mode: 'payment' | 'subscription';
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
  /** Dark tiers exist in checkout but never render until Sarah opens them. */
  dark?: boolean;
};

export const geoTiers: GeoTier[] = [
  {
    slug: 'geo-fixpack',
    name: 'THE FIX PACK',
    chip: '[ INSTANT ]',
    priceUsd: 297,
    cadence: 'once',
    stripePriceEnv: 'STRIPE_PRICE_GEO_FIXPACK',
    mode: 'payment',
    pitch: 'Every missing GEO signal, written for YOUR business, ready to paste.',
    includes: [
      'Your llms.txt and .well-known/ai.txt, written from your actual site',
      'JSON-LD structured data: LocalBusiness + FAQ schema, personalized',
      'Meta title and description rewrites for your key pages',
      'A citable FAQ content block AI engines can quote',
      'Platform-aware install guide (WordPress, Wix, Squarespace, custom)',
      `${GEO.freeRerunsPerPack} re-scans included: fix, re-grade, watch the letter climb`,
      'Delivered the moment you pay, yours forever',
    ],
    cta: 'Install my signals',
    featured: true,
  },
  {
    slug: 'geo-fulldesk',
    name: 'THE FULL DESK',
    chip: '[ PACK + PROOF ]',
    priceUsd: 497,
    cadence: 'once',
    stripePriceEnv: 'STRIPE_PRICE_GEO_FULLDESK',
    mode: 'payment',
    pitch: 'The Fix Pack plus 90 days of monthly re-grades to prove the climb.',
    includes: [
      'Everything in THE FIX PACK',
      'Monthly re-grade emails for 90 days: score deltas, what moved, what to do next',
      'A drift alert if your grade ever drops',
      'Priority reply from Sarah on install questions',
    ],
    cta: 'Pack + 90-day proof',
  },
  {
    slug: 'geo-watch',
    name: 'THE WATCH',
    chip: '[ MONTHLY ]',
    priceUsd: 97,
    cadence: 'monthly',
    stripePriceEnv: 'STRIPE_PRICE_GEO_WATCH',
    mode: 'subscription',
    pitch: 'Your AI-findability, re-graded every month, drift caught early.',
    includes: [
      'One website, re-graded monthly',
      'Score delta email: what changed, what to fix, in plain words',
      'Drift alerts (a hijacked or broken site shows up here first)',
      'Month to month, cancel anytime. One site, one report, no surprises.',
    ],
    cta: 'Start the watch',
  },
  {
    slug: 'geo-watchpro',
    name: 'THE WATCH PRO',
    chip: '[ 3 SITES ]',
    priceUsd: 197,
    cadence: 'monthly',
    stripePriceEnv: 'STRIPE_PRICE_GEO_WATCHPRO',
    mode: 'subscription',
    pitch: 'Three sites on the watch: yours, and the two you compare yourself to.',
    includes: [
      'Up to three websites re-graded monthly',
      'Per-site delta emails plus a one-line comparison',
      'Drift alerts on all three',
      'Month to month, cancel anytime.',
    ],
    cta: 'Watch three',
  },
  {
    slug: 'geo-installed',
    name: 'INSTALLED FOR YOU',
    chip: '[ WHITE GLOVE ]',
    priceUsd: 997,
    cadence: 'once',
    stripePriceEnv: 'STRIPE_PRICE_GEO_INSTALLED',
    mode: 'payment',
    pitch: 'Sarah installs the whole pack on your site and verifies every signal live.',
    includes: [
      'Everything in THE FULL DESK',
      'Hands-on installation on your platform',
      'Live verification of every signal after install',
      'A before/after graded report you can keep',
    ],
    cta: 'Install it for me',
    dark: true,
  },
];

export function getGeoTier(slug: string): GeoTier | undefined {
  return geoTiers.find((t) => t.slug === slug);
}

export const geoFaqAdditions = [
  {
    q: 'What exactly is in the $297 Fix Pack?',
    a: 'The GEO signals your audit flagged as missing, written specifically for your business from your actual site content: llms.txt, .well-known/ai.txt, LocalBusiness and FAQ structured data (JSON-LD), meta title and description rewrites, and a citable FAQ block, plus a step-by-step install guide matched to your platform. You paste, you re-scan (three re-scans included), you watch the grade climb.',
  },
  {
    q: 'Will this get me recommended by ChatGPT?',
    a: 'Honest answer: nobody can promise what an AI engine will say, and anyone who does is selling snake oil. What we promise is concrete: the structured signals AI engines read will exist on your site, correctly installed, verified by re-grade. That is the part of GEO you control, and almost no local business has done it yet.',
  },
  {
    q: 'I am not technical. Can I actually install this?',
    a: 'The pack detects your platform and gives you paste-here instructions for it. Most installs are 20 to 40 minutes of copy-paste. If you would rather not touch it, reply to your receipt and ask about the white-glove install.',
  },
  {
    q: 'What does THE WATCH actually watch?',
    a: 'Once a month we re-run the full graded audit on your site and email you the delta: score movement per category, anything that broke, and the next highest-leverage fix. It also catches ugly surprises early; one local site we audited this week had been silently hijacked by spam, and its owner had no idea.',
  },
] as const;
