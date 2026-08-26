/**
 * The Vercel side of the audit queue.
 *
 * Serverless cannot run the Claude Code CLI, so the free engine lives on
 * Sarah's workstation (`scripts/audit-worker.mts`). These helpers are how a
 * route hands work to it and waits for the answer.
 *
 * The design goal is that the REP NEVER NOTICES. The cockpit's audit button
 * already sat through a 40-60s API call, so a route that enqueues and then
 * waits for the worker inside the same request returns the same shape after
 * roughly the same wait, and no admin UI has to change. When the worker is not
 * running, the route falls straight back to the metered API instead of making
 * anyone wait for a machine that is asleep.
 *
 * Related: `lib/claude-code-json.ts` (the engine), `supabase/migrations/
 * 080_audit_queue.sql` (the table and the atomic claim).
 */

import type { SiteFacts } from '@/lib/site-facts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runWebsiteAudit, type WebsiteAuditReport } from '@/lib/website-audit';

/** The key the local worker heartbeats into `app_state` on every poll. */
export const AUDIT_WORKER_HEALTH_KEY = 'audit_worker_health';

/**
 * How stale a heartbeat can be before we treat the worker as gone. The worker
 * polls every 10s, so two minutes is a dozen missed beats: comfortably past a
 * slow poll, well short of making a rep wait on a dead machine.
 */
const HEARTBEAT_MAX_AGE_MS = 2 * 60 * 1000;

export type AuditJob = {
  id: string;
  target_url: string;
  source_table: string | null;
  source_id: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  report: WebsiteAuditReport | null;
  score: number | null;
  error: string | null;
  engine: string | null;
};

/**
 * Is the local worker alive right now?
 *
 * Fails CLOSED (returns false) on any error. A route that cannot tell should
 * use the API and serve the rep, not gamble the request on a worker it has no
 * evidence for.
 */
export async function auditWorkerAlive(sb: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await sb
      .from('app_state')
      .select('value, updated_at')
      .eq('key', AUDIT_WORKER_HEALTH_KEY)
      .maybeSingle();
    if (!data?.updated_at) return false;
    return Date.now() - new Date(data.updated_at as string).getTime() < HEARTBEAT_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/** Put a URL in front of the worker. Returns the job id, or null if the insert failed. */
export async function enqueueAudit(
  sb: SupabaseClient,
  opts: { url: string; sourceTable?: string; sourceId?: string },
): Promise<string | null> {
  const { data, error } = await sb
    .from('audit_jobs')
    .insert({
      target_url: opts.url,
      source_table: opts.sourceTable ?? null,
      source_id: opts.sourceId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('audit-queue: enqueue failed:', error.message);
    return null;
  }
  return data.id as string;
}

/**
 * Wait for a job to finish, inside the request.
 *
 * `timeoutMs` must leave headroom under the route's maxDuration, because a
 * request killed by the platform returns nothing at all, while a timeout here
 * returns an honest "still building" the caller can act on. The job is NOT
 * cancelled on timeout: the worker finishes it and files the report on the
 * lead anyway, so the work is never wasted, it just lands after the response.
 */
export async function waitForAuditJob(
  sb: SupabaseClient,
  jobId: string,
  timeoutMs: number,
): Promise<AuditJob | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data } = await sb
      .from('audit_jobs')
      .select('id, target_url, source_table, source_id, status, report, score, error, engine')
      .eq('id', jobId)
      .maybeSingle();

    const job = data as AuditJob | null;
    if (job && (job.status === 'done' || job.status === 'failed')) return job;

    // 2s: an audit takes 50-90s, so polling faster just burns database calls
    // inside a serverless function that is billed by the millisecond.
    await new Promise((r) => setTimeout(r, 2000));
  }

  return null;
}

export type AuditOutcome =
  | { kind: 'report'; url: string; report: WebsiteAuditReport; via: 'worker' | 'api' }
  | { kind: 'queued'; jobId: string }
  | { kind: 'error'; status: number; error: string };

/**
 * Audit a URL the cheap way when that is possible, and the reliable way when it
 * is not.
 *
 * Order matters and is deliberate:
 *
 * 1. Worker alive  -> enqueue and wait. Free, and the caller still gets a full
 *    report in one request, so no UI has to learn a new shape.
 * 2. Worker asleep -> straight to the API. A rep clicking Audit on the dial
 *    floor gets an answer now. Saving a dollar is not worth stalling a call.
 * 3. Worker took too long -> return `queued`. The job is NOT cancelled; the
 *    worker finishes it and files the report onto the lead, so the work lands
 *    even though this request could not wait for it.
 *
 * `waitMs` must stay well under the route's maxDuration. A request the platform
 * kills returns nothing; a wait that expires here returns something honest.
 */
export async function auditPreferringWorker(
  sb: SupabaseClient,
  opts: { url: string; sourceTable?: string; sourceId?: string; waitMs?: number; facts?: SiteFacts | null },
): Promise<AuditOutcome> {
  const viaApi = async (): Promise<AuditOutcome> => {
    // The owner has been passed into this function since the day it was written
    // and, until migration 113, went no further than here: `audit_jobs` had
    // columns for it and `llm_jobs`, which is the queue the work actually runs
    // on now, did not. That gap is why four finished audits were never filed.
    const source =
      opts.sourceTable && opts.sourceId ? { table: opts.sourceTable, id: opts.sourceId } : null;
    const result = await runWebsiteAudit(opts.url, { facts: opts.facts, source });
    return result.ok
      ? { kind: 'report', url: result.url, report: result.report, via: 'api' }
      : { kind: 'error', status: result.status, error: result.error };
  };

  if (!(await auditWorkerAlive(sb))) return viaApi();

  const jobId = await enqueueAudit(sb, opts);
  if (!jobId) return viaApi();

  const job = await waitForAuditJob(sb, jobId, opts.waitMs ?? 85_000);

  if (job?.status === 'done' && job.report) {
    return { kind: 'report', url: job.target_url, report: job.report, via: 'worker' };
  }
  if (job?.status === 'failed') {
    // A worker failure is a verdict on the site (dead domain, 404). The worker
    // requeues its OWN infrastructure failures rather than reporting them, so
    // reaching here means the site really could not be graded.
    return { kind: 'error', status: 400, error: job.error ?? 'Audit failed.' };
  }
  return { kind: 'queued', jobId };
}
