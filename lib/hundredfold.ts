/**
 * HUNDREDFOLD. The flagship.
 *
 * The free Hundredfold Roadmap at /scaling-roadmap tells an owner what is
 * capping them. HUNDREDFOLD is the program that goes and fixes it: Mr. Mustard
 * interviews them like a scale-or-fail coach, we build the offer, we build the
 * agents and automations that execute the plan, and we coach them through four
 * gates over twelve months.
 *
 * ⚠️ PRICE LIVES HERE AND NOWHERE ELSE, in cents. Same law as data/demo-agent.ts:
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

  /** $5,000 to start. Covers the interview, the offer build, and the first builds. */
  setupCents: 500_000,
  /** $2,500 a month. Coaching, the build queue, and the agents running. */
  monthlyCents: 250_000,

  /** The program runs on gates, not on the calendar. Twelve months of windows. */
  termMonths: 12,

  /**
   * ⚠️ THE SPEND CAP, and it is the only cap left.
   *
   * Sarah removed the founding-seat limit on 2026-08-07: this is a straight
   * offer meant to reach thousands, not a cohort. That decision moves the risk
   * from "can Sarah serve them" to "does a member cost more in model calls than
   * they pay", which is the failure this number exists to prevent.
   *
   * A member's included AI work per month: interviews, re-synthesis, agent runs.
   * Past it, the work queues to the next cycle rather than billing them a
   * surprise or quietly eating the margin. Guards fail CLOSED.
   */
  monthlyAiCreditCents: 40_000,
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
    name: 'The Offer Build',
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
      'A voice agent answering your calls and a site that answers for you',
      'Everything in your accounts, in your name, yours to keep',
    ],
  },
  {
    key: 'coaching',
    n: '05',
    name: 'Your Coach',
    line: 'Mr. Mustard, on your business, at three in the morning if that is when you think.',
    body: 'Not a weekly call you have to save your questions for. Your own coach lives in your Command Center and has read everything: your interview, your roadmap, your offer, every gate, every number you have logged. Ask him what to do next, why a gate is not moving, how to handle the objection you got today, what to say on the phone tomorrow. He answers in your context, not in general. And when the answer is "that needs building", he does not hand you homework. He asks us to build it.',
    gets: [
      'A coach who knows your plan, available every hour of every day',
      'Answers in your context: your numbers, your gate, your offer, your words',
      'No calls to schedule, no waiting until Tuesday, no saving up questions',
    ],
  },
  {
    key: 'command',
    n: '06',
    name: 'The Arsenal',
    line: 'Everything the plan needs, built and ready, in one place.',
    body: 'Your roadmap lives here instead of going stale in a PDF, and so does everything it takes to run it. Gates check off as you clear them. Your agents, your campaigns, your images, your pages, your scripts. Most of it you can build and put live yourself, right there, as many times as you want. The pieces that cost real money to run stay behind a yes from you, so nothing ever spends without you saying so.',
    gets: [
      'Your live roadmap, gates, scoreboard, and build queue on one screen',
      'Build and deploy your own pages, images, campaigns, and scripts, unlimited',
      'Anything that spends real money waits for your approval first',
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
    item: 'The Offer Build: your offer, stacked, priced, guaranteed, and written',
    valueCents: 750_000,
    why: 'The single highest-leverage document your business will own this year.',
  },
  {
    item: 'Custom agents and automations, built one window at a time',
    valueCents: 2_400_000,
    why: 'Bespoke build work at this studio runs $2,500 to $45,000 per system.',
  },
  {
    item: 'Your own coach, in your context, every hour of every day',
    valueCents: 1_800_000,
    why: 'Studio time is $225 an hour. This is the answer at 11pm on a Sunday, as often as you need it.',
  },
  {
    item: 'A voice agent answering your calls and a site that answers for you',
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
  /** Said under the button, where the hesitation actually happens. */
  short: 'Offer, roadmap, and your first working system inside thirty days, or month two is free and you keep it all.',
};

/**
 * No countdown timer, no fake seat count, no "doors close Friday".
 *
 * The honest reason to start now is arithmetic: the program is built around
 * four windows, and the first one is thirty days. A month spent deciding is a
 * window you do not get back, and every warm lead already in their phone is
 * cooling while they think about it.
 */
export const SCARCITY = {
  headline: 'The only clock that matters is yours',
  body: `There is no countdown on this page and no seat count, because neither would be true. What is true is that window one takes thirty days and it is the same thirty days whether you start it this month or next, and that the people who said "maybe later" to you this quarter are getting colder every week nobody calls them. Start when you are ready to actually run it.`,
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
    'You want a standing phone call on the calendar. We do not run those, on purpose.',
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

/**
 * Stack value is quoted per YEAR against a price that is setup plus twelve
 * months, so the two numbers on the page compare like for like.
 */
export const firstYearPriceSentence = (): string =>
  `${money(HUNDREDFOLD.setupCents)} to start, then ${money(HUNDREDFOLD.monthlyCents)} a month, month to month`;
