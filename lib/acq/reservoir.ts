/**
 * THE PROSPECT RESERVOIR.
 *
 * A prospect is `discovered` the moment the Lead Finder banks it and `ready`
 * only once it has passed every gate we can apply without spending a send.
 * Nothing promoted between those two states, so `ready` was a column nobody
 * ever wrote: 781 mailable prospects sat reading `discovered`, the reservoir
 * gauge on the Client Factory dashboard read zero, and the bottleneck engine
 * concluded inventory was the constraint while 781 people waited to be emailed.
 *
 * ── WHY A SEPARATE STATE AT ALL ──────────────────────────────────────────────
 * `acq_eligible` answers "may we mail this person". `reservoir_state` answers
 * "where are they in our funnel". They look redundant until the reservoir has
 * to hold tens of thousands: at that size you need to know how much genuinely
 * mailable inventory exists TODAY, separately from how much raw discovery is
 * sitting behind it waiting to be graded. One is a permission, the other is a
 * position, and conflating them is how a pipeline reports itself healthy right
 * up until the day it runs dry.
 *
 * ── THE PROMOTION IS NOT A SECOND OPINION ────────────────────────────────────
 * Promotion re-uses `evaluate()`, the same function the sender consults. It
 * deliberately adds no rule of its own. A prospect that is ready here and
 * refused at send time would be a reservoir that lies, and a gauge you cannot
 * trust is worse than no gauge.
 *
 * ── COHORTS ──────────────────────────────────────────────────────────────────
 * Ready inventory is released in cohorts rather than drained oldest-first,
 * because sending five hundred emails into one metro in one morning is a
 * pattern, and patterns are what spam filters are built to notice. A cohort is
 * one trade in one metro, which is also the unit we want to measure: reply rate
 * for roofers in Boise is a fact worth having, and an undifferentiated blast
 * teaches us nothing about anything.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluate } from '@/lib/acq/eligibility';
import { suppressedAddresses } from '@/lib/acq/server';
import { getAcqSettings } from '@/lib/acq/settings';
import type { AcqProspect } from '@/lib/acq/types';

export type ReplenishResult = {
  scanned: number;
  promoted: number;
  demoted: number;
  heldBack: Record<string, number>;
  readyAfter: number;
  target: number;
  shortfall: number;
};

/**
 * How many rows one pass grades, across as many pages as that takes.
 *
 * PostgREST caps a single select at 1000 rows whatever `.limit()` says, so the
 * first version silently graded 1000 and reported it as the whole reservoir.
 * A cap that lies about being a cap is how a queue looks drained when it is
 * not, so this pages explicitly rather than trusting one request.
 */
const BATCH = 6000;
const PAGE = 1000;

/** Ids per UPDATE. Large enough to be three writes, small enough that the URL
 *  PostgREST builds for `in.(...)` does not exceed what the gateway accepts. */
const CHUNK = 200;

/** Read up to `max` rows in one reservoir state, best-scored first, paging past
 *  the 1000-row ceiling PostgREST enforces on every single request. */
async function page(db: SupabaseClient, state: string, max: number): Promise<AcqProspect[]> {
  const out: AcqProspect[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data } = await db
      .from('outbound_leads')
      .select('*')
      .eq('reservoir_state', state)
      .not('acq_campaign_id', 'is', null)
      // Best first, so a capped pass grades the prospects most worth grading.
      .order('lead_score', { ascending: false, nullsFirst: false })
      .range(from, Math.min(from + PAGE, max) - 1);
    const rows = (data ?? []) as unknown as AcqProspect[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function inChunks(ids: string[], run: (chunk: string[]) => PromiseLike<unknown>): Promise<void> {
  for (let i = 0; i < ids.length; i += CHUNK) {
    await run(ids.slice(i, i + CHUNK));
  }
}

/**
 * Grade discovered prospects and promote the ones that pass.
 *
 * Also DEMOTES: a prospect that was ready and has since bounced, unsubscribed,
 * become a client, or fallen under a raised score floor goes back out of the
 * ready pool. A reservoir that only ever fills is a reservoir that is wrong in
 * one direction, and that direction is the one that mails customers.
 */
export async function replenishReservoir(db: SupabaseClient): Promise<ReplenishResult> {
  const settings = await getAcqSettings();
  const suppressed = await suppressedAddresses(db);
  const target = settings.target_ready_inventory ?? 25000;

  const heldBack: Record<string, number> = {};
  let scanned = 0;

  /* ── promote ──
     Verdicts are collected and written in bulk. The first version issued one
     UPDATE per row, which is 25,000 network round trips at the target size and
     took longer than the cron window on 781. Grading is local and cheap; the
     writes are what cost, so there are now three of them regardless of batch
     size. */
  const candidates = await page(db, 'discovered', BATCH);

  const toPromote: string[] = [];
  const toHold: { id: string; reason: string }[] = [];

  for (const row of candidates) {
    scanned++;
    const verdict = evaluate(row, { suppressed, minLeadScore: settings.min_lead_score });
    if (verdict.eligible) {
      toPromote.push(row.id);
    } else {
      // Held, not deleted. A prospect with no email today may have one after
      // the next enrichment pass, and throwing them away means re-discovering
      // and re-paying for them later.
      const reason = shortReason(verdict.reason ?? 'unknown');
      heldBack[reason] = (heldBack[reason] ?? 0) + 1;
      if (row.acq_eligible) toHold.push({ id: row.id, reason: verdict.reason ?? 'held' });
    }
  }

  await inChunks(toPromote, (ids) =>
    db.from('outbound_leads').update({ reservoir_state: 'ready', acq_eligible: true, acq_ineligible_reason: null }).in('id', ids),
  );

  // Grouped by reason so the stored explanation stays specific without
  // degenerating into one write per row.
  const byReason = new Map<string, string[]>();
  for (const h of toHold) byReason.set(h.reason, [...(byReason.get(h.reason) ?? []), h.id]);
  for (const [reason, ids] of byReason) {
    await inChunks(ids, (chunk) =>
      db.from('outbound_leads').update({ acq_eligible: false, acq_ineligible_reason: reason }).in('id', chunk),
    );
  }
  const promoted = toPromote.length;

  /* ── demote ──
     A prospect that was ready and has since bounced, unsubscribed, become a
     client, or fallen under a raised score floor goes back out of the ready
     pool. A reservoir that only ever fills is wrong in exactly one direction,
     and that direction is the one that mails customers. */
  const stale = await page(db, 'ready', BATCH);

  const wonNow: string[] = [];
  const suppressNow: { id: string; reason: string }[] = [];
  for (const row of stale) {
    const verdict = evaluate(row, { suppressed, minLeadScore: settings.min_lead_score });
    if (verdict.eligible) continue;
    // A customer is not "held back", they graduated. Anything else drops to
    // suppressed so it stops counting as inventory we could mail tomorrow.
    if (row.client_status === 'client') wonNow.push(row.id);
    else suppressNow.push({ id: row.id, reason: verdict.reason ?? 'no longer eligible' });
  }

  await inChunks(wonNow, (ids) =>
    db.from('outbound_leads').update({ reservoir_state: 'won', acq_eligible: false, acq_ineligible_reason: 'They bought.' }).in('id', ids),
  );
  const suppressByReason = new Map<string, string[]>();
  for (const h of suppressNow) suppressByReason.set(h.reason, [...(suppressByReason.get(h.reason) ?? []), h.id]);
  for (const [reason, ids] of suppressByReason) {
    await inChunks(ids, (chunk) =>
      db.from('outbound_leads').update({ reservoir_state: 'suppressed', acq_eligible: false, acq_ineligible_reason: reason }).in('id', chunk),
    );
  }
  const demoted = wonNow.length + suppressNow.length;

  const { count: readyAfter } = await db
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .eq('reservoir_state', 'ready');

  return {
    scanned,
    promoted,
    demoted,
    heldBack,
    readyAfter: readyAfter ?? 0,
    target,
    shortfall: Math.max(0, target - (readyAfter ?? 0)),
  };
}

/** Bucket the refusal so the admin sees "412 have no email", not 412 sentences. */
function shortReason(reason: string): string {
  const r = reason.toLowerCase();
  if (/no email|address/.test(r)) return 'no email address';
  if (/score/.test(r)) return 'under the score floor';
  if (/suppress|opt|unsub/.test(r)) return 'suppressed or opted out';
  if (/bounce/.test(r)) return 'bounced before';
  if (/client|customer/.test(r)) return 'already a customer';
  if (/test/.test(r)) return 'test record';
  if (/confidence|tier/.test(r)) return 'email not trustworthy enough';
  return 'other';
}

export type Cohort = {
  slug: string;
  name: string;
  trade: string | null;
  metro: string | null;
  size: number;
};

/**
 * The next cohorts worth releasing, largest first.
 *
 * Returns what EXISTS rather than what we wish existed: a metro with nine ready
 * prospects is a cohort of nine, not a promise of five hundred. `minSize`
 * exists because a cohort of two teaches us nothing and still spends a slot.
 */
export async function nextCohorts(db: SupabaseClient, opts: { limit?: number; minSize?: number } = {}): Promise<Cohort[]> {
  const minSize = opts.minSize ?? 25;
  const { data } = await db
    .from('outbound_leads')
    .select('trade, metro, city, state')
    .eq('reservoir_state', 'ready')
    .eq('acq_eligible', true)
    .limit(20000);

  const buckets = new Map<string, Cohort>();
  for (const r of (data ?? []) as { trade: string | null; metro: string | null; city: string | null; state: string | null }[]) {
    const metro = r.metro || (r.city && r.state ? `${r.city}, ${r.state}` : null);
    const trade = r.trade ?? 'other';
    const slug = `${trade}-${(metro ?? 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const found = buckets.get(slug);
    if (found) found.size++;
    else buckets.set(slug, { slug, name: `${trade} in ${metro ?? 'an unknown metro'}`, trade, metro, size: 1 });
  }

  return [...buckets.values()]
    .filter((c) => c.size >= minSize)
    .sort((a, b) => b.size - a.size)
    .slice(0, opts.limit ?? 20);
}

/**
 * Is inventory actually the bottleneck?
 *
 * Days of runway, not a raw count. Twelve thousand prospects sounds like plenty
 * and is four days at the ceiling, which is the number that should decide
 * whether anybody spends an afternoon sourcing.
 */
export function runwayDays(ready: number, dailySendRate: number): number | null {
  if (!Number.isFinite(dailySendRate) || dailySendRate <= 0) return null;
  return Math.floor(ready / dailySendRate);
}
