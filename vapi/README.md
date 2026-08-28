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
`data/demo-agent.ts`. Freezing those into a static snapshot would reintroduce
hand-typed pricing, the exact thing that script exists to prevent. He is
diffed here so drift stays visible, but `--push` refuses to touch him.

## What is not covered

`server.secret` values, phone number routing, and Vapi credentials live in the
dashboard. Only assistant configuration is versioned here.

## CI

`.github/workflows/vapi-drift.yml` runs `--diff` daily at 08:00 Mountain and on
any PR touching `vapi/assistants/**` or the sync tool. It also fails when any
webhook has no secret set.

## The shared call-quality baseline

Prompts and tools are bespoke per client: a roofer books jobs, a med spa books
consults, a restaurant takes orders. That variation is the product. The
call-handling plumbing underneath should not vary, and all seven concierges
shipped without any of it.

`vapi/baseline.json` holds those shared settings with the reasoning stored
beside each value, in `_`-prefixed keys, so the reason travels with the number.

```bash
node scripts/vapi-baseline.mjs            # report what would change
node scripts/vapi-baseline.mjs --apply    # write it into the configs
node scripts/vapi-sync.mjs --diff         # review
node scripts/vapi-sync.mjs --push --all   # ship
```

It edits only the baseline keys and never touches a prompt or a tool, so a
client's tuned agent is not at risk. Adding a new concierge means adding its
slug to `appliesTo`.

What the first application fixed, across all seven:

| Setting | Was | Now | Why it mattered |
|---|---|---|---|
| `maxDurationSeconds` | 900 | 3600 | Callers were hung up on mid-sentence at fifteen minutes |
| `silenceTimeoutSeconds` | 20 | 60 | Twenty seconds of quiet ended calls while people looked things up |
| `startSpeakingPlan` | absent | livekit, 0.2s | Fixed silence timers instead of true end-of-turn detection |
| `stopSpeakingPlan` | absent | 2 words | A stray TV word could cut the agent off mid-sentence |
| `backgroundSpeechDenoisingPlan` | absent | Krisp + Fourier | Room noise reached the transcriber and came back garbled |
| `analysisPlan` | absent | summary | Owners got no record of what their phone did overnight |

## The fleet registry and linter

`vapi/fleet.json` declares what each agent **is**: the client, the vertical it
serves, and the structural family it belongs to. Nothing in a Vapi config says
"this is a med spa", so nothing could detect an agent cloned from the wrong
vertical. This file says it and `scripts/vapi-lint.mjs` enforces it.

```bash
node scripts/vapi-lint.mjs            # exit 1 on any error
node scripts/vapi-lint.mjs --strict   # warnings fail too
```

Needs no credentials, so it runs first in CI and fails fast.

It checks four things:

1. **Vertical matches family.** A med spa running the painting family is the
   root cause of every vocabulary problem downstream, because once the family is
   declared, its paint vocabulary reads as native.
2. **Tool set matches family.** A drifted tool set means an unrecorded
   capability, or a clone from a family the agent does not claim.
3. **No foreign vocabulary.** Each family owns its parameter names. A parameter
   from another family is the signature of an unfinished clone: descriptions get
   rewritten for the new client, field names do not.
4. **Baseline compliance**, and any concierge missing from the registry.

Issues already written up in `_knownIssues` report as known rather than failing,
so an accepted problem with a documented fix does not hold CI red forever. A
**new** mismatch is a hard error.

### Adding a concierge

1. Add it to `assistants` in `fleet.json` with its client, vertical and family.
2. Add its slug to `appliesTo` in `baseline.json`.
3. `vapi-sync.mjs --pull`, then `vapi-lint.mjs`.

Skip step 1 and the linter warns that an undeclared concierge exists. Declare
the wrong family and it errors.

### Known issue: two med spas speaking paint

Just Botox and Serabella were cloned from CertaPro, a painting contractor. The
descriptions were rewritten for aesthetics; the parameter names were not. Both
booking tools still take `colors` and `project_type`, so a botox consult sends
the client's backend a field called `colors` containing "masseter, jawline".

Calls work today and the descriptions carry the right meaning, so this is
moderate, not urgent. It is not fixed here because renaming a parameter changes
the webhook payload contract, and those handlers live in separate deployments
this repo does not contain. Renaming without shipping those first would break
live booking for two paying clients.

The fix, in order: update both webhook handlers to accept `treatment_type` and
drop `colors`, move both to the `medspa-consult` family, then `--push`. The
linter goes green on its own.
