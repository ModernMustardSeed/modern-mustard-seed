-- 039_outbound_engine.sql
-- The cockpit becomes an engine: shareable forged demos, speed-to-open
-- dialing, and pilots that count their own receipts.

alter table public.outbound_leads add column if not exists next_action text;
alter table public.outbound_leads add column if not exists demo_url text;
alter table public.outbound_leads add column if not exists demo_run_id text;
alter table public.outbound_leads add column if not exists last_open_at timestamptz;

alter table public.outbound_pilots add column if not exists vapi_assistant_id text;

create index if not exists outbound_leads_heat_idx on public.outbound_leads (status, next_action_at);
create index if not exists outbound_leads_last_open_idx on public.outbound_leads (last_open_at desc);

-- Every open now also stamps last_open_at, so "they are reading it right now"
-- can surface in the queue (email_opened_at keeps first-open semantics).
create or replace function public.record_outbound_email_open(oid uuid)
returns void
language sql
as $func$
  update public.outbound_leads
  set email_open_count = email_open_count + 1,
      email_opened_at = coalesce(email_opened_at, now()),
      last_open_at = now()
  where id = oid;
$func$;
