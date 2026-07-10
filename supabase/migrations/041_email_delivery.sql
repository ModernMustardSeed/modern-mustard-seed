-- 041_email_delivery.sql
-- Truthful email delivery + one Sent folder that proves EVERY send.
--
-- Problem this fixes: transactional/outreach mail goes out through Resend, which
-- ACCEPTS a send (returns 200 + an id) even when the address is on its
-- suppression list, then silently drops it. The app saw "no error" and recorded
-- "Sent" while nothing was delivered. Internal notes to sarah@ and the Newk's
-- outreach were all suppressed this way. We now:
--   1. Record every Resend send into `emails` (the same store the admin Sent
--      folder reads) with provider + delivery status, so there is one proof-of-
--      send surface for Zoho AND Resend AND scripts.
--   2. Track the REAL outcome via a Resend webhook (delivered / bounced /
--      complained / suppressed), so status reflects what happened at the inbox,
--      not what the API accepted.
--   3. Mirror Resend's suppression list locally (Resend exposes no removal API),
--      so we refuse to "send" to a blocked address and tell the truth instead of
--      logging a phantom success.
--
-- Idempotent and safe to re-run.

-- ── 1. Delivery status on the mailbox / Sent store ───────────────
alter table public.emails add column if not exists provider text;              -- 'zoho' | 'resend' | 'script'
alter table public.emails add column if not exists provider_message_id text;   -- Resend email id (webhook match key)
alter table public.emails add column if not exists status text;                -- see status vocabulary below
alter table public.emails add column if not exists status_detail text;         -- bounce reason / note
alter table public.emails add column if not exists delivered_at timestamptz;   -- first confirmed delivery
alter table public.emails add column if not exists opened_at timestamptz;      -- first open (Resend open tracking)
-- status vocabulary (outbound): 'queued' | 'sent' | 'delivered' | 'bounced'
--   | 'complained' | 'suppressed' | 'delivery_delayed' | 'failed'.
-- 'sent' = provider accepted; ONLY 'delivered' means the recipient server took it.
create index if not exists emails_provider_msgid_idx
  on public.emails (provider_message_id) where provider_message_id is not null;
create index if not exists emails_status_idx
  on public.emails (status, occurred_at desc) where status is not null;

-- ── 2. Local mirror of the Resend suppression list ───────────────
-- An address lands here on a hard bounce or spam complaint. While present and
-- unresolved, we do NOT attempt to send to it; the caller gets an honest failure
-- with the reason instead of a fake "sent". Resend has no API to remove an entry
-- from ITS list, so removal is done in the Resend dashboard; set resolved=true
-- here after that so sends resume.
create table if not exists public.email_suppressions (
  email text primary key,                 -- lowercased recipient address
  reason text,                            -- 'bounced' | 'complained' | 'suppressed' | 'manual'
  detail text,                            -- provider-supplied reason, if any
  provider text not null default 'resend',
  resend_email_id text,                   -- the send that triggered it (dashboard deep-link)
  resolved boolean not null default false,-- true once cleared in the Resend dashboard
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.email_suppressions disable row level security;
create index if not exists email_suppressions_active_idx
  on public.email_suppressions (email) where resolved = false;

-- Backfill: mark historical Zoho-written Sent rows as provider='zoho' so the
-- Sent folder renders a status chip for them too (they were delivered by SMTP).
update public.emails
  set provider = 'zoho'
  where folder = 'sent' and direction = 'outbound' and provider is null;

notify pgrst, 'reload schema';
