-- THE SUITE FILM (2026-08-01, Sarah's order)
--
-- The video at the top of a Demo Suite hub was a single house film shot on the
-- Wills Electric build and served to every lead. It is now cut per lead, from
-- their own forged surfaces: their website, a live call to their own voice
-- agent, and their own command center (scripts/suite-film/build.mjs).
--
-- The film is the LAST step of the forge, and the suite-ready email/text is
-- gated on it, so nobody is ever shown a suite that is still being made.
--
-- Files live in the existing private `booth` bucket at suite/<leadId>.mp4 and
-- suite/<leadId>.jpg, signed fresh on each hub render, the same way Sarah's
-- personal founder videos already work.
alter table public.outbound_leads
  add column if not exists suite_film_status text
    check (suite_film_status in ('queued', 'filming', 'ready', 'failed')),
  add column if not exists suite_film_path text,
  add column if not exists suite_film_at timestamptz,
  add column if not exists suite_film_seconds smallint,
  add column if not exists suite_film_error text;

-- The cockpit and the delivery gate both ask "which suites are still waiting on
-- a film", which is always a small slice of a large table.
create index if not exists outbound_leads_suite_film_status_idx
  on public.outbound_leads (suite_film_status)
  where suite_film_status is not null;

comment on column public.outbound_leads.suite_film_status is
  'Per-lead suite film: queued | filming | ready | failed. The suite-ready email waits for ready.';
comment on column public.outbound_leads.suite_film_path is
  'Path inside the private booth bucket, e.g. suite/<leadId>.mp4. Signed at render time, never public.';
comment on column public.outbound_leads.suite_film_error is
  'Why the last cut failed, kept so a human can see it on the delivery board without reading worker logs.';
