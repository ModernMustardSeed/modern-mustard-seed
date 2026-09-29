-- ============================================================================
-- YIELD: THE AGENTIC OFFICE.
--
-- Sarah asks Sower (the chief) for an outcome in plain words: "get me 30 calls
-- on the books this week", "make us 10k". Sower answers in chat and, when the
-- ask is bigger than a reply, proposes a MISSION: a goal, a number, a deadline
-- and a sequenced set of TASKS, each owned by one agent on the floor (Scout,
-- Rep, Maker, Herald, Builder, Ledger).
--
-- Nothing here runs a model. Vercel has no Claude Code CLI, so every turn is a
-- row in office_jobs that the resident worker on Sarah's workstation claims
-- (scripts/office/worker.mjs) and runs on the Max subscription, never the
-- metered API. The worker writes back into these same tables and the admin
-- polls them.
--
--   office_messages      the chat thread with Sower
--   office_missions      one outcome Sarah asked for
--   office_tasks         one agent's piece of a mission, with dependencies
--   office_jobs          the queue the worker drains (chief turns, task runs)
--   office_approvals     anything held for Sarah's yes (spend, go-live, a new
--                        message before its first send)
--   office_deliverables  what the floor made: scripts, offers, links, files
--   office_events        the live feed, one line per thing an agent did
--
-- Only the service role reads or writes any of it.
-- ============================================================================

create table if not exists public.office_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  goal text not null,
  summary text,
  metric_label text,
  metric_unit text,
  metric_target numeric,
  metric_current numeric not null default 0,
  due_on date,
  status text not null default 'proposed'
    check (status in ('proposed', 'running', 'done', 'stopped', 'failed')),
  debrief text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists office_missions_status_idx on public.office_missions (status, created_at desc);

create table if not exists public.office_tasks (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.office_missions(id) on delete cascade,
  position int not null default 0,
  agent text not null,
  title text not null,
  brief text not null,
  depends_on uuid[] not null default '{}',
  status text not null default 'blocked'
    check (status in ('blocked', 'queued', 'running', 'waiting', 'done', 'failed', 'stopped')),
  session_id text,
  last_action text,
  output text,
  error text,
  runs int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists office_tasks_mission_idx on public.office_tasks (mission_id, position);
create index if not exists office_tasks_status_idx on public.office_tasks (status);

create table if not exists public.office_messages (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('sarah', 'sower', 'system')),
  body text not null,
  mission_id uuid references public.office_missions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists office_messages_created_idx on public.office_messages (created_at desc);

create table if not exists public.office_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('chief', 'debrief', 'task', 'resume')),
  ref_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),
  worker text,
  last_action text,
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  finished_at timestamptz
);
create index if not exists office_jobs_queue_idx on public.office_jobs (status, kind, created_at);

create table if not exists public.office_approvals (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.office_missions(id) on delete cascade,
  task_id uuid references public.office_tasks(id) on delete cascade,
  agent text not null,
  question text not null,
  detail text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  answer_note text,
  delivered boolean not null default false,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists office_approvals_status_idx on public.office_approvals (status, created_at desc);
create index if not exists office_approvals_task_idx on public.office_approvals (task_id);

create table if not exists public.office_deliverables (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.office_missions(id) on delete cascade,
  task_id uuid references public.office_tasks(id) on delete set null,
  agent text not null,
  kind text not null default 'note'
    check (kind in ('script', 'offer', 'product', 'link', 'file', 'copy', 'list', 'report', 'note')),
  title text not null,
  body text,
  url text,
  created_at timestamptz not null default now()
);
create index if not exists office_deliverables_created_idx on public.office_deliverables (created_at desc);

create table if not exists public.office_events (
  id bigint generated always as identity primary key,
  agent text not null,
  mission_id uuid references public.office_missions(id) on delete cascade,
  task_id uuid references public.office_tasks(id) on delete cascade,
  kind text not null default 'action',
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists office_events_created_idx on public.office_events (created_at desc);

-- One claim, many lanes. The chief lane asks for chief/debrief turns and the
-- task lanes ask for task/resume runs, so a two-hour build never makes Sarah
-- wait for a chat reply. skip locked keeps two lanes off the same row.
create or replace function public.claim_office_job(p_worker text, p_kinds text[])
returns setof public.office_jobs
language plpgsql
as $$
declare
  v_id uuid;
begin
  select id into v_id
    from public.office_jobs
   where status = 'queued' and kind = any(p_kinds)
   order by created_at
   for update skip locked
   limit 1;
  if v_id is null then
    return;
  end if;
  return query
    update public.office_jobs
       set status = 'running', worker = p_worker, claimed_at = now(), attempts = attempts + 1
     where id = v_id
    returning *;
end;
$$;

alter table public.office_missions enable row level security;
alter table public.office_tasks enable row level security;
alter table public.office_messages enable row level security;
alter table public.office_jobs enable row level security;
alter table public.office_approvals enable row level security;
alter table public.office_deliverables enable row level security;
alter table public.office_events enable row level security;
