-- THE LEAD LEARNS WHERE ITS FACEBOOK PAGE IS.
--
-- A business with no website and no email cannot be mailed and has nothing to
-- audit, but it can be messaged: its Facebook page is its front door, and the
-- DM is the whole outreach. Until now that page lived nowhere. 73 leads carried
-- one in `website` (a Facebook page used AS the website, which the sourcers
-- flag as "no real site"), and every other lead had to be looked up by hand.
--
-- `facebook_url` is the page. `facebook_source` says how it got there so a hand
-- paste is never overwritten by a search guess:
--   website   copied from a facebook.com value in `website`
--   search    found by scripts/acq-find-facebook.mjs, strict name match only
--   hand      pasted into the prospect page
--   none      searched by the script, nothing certain; the button falls back to search

alter table public.outbound_leads
  add column if not exists facebook_url text,
  add column if not exists facebook_source text;

comment on column public.outbound_leads.facebook_url is
  'The business Facebook page, canonical https://www.facebook.com/<page>. Null means unknown, not absent.';
comment on column public.outbound_leads.facebook_source is
  'website | search | hand | none. Hand always wins; search never overwrites hand or website; none means searched and nothing certain.';

update public.outbound_leads
   set facebook_url = regexp_replace(website, '^https?://(m\.|www\.)?facebook\.com/', 'https://www.facebook.com/'),
       facebook_source = 'website'
 where facebook_url is null
   and website ~* '^https?://(m\.|www\.)?facebook\.com/';

create index if not exists outbound_leads_facebook_url_idx
  on public.outbound_leads (facebook_url) where facebook_url is not null;

-- The DM list itself: no email, or no real website. Partial so it stays small.
create index if not exists outbound_leads_dm_reach_idx
  on public.outbound_leads (lead_score desc nulls last)
  where email is null or website is null or website ~* 'facebook\.com';
