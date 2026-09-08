-- 120_prep_intakes.sql
-- ANSWERS, NOT PRINTOUTS. A prospect answers the onboarding questionnaire and
-- the access checklist on a web page; their old vendor fills the handover
-- form on another. Every submission lands here as one row with the answers as
-- JSON, gets filed on the client's card, and is emailed to Sarah by
-- /api/prep-intake.
--
-- Run once. Idempotent.

create table if not exists public.prep_intakes (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  kind text not null check (kind in ('onboarding', 'handover')),
  client_email text not null,
  submitted_by text,                -- who filled it in (the client, or the vendor's contact)
  answers jsonb not null,           -- [{q, a}] in the order asked
  ip_hash text,
  ua text,
  created_at timestamptz not null default now()
);

create index if not exists prep_intakes_project_idx on public.prep_intakes (project, created_at desc);

alter table public.prep_intakes disable row level security;
