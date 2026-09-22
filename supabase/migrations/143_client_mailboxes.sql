-- 143_client_mailboxes.sql
-- A business has more than one mailbox. Built Right runs shan@, carmen@ and
-- zayne@brimhomes.com, and the mail desk reads every one of them. Each mailbox
-- is its own row, keyed 'mail:<address>', so the one-row-per-provider unique
-- key stays as it is and reconnecting a mailbox still updates it in place.
-- The old single 'gmail' row stays legal so nothing already stored breaks.

alter table public.client_integrations drop constraint if exists client_integrations_provider_check;
alter table public.client_integrations
  add constraint client_integrations_provider_check
  check (
    provider in ('google', 'facebook', 'instagram', 'x', 'linkedin', 'buildertrend', 'gmail', 'calendar-ics')
    or provider like 'mail:%'
  );
