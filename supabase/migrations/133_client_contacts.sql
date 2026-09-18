-- 133_client_contacts.sql
-- What a client brings with them when they leave another provider.
--
-- 1. Their contact book. Everyone they have ever dealt with: past enquiries,
--    subcontractors, suppliers, realtors, chamber members. These are not
--    website leads. They never enter client_leads, never reach the Monday
--    digest, and are never handed to a CRM, because none of them asked for
--    anything today.
--
-- 2. The posts the old provider published or had queued, kept as a record.
--    The posting engine never reads this table. Its insights job asks each
--    platform for stats on every published row of posting_posts, and these
--    posts were never ours to ask about.
--
-- Run once. Idempotent.

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  name text,
  phone text,
  email text,
  company text,
  tags text[] not null default '{}',
  -- how the old system says the contact arrived: Form, Web Chat, CRM UI
  source text,
  -- which system it came from, e.g. web-express, or 'portal' for one added by hand
  origin text not null default 'portal',
  -- the date the old system first recorded them
  first_seen date,
  notes text,
  -- a stable key per contact so a second import never duplicates the first
  import_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists client_contacts_import_key_idx
  on public.client_contacts (client_email, import_key) where import_key is not null;
create index if not exists client_contacts_client_idx
  on public.client_contacts (client_email, first_seen desc nulls last);
alter table public.client_contacts enable row level security;

create table if not exists public.client_archive_posts (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  origin text not null,
  -- published, scheduled, failed: as the old provider reported it on the day we read it
  status text not null check (status in ('published', 'scheduled', 'failed')),
  posted_at timestamptz not null,
  body text not null,
  networks text[] not null default '{}',
  -- what the old provider reported: {likes, comments, reached, plays}
  stats jsonb not null default '{}'::jsonb,
  error text,
  import_key text not null,
  created_at timestamptz not null default now(),
  unique (client_email, import_key)
);
create index if not exists client_archive_posts_client_idx
  on public.client_archive_posts (client_email, posted_at desc);
alter table public.client_archive_posts enable row level security;

notify pgrst, 'reload schema';
