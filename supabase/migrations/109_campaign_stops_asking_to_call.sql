-- ============================================================================
-- 109  THE CAMPAIGN STOPS ASKING FOR PERMISSION TO CALL
-- ============================================================================
-- Sarah, 2026-08-25, reading the sends: "people dont seem too responsive...
-- really, we should just have them call Mr. Mustard instead of asking him to
-- call them."
--
-- The old ask inverted the friction. A stranger had to hand over their phone
-- number, then wait for a robot to ring them at a moment they did not choose.
-- That is a bigger commitment than buying something, and it bought them nothing
-- until it happened.
--
-- The new ask hands them a working voice agent and a website for their own
-- business, free, with no number and no wait, and prints the ranch line at full
-- size for anyone who would rather dial it right now. The bodies, the button
-- door and the ranch-line block all move in lib/acq/campaign.ts; this moves the
-- two things that live in the database.
--
-- 1. THE BUTTON LABEL. cta_label is per variant so the Command Center owns it,
--    which means the code change alone would leave six buttons still reading
--    "YES - HAVE MR. MUSTARD CALL ME" over a link to the free build. That is
--    worse than either version on its own.
--
-- 2. THE SUBJECT LINES. Four of them ask the old question out loud. A subject
--    promising a callback over a body offering a free build is a bait and
--    switch the reader notices in the first sentence.
--
-- Only rows still carrying the old wording are touched, so a subject Sarah has
-- since rewritten by hand in the Command Center is left exactly as she wrote it.
-- ============================================================================

begin;

-- ── 1. every button points at the free build, so every button says so ───────
-- The three step-1 arms are the same body behind three subjects, and the A/B
-- test is on the subject line, so they share one label.
update acq_variants
   set cta_label = 'BUILD MY FREE VOICE AGENT'
 where active
   and cta_label ~* '(call me|have him call|mustard call)';

-- Email 3 already sent people to the free build and already had the right
-- label. Left alone on purpose: 'BUILD MY DEMO SUITE' is the same promise in
-- the words that email spent four paragraphs setting up.

-- ── 2. the two subjects that ask the old question out loud ─────────────────
-- The other five never mentioned a callback ("The call you never hear about",
-- "Want to try to stump him?", "Should I leave you alone?") and still read true
-- over the new body, so they are not touched.
update acq_variants set subject = 'Your AI receptionist, built free'
 where active and subject = 'Want my AI receptionist to call you?';

update acq_variants set subject = 'Hear Mr. Mustard answer as your business'
 where active and subject = 'Can Mr. Mustard call you?';

commit;
