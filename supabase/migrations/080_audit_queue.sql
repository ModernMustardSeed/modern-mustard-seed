-- 080_audit_queue.sql
-- The work order between Vercel and the local audit worker.
--
-- Website audits used to run inline on Vercel against the metered Anthropic
-- API. That put every lead sweep on the meter, and when the wallet ran dry the
-- whole engine returned "down for maintenance" with no queue behind it, so the
-- work was not deferred, it was simply lost.
--
-- Serverless cannot run the Claude Code CLI, so the free engine has to live on
-- Sarah's workstation. This table is the handoff: a route enqueues a job, the
-- local worker claims it, grades the site on the subscription, and writes the
-- report back here for the route (or the cockpit) to read.
--
-- Modelled on outbound_demo_sites, which has run the same shape for the demo
-- forge since migration 042.

create table if not exists public.audit_jobs (
  id uuid primary key default gen_random_uuid(),

  target_url text not null,

  -- Where the finished report belongs. Null source = a one-off (the smoke
  -- test, an ad-hoc audit) that is read straight off this row and filed
  -- nowhere else.
  source_table text,
  source_id uuid,

  -- queued -> running -> done | failed
  status text not null default 'queued',

  -- Claim bookkeeping, so a crashed worker cannot hold a job forever.
  worker text,
  claimed_at timestamptz,
  attempts int not null default 0,

  report jsonb,
  score int,
  error text,

  -- Which engine actually produced this, so a run can be audited after the
  -- fact for what it cost. 'claude-code' is free, 'api' is metered.
  engine text,

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- The worker's hot path: oldest queued job first.
create index if not exists audit_jobs_claim_idx on public.audit_jobs (status, created_at);
-- The route's hot path: has THIS lead's audit landed yet.
create index if not exists audit_jobs_source_idx on public.audit_jobs (source_table, source_id, created_at desc);

alter table public.audit_jobs enable row level security;
-- No policies on purpose. Every reader and writer is a server route or the
-- local worker, both on the service key, which bypasses RLS. Anon gets nothing.

/**
 * Claim exactly one job, atomically.
 *
 * The naive version (select the oldest queued row, then update it) hands the
 * same row to two workers whenever they poll together, and an audit is a
 * minute of subscription time, so a double claim is a minute burned plus a
 * racing pair of writes onto the same lead. The UPDATE ... WHERE id IN
 * (SELECT ... FOR UPDATE SKIP LOCKED) does the select and the claim in one
 * statement: the row lock serialises concurrent callers and SKIP LOCKED sends
 * the loser to the next row instead of making it wait.
 *
 * Stale running jobs are reclaimed by the same call. A worker killed
 * mid-audit (the forge has done this) otherwise pins its job in 'running'
 * forever and the queue silently stops moving.
 */
create or replace function claim_audit_job(p_worker text, p_stale_minutes int default 15)
returns setof public.audit_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.audit_jobs
     set status = 'running',
         worker = p_worker,
         claimed_at = now(),
         attempts = attempts + 1
   where id in (
     select j.id
       from public.audit_jobs j
      where j.status = 'queued'
         or (j.status = 'running' and j.claimed_at < now() - make_interval(mins => p_stale_minutes))
      order by j.created_at
       for update skip locked
      limit 1
   )
  returning *;
end;
$$;

revoke all on function claim_audit_job(text, int) from public, anon, authenticated;
