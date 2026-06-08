-- Client onboarding intake. One row per client, answers stored as jsonb so the
-- question set can evolve and stay scope-aware (sections chosen from the
-- client's proposal). Surfaces in the project editor in admin.
create table if not exists public.client_intake (
  id uuid primary key default gen_random_uuid(),
  client_email text not null unique,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress',   -- 'in_progress' | 'submitted'
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_intake_email_idx on public.client_intake (client_email);

alter table public.client_intake enable row level security;
