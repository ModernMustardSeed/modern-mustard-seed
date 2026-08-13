-- Phone-only leads from the hero ring box (2026-08-13).
--
-- The hero asks for ONE thing, a phone number, and Mr. Mustard calls in about
-- ten seconds and gets the name, the business, and the email on the call. So a
-- lead can now arrive with a phone and nothing else, which 001_leads.sql did not
-- allow: email was NOT NULL and 'callback' was not a legal type.
--
-- Safe to re-run. Nothing here touches an existing row.

alter table public.leads alter column email drop not null;

alter table public.leads drop constraint if exists leads_type_check;
alter table public.leads add constraint leads_type_check
  check (type in ('build-queue', 'audit', 'contact', 'newsletter', 'callback'));

-- The admin looks these up by number, since a ring lead has no email to match on.
create index if not exists leads_phone_idx on public.leads (phone);
