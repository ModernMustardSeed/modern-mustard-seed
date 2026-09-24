-- Houzz came off the Daily Posting offer 2026-09-24. It has no posting API,
-- so a new client's feeds default to the five we can post to. Existing rows
-- (Built Right keeps Houzz) are untouched.
alter table posting_settings
  alter column platforms set default '{facebook,instagram,linkedin,x,gbp}';
