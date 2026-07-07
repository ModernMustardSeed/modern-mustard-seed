-- 037_outbound_unified.sql
-- One dial floor: the Outbound Cockpit absorbs the Tracker's outreach methods.
-- outbound_leads learns audits, pipeline linkage, and email open tracking;
-- the messages thread and the open-tracking pixel learn to point at outbound
-- leads alongside rep_prospects.

alter table public.outbound_leads add column if not exists audit_score integer;
alter table public.outbound_leads add column if not exists audit_url text;
alter table public.outbound_leads add column if not exists audit_json jsonb;
alter table public.outbound_leads add column if not exists audit_at timestamptz;
alter table public.outbound_leads add column if not exists pipeline_lead_id uuid references public.leads(id) on delete set null;
alter table public.outbound_leads add column if not exists email_opened_at timestamptz;
alter table public.outbound_leads add column if not exists email_open_count integer not null default 0;
alter table public.outbound_leads add column if not exists last_email_at timestamptz;

create index if not exists outbound_leads_email_idx on public.outbound_leads (email);
create index if not exists outbound_leads_pipeline_idx on public.outbound_leads (pipeline_lead_id);

-- Correspondence thread support: a message can belong to an outbound lead.
alter table public.messages add column if not exists outbound_lead_id uuid references public.outbound_leads(id) on delete set null;
create index if not exists messages_outbound_lead_idx on public.messages (outbound_lead_id, occurred_at desc);

-- Open-tracking twin of record_email_open (031). The pixel route fires both;
-- a uuid only ever matches one table, so the other call is a no-op.
create or replace function public.record_outbound_email_open(oid uuid)
returns void
language sql
as $func$
  update public.outbound_leads
  set email_open_count = email_open_count + 1,
      email_opened_at = coalesce(email_opened_at, now())
  where id = oid;
$func$;
