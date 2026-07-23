-- THE SIMPLE REFORGE (2026-07-22)
--
-- "Rebuild this site on the current law, same link, same photos, no API bill."
-- Distinct from the reforge-from-prompt (which is an EDIT and preserves the design)
-- and from a fresh forge (which mints a new row and therefore a new URL).
--
-- reuse_photos: the worker harvests every inlined photograph out of the row's existing
--   html into photos/ + PHOTOS.md in the build dir, and the design law then treats those
--   as the site's approved photography instead of generating new imagery. The fal wallet
--   being dry stops mattering on a rebuild, and Sarah keeps the shots she already likes.
--
-- worker_only: the GitHub-Actions failsafe rescues QUEUED rows on the metered API. That
--   is correct for a real lead standing there waiting, and wrong for a housekeeping
--   rebuild of a site that is already live and still serving. These rows wait for the
--   Max-plan worker however long that takes, and cost nothing.
alter table public.outbound_demo_sites
  add column if not exists reuse_photos boolean not null default false,
  add column if not exists worker_only boolean not null default false;

comment on column public.outbound_demo_sites.reuse_photos is
  'Rebuild reuses the photography inlined in the previous html instead of generating new imagery.';
comment on column public.outbound_demo_sites.worker_only is
  'Never rescue this job on the metered API failsafe. The Max-plan worker owns it.';
