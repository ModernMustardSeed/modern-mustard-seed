/**
 * THE NUMBERS.
 *
 * Everything the Command Center and the Intelligence screen show, computed from
 * the prospect rows, the event log and the call records. Two principles:
 *
 *   A denominator is never guessed. Every conversion rate names the stage it
 *   divides by, so "37% forge rate" always means "of people who talked to Mr.
 *   Mustard", not "of everyone we emailed".
 *
 *   The projection is honest. "How many more prospects to reach 50 clients" is
 *   computed from THIS campaign's observed rates, and when a stage has no data
 *   yet it says so rather than borrowing an industry number.
 */

import { getSupabase } from '@/lib/supabase';
import { OFFER, FUNNEL_STAGES, STAGE_LABELS } from '@/lib/acq/types';
import type { AcqStage } from '@/lib/acq/types';

export type FunnelStep = {
  stage: AcqStage;
  label: string;
  count: number;
  /** Conversion from the previous stage. Null when the previous stage is empty. */
  fromPrevious: number | null;
  /** Conversion from the top of the funnel. */
  fromTop: number | null;
};

export type Totals = {
  prospects: number;
  newToday: number;
  verifiedEmails: number;
  campaignReady: number;
  emailsQueued: number;
  emailsSentToday: number;
  emailsSentTotal: number;
  bounced: number;
  unsubscribed: number;
  replies: number;
  permissionClicks: number;
  callsRequested: number;
  callsAttempted: number;
  conversationsCompleted: number;
  demosCreated: number;
  demosEmailed: number;
  meetingsBooked: number;
  checkoutsSent: number;
  purchases: number;
  setupRevenueCents: number;
  newMrrCents: number;
  closeRatePct: number | null;
  costPerAcquisitionCents: number | null;
};

export type GoalProgress = {
  goal: number;
  clients: number;
  remaining: number;
  mrrCents: number;
  goalMrrCents: number;
  setupCents: number;
  goalSetupCents: number;
  /** Observed prospect → client rate for THIS campaign, or null with no wins. */
  observedRate: number | null;
  /** Prospects still needed at the observed rate. Null when unknowable yet. */
  prospectsNeeded: number | null;
  /** Days to goal at the trailing 14-day win pace. Null when nothing has closed. */
  daysToGoal: number | null;
};

export type AcqStats = {
  totals: Totals;
  funnel: FunnelStep[];
  goal: GoalProgress;
};

type Row = {
  id: string;
  acq_stage: AcqStage;
  acq_eligible: boolean;
  email_status: string | null;
  email_stage: number;
  bounced: boolean;
  unsubscribed_at: string | null;
  reply_at: string | null;
  consent_status: string | null;
  call_stage: string | null;
  call_attempts: number;
  demo_status: string | null;
  demo_emailed_at: string | null;
  checkout_sent_at: string | null;
  meeting_status: string | null;
  payment_status: string | null;
  client_status: string | null;
  won_at: string | null;
  setup_cents: number | null;
  mrr_cents: number | null;
  created_at: string;
  imported_at: string | null;
  last_campaign_email_at: string | null;
  is_test: boolean;
};

const COLS =
  'id,acq_stage,acq_eligible,email_status,email_stage,bounced,unsubscribed_at,reply_at,consent_status,' +
  'call_stage,call_attempts,demo_status,demo_emailed_at,checkout_sent_at,meeting_status,payment_status,' +
  'client_status,won_at,setup_cents,mrr_cents,created_at,imported_at,last_campaign_email_at,is_test';

/** Every acquisition prospect, paged. A campaign of 25k rows is ~25 requests. */
export async function loadCampaignRows(campaignId: string | null): Promise<Row[]> {
  const db = getSupabase();
  if (!db) return [];
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from('outbound_leads').select(COLS).range(from, from + 999);
    q = campaignId ? q.eq('acq_campaign_id', campaignId) : q.not('acq_campaign_id', 'is', null);
    const { data, error } = await q;
    if (error) break;
    const rows = (data ?? []) as unknown as Row[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out.filter((r) => !r.is_test);
}

const isToday = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' });
  return d.format(new Date(iso)) === d.format(new Date());
};

export async function computeStats(campaignId: string | null, goalClients = 50): Promise<AcqStats> {
  const db = getSupabase();
  const rows = await loadCampaignRows(campaignId);

  /* counts that live in tables other than the lead row */
  let emailsQueued = 0;
  let emailsSentTotal = 0;
  let emailsSentToday = 0;
  let permissionClicks = 0;
  let conversationsCompleted = 0;
  let callsAttempted = 0;

  if (db) {
    const { count: queued } = await db
      .from('acq_queue')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'email')
      .eq('status', 'pending');
    emailsQueued = queued ?? 0;

    const { data: sentEvents } = await db
      .from('acq_events')
      .select('type,occurred_at')
      .in('type', ['email_sent', 'link_clicked', 'permission_visited'])
      .limit(100000);
    for (const e of (sentEvents ?? []) as { type: string; occurred_at: string }[]) {
      if (e.type === 'email_sent') {
        emailsSentTotal++;
        if (isToday(e.occurred_at)) emailsSentToday++;
      } else if (e.type === 'link_clicked') {
        permissionClicks++;
      }
    }

    const { data: calls } = await db.from('acq_calls').select('status,duration_sec').limit(100000);
    for (const c of (calls ?? []) as { status: string; duration_sec: number | null }[]) {
      if (c.status !== 'queued') callsAttempted++;
      // A "conversation" is a completed call that lasted long enough to be one.
      if (c.status === 'completed' && (c.duration_sec ?? 0) >= 45) conversationsCompleted++;
    }
  }

  const totals: Totals = {
    prospects: rows.length,
    newToday: rows.filter((r) => isToday(r.imported_at ?? r.created_at)).length,
    verifiedEmails: rows.filter((r) => r.email_status === 'verified').length,
    campaignReady: rows.filter((r) => r.acq_eligible && r.email_stage === 0).length,
    emailsQueued,
    emailsSentToday,
    emailsSentTotal,
    bounced: rows.filter((r) => r.bounced).length,
    unsubscribed: rows.filter((r) => r.unsubscribed_at).length,
    replies: rows.filter((r) => r.reply_at).length,
    permissionClicks,
    callsRequested: rows.filter((r) => r.consent_status === 'granted').length,
    callsAttempted,
    conversationsCompleted,
    demosCreated: rows.filter((r) => r.demo_status === 'ready').length,
    demosEmailed: rows.filter((r) => r.demo_emailed_at).length,
    meetingsBooked: rows.filter((r) => r.meeting_status === 'booked').length,
    checkoutsSent: rows.filter((r) => r.checkout_sent_at).length,
    purchases: rows.filter((r) => r.client_status === 'client').length,
    setupRevenueCents: rows.reduce((s, r) => s + (r.client_status === 'client' ? r.setup_cents ?? OFFER.setupCents : 0), 0),
    newMrrCents: rows.reduce((s, r) => s + (r.client_status === 'client' ? r.mrr_cents ?? OFFER.monthlyCents : 0), 0),
    closeRatePct: null,
    costPerAcquisitionCents: null,
  };

  const conversations = Math.max(conversationsCompleted, rows.filter((r) => r.acq_stage === 'demoed' || r.acq_stage === 'forged' || r.acq_stage === 'demo_sent' || r.acq_stage === 'meeting' || r.acq_stage === 'client').length);
  totals.closeRatePct = conversations > 0 ? round1((totals.purchases / conversations) * 100) : null;

  /* the funnel: each stage counts everyone who reached it OR passed through it */
  const reached = (stage: AcqStage): number => {
    const order = FUNNEL_STAGES.indexOf(stage);
    return rows.filter((r) => {
      const at = FUNNEL_STAGES.indexOf(r.acq_stage);
      if (at >= order && at >= 0) return true;
      // fall back to hard evidence, in case a stage was skipped
      switch (stage) {
        case 'emailed': return r.email_stage > 0;
        case 'consented': return r.consent_status === 'granted';
        case 'called': return (r.call_attempts ?? 0) > 0;
        case 'demoed': return r.call_stage === 'completed';
        case 'forged': return r.demo_status === 'ready';
        case 'demo_sent': return Boolean(r.demo_emailed_at);
        case 'meeting': return r.meeting_status === 'booked' || Boolean(r.checkout_sent_at);
        case 'client': return r.client_status === 'client';
        default: return false;
      }
    }).length;
  };

  const counts = FUNNEL_STAGES.map((s) => (s === 'prospect' ? rows.length : reached(s)));
  const funnel: FunnelStep[] = FUNNEL_STAGES.map((stage, i) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: counts[i],
    fromPrevious: i === 0 ? null : counts[i - 1] > 0 ? round1((counts[i] / counts[i - 1]) * 100) : null,
    fromTop: counts[0] > 0 ? round1((counts[i] / counts[0]) * 100) : null,
  }));

  /* the goal */
  const clients = totals.purchases;
  const observedRate = rows.length > 0 && clients > 0 ? clients / rows.length : null;
  const fourteenDaysAgo = Date.now() - 14 * 86400000;
  const recentWins = rows.filter((r) => r.won_at && new Date(r.won_at).getTime() >= fourteenDaysAgo).length;
  const perDay = recentWins / 14;

  const goal: GoalProgress = {
    goal: goalClients,
    clients,
    remaining: Math.max(0, goalClients - clients),
    mrrCents: totals.newMrrCents,
    goalMrrCents: goalClients * OFFER.monthlyCents,
    setupCents: totals.setupRevenueCents,
    goalSetupCents: goalClients * OFFER.setupCents,
    observedRate,
    prospectsNeeded: observedRate ? Math.ceil(Math.max(0, goalClients - clients) / observedRate) : null,
    daysToGoal: perDay > 0 ? Math.ceil(Math.max(0, goalClients - clients) / perDay) : null,
  };

  return { totals, funnel, goal };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ─────────────────────────── campaign intelligence ──────────────────────── */

export type Segment = {
  key: string;
  label: string;
  prospects: number;
  emailed: number;
  consented: number;
  conversations: number;
  demos: number;
  clients: number;
  permissionRatePct: number | null;
  closeRatePct: number | null;
};

export type Intelligence = {
  byTrade: Segment[];
  byCity: Segment[];
  byVariant: Segment[];
  objections: { label: string; count: number }[];
  scenarios: { label: string; count: number; clients: number }[];
  conversationsPerSale: number | null;
};

type IntelRow = Row & { trade: string | null; city: string | null; state: string | null; acq_variant: string | null };

export async function computeIntelligence(campaignId: string | null): Promise<Intelligence> {
  const db = getSupabase();
  if (!db) return { byTrade: [], byCity: [], byVariant: [], objections: [], scenarios: [], conversationsPerSale: null };

  const rows: IntelRow[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from('outbound_leads').select(`${COLS},trade,city,state,acq_variant`).range(from, from + 999);
    q = campaignId ? q.eq('acq_campaign_id', campaignId) : q.not('acq_campaign_id', 'is', null);
    const { data, error } = await q;
    if (error) break;
    const batch = (data ?? []) as unknown as IntelRow[];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  const live = rows.filter((r) => !r.is_test);

  const segment = (key: string, label: string, list: IntelRow[]): Segment => {
    const emailed = list.filter((r) => r.email_stage > 0).length;
    const consented = list.filter((r) => r.consent_status === 'granted').length;
    const conversations = list.filter((r) => r.call_stage === 'completed').length;
    const demos = list.filter((r) => r.demo_status === 'ready').length;
    const clients = list.filter((r) => r.client_status === 'client').length;
    return {
      key,
      label,
      prospects: list.length,
      emailed,
      consented,
      conversations,
      demos,
      clients,
      permissionRatePct: emailed > 0 ? round1((consented / emailed) * 100) : null,
      closeRatePct: conversations > 0 ? round1((clients / conversations) * 100) : null,
    };
  };

  const group = <T extends string>(pick: (r: IntelRow) => T | null, label: (k: T) => string): Segment[] => {
    const map = new Map<T, IntelRow[]>();
    for (const r of live) {
      const k = pick(r);
      if (!k) continue;
      const arr = map.get(k) ?? [];
      arr.push(r);
      map.set(k, arr);
    }
    return [...map.entries()]
      .map(([k, list]) => segment(String(k), label(k), list))
      .sort((a, b) => b.clients - a.clients || b.consented - a.consented || b.prospects - a.prospects);
  };

  const byTrade = group((r) => (r.trade as string | null), (k) => k.toUpperCase());
  const byCity = group(
    (r) => (r.city ? `${r.city}, ${r.state ?? ''}`.trim().replace(/,$/, '') : null),
    (k) => k,
  ).slice(0, 25);
  const byVariant = group((r) => r.acq_variant, (k) => `Variant ${k}`);

  /* objections and role-play scenarios come out of the call intel */
  const { data: calls } = await db.from('acq_calls').select('lead_id,intel,roleplay_scenario,status').limit(50000);
  const objections = new Map<string, number>();
  const scenarios = new Map<string, { count: number; clients: number }>();
  const clientIds = new Set(live.filter((r) => r.client_status === 'client').map((r) => r.id));

  for (const c of (calls ?? []) as { lead_id: string | null; intel: { objection?: string | null } | null; roleplay_scenario: string | null }[]) {
    const obj = c.intel?.objection?.trim();
    if (obj) objections.set(normalizeObjection(obj), (objections.get(normalizeObjection(obj)) ?? 0) + 1);
    const sc = c.roleplay_scenario?.trim();
    if (sc) {
      const cur = scenarios.get(sc) ?? { count: 0, clients: 0 };
      cur.count++;
      if (c.lead_id && clientIds.has(c.lead_id)) cur.clients++;
      scenarios.set(sc, cur);
    }
  }

  const totalConversations = live.filter((r) => r.call_stage === 'completed').length;
  const totalClients = clientIds.size;

  return {
    byTrade,
    byCity,
    byVariant,
    objections: [...objections.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 15),
    scenarios: [...scenarios.entries()]
      .map(([label, v]) => ({ label, count: v.count, clients: v.clients }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
    conversationsPerSale: totalClients > 0 ? round1(totalConversations / totalClients) : null,
  };
}

/** Collapse the long tail of phrasings into the objection families that matter. */
export function normalizeObjection(text: string): string {
  const t = text.toLowerCase();
  if (/number|port|forward|change (my|our) (phone|line)/.test(t)) return 'Worried about changing the phone number';
  if (/price|cost|expensive|afford|budget|cheap/.test(t)) return 'Price';
  if (/contract|commit|lock|cancel/.test(t)) return 'Commitment or contract';
  if (/robot|sound|fake|human|customers (will|would) hate/.test(t)) return 'Customers will know it is AI';
  if (/already have|answering service|receptionist|office manager/.test(t)) return 'Already has someone answering';
  if (/think about|talk (it over|to)\b[^.]{0,20}\b(partner|wife|husband|spouse|team|owner|boss|brother)|not now|later|busy season|call me back next/.test(t)) {
    return 'Timing, needs to think';
  }
  if (/integrat|servicetitan|housecall|jobber|crm|software/.test(t)) return 'Integration with their software';
  if (/trust|scam|skeptic/.test(t)) return 'Skeptical of the offer';
  return text.slice(0, 60);
}
