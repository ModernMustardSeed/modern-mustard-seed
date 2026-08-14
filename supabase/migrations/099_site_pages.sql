-- FIVE REAL PAGES ON A PAID SITE, NOT FIVE HASH ROUTES.
--
-- Sarah, 2026-08-14: "make all sites have 5 sep pages so it helps seo and geo."
-- The forge's room architecture already gave a site five views, but they were hash
-- routes (#/green, #/plow) inside one document. Google discards everything after the
-- '#', so all five indexed as ONE page with one title and one meta description. The
-- SEO and GEO lift she asked for was not being delivered by that shape.
--
-- Real separate pages means real separate files at real URLs. The deploy layer
-- already ships an arbitrary file list (publishSite takes {file,data}[], and it
-- already emits robots.txt, sitemap.xml, llms.txt and ai.txt beside index.html), so
-- the only thing missing was somewhere to KEEP the extra pages between the build and
-- the publish.
--
-- Scope, per her call on 2026-08-14: PAID sites only. Demos stay the one-page scroll
-- cinema, because a demo's job is to win the owner on one scroll, not to rank.
--
-- site_html stays exactly what it was, the home page, so every existing project, the
-- editor, the draft flow and the preview keep working untouched. site_pages carries
-- ONLY the additional pages, keyed by their filename.
--   { "services.html": "<!doctype html>...", "about.html": "..." }

alter table public.projects
  add column if not exists site_pages jsonb;

comment on column public.projects.site_pages is
  'Additional HTML pages for a multi-page paid site, keyed by filename (services.html, about.html, ...). The home page stays in site_html. Null or empty means a single-page site, which is still valid.';

-- The same for the draft an edit lands in, so a client edit to a multi-page site
-- does not silently collapse it back to one page on approval.
alter table public.projects
  add column if not exists site_pages_draft jsonb;

comment on column public.projects.site_pages_draft is
  'The multi-page counterpart of site_html_draft. Approving a draft promotes both.';
