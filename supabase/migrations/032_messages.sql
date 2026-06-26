-- 032_messages.sql
-- Correspondence log for the rep Tracker: one row per message/event tied to a
-- prospect (and/or a pipeline lead), so each profile shows a full thread and the
-- admin can alert on new inbound mail. Outbound emails, opens, and bookings are
-- logged here too, and inbound replies are pulled in from Zoho over IMAP.
-- Run once. Idempotent and safe to re-run.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid,                 -- rep_prospects.id (nullable)
  lead_id uuid,                     -- leads.id (nullable)
  direction text not null,          -- 'inbound' | 'outbound'
  channel text not null default 'email', -- 'email' | 'open' | 'booking' | 'note'
  from_addr text,
  to_addr text,
  subject text,
  body text,
  snippet text,
  external_id text,                 -- provider/imap id, for dedupe
  read boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.messages disable row level security;
create index if not exists messages_prospect_idx on public.messages (prospect_id, occurred_at desc);
create index if not exists messages_unread_idx on public.messages (read) where read = false;
create unique index if not exists messages_external_uidx on public.messages (external_id) where external_id is not null;
