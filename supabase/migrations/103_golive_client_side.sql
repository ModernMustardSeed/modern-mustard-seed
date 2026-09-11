-- ===========================================================================
-- THE LAUNCH CHECKLIST GETS A CLIENT SIDE.
--
-- golive_runbooks already carried who: 'You' | 'Claude' | 'Client' and per-item
-- done marks, but nothing tied a runbook to the client whose launch it is, so
-- the Client half was only ever visible to us. One column fixes that: the portal
-- looks a runbook up by the signed-in client's email and shows them their own
-- steps, ticking against the same rows we see in /admin/golive.
--
-- One list, two views. A second document for the client is a document that
-- drifts from ours the first time either side changes.
-- ===========================================================================

alter table public.golive_runbooks
  add column if not exists client_email text,
  add column if not exists facts jsonb;

comment on column public.golive_runbooks.client_email is
  'Lowercased email of the client whose launch this is. Lets the portal scope a runbook to them; null for our own projects.';
comment on column public.golive_runbooks.facts is
  'The LaunchFacts the standard checklist was rendered from (business, city, phone, categories, service areas), so the runbook can be regenerated without guessing.';

-- One launch per client. A second runbook for the same person means two lists
-- and two answers to "am I done", which is the failure this whole column exists
-- to prevent.
create unique index if not exists golive_runbooks_client_email_uniq
  on public.golive_runbooks (client_email)
  where client_email is not null and archived = false;

create index if not exists golive_runbooks_client_email_idx
  on public.golive_runbooks (client_email)
  where client_email is not null;
