/**
 * The Vercel side of the roadmap queue.
 *
 * Serverless cannot run the Claude Code CLI, so the free engine lives on
 * Sarah's workstation (`scripts/roadmap-worker.mts`). These helpers are how the
 * public route hands work to it.
 *
 * WHAT IS DIFFERENT FROM THE AUDIT QUEUE, AND WHY.
 *
 * An audit is 50 to 90 seconds, so `lib/audit-queue.ts` can enqueue and then
 * wait inside the request, and the caller never learns the queue exists. A
 * roadmap is 2 to 5 minutes and the route's hard ceiling is 300 seconds, so
 * waiting is a coin flip, not a plan.
 *
 * That is fine here, because the roadmap tool already takes a name and a real
 * email BEFORE it spends a token, and already emails a copy on success. So the
 * contract with the visitor is honest either way: wait and read it on the page,
 * or close the tab and read it in your inbox. The one outcome this module
 * exists to prevent is the third one, which is what production was doing: an
 * apology, and the request thrown away.
 *
 * Ordering rule, and it is the opposite of the audit's: THE QUEUE IS TRIED
 * FIRST AND THE METERED API IS THE FALLBACK. The audit prefers whatever answers
 * a rep fastest because a rep is on a call. Nobody is on a call here, and the
 * roadmap is the top of the funnel that runs on Sarah's subscription by design.
 *
 * Related: `lib/claude-code-json.ts` (the engine), `lib/scaling-roadmap.ts`
 * (the prompt), `supabase/migrations/091_roadmap_queue.sql` (the table).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RoadmapContext, RoadmapReport } from '@/lib/roadmap-shape';

/** The key the local worker heartbeats into `app_state` on every poll. */
export const ROADMAP_WORKER_HEALTH_KEY = 'roadmap_worker_health';

/**
 * How stale a heartbeat can be before the worker counts as gone. The worker
 * polls every 10s and beats on every poll including idle ones, so two minutes
 * is a dozen missed beats: past any slow poll, well short of trusting a machine
 * that is asleep.
 */
const HEARTBEAT_MAX_AGE_MS = 2 * 60 * 1000;

export type RoadmapJob = {
  id: string;
  target_url: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  report: RoadmapReport | null;
  slug: string | null;
  error: string | null;
  engine: string | null;
};

/**
 * Is the local worker alive right now?
 *
 * Fails CLOSED (returns false) on any error, same as the audit's. A route that
 * cannot tell should not gamble a visitor's request on a worker it has no
 * evidence for.
 */
export async function roadmapWorkerAlive(sb: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await sb
      .from('app_state')
      .select('updated_at')
      .eq('key', ROADMAP_WORKER_HEALTH_KEY)
      .maybeSingle();
    if (!data?.updated_at) return false;
    return Date.now() - new Date(data.updated_at as string).getTime() < HEARTBEAT_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Put a roadmap in front of the worker.
 *
 * The whole order rides on the row: url, the context they typed, and the name,
 * address and phone to deliver to. The worker may pick this up an hour later,
 * long after the request that created it has ended, and it has to be able to
 * finish the job without asking anyone anything.
 */
export async function enqueueRoadmap(
  sb: SupabaseClient,
  opts: {
    url: string;
    context: RoadmapContext;
    email?: string;
    name?: string;
    phone?: string;
    source?: string;
    ipHash?: string;
  },
): Promise<string | null> {
  const { data, error } = await sb
    .from('roadmap_jobs')
    .insert({
      target_url: opts.url,
      context: opts.context ?? {},
      email: opts.email ?? null,
      name: opts.name ?? null,
      phone: opts.phone ?? null,
      source: opts.source ?? 'public',
      ip_hash: opts.ipHash ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('roadmap-queue: enqueue failed:', error.message);
    return null;
  }
  return data.id as string;
}

/** Read one job. Used by the poll endpoint and by the in-request wait. */
export async function readRoadmapJob(sb: SupabaseClient, jobId: string): Promise<RoadmapJob | null> {
  const { data } = await sb
    .from('roadmap_jobs')
    .select('id, target_url, status, report, slug, error, engine')
    .eq('id', jobId)
    .maybeSingle();
  return (data as RoadmapJob | null) ?? null;
}

/**
 * Wait for a job to finish, inside the request.
 *
 * `timeoutMs` must leave headroom under the route's maxDuration, because a
 * request the platform kills returns nothing at all, while a timeout here
 * returns an honest "still building" the page can act on. The job is NEVER
 * cancelled on timeout: the worker finishes it, saves it, and emails it, so the
 * work is never wasted. It just lands after the response.
 *
 * Polling at 3s rather than the audit's 2s. This runs for four minutes instead
 * of ninety seconds, and every poll is a database round trip inside a function
 * billed by the millisecond.
 */
export async function waitForRoadmapJob(
  sb: SupabaseClient,
  jobId: string,
  timeoutMs: number,
): Promise<RoadmapJob | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await readRoadmapJob(sb, jobId);
    if (job && (job.status === 'done' || job.status === 'failed')) return job;
    await new Promise((r) => setTimeout(r, 3000));
  }

  return null;
}
