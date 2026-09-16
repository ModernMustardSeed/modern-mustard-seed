-- 129_project_photos_reviews.sql
-- Jobsite signs, photos the owner sends to a project page, and the review
-- asks they send after a job closes. Run once. Idempotent.

alter table public.client_campaigns drop constraint if exists client_campaigns_medium_check;
alter table public.client_campaigns
  add constraint client_campaigns_medium_check
  check (medium in ('sign', 'jobsite', 'truck', 'card', 'print', 'ad', 'mail', 'other'));

create table if not exists public.client_project_photos (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  project_slug text not null,
  url text not null,
  caption text,
  uploaded_by text,
  -- new: waiting for the site build. live: on the page. skipped: not used.
  status text not null default 'new' check (status in ('new', 'live', 'skipped')),
  live_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists client_project_photos_idx on public.client_project_photos (client_email, project_slug, created_at desc);
alter table public.client_project_photos disable row level security;

create table if not exists public.client_review_requests (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  name text not null,
  email text,
  phone text,
  project text,
  sent_email boolean not null default false,
  sent_sms boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists client_review_requests_idx on public.client_review_requests (client_email, created_at desc);
alter table public.client_review_requests disable row level security;
