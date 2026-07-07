-- OPTIONAL (not yet applied): the Sidekick Forge shipped v1 on the existing
-- app_state key/value table (see lib/sidekick-store.ts) because DDL access
-- was down at launch (Supabase CLI token revoked). Apply this later via
-- scripts/sidekick-apply-migration.mjs for nicer admin browsing, then port
-- lib/sidekick-store.ts to real rows. The caps work either way.
create table if not exists sidekick_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  business text not null,
  vertical text,
  city text,
  owner_name text,
  services text,
  hours text,
  ip text,
  -- the browser demo call (started client-side; we record intent at forge time)
  web_forged boolean not null default false,
  -- the encore: one real ring to their cell, once per run and once per number
  phone text,
  phone_call_id text
);

create index if not exists sidekick_runs_email_idx on sidekick_runs (email);
create index if not exists sidekick_runs_phone_idx on sidekick_runs (phone);
create index if not exists sidekick_runs_created_idx on sidekick_runs (created_at);

alter table sidekick_runs enable row level security;
-- No anon policies on purpose: only the service role (the site server) touches this.

-- Ship-gate hardening: app_state carries the Sidekick cap claims + visitor
-- PII and was created with RLS DISABLED (030). Lock it; the service role
-- bypasses RLS so nothing else changes.
alter table public.app_state enable row level security;
