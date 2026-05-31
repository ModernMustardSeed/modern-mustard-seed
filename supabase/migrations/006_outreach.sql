-- Modern Mustard Seed — agentic partner outreach engine
-- Run once in the Supabase SQL Editor. Powers /admin/outreach: the prospect
-- store, the AI-drafted messages queued for approval, and the suppression list.

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text,                 -- their work / channel, in a phrase
  contact text,                 -- public professional contact (email or handle)
  channel_type text not null default 'email',  -- email | instagram | linkedin | x | youtube | warm
  tier int not null default 2,  -- 1..4 from the kit
  fit_score int,                -- 0..25 (five dimensions, 1..5 each)
  fit_breakdown jsonb,          -- { audience, trust, values, buildClient, warmth, rationale }
  source text,
  status text not null default 'new',  -- new | drafted | queued | sent | replied | joined | declined | opted_out
  notes text,                   -- what Sarah knows about their public work
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null,
  touch int not null default 1,        -- 1, 2, or 3
  channel text not null default 'email',
  subject text,
  body text,
  status text not null default 'draft',  -- draft | approved | sent | skipped
  created_at timestamptz default now(),
  sent_at timestamptz
);

create table if not exists public.suppression (
  id uuid primary key default gen_random_uuid(),
  contact text not null unique,
  reason text,
  created_at timestamptz default now()
);

create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_contact_idx on public.prospects (contact);
create index if not exists outreach_messages_prospect_idx on public.outreach_messages (prospect_id);

drop trigger if exists update_prospects_updated_at on public.prospects;
create trigger update_prospects_updated_at
  before update on public.prospects
  for each row
  execute function public.update_updated_at_column();

alter table public.prospects disable row level security;
alter table public.outreach_messages disable row level security;
alter table public.suppression disable row level security;
