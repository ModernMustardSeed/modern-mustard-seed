-- Modern Mustard Seed — client portal (multitenant)
-- Run once in the Supabase SQL Editor. Powers modernmustardseed.com/portal.
-- Tenancy is by email: every row belongs to a client_email, and the portal
-- only ever queries rows matching the signed-in session email.

-- Engagement clients (the big ones). PDF buyers do NOT need a row here; they
-- are recognized automatically by their email in the orders table.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  tier text not null default 'engagement' check (tier in ('engagement', 'fractional', 'vip')),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  welcome_note text,                 -- a personal line shown at the top of their portal
  created_at timestamptz default now()
);

-- One build/engagement per client (kept simple: a client has projects).
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  name text not null,
  status text not null default 'building' check (status in ('discovery', 'building', 'review', 'launched', 'paused')),
  summary text,
  progress int not null default 0,   -- 0..100, drives the progress bar
  milestones jsonb not null default '[]'::jsonb,  -- [{ title, detail, done, due }]
  launch_target date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Files / links / deliverables handed to a client.
create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  label text not null,
  url text not null,
  kind text not null default 'link' check (kind in ('link', 'doc', 'repo', 'site', 'design', 'invoice', 'download')),
  created_at timestamptz default now()
);

create index if not exists clients_email_idx on public.clients (email);
create index if not exists projects_client_email_idx on public.projects (client_email);
create index if not exists client_files_client_email_idx on public.client_files (client_email);

drop trigger if exists update_projects_updated_at on public.projects;
create trigger update_projects_updated_at
  before update on public.projects
  for each row
  execute function public.update_updated_at_column();

-- Accessed only via the service role key from server routes, which scope every
-- query by the session email, so RLS stays off like the other tables.
alter table public.clients disable row level security;
alter table public.projects disable row level security;
alter table public.client_files disable row level security;
