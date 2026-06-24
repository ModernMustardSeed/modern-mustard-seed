-- 027_prospect_closed_loop.sql
-- Turns the rep prospecting Tracker into a closed loop. Each prospect can now
-- carry a website and email (so we can audit the site and follow up), a cached
-- website-audit result (score + full report, so the per-lead AI script and the
-- follow-up email can reference what we actually found), and a link to the
-- `leads` row it becomes once it is a good lead (so a prospect flows into the
-- inbound CRM, the daily digest, and the drip without being entered twice).
-- Run once in the Supabase SQL Editor. Idempotent and safe to re-run.

alter table public.rep_prospects add column if not exists website text;
alter table public.rep_prospects add column if not exists email text;
alter table public.rep_prospects add column if not exists audit_score integer;
alter table public.rep_prospects add column if not exists audit_url text;
alter table public.rep_prospects add column if not exists audit_json jsonb;
alter table public.rep_prospects add column if not exists audit_at timestamptz;
-- The leads-pipeline row this prospect was promoted into (null until promoted).
alter table public.rep_prospects add column if not exists lead_id uuid;

create index if not exists rep_prospects_lead_idx on public.rep_prospects (lead_id);
create index if not exists rep_prospects_email_idx on public.rep_prospects (email);
