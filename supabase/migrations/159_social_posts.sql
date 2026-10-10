-- The social calendar: every post that goes out, the day it goes, and where.
-- Written 2026-10-10 for /admin/social, so Sarah sees exactly what ships each
-- day on each account. Rows are loaded by scripts/social-calendar-import.mjs
-- (idempotent upsert on id) and marked posted by PATCH /api/admin/social/<id>
-- from the desk, a session, or a routine.
--
-- Service role only: RLS is on with no policies, so the anon and authenticated
-- keys read nothing. Covers live in the public Storage bucket social-covers,
-- never in public/ (the main checkout is blobless and media filled the disk).

create table if not exists social_posts (
  id text primary key,
  date date,
  time_mt text,
  platform text not null check (platform in (
    'facebook', 'instagram', 'instagram-sarah', 'tiktok', 'youtube',
    'pinterest', 'linkedin-sarah', 'linkedin-mms', 'x', 'x-sarah'
  )),
  account text,
  series text,
  title text,
  kind text,
  status text not null default 'planned' check (status in (
    'posted', 'scheduled', 'planned', 'unscheduled', 'failed'
  )),
  ref text,
  caption text,
  cover_url text,
  source text,
  -- verified: the post was read back on the platform itself. note: why a row
  -- needs attention (a missed slot, a refused schedule), shown under the row.
  verified boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);

-- Safe to rerun on a table created before verified and note existed.
alter table social_posts add column if not exists verified boolean not null default false;
alter table social_posts add column if not exists note text;

create index if not exists social_posts_date_idx on social_posts (date, time_mt);
create index if not exists social_posts_status_idx on social_posts (status);

alter table social_posts enable row level security;

insert into storage.buckets (id, name, public)
values ('social-covers', 'social-covers', true)
on conflict (id) do update set public = true;
