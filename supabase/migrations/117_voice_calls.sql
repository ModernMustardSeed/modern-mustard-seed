-- 117_voice_calls.sql
-- THE CALL LOG. Every call any voice agent on the Vapi org takes, in one table.
--
-- Until now a call left three different marks depending on who answered it:
-- Mr. Mustard emailed Sarah a summary (and nothing else kept it), a Front
-- Office call wrote fo_calls, and a client agent whose webhook points at its
-- own deploy (August at D&D, the Wild Horse front desk, Newk's) left nothing
-- here at all. The one place that sees all of them is the Vapi API, so this
-- table is filled by pulling from Vapi (lib/voice-calls.ts syncVoiceCalls),
-- with the studio webhook writing through at end-of-call so a call shows up
-- the second it ends.
--
-- voice_agents maps each assistant to the client who owns it. That is what
-- lets /admin/calls filter by client and /portal/calls show a client only
-- their own calls. Assignments are made in the admin; fo_offices rows are
-- picked up automatically.
--
-- Run once. Idempotent and safe to re-run.

create table if not exists public.voice_agents (
  assistant_id text primary key,
  name text,
  client_email text,
  business text,
  kind text not null default 'other'
    check (kind in ('studio', 'demo', 'client', 'partner', 'probe', 'other')),
  hidden boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_agents_client_idx on public.voice_agents (lower(client_email));

create table if not exists public.voice_calls (
  id uuid primary key default gen_random_uuid(),
  vapi_call_id text not null unique,
  assistant_id text,
  agent_name text,
  client_email text,
  kind text not null default 'studio',
  direction text not null default 'inbound'
    check (direction in ('inbound', 'outbound', 'web')),
  call_type text,
  phone_number_id text,
  line_number text,
  line_label text,
  caller_number text,
  caller_name text,
  status text,
  ended_reason text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec integer,
  summary text,
  transcript text,
  messages jsonb not null default '[]'::jsonb,
  recording_url text,
  cost_cents integer,
  transferred boolean not null default false,
  transferred_to text,
  booked boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists voice_calls_started_idx on public.voice_calls (started_at desc);
create index if not exists voice_calls_client_idx on public.voice_calls (lower(client_email), started_at desc);
create index if not exists voice_calls_assistant_idx on public.voice_calls (assistant_id, started_at desc);
create index if not exists voice_calls_caller_idx on public.voice_calls (caller_number);

-- Read and written only through server routes with the service role, scoped
-- by the admin session or the client's session email, like every portal table.
alter table public.voice_agents disable row level security;
alter table public.voice_calls disable row level security;
