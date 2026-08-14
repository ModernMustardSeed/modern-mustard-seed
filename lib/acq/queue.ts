/**
 * THE DURABLE QUEUE.
 *
 * Everything the engine does to a stranger goes through here: send an email,
 * place a call, forge a demo, mail the demo, send checkout. The queue exists for
 * exactly one reason, and it is not throughput.
 *
 * IT IS IDEMPOTENCY. A cron that overlaps itself, a Vapi webhook delivered
 * three times, a double-clicked Start button and a retried Vercel invocation all
 * have to converge on ONE action. Two mechanisms enforce that:
 *
 *   1. `idempotency_key` is UNIQUE. The key is derived from what the job IS
 *      (lead + kind + step), never from when it was created, so a second
 *      enqueue of the same work is refused by Postgres rather than by a race we
 *      hope never happens.
 *   2. Claiming is a single atomic UPDATE with FOR UPDATE SKIP LOCKED
 *      (acq_claim_jobs). Two workers polling the same second get disjoint sets.
 *
 * A job that fails is retried with backoff up to max_attempts, then parked as
 * 'failed' with its error so it shows up in admin instead of vanishing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import type { QueueKind } from '@/lib/acq/types';

export type QueueJob = {
  id: string;
  campaign_id: string | null;
  lead_id: string | null;
  kind: QueueKind;
  step: number;
  status: 'pending' | 'claimed' | 'done' | 'failed' | 'skipped' | 'cancelled';
  run_after: string;
  attempts: number;
  max_attempts: number;
  idempotency_key: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  claimed_at: string | null;
  claimed_by: string | null;
  done_at: string | null;
  created_at: string;
};

/**
 * The key IS the identity of the work. `email:<lead>:2` is "the second campaign
 * email to this lead" forever, whether it is enqueued once or a thousand times.
 */
export function idempotencyKey(kind: QueueKind, leadId: string, step = 0, discriminator?: string): string {
  return [kind, leadId, step, discriminator].filter((v) => v !== undefined && v !== '').join(':');
}

export type EnqueueResult =
  | { ok: true; created: true; job: QueueJob }
  | { ok: true; created: false; reason: 'already-queued'; job: QueueJob | null }
  | { ok: false; error: string };

/**
 * Enqueue exactly once. A conflict on the unique key is the SUCCESS path, not an
 * error: it means the work is already scheduled and this caller should relax.
 */
export async function enqueue(
  db: SupabaseClient | null,
  args: {
    kind: QueueKind;
    leadId: string;
    campaignId?: string | null;
    step?: number;
    runAfter?: Date | string;
    payload?: Record<string, unknown>;
    maxAttempts?: number;
    discriminator?: string;
  },
): Promise<EnqueueResult> {
  const client = db ?? getSupabase();
  if (!client) return { ok: false, error: 'Database is not configured.' };

  const key = idempotencyKey(args.kind, args.leadId, args.step ?? 0, args.discriminator);
  const runAfter =
    args.runAfter instanceof Date ? args.runAfter.toISOString() : args.runAfter || new Date().toISOString();

  const { data, error } = await client
    .from('acq_queue')
    .insert({
      campaign_id: args.campaignId ?? null,
      lead_id: args.leadId,
      kind: args.kind,
      step: args.step ?? 0,
      run_after: runAfter,
      idempotency_key: key,
      payload: args.payload ?? {},
      max_attempts: args.maxAttempts ?? 3,
    })
    .select('*')
    .single();

  if (!error && data) return { ok: true, created: true, job: data as QueueJob };

  // 23505 = unique_violation. Already scheduled or already done. Both are fine.
  if (error && (error.code === '23505' || /duplicate key/i.test(error.message))) {
    const { data: existing } = await client
      .from('acq_queue')
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();
    return { ok: true, created: false, reason: 'already-queued', job: (existing as QueueJob) ?? null };
  }

  return { ok: false, error: error?.message ?? 'Enqueue failed.' };
}

/** Atomic claim. Never returns a job another worker is holding. */
export async function claimJobs(
  db: SupabaseClient | null,
  kinds: QueueKind[] | null,
  limit: number,
  worker: string,
): Promise<QueueJob[]> {
  const client = db ?? getSupabase();
  if (!client) return [];
  const { data, error } = await client.rpc('acq_claim_jobs', {
    p_kinds: kinds,
    p_limit: limit,
    p_worker: worker,
  });
  if (error) throw new Error(`Claiming jobs failed: ${error.message}`);
  return (data ?? []) as QueueJob[];
}

export async function completeJob(
  db: SupabaseClient | null,
  jobId: string,
  result: Record<string, unknown> = {},
): Promise<void> {
  const client = db ?? getSupabase();
  if (!client) return;
  await client
    .from('acq_queue')
    .update({ status: 'done', result, error: null, done_at: new Date().toISOString() })
    .eq('id', jobId);
}

/** A job that should not run and never will (suppressed lead, stage moved on). */
export async function skipJob(db: SupabaseClient | null, jobId: string, why: string): Promise<void> {
  const client = db ?? getSupabase();
  if (!client) return;
  await client
    .from('acq_queue')
    .update({ status: 'skipped', error: why.slice(0, 500), done_at: new Date().toISOString() })
    .eq('id', jobId);
}

/** Exponential backoff, capped. Past max_attempts the job parks as failed. */
export async function failJob(
  db: SupabaseClient | null,
  job: QueueJob,
  error: string,
): Promise<'retry' | 'failed'> {
  const client = db ?? getSupabase();
  if (!client) return 'failed';
  const msg = error.slice(0, 1000);
  if (job.attempts >= job.max_attempts) {
    await client.from('acq_queue').update({ status: 'failed', error: msg, done_at: new Date().toISOString() }).eq('id', job.id);
    return 'failed';
  }
  const delayMinutes = Math.min(240, 5 * 2 ** job.attempts);
  await client
    .from('acq_queue')
    .update({
      status: 'pending',
      error: msg,
      claimed_at: null,
      claimed_by: null,
      run_after: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    })
    .eq('id', job.id);
  return 'retry';
}

/** Release everything a dead worker was holding, so the queue never wedges. */
export async function reclaimStale(db: SupabaseClient | null, olderThanMinutes = 20): Promise<number> {
  const client = db ?? getSupabase();
  if (!client) return 0;
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  const { data } = await client
    .from('acq_queue')
    .update({ status: 'pending', claimed_at: null, claimed_by: null })
    .eq('status', 'claimed')
    .lt('claimed_at', cutoff)
    .select('id');
  return (data ?? []).length;
}

export type QueueCounts = { pending: number; claimed: number; done: number; failed: number; skipped: number; cancelled: number };

export async function queueCounts(kind?: QueueKind): Promise<QueueCounts> {
  const db = getSupabase();
  const zero: QueueCounts = { pending: 0, claimed: 0, done: 0, failed: 0, skipped: 0, cancelled: 0 };
  if (!db) return zero;
  let q = db.from('acq_queue').select('status');
  if (kind) q = q.eq('kind', kind);
  const { data } = await q.limit(100000);
  for (const r of (data ?? []) as { status: keyof QueueCounts }[]) {
    if (r.status in zero) zero[r.status]++;
  }
  return zero;
}

/**
 * Cancel pending work for a lead. Used the moment someone unsubscribes, buys, or
 * books: a queued email that is no longer appropriate must never fire.
 */
export async function cancelPendingFor(
  db: SupabaseClient | null,
  leadId: string,
  kinds?: QueueKind[],
  why = 'Cancelled: the prospect moved on.',
): Promise<number> {
  const client = db ?? getSupabase();
  if (!client) return 0;
  let q = client
    .from('acq_queue')
    .update({ status: 'cancelled', error: why, done_at: new Date().toISOString() })
    .eq('lead_id', leadId)
    .in('status', ['pending', 'claimed']);
  if (kinds?.length) q = q.in('kind', kinds);
  const { data } = await q.select('id');
  return (data ?? []).length;
}
