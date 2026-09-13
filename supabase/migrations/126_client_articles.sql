-- 126_client_articles.sql
-- Carmen writes a piece for Kalispell Montana Hidden Gems every month and it
-- runs on their site under Built Right's byline. Each one belongs on Built
-- Right's own blog too, as a written summary that carries the construction
-- terms and town names, plus a link to the full article.
--
-- She should not have to email anyone to make that happen. She pastes the
-- link in her portal, we write the summary, it goes on the site. This table
-- is that queue.
--
-- Run once. Idempotent.

create table if not exists public.client_articles (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  url text not null,
  title text,
  published_on date,
  publisher text,                       -- "Kalispell Montana Hidden Gems"
  summary text,                         -- what goes on their blog, written by us
  status text not null default 'new' check (status in ('new', 'written', 'live', 'skipped')),
  added_by text,                        -- the portal email, or 'seed'
  live_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_email, url)
);

create index if not exists client_articles_client_idx on public.client_articles (client_email, published_on desc);
alter table public.client_articles disable row level security;
