-- 031_email_open_tracking.sql
-- Email open tracking for the rep Tracker. A 1x1 pixel embedded in the audit /
-- follow-up email hits /api/track/open?p=<prospectId>, which calls
-- record_email_open to count the open and stamp the first-open time. Run once.
-- Idempotent and safe to re-run.

alter table public.rep_prospects add column if not exists email_opened_at timestamptz;
alter table public.rep_prospects add column if not exists email_open_count integer not null default 0;
alter table public.rep_prospects add column if not exists last_email_at timestamptz;

create or replace function public.record_email_open(pid uuid) returns void language sql as $func$
  update public.rep_prospects
  set email_open_count = email_open_count + 1,
      email_opened_at = coalesce(email_opened_at, now())
  where id = pid;
$func$;
