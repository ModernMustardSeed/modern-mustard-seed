-- 029_prospect_do_not_call.sql
-- Do-not-call suppression for outbound AI calling. When a business asks to be
-- removed (Mr. Mustard calls mark_do_not_call, or someone flags it in the
-- Tracker), this is set true and placeOutboundCall will never dial them again.
-- Run once in the Supabase SQL Editor. Idempotent and safe to re-run.

alter table public.rep_prospects add column if not exists do_not_call boolean not null default false;

create index if not exists rep_prospects_dnc_idx on public.rep_prospects (do_not_call);
