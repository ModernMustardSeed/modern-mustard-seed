-- Approvals queue: the human-in-the-loop layer. Anything the system drafts
-- (follow-up nudges, outreach, case studies, expansion offers, build delivery)
-- lands here as an editable draft. Sarah edits, then approves (which executes
-- the action) or rejects. Nothing outward-facing happens without approval.
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- followup | outreach | case_study | expansion | email | build_delivery
  title text not null,
  to_email text,
  to_name text,
  subject text,
  body text not null default '',
  context jsonb not null default '{}'::jsonb,   -- how to execute on approval
  status text not null default 'pending',        -- pending | sent | rejected
  source text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists approvals_status_idx on public.approvals (status);
create index if not exists approvals_created_idx on public.approvals (created_at desc);
create index if not exists approvals_dedupe_idx on public.approvals (dedupe_key);

alter table public.approvals enable row level security;
