-- 127_command_center.sql
-- The client's Command Center: the parts of their business that have to keep
-- running whether or not anyone remembers them. Three things land here.
--
-- 1. Domains. Every name they own, who registers it, when it expires, what it
--    is for. A domain that lapses takes the website and the email with it,
--    and nobody notices until a customer does. The portal shows the list;
--    a weekly cron re-reads the registry and warns before anything expires.
--
-- 2. Their CRM. Built Right runs on Buildertrend, so a lead that reaches us
--    is pushed into Buildertrend the moment it arrives. The hand-off is
--    recorded on the lead, so the portal can say "in Buildertrend" or say
--    exactly why it is not.
--
-- 3. The Buildertrend connection itself lives in client_integrations like
--    every other account: the form token encrypted at rest, one row per
--    client, revocable.
--
-- Run once. Idempotent.

create table if not exists public.client_domains (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  domain text not null,
  -- primary: the website. email: carries their mailboxes. forward: points at
  -- the website. held: registered and renewed, nothing on it yet.
  role text not null default 'held' check (role in ('primary', 'email', 'forward', 'held')),
  registrar text,
  expires_on date,
  forwards_to text,
  mx text,
  status text not null default 'active' check (status in ('active', 'transferring', 'expired', 'released')),
  notes text,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_email, domain)
);
create index if not exists client_domains_client_idx on public.client_domains (client_email, expires_on);
alter table public.client_domains disable row level security;

alter table public.client_leads add column if not exists crm text;
alter table public.client_leads add column if not exists crm_pushed_at timestamptz;
alter table public.client_leads add column if not exists crm_ref text;
alter table public.client_leads add column if not exists crm_error text;

alter table public.client_integrations drop constraint if exists client_integrations_provider_check;
alter table public.client_integrations
  add constraint client_integrations_provider_check
  check (provider in ('google', 'facebook', 'instagram', 'x', 'linkedin', 'buildertrend'));
