-- 124_posting_polish.sql
-- Daily Posting grows up: hidden from the client until Sarah shows it,
-- optional approval before anything goes, a posting hour per platform (each
-- feed at the hour its algorithm rewards), a platform pick and a link per
-- post, the editor's notes on what it changed, and the numbers each post
-- earned once it is out.
--
-- Run once. Idempotent.

alter table public.posting_settings add column if not exists visible boolean not null default false;      -- the client sees the calendar
alter table public.posting_settings add column if not exists approve_first boolean not null default false; -- nothing goes until they tap Approve
alter table public.posting_settings add column if not exists platform_hours jsonb not null default '{}'::jsonb; -- {facebook: 9, instagram: 11, ...} Mountain

alter table public.posting_materials add column if not exists platforms text[];  -- null = every platform in settings
alter table public.posting_materials add column if not exists link text;         -- a page to point to, never on X

alter table public.posting_posts add column if not exists platforms text[];      -- the pick this post goes to
alter table public.posting_posts add column if not exists link text;
alter table public.posting_posts add column if not exists notes jsonb;           -- {facebook: "what the editor changed", ...}
alter table public.posting_posts add column if not exists approved_at timestamptz;
alter table public.posting_posts add column if not exists approved_by text;
alter table public.posting_posts add column if not exists stats jsonb;           -- {facebook: {reach, likes, comments, shares, at}, ...}
alter table public.posting_posts add column if not exists stats_at timestamptz;
