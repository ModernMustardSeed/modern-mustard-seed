import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { isMachineHit, readEngagementEvents } from '@/lib/acq/engagement';
import { suiteState } from '@/lib/acq/suite';
import type { SuiteState } from '@/lib/acq/suite';
import type { AcqEvent } from '@/lib/acq/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * WHO IS MOVING.
 *
 * One fetch that answers, by name, "who opened, who clicked, who landed on the
 * permission page, who gave consent, who is on the phone". Everything here is
 * a person doing something on their side; what we sent them is on the
 * Campaign screen.
 *
 * Built from the timeline (acq_events) joined back to the prospect, the
 * latest consent row and the latest call row. Opens are read off the lead's
 * own counters as well as the timeline, because the counters have been
 * stamped since the first send and the timeline only started carrying opens
 * on 2026-08-18.
 */

export type Step = 'opened' | 'clicked' | 'visited' | 'replied' | 'consented' | 'called' | 'talked' | 'bought';
const STEP_ORDER: Step[] = ['opened', 'clicked', 'visited', 'replied', 'consented', 'called', 'talked', 'bought'];

type Signal = { n: number; last: string | null; first: string | null };
type Person = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string;
  city: string | null;
  state: string | null;
  trade: string | null;
  lead_score: number | null;
  acq_stage: string;
  email_stage: number;
  needs_human: string | null;
  is_test: boolean;
  unsubscribed_at: string | null;
  client_status: string | null;
  checkout_sent_at: string | null;
  demo_status: string | null;
  demo_emailed_at: string | null;
  suite: SuiteState;
  furthest: Step;
  last_activity: string;
  signals: Record<Step, Signal>;
  consent: { at: string; phone_as_typed: string; typed_name: string | null; revoked_at: string | null } | null;
  call: {
    id: string;
    status: string;
    requested_at: string;
    duration_sec: number | null;
    outcome: string | null;
    summary: string | null;
    ended_reason: string | null;
    inbound: boolean;
  } | null;
};

const WINDOWS: Record<string, number | null> = { '1d': 1, '7d': 7, '30d': 30, all: null };

function blank(): Record<Step, Signal> {
  return Object.fromEntries(STEP_ORDER.map((s) => [s, { n: 0, last: null, first: null }])) as Record<Step, Signal>;
}

function stepFor(type: string): Step | null {
  switch (type) {
    case 'email_opened':
      return 'opened';
    case 'link_clicked':
      return 'clicked';
    case 'permission_visited':
      return 'visited';
    case 'reply':
      return 'replied';
    case 'consent_captured':
      return 'consented';
    case 'call_queued':
    case 'call_started':
    case 'call_failed':
    case 'call_inbound':
      return 'called';
    case 'call_completed':
      return 'talked';
    case 'meeting_booked':
    case 'purchased':
      return 'bought';
    default:
      return null;
  }
}

function later(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}
function earlier(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

async function inChunks<T>(ids: string[], fetch: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 150) out.push(...(await fetch(ids.slice(i, i + 150))));
  return out;
}

export async function GET(req: Request) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;

  const url = new URL(req.url);
  const windowKey = url.searchParams.get('window') ?? '7d';
  const days = windowKey in WINDOWS ? WINDOWS[windowKey] : 7;
  const since = days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;
  const includeTest = url.searchParams.get('test') === '1';

  let events: AcqEvent[];
  try {
    events = await readEngagementEvents(db, since, 5000);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not read the timeline.' }, { status: 500 });
  }

  // Opens stamped on the lead row before the timeline carried them.
  let openerIds: string[] = [];
  {
    let q = db
      .from('outbound_leads')
      .select('id')
      .not('acq_campaign_id', 'is', null)
      .gt('email_open_count', 0)
      .order('last_open_at', { ascending: false, nullsFirst: false })
      .limit(2000);
    if (since) q = q.gte('last_open_at', since);
    const { data } = await q;
    openerIds = ((data ?? []) as { id: string }[]).map((r) => r.id);
  }

  const ids = [...new Set([...events.map((e) => e.lead_id).filter(Boolean), ...openerIds])] as string[];

  // ONE literal string on purpose: a concatenated list widens to `string` and
  // supabase-js loses row typing entirely (every row becomes GenericStringError).
  const LEAD_COLS =
    'id,business_name,contact_name,phone,email,city,state,trade,lead_score,acq_stage,email_stage,email_open_count,email_opened_at,last_open_at,consent_status,consent_at,call_stage,last_call_at,needs_human,checkout_sent_at,client_status,demo_status,unsubscribed_at,is_test,acq_campaign_id,reply_at,demo_url,site_demo_url,site_demo_status,os_demo_url,hub_demo_url,suite_film_status,demo_emailed_at';
  type LeadRow = Record<string, unknown> & { id: string };
  const [leads, calls, consents] = await Promise.all([
    inChunks<LeadRow>(ids, async (chunk) => {
      const { data } = await db.from('outbound_leads').select(LEAD_COLS).in('id', chunk);
      return (data ?? []) as LeadRow[];
    }),
    inChunks<Record<string, unknown>>(ids, async (chunk) => {
      const { data } = await db
        .from('acq_calls')
        .select('id,lead_id,status,requested_at,duration_sec,outcome,summary,ended_reason')
        .in('lead_id', chunk)
        .order('requested_at', { ascending: false });
      return (data ?? []) as Record<string, unknown>[];
    }),
    inChunks<Record<string, unknown>>(ids, async (chunk) => {
      const { data } = await db
        .from('acq_consents')
        .select('lead_id,phone_as_typed,typed_name,created_at,revoked_at')
        .in('lead_id', chunk)
        .order('created_at', { ascending: false });
      return (data ?? []) as Record<string, unknown>[];
    }),
  ]);

  const leadById = new Map(leads.map((l) => [l.id, l]));
  const callByLead = new Map<string, Record<string, unknown>>();
  for (const c of calls) if (c.lead_id && !callByLead.has(c.lead_id as string)) callByLead.set(c.lead_id as string, c);
  const consentByLead = new Map<string, Record<string, unknown>>();
  for (const c of consents) if (c.lead_id && !consentByLead.has(c.lead_id as string)) consentByLead.set(c.lead_id as string, c);

  const people = new Map<string, Person>();
  const ensure = (id: string): Person | null => {
    const existing = people.get(id);
    if (existing) return existing;
    const l = leadById.get(id);
    if (!l) return null;
    if (l.is_test && !includeTest) return null;
    const call = callByLead.get(id) ?? null;
    const consent = consentByLead.get(id) ?? null;
    const p: Person = {
      id,
      business_name: (l.business_name as string) ?? 'Unnamed business',
      contact_name: (l.contact_name as string) ?? null,
      email: (l.email as string) ?? null,
      phone: (l.phone as string) ?? '',
      city: (l.city as string) ?? null,
      state: (l.state as string) ?? null,
      trade: (l.trade as string) ?? null,
      lead_score: (l.lead_score as number) ?? null,
      acq_stage: (l.acq_stage as string) ?? 'prospect',
      email_stage: Number(l.email_stage ?? 0),
      needs_human: (l.needs_human as string) ?? null,
      is_test: Boolean(l.is_test),
      unsubscribed_at: (l.unsubscribed_at as string) ?? null,
      client_status: (l.client_status as string) ?? null,
      checkout_sent_at: (l.checkout_sent_at as string) ?? null,
      demo_status: (l.demo_status as string) ?? null,
      demo_emailed_at: (l.demo_emailed_at as string) ?? null,
      suite: suiteState(l as unknown as Parameters<typeof suiteState>[0]),
      furthest: 'opened',
      last_activity: '',
      signals: blank(),
      consent: consent
        ? {
            at: consent.created_at as string,
            phone_as_typed: (consent.phone_as_typed as string) ?? '',
            typed_name: (consent.typed_name as string) ?? null,
            revoked_at: (consent.revoked_at as string) ?? null,
          }
        : null,
      call: call
        ? {
            id: call.id as string,
            status: call.status as string,
            requested_at: call.requested_at as string,
            duration_sec: (call.duration_sec as number) ?? null,
            outcome: (call.outcome as string) ?? null,
            summary: (call.summary as string) ?? null,
            ended_reason: (call.ended_reason as string) ?? null,
            inbound: false,
          }
        : null,
    };
    // Opens off the lead's own counters, which predate the timeline.
    const opens = Number(l.email_open_count ?? 0);
    if (opens > 0) {
      const last = (l.last_open_at as string) ?? (l.email_opened_at as string) ?? null;
      const first = (l.email_opened_at as string) ?? last;
      if (!since || (last && last >= since)) p.signals.opened = { n: opens, last, first };
    }
    people.set(id, p);
    return p;
  };

  // The feed: newest first, each line carrying the name of who did it.
  const feed: (AcqEvent & { business_name: string | null; contact_name: string | null; city: string | null; state: string | null })[] = [];
  for (const e of events) {
    const l = e.lead_id ? leadById.get(e.lead_id) : null;
    if (l && l.is_test && !includeTest) continue;
    if (feed.length >= 150) break;
    feed.push({
      ...e,
      business_name: (l?.business_name as string) ?? null,
      contact_name: (l?.contact_name as string) ?? null,
      city: (l?.city as string) ?? null,
      state: (l?.state as string) ?? null,
    });
  }

  // Walk the timeline oldest to newest so first and last land correctly.
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (!e.lead_id) continue;
    // A mail security gateway following our link is not a person moving. It
    // stays on the prospect's timeline, labelled, but it never puts anybody on
    // this board: a board that lists antivirus as movement is worse than an
    // empty one, because an empty one is honest.
    if (isMachineHit(e)) continue;
    const step = stepFor(e.type);
    if (!step) continue;
    const p = ensure(e.lead_id);
    if (!p) continue;
    if (step === 'opened') {
      // The counters already carry the count; the timeline only refines the stamps.
      p.signals.opened.last = later(p.signals.opened.last, e.occurred_at);
      p.signals.opened.first = earlier(p.signals.opened.first, e.occurred_at) ?? e.occurred_at;
      if (p.signals.opened.n === 0) p.signals.opened.n = 1;
    } else {
      const s = p.signals[step];
      s.n += 1;
      s.last = later(s.last, e.occurred_at);
      s.first = earlier(s.first, e.occurred_at) ?? e.occurred_at;
    }
    if (e.type === 'call_inbound') {
      if (p.call && p.call.requested_at <= e.occurred_at) {
        p.call = { ...p.call, inbound: true };
      } else if (!p.call) {
        p.call = {
          id: e.id,
          status: 'inbound',
          requested_at: e.occurred_at,
          duration_sec: null,
          outcome: null,
          summary: ((e.detail ?? {}).summary as string) ?? null,
          ended_reason: null,
          inbound: true,
        };
      }
    }
  }
  // Openers with no timeline rows at all.
  for (const id of openerIds) ensure(id);

  const list: Person[] = [];
  for (const p of people.values()) {
    let furthest: Step | null = null;
    let last: string | null = null;
    for (const s of STEP_ORDER) {
      const sig = p.signals[s];
      if (sig.n > 0) {
        furthest = s;
        last = later(last, sig.last);
      }
    }
    if (!furthest || !last) continue;
    p.furthest = furthest;
    p.last_activity = last;
    list.push(p);
  }
  list.sort((a, b) => (a.last_activity < b.last_activity ? 1 : -1));

  const totals = Object.fromEntries(STEP_ORDER.map((s) => [s, list.filter((p) => p.signals[s].n > 0).length])) as Record<Step, number>;
  totals.bought = list.filter((p) => p.signals.bought.n > 0 || p.client_status === 'client').length;

  return NextResponse.json({
    window: windowKey,
    since,
    steps: STEP_ORDER,
    totals,
    moving: list.length,
    people: list,
    feed,
  });
}
