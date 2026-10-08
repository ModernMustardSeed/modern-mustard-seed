/**
 * THE PLAN. The four-launch ladder for 2027 and the number it climbs to.
 *
 * Every launch is the same shape: a free masterclass on a Tuesday, the three
 * session bootcamp the week after, the Operator Program cohort behind it, and
 * a run of done-for-you builds through /claude. Each launch is bigger than the
 * last because every host who ran a room comes back with a larger audience and
 * the trade editions open new rooms.
 *
 * The desk renders this file on The Plan tab. Numbers here are targets, not
 * bookings: the Desk tab shows what has actually sold.
 */

export const THE_FORTY = {
  goal: '$40M in the first year',
  line: 'Four launches, each one a step bigger, plus the software the graduates keep paying for.',
  year: 2027,
} as const;

export type LaunchPlan = {
  n: 1 | 2 | 3 | 4;
  key: 'launch-1' | 'launch-2' | 'launch-3' | 'launch-4';
  name: string;
  masterclass: string;
  bootcampStart: string;
  bootcampEnd: string;
  /** Paid bootcamp tickets across GA, VIP and Platinum. */
  tickets: number;
  /** Operator Program seats. */
  operatorSeats: number;
  /** Done-for-you builds sold through /claude on the Day 3 door. */
  doneForYou: number;
  /** Trade editions running alongside the main room. */
  tradeEditions: number;
  editionsNote: string;
};

/** Averages used to turn seat counts into dollars. */
export const PLAN_PRICES = {
  /** Blended across $97, $297 and $497 tickets. */
  avgTicket: 140,
  operator: 4997,
  doneForYou: 12000,
} as const;

export const LAUNCHES: LaunchPlan[] = [
  {
    n: 1,
    key: 'launch-1',
    name: 'Launch 1: the first room',
    masterclass: '2027-01-26',
    bootcampStart: '2027-02-02',
    bootcampEnd: '2027-02-09',
    tickets: 5000,
    operatorSeats: 250,
    doneForYou: 50,
    tradeEditions: 0,
    editionsNote: 'One main room with four trade breakouts on Day 2.',
  },
  {
    n: 2,
    key: 'launch-2',
    name: 'Launch 2: the first two trade editions',
    masterclass: '2027-04-27',
    bootcampStart: '2027-05-04',
    bootcampEnd: '2027-05-11',
    tickets: 12000,
    operatorSeats: 600,
    doneForYou: 120,
    tradeEditions: 2,
    editionsNote: 'Builders and Clinics get their own full editions, hosted by the founding hosts who brought a hundred.',
  },
  {
    n: 3,
    key: 'launch-3',
    name: 'Launch 3: four editions',
    masterclass: '2027-07-27',
    bootcampStart: '2027-08-03',
    bootcampEnd: '2027-08-10',
    tickets: 25000,
    operatorSeats: 1250,
    doneForYou: 250,
    tradeEditions: 4,
    editionsNote: 'Builders, Clinics, Home Services and Agencies each run as a full edition.',
  },
  {
    n: 4,
    key: 'launch-4',
    name: 'Launch 4: six editions',
    masterclass: '2027-10-26',
    bootcampStart: '2027-11-02',
    bootcampEnd: '2027-11-09',
    tickets: 35000,
    operatorSeats: 1750,
    doneForYou: 350,
    tradeEditions: 6,
    editionsNote: 'The four trade editions plus two new rooms chosen from where the hosts are strongest.',
  },
];

export type LaunchTotals = {
  n: LaunchPlan['n'];
  key: LaunchPlan['key'];
  ticketRevenue: number;
  programRevenue: number;
  doneForYouRevenue: number;
  total: number;
};

export type PlanTotals = {
  launches: LaunchTotals[];
  tickets: number;
  operatorSeats: number;
  doneForYou: number;
  ticketRevenue: number;
  programRevenue: number;
  doneForYouRevenue: number;
  launchTotal: number;
  softwareInYear: number;
  softwareRunRate: number;
  yearTotal: number;
};

/** The software line: what the graduates keep paying for after the room closes. */
export const SOFTWARE = {
  seedside: { label: 'SeedSide offices', count: 11500, monthly: 149, by: 'December 2027' },
  studio: { label: 'Mustard Studio agencies', count: 600, monthly: 250, by: 'December 2027' },
  /** What the software line collects inside 2027, since the offices ramp through the year. */
  inYearCollections: 6_500_000,
  inYearNote: 'About $6.5M collected inside 2027. The run rate is what December looks like, not what the year collected.',
} as const;

export function launchTotals(): PlanTotals {
  const launches = LAUNCHES.map<LaunchTotals>((l) => {
    const ticketRevenue = l.tickets * PLAN_PRICES.avgTicket;
    const programRevenue = l.operatorSeats * PLAN_PRICES.operator;
    const doneForYouRevenue = l.doneForYou * PLAN_PRICES.doneForYou;
    return { n: l.n, key: l.key, ticketRevenue, programRevenue, doneForYouRevenue, total: ticketRevenue + programRevenue + doneForYouRevenue };
  });
  const sum = (pick: (t: LaunchTotals) => number) => launches.reduce((a, t) => a + pick(t), 0);
  const softwareRunRate = (SOFTWARE.seedside.count * SOFTWARE.seedside.monthly + SOFTWARE.studio.count * SOFTWARE.studio.monthly) * 12;
  const launchTotal = sum((t) => t.total);
  return {
    launches,
    tickets: LAUNCHES.reduce((a, l) => a + l.tickets, 0),
    operatorSeats: LAUNCHES.reduce((a, l) => a + l.operatorSeats, 0),
    doneForYou: LAUNCHES.reduce((a, l) => a + l.doneForYou, 0),
    ticketRevenue: sum((t) => t.ticketRevenue),
    programRevenue: sum((t) => t.programRevenue),
    doneForYouRevenue: sum((t) => t.doneForYouRevenue),
    launchTotal,
    softwareInYear: SOFTWARE.inYearCollections,
    softwareRunRate,
    yearTotal: launchTotal + SOFTWARE.inYearCollections,
  };
}

export type RhythmDay = { day: string; work: string };

/** The week, every week, from now until Launch 4 closes. */
export const WEEKLY_RHYTHM: RhythmDay[] = [
  { day: 'Monday', work: 'Review outreach replies and approve hosts.' },
  { day: 'Tuesday', work: 'Trade Secrets post goes up.' },
  { day: 'Wednesday', work: 'Masterclass rehearsal, or the session itself in a launch week.' },
  { day: 'Thursday', work: 'Host swipe refresh: new copy and graphics to every approved host.' },
  { day: 'Friday', work: 'Numbers review: seats, revenue, outreach, hosts, against this plan.' },
];

export type Gate = { key: string; label: string; why: string };

/** Nothing in Launch 1 goes live until every gate is green. */
export const GATES: Gate[] = [
  { key: 'vercel', label: 'Vercel paid', why: 'The site that sells the ticket has to stay up through the launch.' },
  { key: 'meta', label: 'Meta ad account active', why: 'The masterclass fills from paid reach on top of the hosts.' },
  { key: 'seedside', label: 'SeedSide live via go-live.ps1', why: 'Every ticket includes an office. The office has to exist before the first ticket sells.' },
  { key: 'studio', label: 'Mustard Studio $97 test checkout done', why: 'Proves the self-serve checkout before the agencies room sends anyone to it.' },
  { key: 'stripe', label: 'Stripe tiers verified with one $97 test purchase and refund', why: 'The welcome email, the registration row and the host credit all fire from one real charge.' },
];

/** Dollars, whole, with commas. */
export function planUsd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** Dollars in millions, one decimal, for the big numbers. */
export function planM(n: number): string {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}
