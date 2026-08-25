/**
 * THE CLIENT FACTORY NUMBERS.
 *
 * Four questions, answered from measured data and nothing else:
 *
 *   1. Is the company compounding?          → NET NEW MRR
 *   2. Where does the goal actually stand?  → PATH TO THE GOAL
 *   3. What is stopping us right now?       → THE BOTTLENECK
 *   4. What would it take to hit target?    → THE FORECAST
 *
 * Two rules run through all of it. Every rate names the denominator it divides
 * by, so "31% build rate" always means "of people who completed a call". And
 * anything with too small a sample says so instead of projecting off three
 * data points: a forecast built on one customer is a rumour with a decimal point.
 */

import { getSupabase } from '@/lib/supabase';
import { OFFER, CLIENT_MILESTONES, MRR_MILESTONES_CENTS } from '@/lib/acq/types';
import { getCampaign } from '@/lib/acq/settings';
import type { AcqCampaign } from '@/lib/acq/types';

/** Below this many outcomes, a rate is reported but never projected from. */
export const MIN_SAMPLE = 20;

/* ───────────────────────── the north star: net new MRR ──────────────────── */

export type MrrMovement = {
  newCents: number;
  expansionCents: number;
  reactivationCents: number;
  contractionCents: number;
  churnCents: number;
  paymentLossCents: number;
  netNewCents: number;
  activeMrrCents: number;
  churnedClients: number;
  newClients: number;
  /** Net revenue retention over the window, when there is a base to divide by. */
  nrrPct: number | null;
  logoChurnPct: number | null;
};

type MrrRow = { type: string; mrr_delta_cents: number; setup_cents: number; occurred_at: string; lead_id: string | null };

/**
 * Decompose a window into what won, what grew, what shrank and what left.
 *
 * Gross new MRR is a headline. This is the business: a month that adds twelve
 * clients and loses nine is not a month that added twelve clients.
 */
export async function mrrMovement(sinceIso: string, untilIso?: string): Promise<MrrMovement> {
  const db = getSupabase();
  const empty: MrrMovement = {
    newCents: 0, expansionCents: 0, reactivationCents: 0, contractionCents: 0, churnCents: 0,
    paymentLossCents: 0, netNewCents: 0, activeMrrCents: 0, churnedClients: 0, newClients: 0,
    nrrPct: null, logoChurnPct: null,
  };
  if (!db) return empty;

  let q = db.from('acq_mrr_events').select('type,mrr_delta_cents,setup_cents,occurred_at,lead_id').gte('occurred_at', sinceIso);
  if (untilIso) q = q.lt('occurred_at', untilIso);
  const { data } = await q.limit(100000);
  const rows = (data ?? []) as MrrRow[];

  const sum = (type: string) => rows.filter((r) => r.type === type).reduce((s, r) => s + Number(r.mrr_delta_cents), 0);

  const out: MrrMovement = {
    ...empty,
    newCents: sum('new'),
    expansionCents: sum('expansion'),
    reactivationCents: sum('reactivation'),
    contractionCents: sum('contraction'),
    churnCents: sum('churn'),
    paymentLossCents: sum('payment_failed'),
    newClients: rows.filter((r) => r.type === 'new').length,
    churnedClients: rows.filter((r) => r.type === 'churn').length,
  };
  out.netNewCents =
    out.newCents + out.expansionCents + out.reactivationCents + out.contractionCents + out.churnCents + out.paymentLossCents;

  // Everything ever, so the standing base is a fact rather than a window.
  const { data: all } = await db.from('acq_mrr_events').select('mrr_delta_cents,type,lead_id').limit(200000);
  const allRows = (all ?? []) as MrrRow[];
  out.activeMrrCents = allRows.reduce((s, r) => s + Number(r.mrr_delta_cents), 0);

  // If the MRR ledger has not been used yet, fall back to what the lead rows
  // say, so the dashboard is honest on day one rather than empty.
  if (!allRows.length) {
    const { data: clients } = await db
      .from('outbound_leads')
      .select('mrr_cents,setup_cents,won_at')
      .eq('client_status', 'client')
      .limit(10000);
    const list = (clients ?? []) as { mrr_cents: number | null; won_at: string | null }[];
    out.activeMrrCents = list.reduce((s, c) => s + (c.mrr_cents ?? OFFER.monthlyCents), 0);
    const inWindow = list.filter((c) => c.won_at && c.won_at >= sinceIso && (!untilIso || c.won_at < untilIso));
    out.newCents = inWindow.reduce((s, c) => s + (c.mrr_cents ?? OFFER.monthlyCents), 0);
    out.newClients = inWindow.length;
    out.netNewCents = out.newCents;
  }

  const openingBase = out.activeMrrCents - out.netNewCents;
  out.nrrPct = openingBase > 0 ? round1(((openingBase + out.expansionCents + out.contractionCents + out.churnCents) / openingBase) * 100) : null;

  const { count: activeClients } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).eq('client_status', 'client');
  const opening = (activeClients ?? 0) - out.newClients + out.churnedClients;
  out.logoChurnPct = opening > 0 ? round1((out.churnedClients / opening) * 100) : null;

  return out;
}

/* ──────────────────────────── goals and milestones ──────────────────────── */

export type GoalLadder = {
  clients: { value: number; reached: boolean; current: boolean }[];
  mrr: { cents: number; reached: boolean; current: boolean }[];
};

/** The ladder, with the rung we are on marked. A milestone is never a ceiling. */
export function goalLadder(activeClients: number, activeMrrCents: number, goalClients: number): GoalLadder {
  const clientRungs = [...new Set([...CLIENT_MILESTONES, goalClients])].sort((a, b) => a - b);
  const nextClient = clientRungs.find((v) => activeClients < v);
  const nextMrr = MRR_MILESTONES_CENTS.find((v) => activeMrrCents < v);
  return {
    clients: clientRungs.map((v) => ({ value: v, reached: activeClients >= v, current: v === nextClient })),
    mrr: MRR_MILESTONES_CENTS.map((v) => ({ cents: v, reached: activeMrrCents >= v, current: v === nextMrr })),
  };
}

export type PathToGoal = {
  goalRevenueCents: number;
  realizedRevenueCents: number;
  remainingCents: number;
  monthsElapsed: number;
  monthsRemaining: number;
  requiredMonthlyCents: number;
  currentMonthlyRunRateCents: number;
  arrRunRateCents: number;
  status: 'ahead' | 'on track' | 'below track' | 'not started';
  activeClients: number;
  newThisMonth: number;
  targetMin: number;
  targetStretch: number;
  activeMrrCents: number;
};

/**
 * Realized revenue only: money actually collected. No proposals, no pipeline,
 * no "if they all upgrade". Setup fees count once; recurring counts per month
 * it was actually live.
 */
export async function pathToGoal(campaign: AcqCampaign): Promise<PathToGoal> {
  const db = getSupabase();
  const start = campaign.goal_started_on ? new Date(`${campaign.goal_started_on}T00:00:00Z`) : new Date();
  const now = new Date();
  const monthsElapsed = Math.max(0, monthsBetween(start, now));
  const horizon = campaign.goal_horizon_months ?? 12;
  const monthsRemaining = Math.max(0, horizon - monthsElapsed);

  let realized = 0;
  let activeClients = 0;
  let newThisMonth = 0;
  let activeMrr = 0;

  if (db) {
    const { data: clients } = await db
      .from('outbound_leads')
      .select('setup_cents,mrr_cents,won_at,client_status')
      .eq('client_status', 'client')
      .limit(20000);
    const list = (clients ?? []) as { setup_cents: number | null; mrr_cents: number | null; won_at: string | null }[];
    activeClients = list.length;
    activeMrr = list.reduce((s, c) => s + (c.mrr_cents ?? OFFER.monthlyCents), 0);

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    newThisMonth = list.filter((c) => c.won_at && c.won_at >= monthStart).length;

    for (const c of list) {
      const setup = c.setup_cents ?? OFFER.setupCents;
      const monthly = c.mrr_cents ?? OFFER.monthlyCents;
      const wonAt = c.won_at ? new Date(c.won_at) : null;
      // Months this account has actually been billed, floored at one.
      const monthsLive = wonAt ? Math.max(1, monthsBetween(wonAt, now)) : 1;
      realized += setup + monthly * monthsLive;
    }
  }

  const goal = Number(campaign.goal_revenue_cents ?? 100_000_000);
  const remaining = Math.max(0, goal - realized);
  const requiredMonthly = monthsRemaining > 0 ? Math.ceil(remaining / monthsRemaining) : remaining;
  const currentMonthly = monthsElapsed > 0 ? Math.round(realized / monthsElapsed) : realized;

  const status: PathToGoal['status'] =
    monthsElapsed === 0 && realized === 0
      ? 'not started'
      : currentMonthly >= requiredMonthly * 1.1
        ? 'ahead'
        : currentMonthly >= requiredMonthly * 0.9
          ? 'on track'
          : 'below track';

  return {
    goalRevenueCents: goal,
    realizedRevenueCents: realized,
    remainingCents: remaining,
    monthsElapsed,
    monthsRemaining,
    requiredMonthlyCents: requiredMonthly,
    currentMonthlyRunRateCents: currentMonthly,
    arrRunRateCents: activeMrr * 12,
    status,
    activeClients,
    newThisMonth,
    targetMin: campaign.monthly_client_target_min ?? 30,
    targetStretch: campaign.monthly_client_target_stretch ?? 40,
    activeMrrCents: activeMrr,
  };
}

/* ─────────────────────────── the bottleneck engine ──────────────────────── */

export type FunnelRate = {
  key: string;
  label: string;
  numerator: number;
  denominator: number;
  ratePct: number | null;
  /** True when the sample is too small to act on. */
  thin: boolean;
};

export type Bottleneck = {
  rates: FunnelRate[];
  /** The stage losing the most, with enough evidence behind it to believe. */
  primary: FunnelRate | null;
  /** The capacity or supply constraint, when that is what actually binds. */
  constraint: {
    id: string;
    label: string;
    detail: string;
    severity: 'blocking' | 'tight' | 'fine';
  };
  advice: string;
};

/**
 * Name the one thing to fix.
 *
 * Two different questions get answered here and they are deliberately kept
 * apart. The funnel rates say where prospects are being LOST. The constraint
 * says what is capping THROUGHPUT. A perfect funnel with no prospect inventory
 * and a broken funnel with a full reservoir need opposite responses, and the
 * classic mistake is to answer both with "send more email".
 */
export async function findBottleneck(campaign: AcqCampaign | null): Promise<Bottleneck> {
  const db = getSupabase();
  const rates: FunnelRate[] = [];
  const zero: Bottleneck = {
    rates,
    primary: null,
    constraint: { id: 'unknown', label: 'Unknown', detail: 'No data yet.', severity: 'fine' },
    advice: 'Nothing has happened yet. Get email one out to a first cohort.',
  };
  if (!db) return zero;

  const { count: emailed } = await db.from('acq_sends').select('id', { count: 'exact', head: true }).eq('kind', 'campaign').neq('status', 'refused');
  const { count: consented } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).eq('consent_status', 'granted');
  const { count: called } = await db.from('acq_calls').select('id', { count: 'exact', head: true }).eq('status', 'completed');
  const { count: built } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).eq('demo_status', 'ready');
  const { count: clients } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).eq('client_status', 'client');
  const { count: ready } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).eq('acq_eligible', true).eq('email_stage', 0);

  const rate = (key: string, label: string, num: number, den: number): FunnelRate => ({
    key,
    label,
    numerator: num,
    denominator: den,
    ratePct: den > 0 ? round2((num / den) * 100) : null,
    thin: den < MIN_SAMPLE,
  });

  rates.push(rate('email-permission', 'Email to permission', consented ?? 0, emailed ?? 0));
  rates.push(rate('permission-call', 'Permission to completed call', called ?? 0, consented ?? 0));
  rates.push(rate('call-forge', 'Call to build', built ?? 0, called ?? 0));
  rates.push(rate('forge-paid', 'Build to paid', clients ?? 0, built ?? 0));

  // The stage with the worst rate that still has enough behind it to believe.
  const believable = rates.filter((r) => !r.thin && r.ratePct !== null);
  const primary = believable.length ? believable.reduce((worst, r) => (r.ratePct! < worst.ratePct! ? r : worst)) : null;

  /* ── what is actually capping throughput ── */

  const { data: settingsRow } = await db.from('acq_settings').select('*').eq('id', true).maybeSingle();
  const allowance = Number(settingsRow?.adaptive_daily_allowance ?? 100);
  const targetInventory = Number(settingsRow?.target_ready_inventory ?? 25000);
  const { count: buildQueue } = await db.from('acq_queue').select('id', { count: 'exact', head: true }).eq('kind', 'forge').eq('status', 'pending');
  const { count: callQueue } = await db.from('acq_queue').select('id', { count: 'exact', head: true }).eq('kind', 'call').eq('status', 'pending');

  let constraint: Bottleneck['constraint'];
  const daysOfInventory = allowance > 0 ? (ready ?? 0) / allowance : 0;

  if ((ready ?? 0) === 0) {
    constraint = { id: 'inventory', label: 'Prospect inventory', detail: 'There is nothing campaign-ready to send to.', severity: 'blocking' };
  } else if (daysOfInventory < 3) {
    constraint = {
      id: 'inventory',
      label: 'Prospect inventory',
      detail: `${ready} ready prospects, about ${daysOfInventory.toFixed(1)} days at the current allowance of ${allowance} a day. Target inventory is ${targetInventory.toLocaleString()}.`,
      severity: 'tight',
    };
  } else if (settingsRow?.sender_state === 'restricted' || settingsRow?.sender_state === 'paused') {
    constraint = { id: 'sender', label: 'Sender health', detail: settingsRow.sender_state_reason ?? 'The sender is held.', severity: 'blocking' };
  } else if ((callQueue ?? 0) > 25) {
    constraint = { id: 'mustard', label: 'Mr. Mustard capacity', detail: `${callQueue} people are waiting on a call they asked for.`, severity: 'tight' };
  } else if ((buildQueue ?? 0) > 15) {
    constraint = { id: 'forge', label: 'Build capacity', detail: `${buildQueue} demos are queued behind the local worker.`, severity: 'tight' };
  } else if (allowance < 1000) {
    constraint = {
      id: 'sender',
      label: 'Sender capacity',
      detail: `The adaptive allowance is ${allowance} a day while the sender ramps. It rises on measured health, not on demand.`,
      severity: 'tight',
    };
  } else {
    constraint = { id: 'none', label: 'No hard constraint', detail: 'Inventory, sender capacity and both workers all have headroom.', severity: 'fine' };
  }

  const advice = buildAdvice(primary, constraint, ready ?? 0, allowance);
  return { rates, primary, constraint, advice };
}

function buildAdvice(primary: FunnelRate | null, constraint: Bottleneck['constraint'], ready: number, allowance: number): string {
  if (constraint.severity === 'blocking') {
    return constraint.id === 'inventory'
      ? 'Run the Lead Finder. Nothing else matters while there is nothing to send to.'
      : `Fix the sender first. ${constraint.detail}`;
  }
  if (!primary) {
    return ready > allowance * 3
      ? 'Not enough has happened to name a bottleneck. Release the next cohort and let it produce a real sample.'
      : 'Not enough has happened to name a bottleneck yet. Keep the cohorts small and let the rates form.';
  }
  switch (primary.key) {
    case 'email-permission':
      return 'The email is the constraint, not the volume. Test the subject and the ask before sending more of the same email to more people.';
    case 'permission-call':
      return 'People are asking for the call and not getting a good one. Look at the failed calls and the retry path before touching the email.';
    case 'call-forge':
      return 'They talk to him and do not ask for theirs. That is the demo, not the list. Listen to three transcripts.';
    case 'forge-paid':
      return 'They get their agent and do not buy. Sending more email will not fix this. Look at price reaction and the objections on the Intelligence screen.';
    default:
      return 'Work the worst rate, not the biggest number.';
  }
}

/* ──────────────────────────────── forecasting ───────────────────────────── */

export type Forecast = {
  target: number;
  /** null when the sample is too thin to project honestly. */
  prospectsNeeded: number | null;
  emailsNeeded: number | null;
  permissionsNeeded: number | null;
  callsNeeded: number | null;
  buildsNeeded: number | null;
  low: number | null;
  high: number | null;
  basedOn: string;
  confident: boolean;
};

/**
 * What it would take to win N more clients, at the rates this campaign has
 * actually produced. Ranges widen automatically when the sample is small, and
 * a genuinely thin sample returns nulls rather than a confident fiction.
 */
export function forecast(rates: FunnelRate[], target: number): Forecast {
  const by = (key: string) => rates.find((r) => r.key === key);
  const chain = ['email-permission', 'permission-call', 'call-forge', 'forge-paid'].map(by);
  const usable = chain.every((r) => r && r.ratePct !== null && r.ratePct > 0);
  const smallest = Math.min(...chain.map((r) => r?.denominator ?? 0));

  if (!usable) {
    return {
      target,
      prospectsNeeded: null, emailsNeeded: null, permissionsNeeded: null, callsNeeded: null, buildsNeeded: null,
      low: null, high: null,
      basedOn: 'Not enough of the funnel has run to project from.',
      confident: false,
    };
  }

  const [ep, pc, cf, fp] = chain.map((r) => r!.ratePct! / 100);
  const builds = Math.ceil(target / fp);
  const calls = Math.ceil(builds / cf);
  const permissions = Math.ceil(calls / pc);
  const emails = Math.ceil(permissions / ep);

  // The wider the thinnest sample, the tighter the range. Deliberately generous
  // at low n: a projection off 20 outcomes deserves a wide band and a label.
  const spread = smallest >= 500 ? 0.2 : smallest >= 200 ? 0.35 : smallest >= MIN_SAMPLE ? 0.6 : 1;

  return {
    target,
    prospectsNeeded: emails,
    emailsNeeded: emails,
    permissionsNeeded: permissions,
    callsNeeded: calls,
    buildsNeeded: builds,
    low: Math.round(emails * (1 - spread / 2)),
    high: Math.round(emails * (1 + spread / 2)),
    basedOn: `Observed rates over a smallest sample of ${smallest.toLocaleString()}. PROJECTION, NOT GUARANTEE.`,
    confident: smallest >= 200,
  };
}

/* ──────────────────────────── the reservoir view ────────────────────────── */

export type Reservoir = {
  total: number;
  byState: Record<string, number>;
  ready: number;
  targetReady: number;
  daysOfInventory: number | null;
  suppressed: number;
};

export async function reservoirStatus(): Promise<Reservoir> {
  const db = getSupabase();
  const empty: Reservoir = { total: 0, byState: {}, ready: 0, targetReady: 25000, daysOfInventory: null, suppressed: 0 };
  if (!db) return empty;

  const { data: settings } = await db.from('acq_settings').select('target_ready_inventory,adaptive_daily_allowance').eq('id', true).maybeSingle();
  const { count: total } = await db.from('outbound_leads').select('id', { count: 'exact', head: true });
  const { count: ready } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).eq('acq_eligible', true).eq('email_stage', 0);
  const { count: suppressed } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).not('unsubscribed_at', 'is', null);

  // One grouped read rather than twenty one head counts.
  const byState: Record<string, number> = {};
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from('outbound_leads').select('reservoir_state').range(from, from + 999);
    const rows = (data ?? []) as { reservoir_state: string | null }[];
    for (const r of rows) {
      const k = r.reservoir_state ?? 'discovered';
      byState[k] = (byState[k] ?? 0) + 1;
    }
    if (rows.length < 1000) break;
  }

  const allowance = Number(settings?.adaptive_daily_allowance ?? 100);
  return {
    total: total ?? 0,
    byState,
    ready: ready ?? 0,
    targetReady: Number(settings?.target_ready_inventory ?? 25000),
    daysOfInventory: allowance > 0 ? round1((ready ?? 0) / allowance) : null,
    suppressed: suppressed ?? 0,
  };
}

/* ───────────────────────────── the whole picture ────────────────────────── */

export type FactoryReport = {
  campaign: AcqCampaign | null;
  path: PathToGoal | null;
  movement: MrrMovement;
  ladder: GoalLadder;
  bottleneck: Bottleneck;
  reservoir: Reservoir;
  forecasts: Forecast[];
};

export async function clientFactoryReport(): Promise<FactoryReport> {
  const campaign = await getCampaign();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

  const [path, movement, bottleneck, reservoir] = await Promise.all([
    campaign ? pathToGoal(campaign) : Promise.resolve(null),
    mrrMovement(monthStart),
    findBottleneck(campaign),
    reservoirStatus(),
  ]);

  const activeClients = path?.activeClients ?? 0;
  const goalClients = campaign?.goal_clients ?? 50;
  const ladder = goalLadder(activeClients, movement.activeMrrCents, goalClients);

  const targets = [...new Set([Math.max(1, goalClients - activeClients), campaign?.monthly_client_target_min ?? 30, campaign?.monthly_client_target_stretch ?? 40])];
  const forecasts = targets.map((t) => forecast(bottleneck.rates, t));

  return { campaign, path, movement, ladder, bottleneck, reservoir, forecasts };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Whole months between two instants, floored. */
export function monthsBetween(from: Date, to: Date): number {
  const months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  return to.getUTCDate() >= from.getUTCDate() ? months : months - 1;
}
