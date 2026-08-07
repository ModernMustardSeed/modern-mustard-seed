-- 087_hundredfold.sql
-- HUNDREDFOLD: the flagship scaling program.
--
-- The free roadmap (086) is the lead magnet. This is what it sells. One row per
-- member, one row per interview, one row per system we build for them, and one
-- row per gate they clear. The member's portal, the admin desk, and the emails
-- all read from these four tables.

create table if not exists public.hundredfold_members (
  id uuid primary key default gen_random_uuid(),

  email text not null unique,
  name text,
  business_name text,
  host text,
  phone text,

  -- applicant | interviewing | interviewed | offered | active | paused | alumni | declined
  status text not null default 'applicant',

  -- The free roadmap that brought them, if there was one. The deep roadmap
  -- built from the interview supersedes it but never overwrites it: the two
  -- side by side are the best before/after asset this program has.
  roadmap_slug text,
  deep_roadmap jsonb,
  offer jsonb,

  -- Price actually agreed, in cents, captured at join so a later price change
  -- never rewrites history. Defaults are filled from lib/hundredfold.ts.
  setup_cents int,
  monthly_cents int,
  price_locked_until date,

  stripe_customer_id text,
  stripe_subscription_id text,

  started_at timestamptz,
  paused_at timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hundredfold_interviews (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.hundredfold_members(id) on delete cascade,

  email text,
  business_name text,
  url text,

  -- 'web' (in-browser voice), 'phone', or 'typed' (the accessible fallback).
  channel text not null default 'web',
  -- open | complete | abandoned
  status text not null default 'open',

  -- [{ role: 'coach' | 'owner', text, at }]. The whole conversation, theirs to keep.
  transcript jsonb not null default '[]'::jsonb,
  -- { question_key: answer }. What the synthesizer actually reads.
  answers jsonb not null default '{}'::jsonb,

  -- Vapi's call id when the interview ran on voice, so a webhook can find the row.
  call_id text,

  summary text,
  duration_seconds int,

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.hundredfold_systems (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.hundredfold_members(id) on delete cascade,

  name text not null,
  -- Which roadmap window this build belongs to (1-4).
  window_no int,
  kind text,
  summary text,
  -- proposed | queued | building | live | retired
  status text not null default 'proposed',
  url text,

  -- What it removes from their week, in the owner's own terms.
  gives_back text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  live_at timestamptz
);

create table if not exists public.hundredfold_gates (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.hundredfold_members(id) on delete cascade,

  window_no int not null,
  -- 'move' (a step inside the window) or 'gate' (the number that unlocks the next window)
  kind text not null default 'move',
  label text not null,
  target text,

  done boolean not null default false,
  done_at timestamptz,
  done_by text,

  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.hundredfold_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.hundredfold_members(id) on delete cascade,

  held_at timestamptz not null,
  window_no int,
  title text,
  notes text,
  recording_url text,
  -- [{ text, done }]
  actions jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists hundredfold_members_status_idx on public.hundredfold_members (status);
create index if not exists hundredfold_interviews_member_idx on public.hundredfold_interviews (member_id);
create index if not exists hundredfold_interviews_call_idx on public.hundredfold_interviews (call_id) where call_id is not null;
create index if not exists hundredfold_systems_member_idx on public.hundredfold_systems (member_id);
create index if not exists hundredfold_gates_member_idx on public.hundredfold_gates (member_id, window_no);
create index if not exists hundredfold_sessions_member_idx on public.hundredfold_sessions (member_id);

alter table public.hundredfold_members enable row level security;
alter table public.hundredfold_interviews enable row level security;
alter table public.hundredfold_systems enable row level security;
alter table public.hundredfold_gates enable row level security;
alter table public.hundredfold_sessions enable row level security;
-- No policies on purpose. Every reader and writer is a server route on the
-- service key, and the member portal reads server-side scoped to their session
-- email. Anon gets nothing.
