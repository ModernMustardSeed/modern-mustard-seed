/**
 * THE SIDEKICK FORGE. The mascot-first flagship demo-to-subscription machine.
 *
 * A visitor tells Mr. Mustard about their business, watches him train a
 * personalized AI front desk in about sixty seconds, then talks to it live
 * (in the browser, or it calls their cell). The free demo is hard-capped;
 * the conversion is "Keep Him": a productized, hard-capped monthly Sidekick.
 *
 * Price lives in `sidekickTiers` below, in cents, and nowhere else. Checkout
 * builds inline Stripe price_data from it, so the env price ids this file used
 * to name (STRIPE_PRICE_SIDEKICK_*) are dead and no longer read anywhere.
 */

export const SIDEKICK = {
  name: 'The Sidekick Forge',
  wordmark: '[ SIDEKICK: FORGED ]',
  tagline: 'Your front desk, forged in 60 seconds.',
  promise:
    'Tell Mr. Mustard about your business. He trains a personalized AI receptionist on the spot, and then you talk to it. Live. If you love it, it answers your real phone 24/7 starting this week.',
  metaTitle: 'The Sidekick Forge. Hear Your Own AI Receptionist in 60 Seconds',
  metaDescription:
    'Mr. Mustard trains an AI front desk for YOUR business while you watch, then it talks to you live and can even call your cell. Free demo, no card. Keep him and he answers your real phone 24/7. From Modern Mustard Seed.',
  phoneLine: '(406) 312-1223',
  demoSeconds: 240,
  creditNote: 'Your setup fee is credited toward any custom build over $2,500.',
} as const;

export type SidekickVertical = {
  id: string;
  label: string;
  /** One flavor line the forge montage brags about during training. */
  drill: string;
  /** A scenario hint injected into the persona so role-play lands for this vertical. */
  scenario: string;
};

export const sidekickVerticals: SidekickVertical[] = [
  {
    id: 'home-services',
    label: 'Home services (plumbing, HVAC, electrical, landscaping)',
    drill: 'a burst water heater at 2am, handled without breaking stride',
    scenario:
      'Expect after-hours emergencies (a leak, no heat, a dead panel). Calm them, capture address and callback number, flag it urgent for the owner, and give only safety tips you were given.',
  },
  {
    id: 'restaurant',
    label: 'Restaurant, cafe, or food truck',
    drill: 'a Friday-night party of six with two allergies and a stroller',
    scenario:
      'Expect reservations, hours, wait times, allergy and menu questions, and large-party requests. Take reservations as messages with name, party size, time, and phone unless told a booking system exists.',
  },
  {
    id: 'beauty',
    label: 'Salon, spa, or beauty studio',
    drill: 'a bride, her mother, and a same-day cancellation, all in one call',
    scenario:
      'Expect appointment requests, service and price questions, cancellations, and gift certificates. Capture preferred stylist or service, date, and phone for confirmation.',
  },
  {
    id: 'health',
    label: 'Clinic, dental, chiropractic, or wellness',
    drill: 'a nervous new patient with an insurance question, put at ease',
    scenario:
      'Expect new-patient requests, insurance questions, and reschedules. NEVER give medical advice of any kind; for anything clinical, take a message for the staff. Emergencies get told to call 911.',
  },
  {
    id: 'fitness',
    label: 'Gym, fitness, or yoga studio',
    drill: 'class schedules, drop-in rates, and one very chatty regular',
    scenario:
      'Expect class times, membership and trial questions, and freeze or cancel requests. Capture name and phone for anything involving billing.',
  },
  {
    id: 'retail',
    label: 'Retail shop or boutique',
    drill: 'a holiday return, a gift card, and "do you have this in medium?"',
    scenario:
      'Expect hours, stock checks, returns, and gift cards. For stock checks, take the item and a callback number rather than guessing.',
  },
  {
    id: 'professional',
    label: 'Professional services (law, accounting, real estate, insurance)',
    drill: 'a consultation intake captured cleanly, conflicts checked at the desk',
    scenario:
      'Expect consultation requests and document questions. NEVER give legal, tax, or financial advice; capture the matter in one sentence plus contact details and schedule the professional.',
  },
  {
    id: 'other',
    label: 'Something else entirely',
    drill: 'a curveball no script saw coming, caught anyway',
    scenario: 'Expect anything. Capture who called, what they need, and how to reach them. Grace under fire.',
  },
];

export function getVertical(id: string): SidekickVertical {
  return sidekickVerticals.find((v) => v.id === id) || sidekickVerticals[sidekickVerticals.length - 1];
}

/**
 * PRICE LIVES HERE, IN CENTS, AND NOWHERE ELSE.
 *
 * This used to carry display-only dollars plus the NAME of a Stripe price env
 * var, which meant the number on the page and the number Stripe charged were two
 * unrelated facts. Editing the page would have silently kept billing the old
 * amount. Checkout now builds inline price_data from these cents (the same
 * pattern lib/demo-order.ts uses), so the advertised price IS the charged price.
 */
export type SidekickTier = {
  slug: 'sidekick' | 'sidekick-pro';
  name: string;
  chip: string;
  setupCents: number;
  monthlyCents: number;
  minutesCap: number;
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

/** Display helper, so no surface can invent its own formatting. */
export function sidekickUsd(cents: number): number {
  return Math.round(cents / 100);
}

export const sidekickTiers: SidekickTier[] = [
  {
    slug: 'sidekick',
    name: 'SIDEKICK',
    chip: '[ ON THE PHONES ]',
    // Matches DEMO_PRODUCTS.voice in lib/demo-order.ts. It is the SAME product,
    // so it must not be cheaper here than in the demo funnel (Sarah, 2026-07-12).
    setupCents: 39700,
    monthlyCents: 29700,
    minutesCap: 250,
    pitch: 'The Sidekick you just met, answering your real phone around the clock.',
    includes: [
      'Your own local number, or we forward your existing line',
      'Trained on your business by Mr. Mustard, tuned by Sarah',
      '250 answered minutes a month (that is roughly 100 calls)',
      'Every call summarized to your inbox, urgent ones flagged',
      'Books appointments and takes clean messages by name',
      'At the cap he takes messages only. Never a surprise bill.',
      'Live within 7 days, installed by hand. Cancel anytime.',
    ],
    cta: 'Keep him',
  },
  {
    slug: 'sidekick-pro',
    name: 'SIDEKICK PRO',
    chip: '[ RUNS THE DESK ]',
    // Must stay strictly above SIDEKICK, and by enough that the upgrade reads as a
    // different tier rather than a rounding error. Base moved to $397/$297, which
    // squeezed the premium to +$100/+$100, so Pro moves with it and restores the
    // original +$200/+$200 gap (Sarah, 2026-07-13).
    setupCents: 59700,
    monthlyCents: 49700,
    minutesCap: 600,
    pitch: 'For phones that actually ring. More minutes, a memory, and a monthly tune-up.',
    includes: [
      'Everything in SIDEKICK',
      '600 answered minutes a month (roughly 250 calls)',
      'Caller memory: regulars get recognized between calls',
      'Booking wired into your real calendar',
      'A monthly 15-minute retrain call with Sarah',
      'Priority support, same-day persona edits',
    ],
    cta: 'Keep him, Pro',
    featured: true,
  },
];

export function getSidekickTier(slug: string): SidekickTier | undefined {
  return sidekickTiers.find((t) => t.slug === slug);
}

/** Honest capability boundary. Edge cases become upsells, not unpaid scope. */
export const sidekickBoundaries = {
  handles: [
    'Answers every call in a natural voice, 24/7, no hold music',
    'Your hours, prices, services, directions, and policies (the ones you give him)',
    'Books appointments and reservations, confirms by name',
    'Takes clean messages: who, what, callback number, urgency',
    'Flags emergencies and urgent calls to your cell immediately',
    'Speaks your customer’s language on request (Spanish, French, and more)',
  ],
  routes: [
    'Medical, legal, tax, or financial advice (he takes a message for you)',
    'Taking payments over the phone (on the roadmap, not in v1)',
    'Heated disputes and refunds (captured carefully, routed to you)',
    'Anything you did not teach him (he says so honestly and takes a number)',
  ],
} as const;

export const sidekickFaq = [
  {
    q: 'What happens when I hit my monthly minutes?',
    a: 'He switches to message-taking mode: short calls, name and number captured, nothing dropped. You never get a surprise bill. If you keep hitting the cap, that is a good problem, and upgrading takes one email.',
  },
  {
    q: 'Is this the same thing I just talked to in the demo?',
    a: 'Same brain, same voice stack, same training method. The paid version gets Sarah’s hand-tuning, your real call flows, your booking setup, and a live line of its own.',
  },
  {
    q: 'Do I need new phones or hardware?',
    a: 'No. You either get a new local number to publish, or your existing number quietly forwards to him after a few rings, after hours, or always. Your phones stay exactly as they are.',
  },
  {
    q: 'What if a caller asks something he does not know?',
    a: 'He says so, honestly, and takes a name and number for you. He is trained to never invent prices, availability, or advice. That honesty is a feature, and it is in writing above.',
  },
  {
    q: 'Can I change what he says?',
    a: 'Yes. Email an edit and it ships same day on Pro, within two business days on SIDEKICK. Pro also gets a monthly retrain call with Sarah.',
  },
  {
    q: 'Is there a contract?',
    a: 'Month to month, cancel anytime. The setup fee is one-time, and it is credited in full toward any custom build over $2,500 if you ever go bigger.',
  },
  {
    q: 'Who is Mr. Mustard?',
    a: 'The AI who answers Modern Mustard Seed’s own phones at (406) 312-1223 and just trained your Sidekick. Call him yourself, he loves visitors.',
  },
] as const;

/**
 * The forge montage script. {business}, {services}, {drill}, {city} get
 * substituted client-side. Timed to feel like real work is happening
 * (it is: the persona is being forged and the line warmed up).
 */
export const forgeScript = [
  '[ LOADING {business} INTO THE FORGE ]',
  '> reading everything you just told him...',
  '> memorizing your services: {services}',
  '> drilling the greeting. warmer. prouder. perfect.',
  '> rehearsing {drill}',
  '> stress test: one furious caller, one confused one, a wrong number. composure held.',
  '> teaching the most important lesson: when you do not know, say so and take a number.',
  '> booking drills: 14 appointments in 60 seconds, zero double-books.',
  '> final exam, {city} edition: passed.',
  '[ GRADUATED. CLASS OF ONE. ]',
] as const;
