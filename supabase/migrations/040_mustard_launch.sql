-- MUSTARD LAUNCH: free Blueprint runs + per-member launch progress.
-- Service-role only (RLS on, no anon policies), same posture as 034_mustard_mode.

create table if not exists launch_runs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  idea text not null,
  blueprint jsonb,
  created_at timestamptz not null default now()
);

create index if not exists launch_runs_email_idx on launch_runs (email);
create index if not exists launch_runs_created_idx on launch_runs (created_at desc);

create table if not exists launch_progress (
  email text primary key,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table launch_runs enable row level security;
alter table launch_progress enable row level security;
