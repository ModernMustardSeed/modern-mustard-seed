-- 113_sms_threads.sql
-- Two-way texting: replies thread back into the cockpit instead of dying on a
-- personal handset.
--
-- WHAT WAS ALREADY HERE. Migration 037 built most of the store and then the
-- provider was retired on 2026-08-01 (see lib/tap-text.ts). `messages` already
-- carries channel='sms', status and provider_sid. `sms_opt_outs` already exists
-- as the do-not-text list. Nothing below re-creates any of that; this adds the
-- three things the inbound half needs and 037 never had, because 037 only ever
-- imagined outbound.
--
-- Run once. Idempotent and safe to re-run.

-- ── 1. The counterparty's number, on its own column ──────────────────────────
-- A thread is "every message to and from this handset." Until now an SMS row
-- put the number in `to_addr` when we sent and `from_addr` when they replied,
-- so reading one conversation meant an OR across two columns and hoping both
-- sides normalized the number the same way. They did not always: the tap-to-text
-- logger wrote E.164 and older campaign rows wrote whatever was typed.
--
-- `phone` is always the OTHER party, always E.164, on both directions. It is the
-- thread key. from_addr/to_addr stay exactly as they are so nothing that reads
-- them today changes behaviour.
alter table public.messages add column if not exists phone text;

-- Which of our numbers the message went through. Null means "before we tracked
-- it" or "sent from Sarah's own handset", which is a real and different thing
-- from a number we own, and the UI says so rather than guessing.
alter table public.messages add column if not exists via_number text;

-- The carrier's reason a text did not land. Kept as its own column rather than
-- folded into `status`, because the code is the actionable half: 30032 means the
-- A2P campaign is not approved, 21610 means they opted out at the carrier, and
-- 21614 means it was never a mobile. "undelivered" alone tells you none of that.
alter table public.messages add column if not exists error_code text;

create index if not exists messages_phone_idx
  on public.messages (phone, occurred_at desc) where phone is not null;

-- The unread inbound texts, which is the query the alert badge runs on every
-- admin page load. Partial so it stays tiny no matter how big `messages` gets.
create index if not exists messages_sms_unread_idx
  on public.messages (occurred_at desc)
  where channel = 'sms' and direction = 'inbound' and read = false;

-- Backfill the existing SMS rows so old threads are not orphaned by the new
-- column. Outbound put the counterparty in to_addr, inbound in from_addr. Only
-- values that already look like E.164 are taken; a half-typed number is left
-- null rather than guessed at, because a wrong guess files a text under a
-- stranger's thread.
update public.messages
   set phone = to_addr
 where channel = 'sms' and direction = 'outbound' and phone is null
   and to_addr ~ '^\+[1-9][0-9]{7,14}$';

update public.messages
   set phone = from_addr
 where channel = 'sms' and direction = 'inbound' and phone is null
   and from_addr ~ '^\+[1-9][0-9]{7,14}$';

-- ── 2. Provider dedupe ───────────────────────────────────────────────────────
-- Twilio retries a webhook it did not get a 200 from, and a retry must not
-- write the same inbound text twice. `provider_sid` (added in 037) is the
-- natural key. Partial unique so the millions of rows with no SID are unaffected
-- and NULLs never collide.
--
-- Guarded, because the retired campaign stack wrote provider_sid too and may
-- have left duplicates behind. A bare CREATE UNIQUE INDEX would abort the whole
-- migration on the first pair, taking the columns above down with it. This
-- reports the problem and continues instead: the dedupe protection is worth
-- having on a fresh table and is not worth losing the rest of the file over.
do $$
declare dupes integer;
begin
  select count(*) into dupes from (
    select provider_sid from public.messages
     where provider_sid is not null
     group by provider_sid having count(*) > 1
  ) d;

  if dupes = 0 then
    create unique index if not exists messages_provider_sid_uidx
      on public.messages (provider_sid) where provider_sid is not null;
  else
    raise notice 'SKIPPED messages_provider_sid_uidx: % provider_sid values are duplicated already. Webhook retries can double-post until this is cleaned up. Find them with: select provider_sid, count(*) from public.messages where provider_sid is not null group by 1 having count(*) > 1;', dupes;
  end if;
end $$;

-- ── 3. Our numbers, and who each one belongs to ──────────────────────────────
-- Every number we own or rent, and the tenant it speaks for. This is what makes
-- the same webhook serve MMS outreach and a client's own front desk without the
-- two ever crossing: the inbound handler looks up the number the text arrived
-- ON, and files the conversation under that owner.
--
-- Without this table there is exactly one implicit tenant, and the first client
-- who gets their own number has their customers' replies land in Sarah's
-- prospect list. That is the failure this prevents.
create table if not exists public.sms_numbers (
  phone text primary key,                    -- E.164, the number itself
  label text,                                -- 'MMS outreach', 'Kyler front desk'
  owner_kind text not null default 'mms',    -- 'mms' | 'client'
  owner_email text,                          -- clients.email when owner_kind='client'
  provider text not null default 'twilio',
  provider_sid text,                         -- Twilio IncomingPhoneNumber SID
  messaging_service_sid text,                -- the A2P-registered service it sends under
  -- Inbound works the day the number is bought. Outbound does not, until the
  -- A2P 10DLC campaign for THIS number's messaging service is approved. Keeping
  -- them as two flags stops the UI from offering a Send box that carriers will
  -- silently filter, which is the exact failure that burned the last stack.
  inbound_ready boolean not null default true,
  outbound_ready boolean not null default false,
  a2p_status text,                           -- free text from scripts/a2p-status.mjs
  auto_reply text,                           -- sent once to a first-time texter, if set
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.sms_numbers disable row level security;
create index if not exists sms_numbers_owner_idx on public.sms_numbers (owner_kind, owner_email);

-- ── 4. Matching a number back to whoever owns it ─────────────────────────────
-- An inbound text arrives as +14065551234. The lead tables store whatever was
-- typed or scraped: "(406) 555-1234", "406-555-1234", "1 406 555 1234". Matching
-- those in application code means pulling every lead with a phone and comparing
-- in JS, which is a full table scan per inbound text.
--
-- A generated column holds the last ten digits, computed by Postgres and indexed,
-- so the match is one equality lookup. Generated rather than backfilled because a
-- lead edited tomorrow must not keep yesterday's key.
--
-- Ten digits, not the full string: +1 is implied for every US number we hold and
-- half the rows already omit it. Comparing on ten normalizes both spellings.
alter table public.outbound_leads
  add column if not exists phone_digits text
  generated always as (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)) stored;
create index if not exists outbound_leads_phone_digits_idx
  on public.outbound_leads (phone_digits) where phone_digits <> '';

alter table public.rep_prospects
  add column if not exists phone_digits text
  generated always as (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)) stored;
create index if not exists rep_prospects_phone_digits_idx
  on public.rep_prospects (phone_digits) where phone_digits <> '';

-- ── 5. Opt-out gets a record of what was said ────────────────────────────────
-- 037 stores the phone, a reason and a source. A carrier complaint asks WHEN and
-- in response to WHAT, and "reason: stop-reply" does not answer that. The exact
-- inbound word and the number it was sent to are the defensible record, the same
-- way lib/acq/consent.ts stores the whole consent sentence rather than a boolean.
alter table public.sms_opt_outs add column if not exists keyword text;
alter table public.sms_opt_outs add column if not exists via_number text;
alter table public.sms_opt_outs add column if not exists message_id uuid;
-- A START reply resumes. The row is kept and stamped, never deleted, so the
-- history reads "they stopped on the 4th and started again on the 9th."
alter table public.sms_opt_outs add column if not exists resumed_at timestamptz;
create index if not exists sms_opt_outs_live_idx on public.sms_opt_outs (phone) where resumed_at is null;
