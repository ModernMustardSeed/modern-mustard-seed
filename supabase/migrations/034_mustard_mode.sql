-- MUSTARD MODE: free-play runs (the Multiplier's saved coaching runs) and
-- cross-device player progress for the HQ.

create table if not exists mustard_runs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ambition text not null,
  reply text,
  created_at timestamptz not null default now()
);
create index if not exists mustard_runs_email_idx on mustard_runs (email);

create table if not exists mustard_progress (
  email text primary key,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table mustard_runs enable row level security;
alter table mustard_progress enable row level security;
-- Service-role only (the site's server routes); no anon policies on purpose.
