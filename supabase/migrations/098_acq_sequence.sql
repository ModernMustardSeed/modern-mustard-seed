-- ============================================================================
-- 098  THE FIVE EMAIL SEQUENCE
-- ============================================================================
-- The drip was three emails: the ask, the challenge, the breakup. Two go into
-- the middle of it.
--
--   2  THE PROOF     why an unanswered phone costs money, in published numbers
--                    with their citations printed underneath
--   4  KEEP HER      the objection nobody says out loud. Most owners hear "AI
--                    receptionist" as "fire the woman who runs my front desk",
--                    and stop reading. This email says the opposite: keep her,
--                    put the agent on nights, weekends and overflow only.
--
-- New order: ask, proof, challenge, keep-her, breakup.
--
-- KEEP HER SITS AT 4, NOT 2, ON PURPOSE. It is the email that rescues everyone
-- who quietly misread the offer, so it belongs immediately before we walk away,
-- as the last-chance reframe rather than a mid-drip aside.
--
-- Safe to renumber: acq_sends holds 9 rows (Sarah's own sample sends) and no
-- prospect has email_stage > 0, so nobody is mid-sequence.
-- ============================================================================

begin;

-- ── delays become an array ──────────────────────────────────────────────────
-- Two hard-coded columns cannot describe a five email sequence, and adding
-- step4_after_days / step5_after_days just moves the wall two emails further
-- out. step_after_days[n] is the business days to wait AFTER email n before
-- email n+1, so a sequence of N emails needs N-1 entries and a sixth email is
-- a data change rather than another migration.
alter table acq_campaigns
  add column if not exists step_after_days smallint[] not null default '{2,3,3,4}';

-- Carry Sarah's configured spacing forward rather than stamping the defaults
-- over it. The two new gaps take the old step-3 spacing.
update acq_campaigns
set step_after_days = array[
  coalesce(step2_after_days, 2),
  coalesce(step3_after_days, 3),
  coalesce(step3_after_days, 3),
  4
]::smallint[]
where step2_after_days is not null or step3_after_days is not null;

alter table acq_campaigns drop column if exists step2_after_days;
alter table acq_campaigns drop column if exists step3_after_days;

-- An empty array would silently stall every sequence at email 1.
alter table acq_campaigns
  add constraint acq_campaigns_step_after_days_len
  check (array_length(step_after_days, 1) between 1 and 11);

-- ── renumber, high to low so the two never collide ──────────────────────────
-- body_key stops being "default unless personalized" and becomes the actual
-- selector for which body renders, because step numbers now move when the
-- sequence is edited and a body must not move with them. The three step-1 arms
-- keep 'default' (they are the same body behind three subject lines) and every
-- other email gets a name.
update acq_variants set step = 5, body_key = 'breakup'   where step = 3;
update acq_variants set step = 3, body_key = 'challenge' where step = 2;

-- ── the two new emails ──────────────────────────────────────────────────────
-- Both are single-variant to start. The A/B weight machinery is per step, so a
-- second arm for either is an insert, not a code change.
insert into acq_variants (campaign_id, key, step, subject, cta_label, body_key, weight, active)
select c.id, v.key, v.step, v.subject, v.cta_label, v.body_key, 1, true
from acq_campaigns c
cross join (values
  ('A', 2::smallint, 'The call you never hear about',        'YES — HAVE MR. MUSTARD CALL ME', 'proof'),
  ('A', 4::smallint, 'You do not have to replace anybody',   'YES — HAVE MR. MUSTARD CALL ME', 'keep_her')
) as v(key, step, subject, cta_label, body_key)
where not exists (
  select 1 from acq_variants x where x.campaign_id = c.id and x.step = v.step and x.key = v.key
);

commit;
