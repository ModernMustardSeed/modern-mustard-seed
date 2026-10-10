-- THE OFFICE, MEASURED.
--
-- Ten standing routines run headless on Sarah's laptop (dev/mms/routines) and
-- sixty-four agents are graded by an eval sweep (~/.claude/evals). Until now
-- the only record of either was a markdown file on that one machine, so a
-- routine that never fired looked exactly like a quiet morning.
--
-- routine_runs     one row per routine per Mountain day, written by run.ps1
--                  through /api/routines/heartbeat. The watchdog cron reads it
--                  and emails Sarah when an expected run is missing.
-- routine_verdicts Sarah's keep or toss on a routine's report, tapped from the
--                  morning brief through /api/routines/verdict.
-- agent_evals      one row per agent per eval case per sweep, posted by the eval
--                  runner through /api/routines/evals.
--
-- /api/office/scoreboard publishes counts from all three, never report text.
-- Only the service role reads or writes; no anon policies.

create table if not exists public.routine_runs (
  id uuid primary key default gen_random_uuid(),
  routine text not null check (routine ~ '^[a-z0-9-]{2,40}$'),
  agent text not null,
  run_date date not null,
  started_at timestamptz,
  finished_at timestamptz,
  status text not null check (status in ('running', 'ok', 'missing_report', 'timeout', 'error', 'skipped')),
  summary text,
  report_chars int,
  created_at timestamptz not null default now(),
  unique (routine, run_date)
);

create index if not exists routine_runs_date_idx on public.routine_runs (run_date desc);

alter table public.routine_runs enable row level security;

create table if not exists public.routine_verdicts (
  id uuid primary key default gen_random_uuid(),
  routine text not null check (routine ~ '^[a-z0-9-]{2,40}$'),
  run_date date not null,
  verdict text not null check (verdict in ('keep', 'toss')),
  note text,
  created_at timestamptz not null default now(),
  unique (routine, run_date)
);

alter table public.routine_verdicts enable row level security;

create table if not exists public.agent_evals (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  agent text not null,
  case_id text not null,
  passed boolean not null,
  score numeric not null check (score >= 0 and score <= 1),
  checks jsonb not null default '[]'::jsonb,
  judge_notes text,
  duration_ms int,
  created_at timestamptz not null default now(),
  unique (run_id, agent, case_id)
);

create index if not exists agent_evals_run_idx on public.agent_evals (run_id, created_at desc);
create index if not exists agent_evals_created_idx on public.agent_evals (created_at desc);

alter table public.agent_evals enable row level security;
