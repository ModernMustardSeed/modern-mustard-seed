# Vapi assistants

Every voice agent on the Vapi org, as config in git. One JSON file per
assistant in `assistants/`, named by slug, with the Vapi `id` at the top.

Before this existed, eight client concierges lived only inside the Vapi
dashboard. No history, no review, no rebuild path. One bad edit or an
accidental delete and a paying client's phone agent was gone with nothing to
restore from.

## The tools

```bash
node scripts/vapi-assistants.mjs      # inventory: every agent, number, webhook
node scripts/vapi-sync.mjs --diff     # what differs, repo vs live (exit 1 on drift)
node scripts/vapi-sync.mjs --pull     # snapshot live into assistants/
node scripts/vapi-sync.mjs --push <slug>
node scripts/vapi-sync.mjs --push --all
```

All of them need the **private** `VAPI_API_KEY`. The public key
(`NEXT_PUBLIC_VAPI_PUBLIC_KEY`) only starts browser calls and returns 401 on
these endpoints. Vapi's own error message hints at the mixup.

## Changing an agent

1. Edit the JSON in `assistants/`.
2. `node scripts/vapi-sync.mjs --diff` to see exactly what will change.
3. `node scripts/vapi-sync.mjs --push <slug>`.
4. Commit. The PR now shows the change as a reviewable diff.

If someone edits an agent in the dashboard instead, `--diff` catches it, and
`--pull` brings the change into the repo so it can be reviewed and kept.

## Adding a new agent or demo

1. Create it in the Vapi dashboard, or copy an existing config and POST it.
2. `node scripts/vapi-sync.mjs --pull` to bring it into the repo.
3. Commit it in the same PR as whatever ships it.

An agent that exists on Vapi but not in `assistants/` shows up in `--diff` as
untracked and fails CI, so a new agent cannot quietly skip this step.

## Three traps, already handled

**`[SENSITIVE]` placeholders.** `vercel env pull` writes that literal string
for every variable marked Sensitive in Vercel, because those are write-only and
can never be read back. It is truthy, so it sails through `||` checks. Pushed
to an assistant as `server.secret` it breaks webhook auth and silently disables
every tool while the agent still answers the phone sounding perfect. Both
scripts hard-stop on it. Real values come from the Vapi dashboard, by hand, and
re-running `vercel env pull` will clobber them back to placeholders.

**Clearing a webhook secret by accident.** A PATCH carrying `server` without a
secret wipes any secret already set. Configs are committed to git so they never
hold secrets, which means every push would silently unauthenticate a protected
webhook. `--push` therefore drops `server` from the patch whenever the live
agent already has a secret, and says so. Set webhook secrets in the dashboard.

**Mr. Mustard is not managed here.** `setup-vapi-mustard.mjs` owns him, because
his spoken prices are derived at build time from `lib/demo-order.ts` and
`data/sidekick.ts`. Freezing those into a static snapshot would reintroduce
hand-typed pricing, the exact thing that script exists to prevent. He is
diffed here so drift stays visible, but `--push` refuses to touch him.

## What is not covered

`server.secret` values, phone number routing, and Vapi credentials live in the
dashboard. Only assistant configuration is versioned here.

## CI

`.github/workflows/vapi-drift.yml` runs `--diff` daily at 08:00 Mountain and on
any PR touching `vapi/assistants/**` or the sync tool. It also fails when any
webhook has no secret set.
