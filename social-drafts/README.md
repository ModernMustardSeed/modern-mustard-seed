# Social Drafts

Thread and post drafts derived from playbooks and case studies. Drop these into Buffer, Hypefury, or your scheduler. Each is meant to drive traffic back to the canonical playbook on the site.

## Cadence

One thread per week on X and one carousel/post per week on LinkedIn. Same source playbook, different format. Run for 30 days, then re-cycle.

## Files

- `01-x-thread-30-day-app-build.md` — X thread teasing the 30-Day App Build Playbook
- `02-x-thread-specialty-ai-tool.md` — X thread teasing the Specialty AI Tool Playbook
- `03-x-thread-scope-ai-project.md` — X thread teasing the 90-minute scoping playbook
- `04-linkedin-byok-pricing.md` — LinkedIn post derived from the BYOK Pricing Playbook

Customize voice, swap in real screenshots, and post. The CTAs all route back to the playbook page on the site.

## Blotato Pipeline

Scheduled drops go through `blotato/`. That folder contains a self-contained 7-day campaign that posts to X, LinkedIn, Facebook, and Instagram via the Blotato API.

Workflow:

1. Connect MMS accounts in the Blotato dashboard
2. `cd blotato && bash discover-accounts.sh` to grab the account IDs
3. `cp .blotato.env.example .blotato.env` and fill in
4. `bash run.sh --dry-run` to preview, then `bash run.sh` to schedule

The first campaign (`blotato/00-PLAN.md`) runs Sat 2026-05-30 through Fri 2026-06-05.
