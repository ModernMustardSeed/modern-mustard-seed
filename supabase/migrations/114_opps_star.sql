-- STARS ON THE OPPS DESK (2026-08-27, Sarah: "put a star next to all the
-- ideal ones for me so I can do those first").
--
-- A starred row is the one to do first. Starred rows sort to the top of the
-- desk and have their own filter. Priority stays as it was (Now / Soon /
-- Later); the star is a separate, personal mark.
alter table public.opps add column if not exists starred boolean not null default false;
create index if not exists opps_starred_idx on public.opps (starred desc, priority, updated_at desc);
