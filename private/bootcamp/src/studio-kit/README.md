# The Studio Kit

The operating layer that runs Modern Mustard Seed, licensed for your business.
Three parts, each installable in an afternoon:

1. **The rules file** (`CLAUDE.template.md`). Who you are, what you sell, how
   you write, and twenty laws, each one already paid for by a real mistake.
   Every agent reads it at the start of every session.
2. **The skill library** (`skills/`). Twelve playbooks for the jobs a small
   business repeats, written so every agent does each job the same way every
   time.
3. **Ten safety hooks** (`hooks/`). Small programs Claude Code runs before and
   after every action. They make the dangerous things impossible instead of
   discouraged.

Start with `INSTALL.md`.

## The ten hooks

| # | Hook | What it does |
| --- | --- | --- |
| 1 | words-guard | Blocks the phrases your business never writes |
| 2 | secrets-guard | Blocks live keys written into files |
| 3 | cron-guard | Blocks two scheduled jobs on the same minute |
| 4 | git-guard | Blocks force pushes, protected branch deletes and skipped checks; asks before hard resets |
| 5 | delete-guard | Blocks recursive deletes outside your workspace |
| 6 | send-guard | Asks before anything is emailed, texted or posted |
| 7 | money-guard | Asks before charges, refunds, payouts and price changes |
| 8 | deploy-guard | Blocks hand-pointed domains; asks before production deploys |
| 9 | sql-guard | Asks before drops, truncates and deletes or updates with no WHERE |
| 10 | audit-log | Writes every action to a monthly audit trail; never blocks |

"Blocks" means the action does not happen and Claude is told why. "Asks" means
Claude Code stops and shows you the action; nothing happens until you approve.

## The twelve skills

| Skill | The job |
| --- | --- |
| excellence-bar | The quality bar and the attack pass for every deliverable |
| shipping-discipline | Lanes, the preflight and "shipped means seen live" |
| brand-voice | One voice across every channel (fill in three blocks) |
| design-loop | Shoot, read, grade, fix, shoot again |
| proposal-writer | Notes to a designed proposal PDF at a set package price |
| outreach-one-to-one | Research first, one observation, one ask |
| client-onboarding | From yes to kickoff in one packet |
| monthly-client-review | The monthly sweep, held for the owner's review |
| morning-briefing | The fifteen-minute daily briefing |
| presence-agent | Day 3 agent one: the weekly presence score and fixes |
| front-desk | Day 3 agent two: answer, qualify, book, hand off |
| workspace-doctor | The weekly health check for all of the above |

## License

Single-business license. See `LICENSE.md`.
