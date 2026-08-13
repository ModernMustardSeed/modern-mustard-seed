-- 092_llm_jobs.sql
-- THE UNIVERSAL WORK ORDER between Vercel and the subscription.
--
-- Migrations 080 (audit_jobs) and 091 (roadmap_jobs) each solved this problem
-- for exactly one caller: serverless has no `claude` binary, so a route that
-- wants the free engine has to hand the work to something that does. Both were
-- right, and between them they covered two of about thirty call sites. The
-- other twenty-eight went straight to the metered API, which is why the wallet
-- emptied and why every one of them broke at once when it did.
--
-- This is the same handoff, generalised, so that NO route anywhere in the app
-- needs an Anthropic API key ever again. A route describes the work it wants;
-- a drainer that owns a subscription does it.
--
-- TWO DRAINERS, DELIBERATELY.
--   1. scripts/llm-worker.mjs on Sarah's workstation. Sub-second pickup when
--      the laptop is awake, which is most of the working day.
--   2. .github/workflows/llm-worker.yml, every five minutes, running the same
--      CLI in a runner authenticated with CLAUDE_CODE_OAUTH_TOKEN.
--
-- The second one is the point. The obvious reading of "put it all on the
-- subscription" is that nothing works while the laptop is closed. It does not
-- have to be true: the Claude Code CLI accepts a subscription OAuth token, and
-- a GitHub runner is a machine that can hold one. So the queue drains around
-- the clock, fast when she is at her desk and within a few minutes when she is
-- not. Nothing is lost either way, because a job is a row and rows wait.
--
-- Same claim semantics as 080 and 091. Three queues that behave identically are
-- one thing to learn and one thing to debug.

create table if not exists public.llm_jobs (
  id uuid primary key default gen_random_uuid(),

  -- Which call site asked. Free text, used for logs, for the desk, and for
  -- working out after the fact where the subscription's time actually went.
  label text not null,

  -- The whole order. The drainer may run in a different process, on a different
  -- continent, ten minutes later, and must be able to finish without asking
  -- anyone anything.
  system_prompt text not null,
  user_prompt text not null,

  -- Present => the answer must satisfy this JSON Schema. Absent => plain text.
  schema jsonb,

  -- 'opus' | 'sonnet' | 'haiku', or a full model id. Passed through to the CLI.
  model text,

  -- queued -> running -> done | failed
  status text not null default 'queued',

  -- Claim bookkeeping, so a crashed drainer cannot hold a job forever.
  worker text,
  claimed_at timestamptz,
  attempts int not null default 0,

  -- Exactly one of these is set when status is 'done': text answers land in
  -- result_text, schema answers in result_json.
  result_text text,
  result_json jsonb,
  error text,

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- The drainer's hot path: oldest queued job first.
create index if not exists llm_jobs_claim_idx on public.llm_jobs (status, created_at);
-- The desk's hot path: what has this call site been doing.
create index if not exists llm_jobs_label_idx on public.llm_jobs (label, created_at desc);

alter table public.llm_jobs enable row level security;
-- No policies on purpose. Every reader and writer is a server route or a
-- drainer, both on the service key, which bypasses RLS. Anon gets nothing.

/**
 * Claim exactly one job, atomically.
 *
 * `for update skip locked` is the whole reason this is a function rather than a
 * select followed by an update. Two drainers now poll this table on purpose
 * (the workstation and the five-minute runner), so they WILL poll together, and
 * the naive version hands both of them the same row. Every double claim is
 * subscription time spent twice on one answer.
 *
 * The stale window is 20 minutes: past the slowest single call this app makes
 * (a site forge at 64k output tokens has measured eleven minutes) and well
 * short of leaving a genuinely dead job stranded for an hour.
 */
create or replace function claim_llm_job(p_worker text, p_stale_minutes int default 20)
returns setof public.llm_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.llm_jobs
     set status = 'running',
         worker = p_worker,
         claimed_at = now(),
         attempts = attempts + 1
   where id in (
     select j.id
       from public.llm_jobs j
      where j.status = 'queued'
         or (j.status = 'running' and j.claimed_at < now() - make_interval(mins => p_stale_minutes))
      order by j.created_at
       for update skip locked
      limit 1
   )
  returning *;
end;
$$;

revoke all on function claim_llm_job(text, int) from public, anon, authenticated;

/**
 * Housekeeping. A job nobody ever read is still a row, and the public tools can
 * produce a lot of them. Keep a fortnight so a failure is still diagnosable on
 * Monday after it happened on Friday, and drop the rest.
 */
create or replace function prune_llm_jobs()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  with gone as (
    delete from public.llm_jobs
     where finished_at is not null
       and finished_at < now() - interval '14 days'
    returning 1
  )
  select count(*) into n from gone;
  return n;
end;
$$;

revoke all on function prune_llm_jobs() from public, anon, authenticated;
