---
name: workspace-doctor
description: A health check for the whole setup. Confirms the rules file, memory, skills and hooks are present and consistent, that every file a skill points to exists, that the guards pass their tests, and that nothing contradicts anything else. Use for "check the workspace", "health check", "is everything wired", "why is a skill broken", or once a week.
---

# Workspace Doctor

A crew drifts. A skill points at a file that moved, two rules disagree, a guard
was switched off during a busy week. The doctor finds the rot before it bites.

## The checks

1. **Rules file.** `~/.claude/CLAUDE.md` exists, has no FILL IN left, and its
   banned phrases match `studio-kit.json`.
2. **Hooks.** Run `node ~/.claude/studio-kit/test.mjs`. Every line passes.
   Then confirm all ten appear in `~/.claude/settings.json`.
3. **Skills.** Every skill folder has a SKILL.md with a name and a description.
   Every file path a skill mentions exists.
4. **Memory.** Every memory note is one fact, has a date, and points at
   something that still exists. Notes that turned out wrong are deleted, not
   left with a correction underneath.
5. **Contradictions.** Two skills or two rules that say different things about
   the same subject (a price, a date, a process). List each pair.
6. **Audit trail.** `~/.claude/audit/` has entries from the last day. A silent
   trail means the hook stopped running.
7. **Scheduled jobs.** No two share a minute, and every one has run on time in
   the last week.

## The report

Each check, pass or fail, with the evidence. For each failure: what is wrong,
what fixed it (if it was safe to fix), or what the owner needs to decide.

## What it fixes on its own

Only what cannot change behavior: a moved path updated, a missing description
added, a stale note deleted. Anything that changes what the crew does is
reported for the owner to decide.
