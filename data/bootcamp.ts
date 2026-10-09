/**
 * THE ONE-PERSON COMPANY BOOTCAMP. Every bootcamp surface reads this file.
 *
 * Three live sessions where one person shows how a whole AI product studio
 * runs on a crew of Claude agents, and every attendee leaves with two working
 * agents of their own. A free masterclass sells the ticket. The ticket sells
 * The Operator Program (eight weeks, cohort). Anyone who would rather have it
 * built goes through /claude. Hosts run a room for their own audience and
 * keep the ticket.
 *
 * Prices are set packages, approved by Sarah on 2026-10-08. A course is one of
 * the two things this site publishes a price for (repo convention), so the
 * numbers on the page and the numbers Stripe charges both come from here.
 * Changes to what we teach are included; a new deliverable is the next tier.
 *
 * Dates are Mountain Time. February is standard time (UTC-7).
 */

import { OFFICE_AGENT_COUNT } from './bootcamp-office';
import { STUDIO_STATS } from './studio-stats';

export const BOOTCAMP = {
  name: 'The One-Person Company Bootcamp',
  short: 'The Bootcamp',
  launch: 'launch-1',
  metaTitle: 'The One-Person Company Bootcamp: Run Your Business With a Crew of AI Agents',
  metaDescription:
    'Three live sessions. Watch one person run an entire AI product studio with a crew of Claude agents, then build two working agents for your own business and leave with your own agentic office. February 2 to 9, 2027. $97.',
  promise:
    'Watch one person run an entire AI product studio with a crew of Claude agents. Then build two of your own, live, for the business you already run.',
  thesis:
    'We are all directors of ideas now. The work left for a person is deciding what should exist and saying yes. This bootcamp teaches you to brief, train and direct a crew of agents that runs the business, brings you fresh ideas, and builds whatever you can describe.',
  timezone: 'America/Denver',
  tzLabel: 'Mountain Time',
  /** 1:00 to 2:30 PM MT, every session. */
  sessionTime: '1:00 to 2:30 PM Mountain',
  dates: {
    masterclass: '2027-01-26T20:00:00.000Z',
    kickoff: '2027-02-01T20:00:00.000Z',
    day1: '2027-02-02T20:00:00.000Z',
    day2: '2027-02-04T20:00:00.000Z',
    day3: '2027-02-09T20:00:00.000Z',
    /** Enrollment closes the night of Day 1, 11:59 PM MT. */
    close: '2027-02-03T06:59:00.000Z',
    operatorStart: '2027-02-16T20:00:00.000Z',
    operatorEnd: '2027-04-06T21:30:00.000Z',
    /** The tier deliverables open in every eligible room when Day 3 ends, 2:30 PM MT. */
    deliverables: '2027-02-09T21:30:00.000Z',
  },
  seedsideIncluded: true,
  guarantee:
    'Attend Day 1 live, do the work, and if the first session was not worth more than the ticket, email us by 11:59 PM Mountain that night and we refund every dollar. No form, no call.',
  owner: 'Sarah Scarano',
  ownerLine: 'Taught live by Sarah Scarano, founder of Modern Mustard Seed, from the desk that runs it.',
} as const;

export type BootcampTierSlug = 'ga' | 'vip' | 'platinum';
export type BootcampPaidSlug = BootcampTierSlug | 'operator';

export type BootcampTier = {
  slug: BootcampTierSlug;
  name: string;
  chip: string;
  priceCents: number;
  replayDays: number;
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
  /** Platinum only: how many seats get their business built on screen on Day 2. */
  frontRowSeats?: number;
};

export const bootcampTiers: BootcampTier[] = [
  {
    slug: 'ga',
    name: 'General Admission',
    chip: 'Three live sessions · 30 days of replays',
    priceCents: 9700,
    replayDays: 30,
    pitch: 'Every live session, the kickoff, and two working agents you keep.',
    includes: [
      'Three live 90-minute sessions, February 2, 4 and 9',
      'The kickoff call on February 1: setup done together, so Day 1 starts at speed',
      'Two working AI agents built on Day 3 for your business, yours to keep',
      'The Idea Director worksheet: the pre-work that turns one idea into a brief an agent can build',
      'Your SeedSide office, first month included: the place your agents work',
      'The private room for the run: questions answered between sessions',
      'Replays for 30 days',
    ],
    cta: 'Take a seat',
  },
  {
    slug: 'vip',
    name: 'VIP',
    chip: 'Everything in General · 90 days of replays',
    priceCents: 29700,
    replayDays: 90,
    pitch: 'The sessions, plus the deck we actually run on and a coaching hour the week after.',
    includes: [
      'Everything in General Admission',
      "The Director's Deck: forty prompts and skill files lifted from the studio, in the words we use them",
      'A bonus 90-minute coaching session with Sarah the week after Day 3, on your real work',
      'Full transcripts and class notes after every session',
      'Replays for 90 days',
    ],
    cta: 'Go VIP',
    featured: true,
  },
  {
    slug: 'platinum',
    name: 'Platinum',
    chip: 'Everything in VIP · six months of replays',
    priceCents: 49700,
    replayDays: 182,
    pitch: 'The studio kit itself, and your business built on screen on Day 2.',
    includes: [
      'Everything in VIP',
      'The Studio Kit: a licensed copy of the twenty laws, the skill library and the ten safety hooks that run Modern Mustard Seed, installable in an afternoon',
      'Front row on Day 2: the first forty Platinum seats get their own business built on screen in their trade room',
      "The Operator's Playbook: the written manual for running a company with a crew",
      'Replays for six months',
    ],
    cta: 'Go Platinum',
    frontRowSeats: 40,
  },
];

export function getBootcampTier(slug: string): BootcampTier | undefined {
  return bootcampTiers.find((t) => t.slug === slug);
}

export function usd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

/** The tier a registration climbs to when a paid tier is bought. */
export const TIER_RANK: Record<string, number> = { masterclass: 0, ga: 1, vip: 2, platinum: 3, operator: 4 };

/**
 * THE TIER DELIVERABLES, named on the VIP and Platinum cards above. Built
 * from private/bootcamp/src by scripts/bootcamp-deliverables-build.mjs and
 * served only through the signed room route, never from public/. A cohort
 * seat holds everything Platinum holds. They open in the room when Day 3
 * ends (BOOTCAMP.dates.deliverables); before that the room shows the date.
 */
export type DeliverableFile = { name: string; label: string; kind: 'PDF' | 'ZIP'; mime: string };
export type BootcampDeliverable = {
  slug: 'deck' | 'kit' | 'playbook';
  name: string;
  minTier: 'vip' | 'platinum';
  blurb: string;
  files: DeliverableFile[];
};

export const bootcampDeliverables: BootcampDeliverable[] = [
  {
    slug: 'deck',
    name: "The Director's Deck",
    minTier: 'vip',
    blurb: 'Forty prompts and skill files lifted from the studio, in eight suits, in the words we use them. The deck to read, and the same forty as files to paste.',
    files: [
      { name: 'directors-deck.pdf', label: 'The deck', kind: 'PDF', mime: 'application/pdf' },
      { name: 'directors-deck-files.zip', label: 'The forty as files', kind: 'ZIP', mime: 'application/zip' },
    ],
  },
  {
    slug: 'kit',
    name: 'The Studio Kit',
    minTier: 'platinum',
    blurb: 'The twenty laws as a rules file you fill in, twelve skills, and the ten safety hooks that run Modern Mustard Seed, with an installer and a test suite for Windows and macOS.',
    files: [{ name: 'studio-kit.zip', label: 'The kit', kind: 'ZIP', mime: 'application/zip' }],
  },
  {
    slug: 'playbook',
    name: "The Operator's Playbook",
    minTier: 'platinum',
    blurb: 'The written manual for running a company with a crew: fourteen chapters and the first-thirty-days checklist.',
    files: [{ name: 'operators-playbook.pdf', label: 'The playbook', kind: 'PDF', mime: 'application/pdf' }],
  },
];

/** The deliverables a tier holds, in order. Free seats and General Admission hold none. */
export function deliverablesFor(tier: string): BootcampDeliverable[] {
  const rank = TIER_RANK[tier] ?? 0;
  return bootcampDeliverables.filter((d) => rank >= TIER_RANK[d.minTier]);
}

/** The deliverable a file belongs to, or undefined when no deliverable ships that name. */
export function deliverableForFile(name: string): { deliverable: BootcampDeliverable; file: DeliverableFile } | undefined {
  for (const deliverable of bootcampDeliverables) {
    const file = deliverable.files.find((f) => f.name === name);
    if (file) return { deliverable, file };
  }
  return undefined;
}

export function deliverablesReleased(now = Date.now()): boolean {
  return now >= new Date(BOOTCAMP.dates.deliverables).getTime();
}

export type BootcampDay = {
  n: 1 | 2 | 3;
  dateKey: 'day1' | 'day2' | 'day3';
  dateLabel: string;
  title: string;
  lead: string;
  beats: string[];
  leaveWith: string;
};

export const bootcampDays: BootcampDay[] = [
  {
    n: 1,
    dateKey: 'day1',
    dateLabel: 'Tuesday, February 2',
    title: 'Inside a company run by one person and a crew',
    lead: 'The whole studio on screen, live. Not slides. The actual office.',
    beats: [
      'A live call to the phone agent that answers our line, in front of everyone',
      'The org chart: every agent, its one job, and the charter it cannot break',
      'The twenty laws the crew obeys, and the one incident that wrote each of them',
      `Memory: how ${STUDIO_STATS.memoryNotes} notes mean we never explain the business twice`,
      'The morning briefing: what ran overnight, and the three decisions waiting for a yes',
      'The money: what this setup costs a month, and what it replaced',
    ],
    leaveWith: 'A map of your own business as a crew: which jobs become agents first, and in what order.',
  },
  {
    n: 2,
    dateKey: 'day2',
    dateLabel: 'Thursday, February 4',
    title: 'Your trade, your business, on screen',
    lead: 'The room splits by trade. Each room works on real businesses in it, starting with the front row.',
    beats: [
      'Builders, clinics, home services and agencies each get their own room and their own host',
      'Your website read and your presence audited live, then the first agent that fixes the biggest gap',
      'One agent built from a blank page, start to finish, in under twenty minutes',
      'The idea engine: how to train agents to bring you ideas you did not ask for, and judge them',
      'What a one-person company in your trade looks like at ten times the size, with the same headcount',
    ],
    leaveWith: 'A build plan for your first two agents, written with the room, in your own words.',
  },
  {
    n: 3,
    dateKey: 'day3',
    dateLabel: 'Tuesday, February 9',
    title: 'Hire your first two agents',
    lead: 'You build. We direct. By the end of the session they are working.',
    beats: [
      'Agent one: the presence agent. It reads your site, your listings and your reviews every week and files the fixes',
      'Agent two: the front desk. It answers the missed call or the form, qualifies the lead and books the appointment',
      'Connecting your calendar, inbox and the tools you already pay for',
      'Your SeedSide office opens, with both agents working inside it',
      'The director’s habit: the weekly fifteen minutes that keeps a crew sharp',
      'Three doors out: build the rest yourself, build it with us, or have us build it',
    ],
    leaveWith: 'Two working agents in your own office, and the method to add the third.',
  },
];

export type TradeRoom = {
  slug: 'builders' | 'clinics' | 'home-services' | 'agencies';
  name: string;
  who: string;
  example: string;
  /** The business profile SeedSide intake lands them in. */
  persona: string;
};

export const tradeRooms: TradeRoom[] = [
  { slug: 'builders', name: 'Builders', who: 'Custom home builders, remodelers, trades that quote big jobs', example: 'A pre-construction pipeline that follows up every plan request and books the site walk.', persona: 'builder' },
  { slug: 'clinics', name: 'Clinics', who: 'Dental, med spa, chiropractic, physical therapy, optometry', example: 'An intake desk that answers after hours, qualifies the patient and fills the cancellation list.', persona: 'clinic' },
  { slug: 'home-services', name: 'Home Services', who: 'HVAC, plumbing, electrical, roofing, landscaping, cleaning', example: 'A dispatcher that catches the missed call, quotes the standard job and texts the arrival window.', persona: 'home-services' },
  { slug: 'agencies', name: 'Agencies', who: 'Marketing, web design and creative shops that serve all of the above', example: 'A studio that audits every client monthly, drafts the report and proposes the next build.', persona: 'agency' },
];

export const OPERATOR = {
  slug: 'operator' as const,
  name: 'The Operator Program',
  chip: 'Eight weeks · live · cohort of 250',
  priceCents: 499700,
  seats: 250,
  starts: 'Tuesday, February 16, 2027',
  weeks: 8,
  pitch:
    'Eight weeks, live, in a cohort. You leave with your own agentic office running your business, a crew with charters, an idea engine that feeds you, and the ability to bring any idea you can describe to life yourself.',
  promise:
    'Finish the program and you can take an idea from a sentence to a shipped thing without hiring anyone: spec it, brief the crew, build it, guard it, run it.',
  includes: [
    'Eight weekly live sessions with Sarah, Tuesdays 1:00 to 2:30 PM Mountain, plus a Thursday build lab every week',
    'Your own agentic office in SeedSide for the length of the program, built out week by week',
    'Your rules file, memory and skill library written for your business, reviewed by the crew that runs ours',
    'A crew of agents with charters, running real recurring work by week four',
    'Safety hooks on money, messages and anything that leaves the building, installed and tested',
    'The idea engine: agents trained to bring you fresh ideas weekly and argue for them',
    'Build Week: one idea of yours taken from a sentence to a working thing, shipped',
    'Graduation: your operating manual, every account in your name, and a seat in the alumni room',
  ],
  cta: 'Take a seat in the cohort',
};

export type OperatorWeek = { n: number; title: string; outcome: string };

export const operatorWeeks: OperatorWeek[] = [
  { n: 1, title: 'Director of Ideas', outcome: 'Turn any idea into a brief an agent can build from: the one-page spec, the acceptance test, the order of work.' },
  { n: 2, title: 'Rules and Memory', outcome: 'Your rules file and memory, so every agent knows your business, your words and your lines you never cross.' },
  { n: 3, title: 'Skills', outcome: 'Ten skills for the jobs you repeat, written as playbooks the agents follow the same way every time.' },
  { n: 4, title: 'The Crew', outcome: 'Agents with one job each and a charter, running your recurring work on a schedule, with a morning briefing.' },
  { n: 5, title: 'Guardrails', outcome: 'Hooks that make the dangerous things impossible, not discouraged. Money, messages, deletes, and the audit trail.' },
  { n: 6, title: 'The Idea Engine', outcome: 'Agents that read your market, your customers and your own notes, then bring you three ideas a week and make the case.' },
  { n: 7, title: 'Build Week', outcome: 'One idea, shipped: a product, a tool, a system, a site. Scoped Monday, live Friday, with the crew doing the building.' },
  { n: 8, title: 'Operate', outcome: 'Run the whole thing in fifteen minutes a day. Handoff, ownership, and what to build next quarter.' },
];

export const HOSTS = {
  name: 'Host a Room',
  ticketPct: 100,
  programPct: 20,
  foundingHosts: 25,
  roomThreshold: 100,
  pitch:
    'Run the bootcamp for your own audience, under your name. You keep every dollar of every ticket you sell and twenty percent of every Operator Program seat that follows. Bring a hundred people and you get your own trade room on Day 2.',
  terms: [
    'You keep 100% of every ticket sold through your link: $97, $297 or $497, every one',
    'You earn 20% of every Operator Program seat your people take, $999 a seat',
    'Bring 100 or more and you host your own room on Day 2, with your name on the door',
    'The first 25 hosts are founding hosts: the same terms on all four 2027 launches',
    'Swipe copy, graphics, your tracking link and a live dashboard, ready the day you are approved',
    'Paid within ten days after Day 3, to the account you name',
  ],
  cta: 'Apply to host',
};

export const BOOTCAMP_PROOF = [
  { n: '1', label: 'person at the desk' },
  { n: '20', label: 'laws the crew obeys' },
  { n: '46', label: 'skills in daily use' },
  { n: String(OFFICE_AGENT_COUNT), label: 'agents on the crew' },
  { n: String(STUDIO_STATS.memoryNotes), label: 'memory notes it reads first' },
  { n: '40+', label: 'products shipped' },
] as const;

export const bootcampFaq = [
  {
    q: 'Who is this for?',
    a: 'Owners and operators who already run something that works and want it to run on a crew of agents instead of more hires. Builders, clinics, home services and agencies get their own room on Day 2. If you use AI most days and you are still the bottleneck, this is for you.',
  },
  {
    q: 'Do I need to be technical?',
    a: 'No. You need to know your business. We handle setup together on the kickoff call, and on Day 3 you build by directing, not by coding. Everything is done in plain words.',
  },
  {
    q: 'What do I actually leave with?',
    a: 'Two working agents for your business, running in your own SeedSide office: one that keeps your presence sharp every week and one that answers and books. Plus the build plan for the next three, written in your words.',
  },
  {
    q: 'What is SeedSide?',
    a: 'SeedSide is the agentic office your agents work in: the desks, the crew, the morning briefing and the record of everything they did. Every ticket includes the first month. After that it is month to month, cancel any time.',
  },
  {
    q: 'What if I cannot attend live?',
    a: 'Replays go up the same evening and stay up for 30, 90 or 182 days depending on your ticket. Day 3 is worth attending live: that is when your agents get built with the room.',
  },
  {
    q: 'What does it cost?',
    a: 'General Admission is $97, VIP is $297 and Platinum is $497. The Operator Program, the eight-week cohort after the bootcamp, is $4,997. Every price is a set package. Nothing is added later and nothing is negotiated.',
  },
  {
    q: 'What is the guarantee?',
    a: BOOTCAMP.guarantee,
  },
  {
    q: 'Is this a sales pitch for something else?',
    a: 'Day 3 ends with three doors: keep building yourself, join the Operator Program, or have us build it. We say so on this page because we would rather you choose with your eyes open. The sessions are the product. Most people leave with the two agents and nothing else, and that is a good outcome.',
  },
  {
    q: 'Are you affiliated with Anthropic?',
    a: 'No. Claude is made by Anthropic. Modern Mustard Seed is an independent studio that runs on Claude and teaches what we learned doing it.',
  },
];

/** The three doors out of Day 3. */
export const bootcampDoors = [
  { slug: 'self', title: 'Build the rest yourself', body: 'Take the method, the two agents and the plan, and keep going. The private room stays open for the length of your replays.', href: '/bootcamp#days', cta: 'What you leave with' },
  { slug: 'operator', title: 'Build it with us', body: 'The Operator Program: eight weeks, live, in a cohort of 250. You leave running your business on a crew you built.', href: '/bootcamp/operator', cta: 'The Operator Program' },
  { slug: 'built', title: 'Have us build it', body: 'Claude Operator and Agentic Native: we build the crew, hand you every key, and teach you to run it. Fifty seats this launch.', href: '/claude', cta: 'See Claude Operator' },
];

export const DONE_FOR_YOU_SEATS = 50;

/** Dates formatted for Mountain Time, reused by pages, emails and the .ics. */
export function fmtMountain(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BOOTCAMP.timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...opts,
  }).format(new Date(iso));
}

export function fmtMountainTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: BOOTCAMP.timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** Milliseconds until a dated moment, never negative. */
export function msUntil(iso: string, now = Date.now()): number {
  return Math.max(0, new Date(iso).getTime() - now);
}

export function enrollmentOpen(now = Date.now()): boolean {
  return now < new Date(BOOTCAMP.dates.close).getTime();
}
