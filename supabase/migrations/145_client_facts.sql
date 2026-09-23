-- 145_client_facts.sql
-- WHAT THE DESK KNOWS ABOUT THE BUSINESS IT WORKS FOR.
--
-- Every conversation with the Operator starts from nothing. It can read the
-- rows, so it knows who is waiting and what a job is worth, and it knows
-- nothing at all about the business: that they do not take commercial work,
-- that Carmen decides and Shan builds, that they will not build below a
-- certain number, that a lot without a perc test is a conversation and not a
-- job. Those facts are the difference between a tool that answers and one
-- that belongs to them.
--
-- TWO WAYS A FACT GETS HERE, AND THEY ARE NOT THE SAME THING.
--
--   said     the owner stated it. "We don't do commercial." That is a fact
--            about their business from the only authority on it, and it is
--            kept the moment they say it.
--   noticed  the machine inferred it from rows. "Every job from Kim Marland
--            has closed." That is a hypothesis with evidence, and it is
--            proposed rather than kept: it becomes a fact when a person says
--            yes. Software that quietly adopts its own guesses about a
--            business will eventually act on one that is wrong, and the owner
--            will never know where it came from.
--
-- A retired fact is kept, not deleted. "We stopped doing remodels in 2026" is
-- itself worth knowing, and a fact that vanishes takes its own history with
-- it.

create table if not exists public.client_facts (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,

  -- One sentence, in their words where possible. "We do not take commercial
  -- work." Not a key-value pair: a business is not a settings screen.
  fact text not null,

  --   rule        something they will or will not do
  --   preference  how they like things done
  --   about       a plain fact about the business
  --   person      something about a person they deal with
  kind text not null default 'about' check (kind in ('rule', 'preference', 'about', 'person')),

  -- Who or what it is about, when it is about something in particular.
  subject text,

  -- said | noticed. See the note above; they are not the same authority.
  source text not null default 'said' check (source in ('said', 'noticed')),
  -- What the machine was looking at when it noticed. Empty for a stated fact.
  evidence text,

  -- A noticed fact is nothing until a person says yes.
  confirmed_at timestamptz,
  confirmed_by text,

  -- Kept, never deleted. A fact that stopped being true is still history.
  retired_at timestamptz,
  retired_reason text,

  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists client_facts_client_idx
  on public.client_facts (client_email, created_at desc)
  where retired_at is null;

alter table public.client_facts enable row level security;

comment on table public.client_facts is
  'What the Operator knows about this business. A said fact is kept at once; a noticed one waits for a person. See lib/cc-facts.ts.';

-- The weekly pattern read is a brief like any other.
alter table public.client_briefs drop constraint if exists client_briefs_kind_check;
alter table public.client_briefs add constraint client_briefs_kind_check
  check (kind in ('qualify', 'quiet', 'monday', 'risk', 'cert', 'handover', 'noticed'));
