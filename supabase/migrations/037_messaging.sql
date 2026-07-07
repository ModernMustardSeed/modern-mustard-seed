-- 037_messaging.sql
-- Team mail + texting. Powers (1) a real two-way mailbox inside the admin for
-- each teammate (Sarah + Polly), synced from Zoho over IMAP and sent over SMTP,
-- and (2) a compliant SMS engine: per-lead texts and bulk cold-text campaigns
-- with STOP opt-out suppression, delivery tracking, and inbound replies threaded
-- back onto the lead.
--
-- Run once in the Supabase SQL Editor (or via scripts/apply-messaging-migration).
-- Idempotent and safe to re-run.

-- ── 1. Mailbox store ─────────────────────────────────────────────
-- One row per email in a teammate's mailbox, scoped by `mailbox` (the address it
-- belongs to). Inbound is pulled from Zoho over IMAP; outbound (folder='sent') is
-- written when a teammate sends from the admin. This is a real inbox, distinct
-- from the lead-centric `messages` thread (a lead-linked email is written to
-- BOTH: `emails` for the mailbox, `messages` for the lead's conversation).
create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  mailbox text not null,                 -- the address this belongs to (sarah@…, polly.thompson@…)
  folder text not null default 'inbox',  -- 'inbox' | 'sent'
  direction text not null,               -- 'inbound' | 'outbound'
  message_id text,                        -- RFC Message-ID (dedupe)
  in_reply_to text,                       -- parent Message-ID, for threading
  thread_key text,                        -- normalized subject, groups a thread
  from_addr text,
  from_name text,
  to_addrs text,                          -- comma-joined
  cc_addrs text,
  subject text,
  snippet text,
  body_text text,
  body_html text,
  has_attachments boolean not null default false,
  is_read boolean not null default false,
  starred boolean not null default false,
  prospect_id uuid,                       -- linked lead (rep_prospects.id), if any
  lead_id uuid,                           -- linked pipeline lead (leads.id), if any
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.emails disable row level security;
create index if not exists emails_mailbox_idx on public.emails (mailbox, folder, occurred_at desc);
create index if not exists emails_unread_idx on public.emails (mailbox, is_read) where is_read = false;
create index if not exists emails_thread_idx on public.emails (mailbox, thread_key, occurred_at);
-- Dedupe per mailbox by Message-ID (the same message can land in two mailboxes).
-- Non-partial so it can serve as an upsert ON CONFLICT target. message_id is
-- always set by the sync (it falls back to a uid-based id), and Postgres treats
-- NULLs as distinct, so this never blocks a genuinely id-less row.
create unique index if not exists emails_mailbox_msgid_uidx
  on public.emails (mailbox, message_id);

-- ── 2. SMS opt-out suppression (STOP list) ───────────────────────
-- The authoritative do-not-text list. A phone here is never texted again, by any
-- campaign or one-off. Fed by inbound STOP/UNSUBSCRIBE replies and manual flags.
create table if not exists public.sms_opt_outs (
  phone text primary key,                 -- E.164, e.g. +14065551234
  reason text,                            -- 'stop-reply' | 'manual' | 'complaint'
  source text,                            -- campaign id or 'inbound' or admin email
  created_at timestamptz not null default now()
);
alter table public.sms_opt_outs disable row level security;

-- ── 3. Texting suppression + activity on the lead ────────────────
-- A business may take calls but not texts; keep the two separate. `last_sms_at`
-- rate-limits re-texting and shows recency in the UI.
alter table public.rep_prospects add column if not exists do_not_text boolean not null default false;
alter table public.rep_prospects add column if not exists last_sms_at timestamptz;
create index if not exists rep_prospects_dnt_idx on public.rep_prospects (do_not_text);

-- ── 4. Delivery status on the correspondence thread ──────────────
-- `messages` already logs a lead's texts (channel='sms'); add carrier status +
-- the provider message id so a status webhook can update the exact row.
alter table public.messages add column if not exists status text;        -- queued|sent|delivered|undelivered|failed|received
alter table public.messages add column if not exists provider_sid text;  -- Twilio Message SID
create index if not exists messages_provider_sid_idx on public.messages (provider_sid) where provider_sid is not null;

-- ── 5. Cold-text campaigns ───────────────────────────────────────
create table if not exists public.sms_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by text,                        -- admin email who built it
  template_key text,                      -- 'auto' (personalized per lead) or a named template
  custom_template text,                   -- optional override body with {{tokens}}
  audience jsonb,                          -- the filter used to build the recipient set
  status text not null default 'draft',   -- draft|ready|sending|paused|done|cancelled
  quiet_hours boolean not null default true,   -- only send 9a-8p in the lead's local time
  verify_mobile boolean not null default false,-- Twilio Lookup: skip landlines before sending
  throttle_per_min integer not null default 30,-- carrier-friendly pace
  total integer not null default 0,
  queued integer not null default 0,
  sent integer not null default 0,
  delivered integer not null default 0,
  failed integer not null default 0,
  replied integer not null default 0,
  opted_out integer not null default 0,
  skipped integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
alter table public.sms_campaigns disable row level security;
create index if not exists sms_campaigns_status_idx on public.sms_campaigns (status, created_at desc);

create table if not exists public.sms_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  prospect_id uuid,                        -- rep_prospects.id (source lead)
  business text,
  phone text not null,                     -- E.164
  body text not null,                      -- the personalized message (frozen at build)
  status text not null default 'queued',   -- queued|sent|delivered|failed|skipped|replied|opted_out
  error text,
  provider_sid text,
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.sms_campaign_recipients disable row level security;
create unique index if not exists sms_recipients_campaign_phone_uidx
  on public.sms_campaign_recipients (campaign_id, phone);
create index if not exists sms_recipients_campaign_status_idx
  on public.sms_campaign_recipients (campaign_id, status);
create index if not exists sms_recipients_provider_sid_idx
  on public.sms_campaign_recipients (provider_sid) where provider_sid is not null;
