# Rehearsing the /demos funnel

## Why this exists

On 2026-08-03 the funnel was driven end to end for the first time since it shipped.
It found five real defects in a single pass, and two of them ("wants a quote on a
order", and `Olivia's Chocolates's` on twenty-five surfaces including the call pill
that rides on every demo site) had been shipping for weeks with nobody aware.

The reason nobody was aware is structural: **Stripe Checkout in subscription mode
always collects a card**, even when a 100% coupon makes the first invoice $0. So the
money path cannot test itself, and every rehearsal needed a human with a card.

`scripts/funnel-rehearsal.mjs` is the standing version of that pass.

## Smoke mode (running now, nightly at 6am Mountain)

Nothing to configure. It runs against production and:

- exercises every **guard** over real HTTP: incomplete signup, prompt-injection in a
  business name, the bot honeypot, an unknown hub at checkout, an empty cart, intake
  on an order that never paid, an unauthenticated portal read, an unauthenticated
  admin read
- drives the **happy path through the database** rather than the signup route, on
  purpose, so nothing is emailed and no slot is taken from the global daily forge cap
- renders the hub and the command center and asserts the business name is on the page
- checks the things that fail **quietly**: a stale worker heartbeat, a job queued over
  90 minutes, any build that failed in the last 24 hours
- runs the copy linter over the three newest demos
- **deletes every row it created, in a `finally`**, and sweeps up anything left behind
  by a previous crashed run

```bash
node scripts/funnel-rehearsal.mjs          # the nightly pass
node scripts/funnel-rehearsal.mjs --keep   # leave the rows to look at them
```

A failing run means something in the funnel is broken right now. The GitHub Actions
run goes red.

## Full mode (needs one setup, then it is automatic)

Full mode adds the part smoke mode cannot reach: the real hosted checkout, completed
with test card `4242 4242 4242 4242`, so the **webhook and provisioning** are
exercised too. That is the half of the funnel that turns money into a client, a
project, a portal and a queued rebuild.

It refuses to run against a live key, because completing a real checkout every night
would mint a real subscription every night.

Two things are needed, both one-time:

1. **A preview deployment on Stripe test keys.** In Vercel, add a Preview-scoped
   `STRIPE_SECRET_KEY` set to the `sk_test_…` key, and a Preview-scoped
   `STRIPE_WEBHOOK_SECRET` for a Stripe **test-mode** webhook endpoint pointed at
   that preview URL's `/api/store/webhook`.
2. **Two env vars for the runner**, as GitHub secrets:
   - `REHEARSAL_BASE_URL` = the preview deployment URL
   - `STRIPE_TEST_SECRET_KEY` = the same `sk_test_…` key

Then:

```bash
node scripts/funnel-rehearsal.mjs --full
```

### Why a preview deployment and not a flag

The obvious shortcut is a `?test=1` branch in the live checkout route that swaps in a
test key. Do not do that. It puts a mode switch in the money path, and a mode switch
in the money path is one typo away from taking real orders in test mode, which looks
exactly like working right up until the money never arrives.

The other shortcut is `payment_method_collection: 'if_required'`, so a 100% coupon
skips the card. Also do not do that: with `allow_promotion_codes: true`, any coupon
that leaks would create subscriptions **with no card on file** that renew at full
price and immediately fail.

Keeping test mode in its own deployment is the boring, correct answer.
