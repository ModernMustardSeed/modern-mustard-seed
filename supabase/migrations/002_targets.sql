-- Modern Mustard Seed — owner targets
-- Run this once in the Supabase SQL Editor. Powers the "Targets" block on the
-- command center (modernmustardseed.com/admin). Each save inserts a new row;
-- the dashboard always reads the most recent one, so you keep a history.

create table if not exists public.targets (
  id uuid primary key default gen_random_uuid(),
  revenue_goal int not null default 0,   -- monthly revenue goal in whole dollars
  leads_goal int not null default 0,     -- new leads per month
  calls_goal int not null default 0,     -- discovery calls per month
  created_at timestamptz default now()
);

create index if not exists targets_created_at_idx on public.targets (created_at desc);

-- Accessed only via the service role key from server routes (admin gated by
-- ADMIN_EMAIL + ADMIN_PASSWORD), so RLS stays off like the leads table.
alter table public.targets disable row level security;
