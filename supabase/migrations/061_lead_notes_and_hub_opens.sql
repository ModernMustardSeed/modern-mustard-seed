-- 061: per-lead manual notes + a demo-hub open counter for the cockpit.
--
-- Two cockpit asks:
--  1. rep_notes: a freeform place for Sarah to jot what she learned about a lead.
--     SEPARATE from `notes`, which is auto-populated with mining ammo (REVIEWS:/
--     WEBSITE: prefixes the call script parses) and must not be clobbered.
--  2. hub_view_count: how many times this lead opened their Demo Suite hub. We already
--     record a throttled 'hub_viewed' event per open (demo_events); this surfaces it as
--     a fast counter on the lead, mirroring email_open_count, so the list query stays a
--     single select with no join.

alter table outbound_leads add column if not exists rep_notes text;
alter table outbound_leads add column if not exists hub_view_count integer not null default 0;

-- Seed the counter from the telemetry we already have, so historical opens show today.
update outbound_leads l
   set hub_view_count = coalesce((
     select count(*) from demo_events e
      where e.lead_id = l.id and e.event = 'hub_viewed'
   ), 0)
 where exists (select 1 from demo_events e where e.lead_id = l.id and e.event = 'hub_viewed');

-- Atomic increment for the public hub page (fire-and-forget, already throttled to one
-- per 60s by the presence stamp, so a reload loop cannot inflate it).
create or replace function bump_hub_view(p_lead_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update outbound_leads set hub_view_count = hub_view_count + 1 where id = p_lead_id;
$$;
