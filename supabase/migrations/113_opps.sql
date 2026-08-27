-- THE OPPS DESK (2026-08-26, Sarah: "build a dashboard link in my mms admin
-- that I can send these out to the right people and find an opp, kinda like I
-- do for MMS outbound or acquisition ... so I can manage these opps and work
-- them all").
--
-- One row per opportunity Sarah is working for herself: fractional seats,
-- contracts, founder-in-residence programs, expert networks, partner programs.
-- The row carries state (status, next step, contact). The story lives in
-- public.messages, which gains an opp_id so the desk's sent emails and notes
-- thread the same way outbound leads do.

-- ── 1. Opportunities ────────────────────────────────────────────────────────
create table if not exists public.opps (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  title text not null,
  url text not null,
  "group" text not null default 'lead'
    check ("group" in ('lead','eir','build','creative','expert','partner')),
  type text not null default 'contract',
  pay text,
  why_fit text,
  source text,
  deadline text,
  verified boolean not null default false,
  status text not null default 'new'
    check (status in ('new','shortlist','applied','replied','interview','offer','won','passed')),
  priority smallint not null default 2 check (priority between 1 and 3),
  contact_name text,
  contact_email text,
  notes text,
  next_step text,
  next_step_at timestamptz,
  applied_at timestamptz,
  last_action_at timestamptz,
  last_email_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists opps_url_key on public.opps (url);
create index if not exists opps_status_idx on public.opps (status, priority, updated_at desc);
create index if not exists opps_group_idx on public.opps ("group");
create index if not exists opps_next_step_idx on public.opps (next_step_at) where next_step_at is not null;

alter table public.opps disable row level security;

-- ── 2. Thread the desk's mail through messages, like outbound does ─────────
alter table public.messages add column if not exists opp_id uuid references public.opps(id) on delete set null;
create index if not exists messages_opp_idx on public.messages (opp_id, occurred_at desc);

-- ── 3. updated_at ───────────────────────────────────────────────────────────
create or replace function public.opps_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists opps_touch_updated_at on public.opps;
create trigger opps_touch_updated_at before update on public.opps
  for each row execute function public.opps_touch_updated_at();
