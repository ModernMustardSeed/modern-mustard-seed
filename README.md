# Modern Mustard Seed

The production codebase behind [modernmustardseed.com](https://modernmustardseed.com): an AI product studio that ships voice agents, agentic systems, custom software and websites for operators, at set package prices. Built and run by [Sarah Scarano](https://modernmustardseed.com/sarahscarano).

This is not a demo repo. It is the live site, the admin (the Command Center), the outbound acquisition engine, the demo-site build pipeline, the audit engine, and the voice agent plumbing, in one Next.js 16 application on Supabase and Vercel.

## What is in here

| Area | Where | What it does |
| --- | --- | --- |
| Marketing site | `app/` | The public site, blog, work, playbooks, the AI audit at `/audit`, the ecosystem loop at `/the-system` |
| Command Center | `app/admin/`, `app/api/admin/` | Pipeline, outbound cockpit, acquisition machine, client book, delivery board, proposals, two-way SMS, email threads, the Opps Desk |
| Acquisition engine | `lib/acq/`, `app/api/acq/`, `scripts/` | Lead finder, five-email drip, voice follow-up, a governor gate every send passes, a bounce brake, delivery telemetry reconciled against the provider |
| The Build | `scripts/demo-site-worker.mjs`, `scripts/build-worker.mjs` | A lead goes in, a finished multi-page demo website comes out. Twelve templates, two builds at a time, a watchdog and heartbeats |
| Voice | `app/api/voice/`, `vapi/` | Vapi and ElevenLabs agents that book, quote, warm-transfer, take orders, send decks and start builds. Assistant config as code, with a sync tool |
| Email | `lib/email.ts`, `lib/send-email.ts`, `lib/email-log.ts` | Templates, a tracked Resend client, suppression that fails closed, the sent log |
| Data | `supabase/migrations/` | 114 migrations. Text statuses with CHECK constraints, `updated_at` triggers, service-role only |

## Stack

Next.js 16 App Router, React 19, TypeScript strict, Tailwind 3, Supabase (Postgres, auth, storage), Vercel, Stripe, Resend, Twilio, Vapi, ElevenLabs, Anthropic Claude API, Playwright. One lockfile, pnpm everywhere.

## Run it

```bash
pnpm install --frozen-lockfile
pnpm dev        # port 3001
pnpm build
pnpm lint
pnpm exec tsc --noEmit
```

Secrets live in `.env.local` (gitignored). Production ships by merge to `master`; the Vercel git integration builds it. Never deploy from a laptop.

## Things this repo learned the hard way

- A green light is not proof. An unregistered webhook hid a 5.2% bounce rate for weeks; the reconciler and the bounce brake are the fix, and the rule.
- One enum inside an array schema emptied every voice tool payload for eleven days while the heartbeat read healthy. Validate the schema the model sees.
- Vercel matches middleware matchers case-insensitively and `next start` does not. A public page ended up behind the admin login.
- `overflow-x: hidden` on the body kills `position: sticky`. Use `overflow-x: clip`.
- Never trace `public/` into a serverless function. Twenty marketing videos once got packed into a lambda whose job was to return JSON.

## Author

Sarah Scarano, Bigfork, Montana. [sarah@modernmustardseed.com](mailto:sarah@modernmustardseed.com). The resume is a magazine: [modernmustardseed.com/sarahscarano](https://modernmustardseed.com/sarahscarano).
