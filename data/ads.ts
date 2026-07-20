/**
 * MUSTARD BROADCAST (/ads). Done-for-you advertising for local businesses:
 * we produce the commercial, launch it on Meta (and Google on Prime Time),
 * manage it weekly, and report monthly in plain English. The client's ad
 * spend stays in THEIR ad account on THEIR card, never marked up.
 *
 * Amounts live here in cents and flow into checkout as inline price_data
 * (same shape as Sidekick), so the page and the charge cannot diverge.
 * No trials, month to month, hard caps on managed spend. Fail closed.
 */

export const BROADCAST = {
  name: 'MUSTARD BROADCAST',
  wordmark: '[ MUSTARD BROADCAST ]',
  tagline: 'We make the commercial. We run the ads. You answer the phone.',
  promise:
    'A cinematic commercial produced for your business, launched on Facebook, Instagram, and Google, managed every week, and reported in plain English every month. Your ad spend stays on your card, never marked up. You do the part only you can do: answer the phone.',
  metaTitle: 'MUSTARD BROADCAST. We Make Your Commercial and Run Your Ads',
  metaDescription:
    'Done-for-you advertising for local businesses: a cinematic commercial produced for your business, Facebook, Instagram, and Google ads launched and managed weekly, plain-English monthly reports. From $297/mo, month to month. By Modern Mustard Seed.',
  demoVideo: '/ads/broadcast-demo-16x9.mp4',
  demoPoster: '/ads/broadcast-demo-poster.jpg',
} as const;

export type BroadcastTier = {
  slug: 'ads-onair' | 'ads-primetime';
  name: string;
  chip: string;
  setupCents: number;
  monthlyCents: number;
  /** Managed ad-spend ceiling, in dollars per month. Above this is a custom quote. */
  spendCapUsd: number;
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

export const broadcastTiers: BroadcastTier[] = [
  {
    slug: 'ads-onair',
    name: 'ON AIR',
    chip: '[ META ]',
    setupCents: 49700,
    monthlyCents: 29700,
    spendCapUsd: 3000,
    pitch: 'Your commercial on Facebook and Instagram, managed for you.',
    includes: [
      'Your 30-second cinematic commercial, produced in week one (3 cuts: widescreen, Reels, feed)',
      'Facebook + Instagram campaign built and launched in YOUR ad account',
      'Weekly management: budgets, audiences, placements, tired creative swapped',
      'A monthly plain-English report: what ran, what it cost, what came in',
      'Ad spend stays on your card, paid straight to Meta, never marked up (most start at $10 to $20/day)',
      'Month to month, cancel anytime',
    ],
    cta: 'Go on air',
  },
  {
    slug: 'ads-primetime',
    name: 'PRIME TIME',
    chip: '[ META + GOOGLE ]',
    setupCents: 99700,
    monthlyCents: 59700,
    spendCapUsd: 10000,
    pitch: 'The full engine: both networks, a landing page, and fresh film all year.',
    includes: [
      'Everything in ON AIR',
      'Google Search ads, so you catch people already looking for you',
      'A landing page built to convert, with call + form tracking on every lead',
      'A brand-new commercial every quarter (4 per year)',
      'Monthly creative refresh: new hooks, new copy, no stale ads',
      'Priority line to Sarah for promos and seasonal pushes',
    ],
    cta: 'Take prime time',
    featured: true,
  },
];

export function getBroadcastTier(slug: string): BroadcastTier | undefined {
  return broadcastTiers.find((t) => t.slug === slug);
}

/** The self-serve rung below managed: just the commercial, via MUSTARD PICTURES. */
export const broadcastEntry = {
  name: 'JUST THE COMMERCIAL',
  chip: '[ DIY ]',
  priceUsd: 197,
  pitch: 'Not ready for managed ads? Get the film and run it yourself.',
  includes: [
    'The same 30-second commercial, three cuts, full rights',
    'Delivered within 2 business days via MUSTARD PICTURES',
    'Upgrade to ON AIR later and your film comes with you',
  ],
  href: '/pictures',
  cta: 'Get the film only',
} as const;

/**
 * Ad Budget Planner data. Honest planning ranges for local lead campaigns
 * (Meta lead objectives, US local markets). Ranges, never promises: the
 * planner labels everything as an estimate and the copy stays claim-safe.
 */
export type PlannerVertical = {
  id: string;
  label: string;
  /** Typical cost per lead range, dollars. */
  cplLow: number;
  cplHigh: number;
  /** Default average customer value for the math. */
  defaultJobUsd: number;
};

export const plannerVerticals: PlannerVertical[] = [
  { id: 'landscaping', label: 'Landscaping / lawn care', cplLow: 8, cplHigh: 22, defaultJobUsd: 400 },
  { id: 'plumbing-hvac', label: 'Plumbing / HVAC / electrical', cplLow: 25, cplHigh: 60, defaultJobUsd: 650 },
  { id: 'roofing', label: 'Roofing / exteriors', cplLow: 40, cplHigh: 90, defaultJobUsd: 9000 },
  { id: 'restaurant', label: 'Restaurant / cafe / food truck', cplLow: 2, cplHigh: 8, defaultJobUsd: 45 },
  { id: 'beauty', label: 'Salon / spa / beauty', cplLow: 10, cplHigh: 25, defaultJobUsd: 120 },
  { id: 'fitness', label: 'Gym / fitness / yoga', cplLow: 15, cplHigh: 35, defaultJobUsd: 600 },
  { id: 'health', label: 'Dental / clinic / wellness', cplLow: 30, cplHigh: 80, defaultJobUsd: 900 },
  { id: 'professional', label: 'Law / accounting / real estate / insurance', cplLow: 30, cplHigh: 70, defaultJobUsd: 1500 },
  { id: 'retail', label: 'Retail / boutique', cplLow: 5, cplHigh: 15, defaultJobUsd: 80 },
  { id: 'other', label: 'Something else', cplLow: 10, cplHigh: 40, defaultJobUsd: 500 },
];

export function getPlannerVertical(id: string): PlannerVertical {
  return plannerVerticals.find((v) => v.id === id) || plannerVerticals[plannerVerticals.length - 1];
}

export const broadcastFaq = [
  {
    q: 'Where does my ad spend actually go?',
    a: 'Straight from your card to Meta and Google, inside your own ad account. We never touch it, never mark it up, and you can see every dollar any time you like. Our fee is the flat monthly number on this page, nothing else.',
  },
  {
    q: 'How much should I spend on ads?',
    a: 'Most local businesses start at $10 to $20 a day. The Ad Budget Planner on this page turns your industry and average job value into a starting number, and we fine-tune it together in week one.',
  },
  {
    q: 'How fast am I live?',
    a: 'Your commercial is in your inbox within 2 business days, and you approve every frame. Once you approve, the campaign is live in your ad account within 7 days, usually sooner.',
  },
  {
    q: 'Is there a contract?',
    a: 'No. Month to month, cancel anytime. The one-time setup covers producing your commercial and building the campaign in week one, so it is not refundable once your film is delivered, but the monthly stops whenever you say stop.',
  },
  {
    q: 'What results can you promise?',
    a: 'Honestly: nobody can promise you leads, and anyone who does is selling you something. What we promise is the work: real cinematic creative (not stock footage), weekly attention from a human, and a report every month that tells you the truth. When something underperforms, we fix the creative instead of writing excuses.',
  },
  {
    q: 'Do I need a website?',
    a: 'No. ON AIR can run Meta instant lead forms that send inquiries straight to your phone and inbox. PRIME TIME includes a landing page built to convert, wired with call and form tracking.',
  },
  {
    q: 'What is the catch on the managed spend?',
    a: 'ON AIR covers ad accounts spending up to $3,000 a month, PRIME TIME up to $10,000. Past that you have outgrown these packages (congratulations) and we quote a custom engine.',
  },
  {
    q: 'What do I own if I leave?',
    a: 'Everything. Your commercial files with full rights forever, your ad account, your pixel, your audiences, your leads. We build in your house, not ours. Leaving is one email and nothing switches off behind your back.',
  },
] as const;
