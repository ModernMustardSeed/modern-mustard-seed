# The One-Person Company Bootcamp: build contract

Shared by every session building the bootcamp on branch `feat/bootcamp-20261008`.
Source of truth for copy, prices and dates: `data/bootcamp.ts`. Tables: `supabase/migrations/157_bootcamp.sql`. Signed keys: `lib/bootcamp/key.ts`.

## House rules that apply to every file

- No em dashes anywhere: not in copy, comments, emails, JSON, commit messages.
- No hourly or time-and-materials language. Prices are set packages and come from `data/bootcamp.ts` only.
- Never mention the Command Center. The office is SeedSide.
- "Build" is the verb. The word "forge" never appears.
- Sites and emails speak as the studio: we, us, our, or Sarah in first person.
- Every public route ships with its footer link (`components/Footer.tsx`), sitemap entry (`app/sitemap.ts`) and an `public/llms.txt` line in the same commit.
- Never claim Anthropic endorses or partners with the studio.
- Next.js 16: `params` and `searchParams` are Promises in pages and route handlers. `cookies()` and `headers()` are async.
- Supabase through `getSupabase()` from `@/lib/supabase` (service role, may return null: handle it).
- Admin auth in API routes: `const user = await getAdminUser(); if (!user) return 401` from `@/lib/admin-auth`.
- Email goes out only through `sendViaResend` from `@/lib/send-email` (returns `{ ok, id }` or `{ ok:false, error }`). Templates wrap in `clientEmail({ preheader, eyebrow, greeting, body, cta, secondary, signature })` from `@/lib/email`, with `p()` and `callout()` for body blocks.
  - Transactional, one-to-one mail (masterclass confirmation, ticket welcome, operator welcome, host received, host approved, owner notifications): from `'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>'`, replyTo `sarah@modernmustardseed.com`, NO `unsubscribeUrl` (the root domain refuses any send that carries one: `bulkOnRootRefusal` in lib/send-email.ts).
  - Drip and sequence mail (every reminder, replay, offer and invite the cron sends): from `OUTREACH_FROM` with `replyTo: OUTREACH_REPLY_TO` (both in `@/lib/outreach-domain`), html ends with the bootcamp unsubscribe footer, and `unsubscribeUrl` = `unsubscribeLink(SITE.url, registration.id)` from `lib/bootcamp/key.ts`. Follow `lib/celebrate-drip.ts` exactly for the send call. The bootcamp unsubscribe only sets `bootcamp_registrations.unsubscribed_at`; it never writes the global suppression tables (a person who mutes reminders must still get their receipt).
  - Outreach to hosts (the influencer engine): one-to-one, text only, from the root address exactly like `app/api/admin/partner-desk/[id]/send/route.ts`: `sendViaResend({ from, to, replyTo, subject, text })`, no html, no unsubscribe header. Twelve a day is the ceiling. The desk's "Send now" and the cron share one function.
- Register every inline price in `inlinePriceChecks()` in `lib/checkout-health.ts` (`{ funnel: 'bootcamp', amounts: [97, 297, 497, 4997] }`).
- Stripe through `getStripe()` from `@/lib/stripe`. Checkout uses inline `price_data` (the `app/api/ads/checkout/route.ts` shape) so the page and the charge cannot diverge. `metadata.kind` is `'bootcamp'` for tickets (metadata.slug = ga|vip|platinum) and `'operator'` for the program.
- Crons check `Authorization: Bearer ${CRON_SECRET}` and fail closed. `?dry=1` reports without sending.

## Routes

Public:
- `/bootcamp` the offer page (tiers, days, rooms, proof, hosts strip, FAQ, three doors, guarantee).
- `/bootcamp/masterclass` free registration for January 26. Form POSTs `/api/bootcamp/register`.
- `/bootcamp/operator` The Operator Program, $4,997, checkout button POSTs `/api/bootcamp/checkout { tier: 'operator' }`.
- `/bootcamp/host` Host a Room: terms and application form, POSTs `/api/bootcamp/host`.
- `/bootcamp/host/[slug]?k=` the host dashboard (signed with `hostKeyValid`). Reads `/api/bootcamp/host/[slug]?k=`.
- `/bootcamp/welcome?session_id=` after Stripe. Reads `/api/bootcamp/session?session_id=` to show the tier and dates. Also `/bootcamp/welcome?masterclass=1` after a free registration.
- `/bootcamp/r/[code]` sets cookie `mms_bc_ref=<code>` (180 days, path /, SameSite Lax), increments `bootcamp_hosts.clicks`, redirects to `/bootcamp?via=<code>`.

API (public):
- `POST /api/bootcamp/checkout` body `{ tier: 'ga'|'vip'|'platinum'|'operator', email?: string }`. Reads `mms_bc_ref` cookie, puts `host` in metadata, `success_url=/bootcamp/welcome?session_id={CHECKOUT_SESSION_ID}`, `cancel_url=/bootcamp#tiers` (operator: `/bootcamp/operator`). `mode: 'payment'`, `allow_promotion_codes: true`, custom field `business` (optional). Returns `{ url }`.
- `POST /api/bootcamp/register` body `{ email, name, business?, website?, trade?, why?, via? }`. Upserts `bootcamp_registrations` (launch, email) at tier `masterclass` if no row; never lowers a tier. Sends the masterclass confirmation with the .ics. Returns `{ ok: true }`.
- `POST /api/bootcamp/host` body `{ name, brand?, email, website?, platforms?, audience?, vertical?, room? }`. Inserts `bootcamp_hosts` as `applied` with slug from `bootcampSlug(brand || name)` (suffix -2, -3 on collision). Emails Sarah (OWNER_NOTIFY_TO) and the applicant a "received" note. Returns `{ ok: true, slug }`.
- `GET /api/bootcamp/host/[slug]?k=` returns `{ host, stats: { clicks, masterclass, tickets, ticketRevenueCents, operatorSeats, earningsCents }, recent: [...] }`.
- `GET /api/bootcamp/session?session_id=` returns `{ tier, name, email, amountCents }` from Stripe (no secrets).
- `GET /api/bootcamp/unsubscribe?id=&k=` sets `unsubscribed_at`, renders a plain confirmation page.
- `GET /api/bootcamp/invite.ics?which=masterclass|day1|day2|day3|kickoff` returns the calendar file (`buildIcsInvite` from `@/lib/ics`).

Webhook: `app/api/store/webhook/route.ts` gains two branches next to `kind === 'program'`: `kind === 'bootcamp'` and `kind === 'operator'`, both calling `fulfillBootcampCheckout(session)` from `lib/bootcamp/fulfill.ts`.

Crons (vercel.json, minutes are unique across the file):
- `/api/cron/bootcamp-drip` schedule `33 * * * *` (hourly). Runs `runBootcampDrip(sb, { dryRun })` from `lib/bootcamp/drip.ts`.
- `/api/cron/bootcamp-outreach` schedule `38 15 * * 1-5` (weekday mornings Mountain). Runs `runBootcampOutreach(sb, { dryRun })` from `lib/bootcamp/outreach.ts`.

Admin:
- `/admin/bootcamp` desk, tab `bootcamp` in `components/admin/AdminHeader.tsx` under the Marketing dropdown.
- `app/api/admin/bootcamp/*` routes (see admin section).

## Library modules

- `lib/bootcamp/key.ts` (done): `bootcampSlug`, `hostKey`, `hostKeyValid`, `regKey`, `regKeyValid`, `hostLinks(base, slug)`, `unsubscribeLink(base, id)`.
- `lib/bootcamp/store.ts`: `upsertRegistration`, `climbTier`, `getRegistrationByEmail`, `recordEvent(kind, {...})`, `bumpHostClicks`, `getHostBySlug`, `listHosts`, `hostStats(slug)`.
- `lib/bootcamp/emails.ts`: every template as a function returning `{ subject, html, text }`: `masterclassConfirm`, `masterclassReminder24h`, `masterclassReminder1h`, `masterclassReplay`, `ticketWelcome(tier)`, `kickoffTomorrow`, `dayReminder(n)`, `dayReplay(n)`, `operatorInvite(step 1|2|3)`, `operatorWelcome`, `hostReceived`, `hostApproved(links)`, `hostWeekly(stats)`.
- `lib/bootcamp/drip.ts`: `runBootcampDrip(sb, { dryRun, now })`. Steps keyed by name in `sent_steps`; each step has a window (send when `now` is past `at` and before `at + 6h`), skips unsubscribed, logs `bootcamp_events` kind `drip:<step>`. Steps: masterclass confirm is sent by the register route; the drip sends `mc-24h`, `mc-1h`, `mc-replay` (masterclass + 4h, offers the ticket), `mc-offer-2` (+2d), `mc-offer-3` (+5d, closes Feb 2), ticket holders get `kickoff-24h`, `day1-24h`, `day1-1h`, `day2-24h`, `day2-1h`, `day3-24h`, `day3-1h`, `day3-replay` (+4h, three doors, operator invite 1), `op-2` (+2d), `op-3` (+5d, cohort starts Feb 16). Operator seats get `op-welcome` from fulfill and `op-start-24h` from the drip.
- `lib/bootcamp/fulfill.ts`: `fulfillBootcampCheckout(session)`: resolve tier from metadata, upsert registration (climb), record `orders` row (item_type `bootcamp`), credit host (`bootcamp_events` kind `host-sale` with cents owed), send the welcome email, notify Sarah with `leadNotification`.
- `lib/bootcamp/outreach.ts`: `runBootcampOutreach(sb, { dryRun, now })` reads `app_state` key `bootcamp:outreach` `{ armed: boolean, dailyCap: number, startedAt }`. When not armed, returns `{ armed: false }` and sends nothing. When armed: picks up to `dailyCap` rows with `contact_type = 'email'`, `status in ('queued','sent')`, `next_at <= now` ordered by fit desc, tier, created_at; skips any email with an inbound row in `emails` (direction `inbound`, `from_addr` matches) and marks it `replied`; skips suppressed addresses (`activeSuppressions` from `@/lib/email-log`); sends the step template (`outreachEmail(step, target)` in `lib/bootcamp/outreach-copy.ts`), bumps `step`, sets `next_at` (+4 days after step 1, +9 days after step 2, `done` after step 3), writes `bootcamp_events` kind `outreach:<step>`. Rows with `contact_type != 'email'` are set to `hand` on first pass so the desk shows them with the message to paste. Three steps max. One email per target per run.
- `scripts/bootcamp-seed-outreach.mjs`: reads `data/bootcamp-outreach.json` and upserts into `bootcamp_outreach` on lower(email) (or name+brand when no email). Idempotent. Run from the checkout with `.env.local`.

## data/bootcamp-marketing.ts shape

```ts
export type Copy = { id: string; title: string; channel: 'meta'|'linkedin'|'instagram'|'email'|'x'|'host'|'press'|'script'; body: string; note?: string };
export const META_PRIMARY: Copy[];      // 6 primary texts
export const META_HEADLINES: string[];  // 8
export const LINKEDIN_POSTS: Copy[];    // 3, Sarah's voice, first person
export const TRADE_SECRETS_POSTS: Copy[]; // 12 short posts for @sarahscaranobuilds, one a week to Jan 26
export const HOST_SWIPE: Copy[];        // host email, host social post, host DM, host story text
export const MASTERCLASS_SCRIPT: { minute: number; beat: string; onScreen: string }[]; // 60 minutes, 20 beats
export const PRESS_BLURB: Copy;         // 120 words, third person allowed here only
export const EMAIL_SUBJECTS: Record<string, string[]>; // step key -> three subject options
```

## Admin desk (`/admin/bootcamp`)

Tabs: Desk (numbers: masterclass seats, GA/VIP/Platinum counts and revenue, Operator seats, hosts applied/approved, outreach sent/replied/hosting, the next dated moment with a countdown), Outreach (the switch: Armed / Off with daily cap, the list with status, step, next send, fit, vertical; actions: Send now, Mark replied, Mark hosting, Skip; for `hand` rows a "Copy message" button with the rendered step 1 text), Hosts (applied list with Approve / Decline, approved list with links and stats), Registrations (search, tier filter, CSV export), Marketing Kit (every entry from `data/bootcamp-marketing.ts` with a Copy button), The Plan (the four-launch ladder from `data/bootcamp-plan.ts`).

Routes under `app/api/admin/bootcamp/`:
- `GET stats`
- `GET|POST outreach` (list; POST `{ action: 'arm'|'disarm'|'cap', dailyCap? }`)
- `POST outreach/[id]` `{ action: 'send'|'replied'|'hosting'|'skip'|'requeue' }`
- `POST hosts/[slug]` `{ action: 'approve'|'decline'|'pause' }` (approve mints links, sends `hostApproved`)
- `GET registrations?tier=&q=&format=csv`
