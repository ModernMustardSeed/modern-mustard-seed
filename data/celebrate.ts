/**
 * CELEBRATE. Gifting on autopilot, fulfilled by real local shops.
 *
 * Businesses and families load every date that matters (birthdays, work
 * anniversaries, retirements, graduations, holidays), set a budget per
 * person, and CELEBRATE dispatches real cakes, fresh flowers, charcuterie
 * boards, and handwritten cards from local makers on the right dates.
 *
 * Prices live in `celebrateTiers` below, in cents, and nowhere else.
 * This page launches as waitlist + corporate pilot (no self-serve checkout
 * until the founding vendor route is live). Budgets are hard-capped and
 * fail closed per the never-leak-revenue rule.
 */

export const CELEBRATE = {
  name: 'Celebrate',
  wordmark: '[ CELEBRATE ]',
  tagline: 'Turn your calendar into a parade.',
  promise:
    'Load your people once and set a budget per person. Real cakes from the bakery down the street, fresh flowers, charcuterie boards, and handwritten cards go out on every date that matters, all year, on autopilot.',
  metaTitle: 'Birthday Cakes, Flowers, and Gifts on Autopilot from Local Shops',
  metaDescription:
    'Load every birthday, work anniversary, and milestone once. Celebrate auto-sends real cakes, fresh flowers, and handwritten cards from local makers on the right dates, with a hard-capped budget you set. For teams, clients, and families. A Modern Mustard Seed service.',
  foundingRoute: 'Founding route now boarding: the Flathead Valley, Montana. Every other city rides the waitlist.',
} as const;

/* -------------------------------------------------------------------------- */
/* THE CLOCK                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Opening day. Sarah set the clock on 2026-08-11 at "68 days out", which lands
 * on Monday 19 October 2026. The instant is 9:00 AM Mountain (MDT, UTC-6 on
 * that date), so the doors open at the start of a business day rather than at
 * a midnight nobody is awake for.
 *
 * ⚠️ THIS DATE IS LOAD-BEARING IN THREE PLACES: the on-page counter, every
 * letter in the pre-launch drip (lib/celebrate-drip.ts schedules against days
 * to launch, not days since signup), and the waitlist confirmation email.
 * Move it here and all three move together. Do not hardcode it anywhere else.
 */
export const CELEBRATE_LAUNCH = {
  /** The moment the doors open, as a real instant. */
  at: '2026-10-19T15:00:00.000Z',
  /** How the date is written in prose. Never abbreviate it in a headline. */
  label: 'Monday, October 19, 2026',
  short: 'Oct 19',
  /** Local phrasing for the founding route, which is where the clock applies. */
  timeLabel: '9:00 AM Mountain',
  city: 'the Flathead Valley',
} as const;

export type LaunchClock = {
  /** Milliseconds left. Zero once the doors are open. */
  ms: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True the instant the countdown reaches opening day. */
  open: boolean;
};

/**
 * The countdown, computed from one instant so the page, the emails, and the
 * cron all agree. `now` is always passed in: a server component that called
 * Date.now() itself would bake the answer into the static build, and a client
 * component that called it during the first render would disagree with the
 * server HTML and blow up hydration.
 */
export function launchClock(now: number): LaunchClock {
  const ms = Math.max(0, new Date(CELEBRATE_LAUNCH.at).getTime() - now);
  return {
    ms,
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000) % 24,
    minutes: Math.floor(ms / 60000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
    open: ms === 0,
  };
}

/** Whole days to opening, the number the drip schedules against. Negative after launch. */
export function daysToLaunch(now: number): number {
  return Math.floor((new Date(CELEBRATE_LAUNCH.at).getTime() - now) / 86400000);
}

/** Who a waitlist signup is celebrating. Drives which drip lane they ride. */
export type CelebrateAudience = 'team' | 'family';

export type CelebrateTier = {
  slug: string;
  name: string;
  chip: string;
  monthlyCents: number;
  recipientCap: number;
  pitch: string;
  includes: string[];
  featured?: boolean;
};

export function celebrateUsd(cents: number): number {
  return Math.round(cents / 100);
}

/** Gifts are billed at local-shop prices; this is the floor we quote. */
export const celebrateGiftFloorCents = 3500;

export const celebrateTiers: CelebrateTier[] = [
  {
    slug: 'team',
    name: 'TEAM',
    chip: '[ THE WHOLE CREW ]',
    monthlyCents: 5900,
    recipientCap: 50,
    pitch: 'Every birthday and work anniversary on your team, handled before you remember it.',
    includes: [
      'Up to 50 people on your route',
      'Birthdays, work anniversaries, and the holidays you pick',
      'Budget per person, hard-capped, never exceeded',
      'Approve every send, or run full autopilot',
      'Delivery photo proof on every dispatch',
    ],
    featured: true,
  },
  {
    slug: 'company',
    name: 'COMPANY',
    chip: '[ TEAMS + CLIENTS ]',
    monthlyCents: 14900,
    recipientCap: 150,
    pitch: 'Employees plus your best clients, celebrated like you personally remembered.',
    includes: [
      'Up to 150 people on your route',
      'Client milestones: closings, renewals, thank-yous',
      'Handwritten cards in real ink, never printed script',
      'Monthly invoice, one line, zero surprise fees',
      'Concierge onboarding: we load your list for you',
    ],
  },
];

export const celebrateOccasions = [
  { id: 'birthday', label: 'Birthday', prop: 'cake' },
  { id: 'work-anniversary', label: 'Work Anniversary', prop: 'card' },
  { id: 'client-milestone', label: 'Client Milestone', prop: 'board' },
  { id: 'retirement', label: 'Retirement', prop: 'board' },
  { id: 'graduation', label: 'Graduation', prop: 'bouquet' },
  { id: 'wedding', label: 'Wedding / Anniversary', prop: 'bouquet' },
  { id: 'holiday', label: 'Christmas / Holiday', prop: 'cake' },
  { id: 'just-because', label: 'Just Because', prop: 'bouquet' },
] as const;

export type CelebrateOccasionId = (typeof celebrateOccasions)[number]['id'];

export const celebrateSamplePeople = [
  { name: 'Margaret', month: 2, day: 14, occasion: 'birthday' as CelebrateOccasionId },
  { name: 'Dad', month: 3, day: 2, occasion: 'just-because' as CelebrateOccasionId },
  { name: 'The Jensens', month: 4, day: 30, occasion: 'client-milestone' as CelebrateOccasionId },
  { name: 'Kelsey R.', month: 5, day: 18, occasion: 'work-anniversary' as CelebrateOccasionId },
];

export const celebrateFaq = [
  {
    q: 'How does the budget work?',
    a: 'You set a budget per person (most teams pick $35 to $75) and a monthly cap for the whole account. Every send stays inside both. When a cap is reached we pause and ask instead of charging you more. There is no such thing as a surprise bill.',
  },
  {
    q: 'Who actually makes the gifts?',
    a: 'Local shops. The bakery down the street bakes the cake the morning it is delivered, the florist cuts the stems that day, the cards are written in real ink. National gifting platforms ship warehouse boxes; fresh joy cannot be warehoused, which is exactly why we built Celebrate around local makers.',
  },
  {
    q: 'Do I approve every gift, or does it just go?',
    a: 'Your choice per account. Approve mode sends you a two-tap preview a week before each dispatch. Autopilot mode just handles it and sends you the delivery photo. Most owners start on approve and switch to autopilot after the first month.',
  },
  {
    q: 'What areas do you serve?',
    a: 'The founding route is the Flathead Valley, Montana (Kalispell, Whitefish, Columbia Falls, Bigfork). Join the waitlist from anywhere: every city with enough waitlist signups gets a vendor route, and your people ride free the first month when your city opens.',
  },
  {
    q: 'Can families use this or is it just for businesses?',
    a: 'Families are exactly the point. The business plans launch first because offices lose track of the most birthdays, but the waitlist has a family lane and the family plan follows the founding route.',
  },
  {
    q: 'What does a corporate pilot include?',
    a: 'We load your full list for you, run your next 60 days of celebrations end to end, and send you the delivery photos and the reactions. If your team does not feel it, you walk away. Pilots are limited to the founding route while the vendor network grows.',
  },
];
