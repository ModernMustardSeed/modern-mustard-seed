-- 136_client_mailings.sql
-- CAMPAIGNS in the client Command Center: one message from the business to the
-- people in its own contact book, chosen by tag. Not to be confused with
-- client_campaigns (migration 128), which is the QR codes on signs and ads.
--
-- Three rules live in the schema so no route can forget them:
--   1. every contact carries its own unsubscribe token, and an unsubscribed
--      contact is never mailed again, by anyone, from any screen;
--   2. every recipient of a mailing is a row with its own outcome, so "sent to
--      214" is a count of rows that say sent, never an estimate;
--   3. one address appears once per mailing.

alter table public.client_contacts
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribe_token text not null default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists client_contacts_unsub_token_idx
  on public.client_contacts (unsubscribe_token);

create table if not exists public.client_mailings (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  subject text not null,
  body text not null,
  -- the tags that chose the audience; empty means everyone with an address
  tags text[] not null default '{}',
  status text not null default 'sending' check (status in ('sending', 'sent', 'stopped')),
  -- who pressed Send, as the desk knows them
  created_by text,
  audience_count int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists client_mailings_client_idx
  on public.client_mailings (client_email, created_at desc);

create table if not exists public.client_mailing_recipients (
  id uuid primary key default gen_random_uuid(),
  mailing_id uuid not null references public.client_mailings (id) on delete cascade,
  contact_id uuid references public.client_contacts (id) on delete set null,
  email text not null,
  name text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  error text,
  sent_at timestamptz
);
create unique index if not exists client_mailing_recipients_once_idx
  on public.client_mailing_recipients (mailing_id, email);
create index if not exists client_mailing_recipients_queue_idx
  on public.client_mailing_recipients (mailing_id, status);

alter table public.client_mailings disable row level security;
alter table public.client_mailing_recipients disable row level security;
