-- THE WORD "SIDEKICK" LEAVES THE DATABASE.
--
-- Sarah, 2026-08-25: "take sidekick away everywhere."
--
-- The product was renamed to the Voice Agent Forge on 2026-07-28 and the public
-- site has been clean since. What survived was internal: file names, identifiers,
-- and these stored values. The code side moved to `demo-agent` in the same
-- change; this moves the data underneath it.
--
-- ── WHY THE KEYS CAN MOVE SAFELY ─────────────────────────────────────────────
-- `app_state` keys of the form `sidekick:run:<uuid>` ARE the forged demos. Every
-- demo link ever emailed, texted, put on a hub or embedded in a walkthrough film
-- resolves through one, and those links live forever in other people's inboxes.
-- So this is not a cosmetic rename, it is a live key migration, and it is only
-- safe because `getRun` in lib/demo-run-store.ts reads the new prefix FIRST and
-- falls back to the old one. Deploy that fallback before running this, and leave
-- it in place afterwards: it costs one extra query on a miss and it is the only
-- thing standing between a rename and a dead link somebody paid to send.
--
-- ── THE LEAD SOURCE MATTERS MORE THAN IT LOOKS ───────────────────────────────
-- lib/demo-agent-drip.ts selects `.eq('source', 'demo-agent-forge')`. Renaming the
-- writer without moving these rows would drop eight real leads out of the drip
-- silently, which is exactly how demo-station leads fell out of the funnel on
-- 2026-08-13. Moved here, in the same transaction as the code that renamed it.

begin;

-- 277 runs, 8 email claims, 6 day counters at the time of writing.
update app_state set key = 'demo:run:'   || substring(key from 14) where key like 'sidekick:run:%';
update app_state set key = 'demo:email:' || substring(key from 16) where key like 'sidekick:email:%';
update app_state set key = 'demo:phone:' || substring(key from 16) where key like 'sidekick:phone:%';
update app_state set key = 'demo:day:'   || substring(key from 14) where key like 'sidekick:day:%';
update app_state set key = 'demo:ring:'  || substring(key from 15) where key like 'sidekick:ring:%';

-- The eight leads the forge wrote, so the drip keeps reaching them.
update leads set source = 'demo-agent-forge' where source = 'sidekick-forge';
update leads set source = 'demo-agent-buyer' where source = 'sidekick-buyer';
update leads set notes = replace(notes, '[sidekick]', '[demo agent]') where notes like '%[sidekick]%';

/*
 * ── AND THE TABLE THAT NEARLY BROKE THE DEMO BOOKING WORK ───────────────────
 *
 * `sidekick_runs` was created by migration 036 and NEVER used. Its own header
 * called it "the OPTIONAL future upgrade to a real table"; the live store has
 * always been app_state. So it sat there: present, empty, and named exactly
 * like the thing a reasonable person would join to.
 *
 * On 2026-08-25 that cost real time. `demo_appointments.run_id` was written as
 * `references sidekick_runs(id)`. The schema applied cleanly, every test passed,
 * and every booking would have failed at runtime with a constraint error that a
 * caller experiences as "the owner will confirm" - the exact bug that work was
 * fixing. It was caught only because a double-booking test against real data
 * found zero rows in a table that should have had 277.
 *
 * An empty table with an inviting name is a trap that costs somebody a day every
 * time they find it. Dropping it is the fix, and it is free: nothing reads it,
 * nothing writes it, and it has never held a row.
 */
drop table if exists sidekick_runs;

commit;
