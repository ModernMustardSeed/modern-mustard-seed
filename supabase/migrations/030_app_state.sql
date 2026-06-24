-- 030_app_state.sql
-- Tiny key/value store for app-level flags that need to persist across stateless
-- cron runs. First use: the voice watchdog's low-balance alert dedup
-- (key 'voice_billing'), so a depleted Vapi wallet pages Sarah once per outage
-- instead of every 10 minutes. Run once in the Supabase SQL Editor. Idempotent.

create table if not exists public.app_state (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state disable row level security;
