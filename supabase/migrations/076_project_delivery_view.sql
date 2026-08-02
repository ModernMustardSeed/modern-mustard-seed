-- 076: a cheap presence view for the universal delivery board. The board needs
-- "does this project have a site / a draft" for EVERY project; selecting the
-- raw site_html blobs for 200 rows to compute two booleans would be absurd.

create or replace view public.project_delivery_flags as
select
  id,
  (site_html is not null and length(site_html) > 0) as has_site,
  (site_html_draft is not null and length(site_html_draft) > 0) as has_draft
from public.projects;
