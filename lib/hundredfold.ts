/**
 * HUNDREDFOLD. The flagship.
 *
 * The free Hundredfold Roadmap at /scaling-roadmap tells an owner what is
 * capping them. HUNDREDFOLD is the program that goes and fixes it: Mr. Mustard
 * interviews them like a scale-or-fail coach, we forge the offer, we build the
 * agents and automations that execute the plan, and we coach them through four
 * gates over twelve months.
 *
 * ⚠️ PRICE LIVES HERE AND NOWHERE ELSE, in cents. Same law as data/sidekick.ts:
 * the landing page, the checkout, the portal, the emails, and the offer stack
 * all derive from these constants. A price typed as a string anywhere else is a
 * bug waiting for a customer to find it.
 */

export const HUNDREDFOLD = {
  name: 'HUNDREDFOLD',
  /** How it is said in a sentence: "you're in Hundredfold now". */
  spoken: 'Hundredfold',
  path: '/hundredfold',
  tagline: 'The scaling program that builds the machine with you.',

  /** $5,000 to start. Covers the interview, the offer forge, and the first builds. */
  setupCents: 500_000,
  /** $2,500 a month. Coaching, the build queue, and the agents running. */
  monthlyCents: 250_000,

  /** Months the joining price is held, said plainly on the page. */
  priceLockMonths: 12,

  /**
   * The hard cap. Sarah delivers this personally, so the number of seats is the
   * number she can actually serve, and the page never sells past it.
   * Revenue rule: hard-cap every plan, no trials, spend guards fail closed.
   */
  foundingSeats: 10,

  /** The program runs on gates, not on the calendar. Twelve months of windows. */
  termMonths: 12,
} as const;

export const money = (cents: number): string =>
  `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/** Reads as "$5,000 to start, then $2,500 a month". Used everywhere the price is said. */
export const priceSentence = (): string =>
  `${money(HUNDREDFOLD.setupCents)} to start, then ${money(HUNDREDFOLD.monthlyCents)} a month`;

export const firstYearCents = (): number =>
  HUNDREDFOLD.setupCents + HUNDREDFOLD.monthlyCents * HUNDREDFOLD.termMonths;

/* -------------------------------------------------------------------------- */
/* The six pillars                                                             */
/* -------------------------------------------------------------------------- */

export type Pillar = {
  key: string;
  n: string;
  name: string;
  line: string;
  body: string;
  /** What actually lands in their hands. */
  gets: string[];
};

export const PILLARS: Pillar[] = [
  {
    key: 'interview',
    n: '01',
    name: 'The Interview',
    line: 'Mr. Mustard asks you the thirty questions that decide everything.',
    body: 'Not a form. A real conversation with a coach who does not accept a vague answer. He asks what you sell and to whom, what they actually pay, what happens to the people who say no, what breaks first if you double tomorrow, where the money goes, and what you actually want out of this. He pushes when the answer is soft. Most owners have never been asked these out loud, and the answers are the whole plan.',
    gets: [
      'A live voice interview with Mr. Mustard, in your browser or on the phone',
      'A full transcript you own',
      'The scale-or-fail read: what your answers say that your website cannot',
    ],
  },
  {
    key: 'offer',
    n: '02',
    name: 'The Offer Forge',
    line: 'We build the thing you sell before we build anything else.',
    body: 'Most businesses do not have a traffic problem. They have an offer nobody can repeat and a price nobody can justify. We rebuild yours: the promise, the value stack itemized in dollars, a guarantee you can actually honor, a name a buyer repeats to their spouse, the price ladder, and the honest reason to move now. Then we write the assets that sell it.',
    gets: [
      'Your offer, named, stacked, priced, and guaranteed',
      'The sales page copy, the call script, and the objection handling',
      'A price ladder: the first yes, the core, the thing that recurs, the upsell',
    ],
  },
  {
    key: 'roadmap',
    n: '03',
    name: 'The Roadmap',
    line: 'Twelve months, four windows, a number on every gate.',
    body: 'The deep version of the roadmap, built from the interview instead of from your homepage. One constraint at a time. Each window has a goal, the moves, the metric, and the number that has to clear before you are allowed to move on. You do not advance because ninety days passed. You advance because the gate cleared.',
    gets: [
      'The full Hundredfold Roadmap, written from your interview',
      'Four windows with a numeric gate on each',
      'A scoreboard of six to eight numbers, wired to real data where we can reach it',
    ],
  },
  {
    key: 'build',
    n: '04',
    name: 'The Build',
    line: 'We wire the agents that actually run the plan.',
    body: 'This is the part nobody else does. Every window of your roadmap has work in it that a machine should be doing, and we build those machines into your business. Your phone answered day and night. Your follow-up that never forgets a warm lead. Your content produced from work you already did. Your numbers on one board. Real systems in your accounts, built for your business, not a template with your logo on it.',
    gets: [
      'Custom agents and automations built for your roadmap, one window at a time',
      'A voice agent on your real number and a site that answers for you',
      'Everything in your accounts, in your name, yours to keep',
    ],
  },
  {
    key: 'coaching',
    n: '05',
    name: 'The Coaching',
    line: 'Every week. Step by step, and the reason behind the step.',
    body: 'Two things at once, because owners need both. The step-by-step: exactly what to do this week, in what order, with the script. And the altitude: why this works, so you can make the call yourself next quarter without asking anyone. You leave knowing how to run the machine, not just owning one.',
    gets: [
      'Weekly working sessions against your current gate',
      'The step-by-step for this week, written down',
      'A direct line between sessions, answered by a person',
    ],
  },
  {
    key: 'command',
    n: '06',
    name: 'The Command Center',
    line: 'Your whole program on one screen.',
    body: 'Your roadmap lives here, not in a PDF that goes stale. Gates check off as you clear them. Your scoreboard updates. You can see every agent we have built, what is in the build queue, every session, every asset, and the message thread with us. Open it Monday morning and you know exactly what this week is.',
    gets: [
      'Your live roadmap with checkable gates',
      'Your scoreboard, your agents, and your build queue',
      'Every asset, session, and recording in one place',
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* The value stack                                                             */
/* -------------------------------------------------------------------------- */

/**
 * What the year is worth, itemized. Every figure is what the same work is
 * quoted at elsewhere in this studio or in this market, so each line can be
 * defended out loud. No invented statistics, no fabricated case results.
 */
export const STACK: { item: string; valueCents: number; why: string }[] = [
  {
    item: 'The Interview and your deep roadmap',
    valueCents: 500_000,
    why: 'A strategy engagement that produces the actual plan, not notes.',
  },
  {
    item: 'The Offer Forge: your offer, stacked, priced, guaranteed, and written',
    valueCents: 750_000,
    why: 'The single highest-leverage document your business will own this year.',
  },
  {
    item: 'Custom agents and automations, built one window at a time',
    valueCents: 2_400_000,
    why: 'Bespoke build work at this studio runs $2,500 to $45,000 per system.',
  },
  {
    item: 'Weekly coaching sessions with Sarah, all year',
    valueCents: 1_800_000,
    why: 'Studio time is $225 an hour. This is a standing hour every week, plus prep.',
  },
  {
    item: 'A voice agent on your real number and a site that answers for you',
    valueCents: 596_400,
    why: 'The Talking Website is $497 to start plus $497 a month on its own.',
  },
  {
    item: 'Your Command Center: live roadmap, gates, scoreboard, build queue',
    valueCents: 360_000,
    why: 'The back office that keeps the whole program in one place.',
  },
  {
    item: 'Everything built stays in your accounts, in your name',
    valueCents: 0,
    why: 'No lock-in, no rental, no hostage. Worth more than the line above it.',
  },
];

export const stackTotalCents = (): number => STACK.reduce((s, i) => s + i.valueCents, 0);

/* -------------------------------------------------------------------------- */
/* Risk reversal and honest scarcity                                           */
/* -------------------------------------------------------------------------- */

/**
 * A guarantee has to be conditional, specific, and honorable, or it is noise.
 * This one is honorable because both halves are things we control.
 */
export const GUARANTEE = {
  name: 'The First Window Guarantee',
  body: `Your first thirty days produce your offer, your roadmap, and your first built system, live and working. If all three are not in your hands by day thirty, you do not pay the second month and you keep everything we made. After that, thirty days notice, any month, no exit fee and no argument. Everything we build stays in your accounts either way.`,
};

/**
 * Scarcity that is true and checkable, never a countdown timer. Sarah builds
 * every one of these personally, so the seat count IS the delivery capacity.
 */
export const SCARCITY = {
  headline: `${HUNDREDFOLD.foundingSeats} founding seats`,
  body: `Sarah runs every interview and every build herself, so the number of seats is simply the number she can serve well. Founding members hold their joining price for ${HUNDREDFOLD.priceLockMonths} months. When the seats are full the next opening is the next one someone finishes.`,
};

/** Who this is and is not for. Saying the "not" out loud is what makes the "is" land. */
export const FIT = {
  yes: [
    'You already sell something that works. Revenue exists, it is just capped.',
    'You are the bottleneck and you know it.',
    'You want to understand the machine, not just be handed one.',
    'You can act on a plan within a week of getting it.',
  ],
  no: [
    'You have no offer and no customers yet. Start with the free roadmap.',
    'You want someone to do all of it while you stay out of the room.',
    'You are looking for a course to watch.',
    'You need this to pay for itself in thirty days. Give it a full window.',
  ],
};

/* -------------------------------------------------------------------------- */
/* Program state                                                               */
/* -------------------------------------------------------------------------- */

export const MEMBER_STATUSES = [
  'applicant',
  'interviewing',
  'interviewed',
  'offered',
  'active',
  'paused',
  'alumni',
  'declined',
] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const SYSTEM_STATUSES = ['proposed', 'queued', 'building', 'live', 'retired'] as const;
export type SystemStatus = (typeof SYSTEM_STATUSES)[number];

/** Seats left, floored at zero so the page can never advertise a negative. */
export const seatsLeft = (activeCount: number): number =>
  Math.max(0, HUNDREDFOLD.foundingSeats - activeCount);
