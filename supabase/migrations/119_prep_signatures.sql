-- 119_prep_signatures.sql
-- A SIGNED QUOTE. A prospect picks the packages they want on a prep start page,
-- types their name, and the record lands here before checkout opens: what they
-- chose, at what price, who signed, when, from where. The row is filed on the
-- client's card (client_files) and emailed to Sarah by /api/prep-sign.
--
-- Run once. Idempotent.

create table if not exists public.prep_signatures (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  client_email text not null,
  client_name text,
  signer_name text not null,
  packages jsonb not null,            -- [{key,label,setupCents,monthlyCents}]
  setup_cents integer not null default 0,
  monthly_cents integer not null default 0,
  quote_url text,
  terms text,
  ip_hash text,
  ua text,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

create index if not exists prep_signatures_project_idx on public.prep_signatures (project, created_at desc);
create index if not exists prep_signatures_email_idx on public.prep_signatures (lower(client_email));

alter table public.prep_signatures disable row level security;
