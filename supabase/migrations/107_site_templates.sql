-- SITE TEMPLATES ON THE FORGE (2026-08-24, Sarah's template picker)
--
-- Every visual system the Forge can build is registered in lib/site-templates.mjs.
-- The picker on the cockpit and the Forge board chooses one (or Random, resolved at
-- queue time), and the choice is written here so the admin, the worker and the
-- serverless failsafe all agree on it before the build starts. Until now the style
-- a site wore existed only in RESULT.json on the worker's disk.
--
-- Also relaxes design_tier: migration 073 allowed (1, 2) while tier 3 has been live
-- since 2026-08-07, which is why the tier still rides the brief as a first line.

alter table public.outbound_demo_sites
  add column if not exists site_template text;
comment on column public.outbound_demo_sites.site_template is
  'lib/site-templates.mjs key this build wears (steel-and-ember, lakehouse-editorial, ...). Null on rows queued before the picker.';

alter table public.outbound_leads
  add column if not exists site_template text;
comment on column public.outbound_leads.site_template is
  'The template the lead''s current demo site wears. Random excludes it on the next forge.';

alter table public.projects
  add column if not exists site_template text;
comment on column public.projects.site_template is
  'The template the client''s site wears, carried over from the demo they bought.';

alter table public.outbound_demo_sites drop constraint if exists outbound_demo_sites_design_tier_check;
alter table public.outbound_demo_sites
  add constraint outbound_demo_sites_design_tier_check check (design_tier in (1, 2, 3));

create index if not exists outbound_leads_site_template_idx
  on public.outbound_leads (site_template) where site_template is not null;
