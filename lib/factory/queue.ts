import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * THE FACTORY WORK QUEUE.
 *
 * LANES, NOT ONE LINE. A single sourcing run can be five thousand rows of cold
 * work. A hot lead's reply is one row and it is worth more than all of them. So
 * the queue is ordered by lane priority first and age second, and a claim takes
 * the hottest available work regardless of what is piled up behind it.
 *
 * IDEMPOTENCY. `idempotency_key` is unique per tenant. Enqueueing the same work
 * twice is a no-op that returns the existing job, which is what makes a retried
 * webhook, a double-clicked button and a re-run worker all safe.
 *
 * RETRIES ARE BOUNDED AND TYPED. A transient failure backs off and comes round
 * again; a permanent one (`fail(..., { permanent: true })`) stops immediately.
 * Retrying a 400 five times only makes the same mistake five times.
 */

export const LANES = ['hot', 'inbound', 'ai', 'value_action', 'campaign', 'enrich', 'sourcing', 'analytics', 'notify'] as const;
export type Lane = (typeof LANES)[number];

/** Lower runs first. Hot work jumps every queue. */
export const LANE_PRIORITY: Record<Lane, number> = {
  hot: 0,
  inbound: 10,
  ai: 20,
  value_action: 30,
  campaign: 40,
  notify: 50,
  enrich: 60,
  analytics: 70,
  sourcing: 90,
};

export type FactoryJob = {
  id: string;
  tenant_id: string;
  factory_id: string | null;
  lane: Lane;
  kind: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'running' | 'done' | 'failed' | 'canceled';
  priority: number;
  attempts: number;
  max_attempts: number;
  run_after: string;
  locked_by: string | null;
  locked_at: string | null;
  result: unknown;
  error: string | null;
  idempotency_key: string | null;
  created_at: string;
  completed_at: string | null;
};

export type EnqueueInput = {
  tenantId: string;
  factoryId?: string | null;
  lane: Lane;
  kind: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  runAfter?: Date;
  maxAttempts?: number;
};

export async function enqueue(supabase: SupabaseClient, input: EnqueueInput): Promise<FactoryJob | null> {
  const row = {
    tenant_id: input.tenantId,
    factory_id: input.factoryId ?? null,
    lane: input.lane,
    kind: input.kind,
    payload: input.payload ?? {},
    priority: LANE_PRIORITY[input.lane],
    run_after: (input.runAfter ?? new Date()).toISOString(),
    max_attempts: input.maxAttempts ?? 5,
    idempotency_key: input.idempotencyKey ?? null,
  };

  const { data, error } = await supabase.from('factory_jobs').insert(row).select('*').single();
  if (!error) return data as FactoryJob;

  if ((error as { code?: string }).code === '23505' && input.idempotencyKey) {
    // Already queued or already done. Hand back the row that exists; the work
    // is accounted for either way, which is the whole point of the key.
    const { data: existing } = await supabase
      .from('factory_jobs')
      .select('*')
      .eq('tenant_id', input.tenantId)
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle();
    return (existing as FactoryJob) ?? null;
  }

  console.error('enqueue failed', input.kind, error.message);
  return null;
}

/**
 * Claim one job. Not a transaction, so the update is conditioned on the row
 * still being queued: two workers racing, one wins, the loser gets zero rows
 * back and tries the next job instead of duplicating work.
 */
export async function claim(
  supabase: SupabaseClient,
  worker: string,
  opts: { lanes?: Lane[]; tenantId?: string } = {},
): Promise<FactoryJob | null> {
  let q = supabase
    .from('factory_jobs')
    .select('*')
    .eq('status', 'queued')
    .lte('run_after', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('run_after', { ascending: true })
    .limit(5);
  if (opts.lanes?.length) q = q.in('lane', opts.lanes);
  if (opts.tenantId) q = q.eq('tenant_id', opts.tenantId);

  const { data } = await q;
  for (const candidate of ((data as FactoryJob[]) ?? [])) {
    const { data: won } = await supabase
      .from('factory_jobs')
      .update({
        status: 'running',
        locked_by: worker,
        locked_at: new Date().toISOString(),
        attempts: candidate.attempts + 1,
      })
      .eq('id', candidate.id)
      .eq('status', 'queued')
      .select('*')
      .maybeSingle();
    if (won) return won as FactoryJob;
  }
  return null;
}

export async function complete(supabase: SupabaseClient, jobId: string, result: unknown): Promise<void> {
  await supabase
    .from('factory_jobs')
    .update({ status: 'done', result: result ?? null, completed_at: new Date().toISOString(), error: null })
    .eq('id', jobId);
}

/** Exponential backoff, capped. 30s, 1m, 2m, 4m, 8m, then 15m forever. */
export function backoffMs(attempt: number): number {
  return Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
}

export async function fail(
  supabase: SupabaseClient,
  job: FactoryJob,
  message: string,
  opts: { permanent?: boolean } = {},
): Promise<void> {
  const done = opts.permanent || job.attempts >= job.max_attempts;
  await supabase
    .from('factory_jobs')
    .update(
      done
        ? { status: 'failed', error: message, completed_at: new Date().toISOString() }
        : { status: 'queued', error: message, run_after: new Date(Date.now() + backoffMs(job.attempts)).toISOString(), locked_by: null, locked_at: null },
    )
    .eq('id', job.id);
}

/** Jobs stuck 'running' past this are assumed orphaned by a dead worker. */
export const STALE_LOCK_MS = 10 * 60_000;

export async function requeueStale(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_LOCK_MS).toISOString();
  const { data } = await supabase
    .from('factory_jobs')
    .update({ status: 'queued', locked_by: null, locked_at: null })
    .eq('status', 'running')
    .lt('locked_at', cutoff)
    .select('id');
  return ((data as { id: string }[]) ?? []).length;
}

export type QueueDepth = { lane: Lane; queued: number; running: number; failed: number; oldestSeconds: number | null };

/** Queue health for the operations centre. Lag, not just size. */
export async function queueDepth(supabase: SupabaseClient, tenantId?: string): Promise<QueueDepth[]> {
  let q = supabase.from('factory_jobs').select('lane, status, run_after').neq('status', 'done').limit(5000);
  if (tenantId) q = q.eq('tenant_id', tenantId);
  const { data } = await q;
  const rows = (data as { lane: Lane; status: string; run_after: string }[]) ?? [];

  const now = Date.now();
  return LANES.map((lane) => {
    const mine = rows.filter((r) => r.lane === lane);
    const queued = mine.filter((r) => r.status === 'queued');
    const oldest = queued.reduce<number | null>((acc, r) => {
      const age = (now - new Date(r.run_after).getTime()) / 1000;
      return age > 0 && (acc === null || age > acc) ? age : acc;
    }, null);
    return {
      lane,
      queued: queued.length,
      running: mine.filter((r) => r.status === 'running').length,
      failed: mine.filter((r) => r.status === 'failed').length,
      oldestSeconds: oldest === null ? null : Math.round(oldest),
    };
  }).filter((d) => d.queued || d.running || d.failed);
}
