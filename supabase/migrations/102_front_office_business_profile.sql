-- ============================================================================
-- 102  THE OFFICE KNOWS THE BUSINESS IT ANSWERS FOR
-- ============================================================================
-- We source a prospect with their address, website, rating, review count and
-- posted hours, spend a call learning more, take their money, and then hand
-- their receptionist a business name and nothing else.
--
-- That shows up in two places a customer notices immediately:
--
--   ON THE PHONE. A caller asks "where are you based" or "what's your website"
--   and the agent has to say it does not know, about the business it claims to
--   work for. That is the moment a good demo becomes an obvious robot.
--
--   IN THE PORTAL. A profile page that knows nothing about them reads like a
--   product that has not been set up, on day one, right after they paid.
--
-- Everything here is already in outbound_leads at the moment of sale. It was
-- simply never carried across.
-- ============================================================================

begin;

alter table fo_offices
  add column if not exists website text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  -- Public reputation as we found it. Not for display to callers: it is what
  -- lets the portal show the owner we actually looked at their business, and
  -- it is the same figure the sales email did its arithmetic on.
  add column if not exists rating numeric(2,1),
  add column if not exists review_count integer,
  add column if not exists emergency_service boolean,
  add column if not exists contact_name text,
  add column if not exists contact_title text,
  -- The trade, promoted out of settings jsonb into a real column, because the
  -- agent compiler and the portal both read it and neither should be digging
  -- through a settings blob for something this load-bearing.
  add column if not exists trade text;

-- Backfill from the lead each office came from, for anything already created.
update fo_offices o
set website = coalesce(o.website, l.website),
    address = coalesce(o.address, l.address),
    city = coalesce(o.city, l.city),
    state = coalesce(o.state, l.state),
    rating = coalesce(o.rating, l.rating),
    review_count = coalesce(o.review_count, l.review_count),
    emergency_service = coalesce(o.emergency_service, l.emergency_service),
    contact_name = coalesce(o.contact_name, l.contact_name),
    contact_title = coalesce(o.contact_title, l.contact_title),
    trade = coalesce(o.trade, l.trade),
    service_area = coalesce(o.service_area, l.service_area),
    hours = case when o.hours = '{}'::jsonb then coalesce(l.hours, '{}'::jsonb) else o.hours end
from outbound_leads l
where o.outbound_lead_id = l.id;

commit;
