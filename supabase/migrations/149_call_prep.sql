-- CALL PREP: THE CALLS WE HAVE LINED UP, AND WHAT WE SAY ON EACH ONE.
--
-- A prospect call gets one row: who, when, who on our side takes it, the
-- Presence Audit it leans on, and a brief the team reads together before the
-- call (who they are, the opening, what the audit found, the questions, the
-- offer, what to avoid, the next step). Notes and the outcome land on the same
-- row after the call, so the desk at /admin/call-prep is the whole story.
--
-- brief is jsonb in the shape of CallBrief in lib/call-prep.ts. Only the
-- service role reads or writes it.

create table if not exists public.call_prep (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  website text,
  city text,
  call_at timestamptz,
  taken_by text,
  audit_id uuid references public.presence_audits(id) on delete set null,
  status text not null default 'lined_up'
    check (status in ('lined_up', 'done', 'won', 'passed', 'no_show')),
  brief jsonb not null default '{}'::jsonb,
  notes text,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists call_prep_status_call_at_idx on public.call_prep (status, call_at);

alter table public.call_prep enable row level security;
