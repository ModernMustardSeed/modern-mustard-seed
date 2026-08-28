-- THE LEAD REMEMBERS IT WAS MESSAGED.
--
-- 114 gave every lead with nothing to mail a Facebook page and a button. A
-- button turns a list into a worked list only if the list can hide what has
-- been done. These two columns are the stamp: when the last DM went out and
-- how many have gone. The event ledger (acq_events, type dm_sent) keeps the
-- history; the columns keep the filter fast.

alter table public.outbound_leads
  add column if not exists last_dm_at timestamptz,
  add column if not exists dm_count smallint not null default 0;

comment on column public.outbound_leads.last_dm_at is
  'When Sarah last sent this business a Facebook DM by hand. Null means never.';
comment on column public.outbound_leads.dm_count is
  'How many DMs have gone to this business. Incremented by the DM sent button.';

create index if not exists outbound_leads_last_dm_idx
  on public.outbound_leads (last_dm_at desc) where last_dm_at is not null;
