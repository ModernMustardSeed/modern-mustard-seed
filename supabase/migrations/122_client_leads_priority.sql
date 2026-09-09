-- 122_client_leads_priority.sql
-- The lead carries its own priority (from the buyer's starting point, in the
-- order Carmen gave: land and plans first, then land without plans, then plans
-- without land, then a remodel), the two SMS consents the form collected, how
-- long the visitor took, and the one human mark: handled_at, set by a person
-- in the portal and by nothing else.
--
-- Run once. Idempotent.

alter table public.client_leads add column if not exists priority int;            -- 1 to 4, null when unknown
alter table public.client_leads add column if not exists sms_consent boolean;      -- transactional texts allowed
alter table public.client_leads add column if not exists sms_promo boolean;        -- promotional texts allowed
alter table public.client_leads add column if not exists elapsed_ms int;           -- page load to submit
alter table public.client_leads add column if not exists handled_at timestamptz;   -- a person marked it called
alter table public.client_leads add column if not exists handled_by text;
alter table public.client_leads add column if not exists confirmed jsonb;          -- what the visitor was sent {email, sms}

create index if not exists client_leads_open_idx on public.client_leads (client_email, handled_at, priority, created_at desc);
