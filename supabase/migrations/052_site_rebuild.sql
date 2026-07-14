-- 052_site_rebuild.sql
--
-- AUTO-REBUILD FROM THE INTAKE, AND A SCHEDULED REVEAL.
--
-- Two things.
--
-- 1. THE REBUILD. The demo was forged from a lead's scraped facts and whatever the
--    forge could guess. Then they bought, and told us the truth: their real logo, real
--    photos, real menu, real hours, real services. Nothing consumed any of that. Sarah
--    was expected to hand-edit an 900KB HTML file into their brand. So the same forge
--    that made the demo now re-runs against the real material, and the result becomes
--    projects.site_html (the real site, migration 050), not a new demo.
--
--    It reuses outbound_demo_sites as the job queue on purpose: the worker (flat Max
--    plan) and the API failsafe already drain that queue, already handle claiming,
--    staleness, and failure. A second queue would be a second thing to keep alive at
--    2am. The row just needs to say which project it belongs to and that it is not a
--    demo.
--
-- 2. THE REVEAL. A site that appears the instant the money clears reads as a machine.
--    The same site, reviewed by a human and delivered with a note, reads as a studio.
--    The difference is not the work; it is whether anyone looked. So the build happens
--    NOW (Sarah gets it in minutes and can polish it), and the CLIENT-FACING reveal is
--    scheduled. Nothing is published to a client until a human approves it, and it goes
--    out on a date we choose.
--
--    This is a knob, not a doctrine: reveal_at is a timestamp, and it can be now.

-- 1. The queue learns what a rebuild is.
alter table outbound_demo_sites add column if not exists project_id uuid references projects(id) on delete set null;
alter table outbound_demo_sites add column if not exists kind text not null default 'demo'
  check (kind in ('demo', 'rebuild'));
create index if not exists outbound_demo_sites_project_idx on outbound_demo_sites (project_id);

-- 2. The project tracks its own rebuild.
alter table projects add column if not exists site_build_status text
  check (site_build_status in ('queued', 'building', 'ready', 'failed') or site_build_status is null);
alter table projects add column if not exists site_build_id uuid;
alter table projects add column if not exists site_build_error text;

-- 3. The reveal. approved_at is a HUMAN saying "this is good enough to send".
--    Nothing auto-publishes to a client without it, no matter what reveal_at says:
--    the cron requires BOTH, so a scheduling mistake can never ship an unreviewed site.
alter table projects add column if not exists approved_at timestamptz;
alter table projects add column if not exists approved_by text;
alter table projects add column if not exists reveal_at timestamptz;
create index if not exists projects_reveal_idx on projects (reveal_at) where reveal_at is not null;
