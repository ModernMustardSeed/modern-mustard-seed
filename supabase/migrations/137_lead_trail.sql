-- 137_lead_trail.sql
-- THE LEAD TRAIL: the pages a person read on the website before they reached out.
--
-- A lead stores the visitor's address hashed one way (sha256 of the address) and a
-- page visit stores it another (sha256 of address, day and a salt, so a visitor cannot
-- be followed from one day to the next). Neither can be turned into the other, so a
-- lead now also keeps the two visit hashes that could match it: the one for the day it
-- arrived and the one for the day before, which covers a form sent just after midnight
-- UTC. Older leads have no trail and never will. That is said on screen by showing
-- nothing, not by guessing.

alter table public.client_leads
  add column if not exists visit_hashes text[];
