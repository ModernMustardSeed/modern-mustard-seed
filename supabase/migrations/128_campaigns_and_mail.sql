-- 128_campaigns_and_mail.sql
-- Two more parts of the client's Command Center.
--
-- 1. Campaigns. A QR code on a yard sign, a truck, a card or an ad carries a
--    short code in its link. The landing is counted as a scan, and a lead
--    that follows carries the code, so "where did this one come from" has an
--    answer that names the sign.
--
-- 2. Their mail. Read over IMAP with an app password the owner gives us,
--    sorted into a few plain categories, with a drafted reply waiting for
--    the ones that need one. Nothing is ever sent without the owner's click.
--
-- Run once. Idempotent.

create table if not exists public.client_campaigns (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  code text not null,
  label text not null,
  medium text not null default 'other' check (medium in ('sign', 'truck', 'card', 'print', 'ad', 'mail', 'other')),
  path text not null default '/',
  scans int not null default 0,
  leads int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_email, code)
);
alter table public.client_campaigns disable row level security;

create table if not exists public.client_visits (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  campaign_code text not null,
  path text,
  referrer text,
  ua_hash text,
  created_at timestamptz not null default now()
);
create index if not exists client_visits_client_idx on public.client_visits (client_email, created_at desc);
alter table public.client_visits disable row level security;

alter table public.client_leads add column if not exists campaign text;

create table if not exists public.client_mail (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  mailbox text not null,
  uid bigint,
  message_id text not null,
  in_reply_to text,
  from_addr text,
  from_name text,
  to_addrs text,
  subject text,
  snippet text,
  body_text text,
  received_at timestamptz not null,
  -- lead, customer, vendor, money, newsletter, notification, spam, other
  category text,
  summary text,
  needs_reply boolean,
  draft text,
  llm_job_id uuid,
  status text not null default 'new' check (status in ('new', 'replied', 'done', 'skipped')),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_email, message_id)
);
create index if not exists client_mail_client_idx on public.client_mail (client_email, received_at desc);
alter table public.client_mail enable row level security;

alter table public.client_integrations drop constraint if exists client_integrations_provider_check;
alter table public.client_integrations
  add constraint client_integrations_provider_check
  check (provider in ('google', 'facebook', 'instagram', 'x', 'linkedin', 'buildertrend', 'gmail'));
