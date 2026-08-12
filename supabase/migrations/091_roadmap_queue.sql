-- 091_roadmap_queue.sql
-- The work order between Vercel and the local roadmap worker.
--
-- THE HUNDREDFOLD ROADMAP had the failure migration 080 was written to end,
-- one tool later. lib/scaling-roadmap.ts already carries a free `claude-code`
-- engine, but serverless has no `claude` binary, so on Vercel the engine is
-- always 'api'. When the metered wallet went dry every visitor to
-- /scaling-roadmap got "The roadmap engine is down for maintenance" and their
-- request was not deferred, it was simply lost: no row, no lead, no retry.
--
-- This table is the handoff. A route enqueues the job, the worker on Sarah's
-- workstation claims it, writes the roadmap on the Max subscription, saves it,
-- and emails it. The visitor already gave a name and address before a token is
-- spent (the gate added 2026-08-07), so a roadmap that finishes after the
-- request has ended still reaches the person who asked for it.
--
-- Same shape as audit_jobs (migration 080), deliberately. Two queues that
-- behave identically are one thing to learn and one thing to debug.

create table if not exists public.roadmap_jobs (
  id uuid primary key default gen_random_uuid(),

  target_url text not null,

  -- Everything the engine and the delivery need, captured at request time.
  -- The worker may run an hour later on a machine that has never seen this
  -- visitor, so the job carries the whole order rather than a pointer to it.
  context jsonb not null default '{}'::jsonb,
  email text,
  name text,
  phone text,
  source text not null default 'public',
  ip_hash text,

  -- queued -> running -> done | failed
  status text not null default 'queued',

  -- Claim bookkeeping, so a crashed worker cannot hold a job forever.
  worker text,
  claimed_at timestamptz,
  attempts int not null default 0,

  report jsonb,
  -- The permalink the worker minted when it saved the roadmap. This is what a
  -- still-waiting request returns, and what the delivery email links to.
  slug text,
  scale_score int,
  error text,

  -- Which engine actually produced this, so a run can be audited after the
  -- fact for what it cost. 'claude-code' is free, 'api' is metered.
  engine text,

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- The worker's hot path: oldest queued job first.
create index if not exists roadmap_jobs_claim_idx on public.roadmap_jobs (status, created_at);
-- The client's hot path: poll one job by id. (Primary key covers it.)
-- The desk's hot path: what has this visitor asked for lately.
create index if not exists roadmap_jobs_email_idx on public.roadmap_jobs (email, created_at desc);

alter table public.roadmap_jobs enable row level security;
-- No policies on purpose. Every reader and writer is a server route or the
-- local worker, both on the service key, which bypasses RLS. Anon gets nothing.

/**
 * Claim exactly one job, atomically.
 *
 * Identical in spirit to claim_audit_job. The naive select-then-update hands
 * the same row to two workers whenever they poll together, and a roadmap is
 * two to five minutes of subscription time, so a double claim is expensive and
 * produces a racing pair of saves under two different slugs.
 *
 * The stale window is 25 minutes rather than the audit's 15. A roadmap at high
 * effort has measured 320 seconds for the model call alone, and the worker
 * retries a malformed response twice, so a healthy job can legitimately hold
 * its claim far longer than an audit ever does. Reclaiming at 15 would hand a
 * live job to a second worker and pay for it twice.
 */
create or replace function claim_roadmap_job(p_worker text, p_stale_minutes int default 25)
returns setof public.roadmap_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.roadmap_jobs
     set status = 'running',
         worker = p_worker,
         claimed_at = now(),
         attempts = attempts + 1
   where id in (
     select j.id
       from public.roadmap_jobs j
      where j.status = 'queued'
         or (j.status = 'running' and j.claimed_at < now() - make_interval(mins => p_stale_minutes))
      order by j.created_at
       for update skip locked
      limit 1
   )
  returning *;
end;
$$;

revoke all on function claim_roadmap_job(text, int) from public, anon, authenticated;
