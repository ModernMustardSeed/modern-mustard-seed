/**
 * Server-side helpers shared by every /api/admin/acquisition route: the auth
 * gate, the priority queues Sarah actually works from, and the enrollment pass
 * that decides who is allowed into the campaign.
 */

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { evaluate } from '@/lib/acq/eligibility';
import { emailKey } from '@/lib/acq/dedupe';
import { recordEvent } from '@/lib/acq/events';
import { enqueue } from '@/lib/acq/queue';
import type { AcqProspect } from '@/lib/acq/types';

export async function requireAcqAdmin(): Promise<{ db: SupabaseClient } | { error: NextResponse }> {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const db = getSupabase();
  if (!db) return { error: NextResponse.json({ error: 'Database not configured' }, { status: 500 }) };
  return { db };
}

/** Page a table without the silent 1000-row ceiling. */
export async function fetchAll<T>(db: SupabaseClient, table: string, cols: string, build?: (q: ReturnType<SupabaseClient['from']>) => unknown): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(cols).range(from, from + 999);
    if (build) q = build(q as never) as typeof q;
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as unknown as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** Every address that must never be mailed, from both lists plus the clients. */
export async function suppressedAddresses(db: SupabaseClient): Promise<Set<string>> {
  const out = new Set<string>();
  const [optOuts, bounces, clients] = await Promise.all([
    db.from('suppression').select('contact'),
    db.from('email_suppressions').select('email,resolved'),
    db.from('clients').select('email'),
  ]);
  if (optOuts.error || bounces.error) {
    throw new Error('The suppression lists could not be read, so nothing may be enrolled.');
  }
  for (const r of optOuts.data ?? []) {
    const k = emailKey((r as { contact: string }).contact);
    if (k) out.add(k);
  }
  for (const r of (bounces.data ?? []) as { email: string; resolved: boolean }[]) {
    if (r.resolved) continue;
    const k = emailKey(r.email);
    if (k) out.add(k);
  }
  for (const r of (clients.data ?? []) as { email: string | null }[]) {
    const k = emailKey(r.email);
    if (k) out.add(k);
  }
  return out;
}

/* ─────────────────────────── the priority queues ────────────────────────── */

export type QueueRow = {
  id: string;
  business_name: string;
  contact_name: string | null;
  city: string | null;
  state: string | null;
  trade: string | null;
  lead_score: number | null;
  reason: string;
  at: string | null;
  href: string;
};

export type PriorityQueues = { hot: QueueRow[]; needsHuman: QueueRow[]; followupToday: QueueRow[] };

const QUEUE_COLS =
  'id,business_name,contact_name,city,state,trade,lead_score,acq_stage,call_stage,demo_status,checkout_sent_at,' +
  'demo_emailed_at,meeting_status,needs_human,reply_at,consent_at,last_call_at,updated_at,client_status,unsubscribed_at';

type QRow = AcqProspect & Record<string, unknown>;

/**
 * HOT RIGHT NOW, NEEDS HUMAN and FOLLOW-UP TODAY.
 *
 * Deliberately three short lists rather than one long one. The whole point of
 * the screen is that Sarah opens it and knows who to talk to before she has
 * read a single row of the CRM.
 */
export async function priorityQueues(db: SupabaseClient): Promise<PriorityQueues> {
  const { data } = await db
    .from('outbound_leads')
    .select(QUEUE_COLS)
    .not('acq_campaign_id', 'is', null)
    .neq('acq_stage', 'lost')
    .is('unsubscribed_at', null)
    .order('updated_at', { ascending: false })
    .limit(400);

  const rows = ((data ?? []) as unknown as QRow[]).filter((r) => r.client_status !== 'client');
  const base = (r: QRow, reason: string, at: string | null): QueueRow => ({
    id: r.id,
    business_name: r.business_name,
    contact_name: r.contact_name,
    city: r.city,
    state: r.state,
    trade: r.trade,
    lead_score: r.lead_score,
    reason,
    at,
    href: `/admin/acquisition/prospects/${r.id}`,
  });

  const hot: QueueRow[] = [];
  const needsHuman: QueueRow[] = [];

  for (const r of rows) {
    if (r.needs_human) needsHuman.push(base(r, r.needs_human, r.last_call_at ?? r.updated_at));
    if (r.reply_at) hot.push(base(r, 'Replied', r.reply_at));
    else if (r.checkout_sent_at && r.client_status !== 'client') hot.push(base(r, 'Checkout link sent, not paid yet', r.checkout_sent_at));
    else if (r.demo_status === 'ready' && !r.demo_emailed_at) hot.push(base(r, 'Their agent is built and not sent yet', r.updated_at));
    else if (r.demo_status === 'requested' || r.demo_status === 'forging') hot.push(base(r, 'Asked Mr. Mustard to build theirs', r.updated_at));
    else if (r.call_stage === 'completed' && (r.lead_score ?? 0) >= 65) hot.push(base(r, 'Finished a Mr. Mustard call, high score', r.last_call_at));
    else if (r.meeting_status === 'booked') hot.push(base(r, 'Meeting booked', r.updated_at));
  }

  const now = Date.now();
  const { data: due } = await db
    .from('acq_queue')
    .select('lead_id,kind,step,run_after,payload')
    .eq('status', 'pending')
    .lte('run_after', new Date(now + 24 * 3600 * 1000).toISOString())
    .in('kind', ['followup', 'call', 'demo_email'])
    .order('run_after')
    .limit(60);

  const followupIds = [...new Set(((due ?? []) as { lead_id: string }[]).map((d) => d.lead_id).filter(Boolean))];
  const followupToday: QueueRow[] = [];
  if (followupIds.length) {
    const { data: leads } = await db.from('outbound_leads').select(QUEUE_COLS).in('id', followupIds);
    const byId = new Map(((leads ?? []) as unknown as QRow[]).map((l) => [l.id, l]));
    for (const d of (due ?? []) as { lead_id: string; kind: string; run_after: string; payload: Record<string, unknown> }[]) {
      const lead = byId.get(d.lead_id);
      if (!lead) continue;
      const what = d.kind === 'followup' ? String(d.payload?.followup ?? 'follow-up') : d.kind === 'call' ? 'Mr. Mustard retry' : 'demo email';
      followupToday.push(base(lead, what.replace(/_/g, ' '), d.run_after));
    }
  }

  const rank = (a: QueueRow, b: QueueRow) => (b.lead_score ?? 0) - (a.lead_score ?? 0);
  return {
    hot: hot.sort(rank).slice(0, 25),
    needsHuman: needsHuman.sort(rank).slice(0, 25),
    followupToday: followupToday.slice(0, 25),
  };
}

/* ───────────────────────────── enrollment ──────────────────────────────── */

export type EnrollReport = {
  considered: number;
  enrolled: number;
  alreadyIn: number;
  rejected: Record<string, number>;
  queued: number;
};

/**
 * Decide who is in the campaign, and queue email one for each.
 *
 * Safe to run repeatedly, which matters because Sarah will: enrolment writes
 * `acq_eligible` plus the reason on EVERY row it looks at, so the CRM can always
 * explain a skip, and the queue's idempotency key means a second pass cannot
 * schedule a second first email.
 */
/**
 * Exactly the columns `evaluate()` reads, plus the ones enrolment writes off.
 *
 * This was `select('*')` across every row in outbound_leads, which on 7,400
 * prospects with a hundred and fifty columns each is megabytes of payload
 * fetched to answer questions about fourteen fields. Combined with one UPDATE
 * per row it put the enrol endpoint over the sixty second serverless ceiling
 * and returned a 504 to somebody trying to start their campaign.
 */
const ENROLL_COLUMNS =
  'id,is_test,duplicate_of,unsubscribed_at,bounced,client_status,acq_stage,status,dnc_checked,email,email_status,phone,lead_score,acq_eligible,acq_ineligible_reason,acq_campaign_id,imported_at,email_stage,trade';

/** Ids per write. Small enough that the URL PostgREST builds stays sane. */
const ENROLL_CHUNK = 200;

async function inChunks<T>(items: T[], size: number, run: (chunk: T[]) => PromiseLike<unknown>): Promise<void> {
  for (let i = 0; i < items.length; i += size) await run(items.slice(i, i + size));
}

export async function enrollEligible(
  db: SupabaseClient,
  campaignId: string,
  opts: { minScore: number; limit?: number; trades?: string[]; dryRun?: boolean; queueFirstEmail?: boolean } = { minScore: 40 },
): Promise<EnrollReport> {
  const report: EnrollReport = { considered: 0, enrolled: 0, alreadyIn: 0, rejected: {}, queued: 0 };
  const suppressed = await suppressedAddresses(db);

  const rows = await fetchAll<AcqProspect>(db, 'outbound_leads', ENROLL_COLUMNS);
  const wanted = opts.trades?.length ? new Set(opts.trades) : null;

  /*
   * DECIDE FIRST, WRITE ONCE.
   *
   * The previous version issued an UPDATE and an event INSERT per row as it
   * walked, which is up to fifteen thousand sequential round trips for a full
   * pass. Judging is local and free; the writes are what cost, so every
   * decision is collected here and flushed in batches below.
   */
  const toEnroll: AcqProspect[] = [];
  const rejectBy = new Map<string, string[]>();

  for (const lead of rows) {
    if (wanted && !wanted.has(lead.trade ?? 'other')) continue;
    report.considered++;

    const verdict = evaluate(lead, { suppressed, minLeadScore: opts.minScore });
    if (!verdict.eligible) {
      report.rejected[verdict.reason] = (report.rejected[verdict.reason] ?? 0) + 1;
      // Only write when the stored answer is actually wrong. Re-stamping a row
      // that already says the same thing is the commonest wasted write here.
      if (lead.acq_eligible || lead.acq_ineligible_reason !== verdict.reason) {
        rejectBy.set(verdict.reason, [...(rejectBy.get(verdict.reason) ?? []), lead.id]);
      }
      continue;
    }

    if (lead.acq_eligible && lead.acq_campaign_id === campaignId) {
      report.alreadyIn++;
      continue;
    }

    report.enrolled++;
    toEnroll.push(lead);
    if (opts.limit && report.enrolled >= opts.limit) break;
  }

  if (opts.dryRun) return report;

  const stamp = new Date().toISOString();

  for (const [reason, ids] of rejectBy) {
    await inChunks(ids, ENROLL_CHUNK, (chunk) =>
      db.from('outbound_leads').update({ acq_eligible: false, acq_ineligible_reason: reason }).in('id', chunk),
    );
  }

  // A lost prospect coming back becomes a prospect again; everyone else keeps
  // the stage they had. Grouped so the whole set is two writes, not N.
  const revive = toEnroll.filter((l) => l.acq_stage === 'lost' || !l.acq_stage).map((l) => l.id);
  const keep = toEnroll.filter((l) => !(l.acq_stage === 'lost' || !l.acq_stage)).map((l) => l.id);

  await inChunks(revive, ENROLL_CHUNK, (chunk) =>
    db
      .from('outbound_leads')
      .update({ acq_eligible: true, acq_ineligible_reason: null, acq_campaign_id: campaignId, acq_stage: 'prospect' })
      .in('id', chunk),
  );
  await inChunks(keep, ENROLL_CHUNK, (chunk) =>
    db.from('outbound_leads').update({ acq_eligible: true, acq_ineligible_reason: null, acq_campaign_id: campaignId }).in('id', chunk),
  );

  // imported_at records when a prospect FIRST entered the campaign, so it is
  // only ever set on rows that do not have one.
  const firstTime = toEnroll.filter((l) => !l.imported_at).map((l) => l.id);
  await inChunks(firstTime, ENROLL_CHUNK, (chunk) => db.from('outbound_leads').update({ imported_at: stamp }).in('id', chunk));

  await inChunks(toEnroll, ENROLL_CHUNK, (chunk) =>
    db.from('acq_events').insert(
      chunk.map((l) => ({
        lead_id: l.id,
        campaign_id: campaignId,
        type: 'eligible',
        label: 'Enrolled in MEET MR. MUSTARD',
        detail: { score: l.lead_score },
      })),
    ),
  );

  if (opts.queueFirstEmail) {
    for (const lead of toEnroll) {
      if ((lead.email_stage ?? 0) !== 0) continue;
      const res = await enqueue(db, { kind: 'email', leadId: lead.id, campaignId, step: 1 });
      if (res.ok && res.created) report.queued++;
    }
  }

  return report;
}

