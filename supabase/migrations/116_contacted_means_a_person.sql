-- CONTACTED MEANS A PERSON REACHED THEM.
--
-- Six automated paths were flipping outbound_leads.status from new to
-- contacted: the campaign drip, the follow-up drip, the cadence cron, an
-- inbound reply, an inbound call to Mr. Mustard, and a self-booked demo. By
-- 2026-08-26, 958 leads read "Contacted" and Sarah had spoken to three of
-- them. The code no longer does this (same commit). This puts the 783 that
-- only ever received a drip email back to new. Leads with a logged call, an
-- AI call, or a rep note keep their status, and so do the 64 that arrived
-- from the old tracker already marked contacted, because that mark may have
-- been hers.

update public.outbound_leads l
   set status = 'new'
 where status = 'contacted'
   and (last_campaign_email_at is not null
        or exists (select 1 from public.outbound_drips d where d.lead_id = l.id))
   and coalesce(call_attempts, 0) = 0
   and last_call_at is null
   and coalesce(rep_notes, '') = ''
   and last_dm_at is null
   and not exists (select 1 from public.outbound_call_logs c where c.lead_id = l.id);
