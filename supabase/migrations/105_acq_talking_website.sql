-- ============================================================================
-- 105  THE WEBSITE EMAIL GOES IN AT THREE
-- ============================================================================
-- The drip only ever talked about the phone. Some of the people ignoring it do
-- not have a phone problem, and nothing in five emails ever told them we build
-- the website, that the same agent lives on it as a button that talks, or that
-- the whole suite is free to look at.
--
-- So a sixth email goes in at position three, where the ask has already been
-- made twice and a different door is worth opening:
--
--   3  THE WHOLE THING   he is not only a phone line. He answers the website
--                        too, and carries his own number. Button lands on
--                        /demos rather than /mustard.
--
-- New order: ask, proof, the whole thing, challenge, keep-her, breakup.
--
-- SAFE TO RENUMBER, AND THE MIGRATION PROVES IT RATHER THAN ASSUMING IT.
-- Renumbering a live sequence is only safe while nobody has received the email
-- being moved. Today the reservoir tops out at email_stage 2, so no prospect
-- has seen the old step 3 (the challenge) and nobody can receive it twice. The
-- guard below is not decoration: if this file is ever replayed against a
-- database where the drip has run further, it aborts instead of double-sending
-- to a few thousand strangers.
-- ============================================================================

begin;

do $$
declare
  furthest smallint;
begin
  select coalesce(max(email_stage), 0) into furthest from public.outbound_leads;
  if furthest > 2 then
    raise exception
      'Refusing to renumber: a prospect is at email_stage %, so moving the challenge email from 3 to 4 would send it twice. Insert the new email at the END of the sequence instead.',
      furthest;
  end if;
end $$;

-- ── renumber, high to low so two rows never collide on (campaign, step, key) ─
update public.acq_variants set step = 6 where step = 5;  -- breakup
update public.acq_variants set step = 5 where step = 4;  -- keep_her
update public.acq_variants set step = 4 where step = 3;  -- challenge

-- ── the new email ───────────────────────────────────────────────────────────
-- Single variant to start. The A/B machinery is per step, so a second arm is
-- an insert rather than a code change.
--
-- The CTA label says SUITE, not CALL, because this is the one email in the
-- sequence whose button does not open /mustard. lib/acq/campaign.ts routes
-- body_key 'talking_website' to the /demos door; the label has to match the
-- door or the click is a bait and switch.
insert into public.acq_variants (campaign_id, key, step, subject, cta_label, body_key, weight, active)
select c.id, v.key, v.step, v.subject, v.cta_label, v.body_key, 1, true
from public.acq_campaigns c
cross join (values
  ('A', 3::smallint, 'He can answer your website too', 'BUILD MY DEMO SUITE', 'talking_website')
) as v(key, step, subject, cta_label, body_key)
where c.slug = 'meet-mr-mustard'
  and not exists (
    select 1 from public.acq_variants x
     where x.campaign_id = c.id and x.step = v.step and x.key = v.key and x.body_key = v.body_key
  );

-- ── spacing ─────────────────────────────────────────────────────────────────
-- Six emails need five gaps. The new gap is inserted where the new email is,
-- carrying the same spacing as the one it displaced, so nobody's cadence
-- changes except that one more message arrives.
update public.acq_campaigns
set step_after_days = (
  step_after_days[1:2] || step_after_days[2:2] || step_after_days[3:]
)::smallint[]
where slug = 'meet-mr-mustard'
  and array_length(step_after_days, 1) = 4;

commit;
