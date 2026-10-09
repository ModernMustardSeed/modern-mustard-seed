---
name: shipping-discipline
description: The engineering bar for anything that leaves this machine. Load before writing code, before any commit, before any deploy, and before reporting that something shipped. Use for ship, deploy, push, merge, go live, release, is it live, did it deploy, it broke, roll it back, or when starting work in a repository where other sessions may be working. Governs lanes so parallel sessions stop overwriting each other, the preflight that stops half-broken deploys, and the live check that decides whether "shipped" is true.
---

# Shipping Discipline

Three failures cost the most time in a business run by a crew: sessions
overwriting each other, deploys that report success and are not live, and work
reported as shipped that nobody checked. Everything below kills one of those.

## Rule zero: shipped means seen on the live address

A deployment ID is not a ship. A green build is not a ship. Shipped means you
fetched the production URL and found a phrase that exists only in the new
version. If you did not fetch it, the honest word is "merged", not "live".

```
curl -s https://<your-domain>/<path> | grep -c "<a phrase unique to this change>"
```

If the phrase is absent, the ship failed. Check that the deployed commit matches
yours before blaming a cache.

## Lanes

Several sessions may be working at once, each in its own worktree. Assume every
branch you did not create belongs to a session that is still running.

Before touching a repository:

```
git worktree list
git fetch --all --prune
git status --short
```

- **One branch, one worktree.** Never check the same branch out twice.
- **Rebase before push.** `git pull --rebase`, then run the preflight again. A
  push that needs a merge commit means someone moved under you.
- **Never settle a conflict by taking your own side wholesale.** The other side
  is a live session's work. Read both and keep both.
- **Never discard someone else's uncommitted work.** Hard resets and cleans ask
  first because of this.
- **Finish the lane.** A worktree left dirty overnight is a trap for the next
  session. Commit it, or remove it.

## One way to production

Production ships by merging to the main branch, and the host builds it. A
deploy typed from a laptop uploads whatever is on that laptop and overwrites
what another session just shipped. The deploy guard asks before any of those.

## The preflight

In order. Stop at the first failure, fix the cause, and start again from that
step. Never switch a rule off to get past it.

1. Fetch and rebase. A stale base makes the rest prove nothing.
2. Type check.
3. Lint.
4. Build. A local build that passes is the only real predictor of the host's
   build passing.
5. Secret check: `git status --short` lists no `.env` files.
6. Commit with a message that says what changed and why.
7. Push, open the pull request, merge when the checks are green.
8. Fetch the live page. Rule zero.

## Before handing anything back

- Reproduce the original problem, then confirm it is gone. A fix you never
  reproduced is a guess.
- Exercise the change on the live address, not only locally.
- Check the paths next to what you touched. A layout or config edit reaches
  further than its file.
- Read the logs after the deploy. A working homepage says nothing about the
  forms and the scheduled jobs.
- Say plainly what you did not check. An unchecked claim stops the owner from
  checking it themselves.

## Rollback

Faster than debugging in production. Promote the last good deployment from the
host's dashboard, then revert the bad commit on main so the next build does
not put it straight back.
