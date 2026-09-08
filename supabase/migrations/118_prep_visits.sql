-- 118_prep_visits.sql
-- WHO OPENED THE PREP. A prospect gets a deck, an audit and a demo site before
-- they say yes, and until now nothing recorded whether they ever looked.
-- Every page on those surfaces sends one beacon to /api/prep-visit; this is
-- where it lands. Read by the admin and by the person asking "has he opened
-- it yet".
--
-- Run once. Idempotent.

create table if not exists public.prep_visits (
  id uuid primary key default gen_random_uuid(),
  project text not null,            -- e.g. 'built-right'
  surface text not null,            -- 'deck' | 'audit' | 'site'
  path text not null,
  referrer text,
  country text,
  region text,
  city text,
  ua text,
  ip_hash text,                     -- sha256 of ip + day, so repeat visits group without keeping the address
  created_at timestamptz not null default now()
);

create index if not exists prep_visits_project_idx on public.prep_visits (project, created_at desc);

alter table public.prep_visits disable row level security;
