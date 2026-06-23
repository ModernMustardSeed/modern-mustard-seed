-- 028_voice_caller_memory.sql
-- Persistent cross-call memory for the voice agents (Mr. Mustard et al.).
-- A returning caller is recognized by phone (inbound calls) or email (web), so
-- the agent can greet them by name, skip re-asking what it already knows, and
-- pick up the thread from the last conversation. Written on booking/lead capture
-- and at end-of-call; read at the start of a call via the recall_caller tool.
-- Run once in the Supabase SQL Editor. Idempotent and safe to re-run.

create table if not exists public.voice_caller_memory (
  id uuid primary key default gen_random_uuid(),
  phone text,
  email text,
  name text,
  business text,
  pain_summary text,
  last_summary text,
  booked boolean not null default false,
  call_count integer not null default 0,
  first_called_at timestamptz not null default now(),
  last_called_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_caller_memory_phone_idx on public.voice_caller_memory (phone);
create index if not exists voice_caller_memory_email_idx on public.voice_caller_memory (lower(email));
