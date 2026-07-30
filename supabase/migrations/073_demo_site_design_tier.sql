-- DESIGN TIERS ON THE FORGE (2026-07-30, Sarah's tier picker)
--
-- 1 = the codex/award style. 2 = the Wildmere AWARD SITE style. NULL = the
-- worker rolls roulette per build so unattended demos come out varied.
--
-- NOTE: until this migration is applied, the cockpit transports the choice as a
-- "DESIGN TIER: n" first line in the brief and the worker parses it (see
-- app/api/admin/outbound/leads/[id]/forge-site/route.ts and
-- scripts/demo-site-worker.mjs tierOf). The worker prefers this column whenever
-- it exists, so applying this later changes nothing in behavior, only hygiene.
alter table public.outbound_demo_sites
  add column if not exists design_tier smallint
  check (design_tier in (1, 2));

comment on column public.outbound_demo_sites.design_tier is
  'Which design tier built this demo: 1 codex/award, 2 Wildmere award-site, null roulette per build.';
