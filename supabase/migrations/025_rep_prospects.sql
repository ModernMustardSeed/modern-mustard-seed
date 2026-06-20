-- Shared rep prospecting tracker. Each row is a business a partner is working
-- (cold call or walk-in). Shared across the team so Sarah sees activity and reps
-- avoid double-calling the same business. Separate from `leads` (inbound CRM).
create table if not exists public.rep_prospects (
  id uuid primary key default gen_random_uuid(),
  rep_email text not null,
  rep_name text,
  business text not null,
  city text,
  phone text,
  channel text not null default 'cold-call',
  status text not null default 'to-contact',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists rep_prospects_rep_idx on public.rep_prospects (rep_email);
create index if not exists rep_prospects_status_idx on public.rep_prospects (status);
create index if not exists rep_prospects_city_idx on public.rep_prospects (city);

alter table public.rep_prospects disable row level security;
