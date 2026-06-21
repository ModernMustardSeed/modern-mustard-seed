-- 026_lead_followups.sql
-- Adds a follow-up reminder date and an owner to each lead, powering the
-- pipeline's no-stale-lead loop and the daily digest email. Run once in the
-- Supabase SQL Editor. Idempotent and safe to re-run.

alter table public.leads add column if not exists follow_up_at timestamptz;
alter table public.leads add column if not exists owner text;

create index if not exists leads_follow_up_at_idx on public.leads (follow_up_at);
