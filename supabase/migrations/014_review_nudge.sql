-- Modern Mustard Seed — one-time review nudge after delivery.
-- Run once in the Supabase SQL Editor. review_requested_at dedupes the ask so a
-- client is only nudged once even if balance-paid and project-launched both fire.

alter table public.projects
  add column if not exists review_requested_at timestamptz;
