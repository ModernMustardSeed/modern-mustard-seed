# Demo "Order It Now" Build Brief (locked 2026-07-11)

Sarah's call: prospects on the forged-demo surfaces buy on the spot instead of
being sent to /sidekick or /book. We customize after purchase and release
within a week.

## Pricing (LOCKED by Sarah)
| Product | Setup (one-time) | Monthly |
|---|---|---|
| AI Receptionist (voice) | $297 | $197/mo |
| Website | $497 | $97/mo |
| Business OS | $497 | $197/mo |
| All-three bundle | $997 | $397/mo |

- Month-to-month, cancel anytime, setup fee non-refundable.
- Post-checkout: branded intake form immediately (no call required), order +
  intake land in admin, delivery promise: released within 7 days.
- "Prefer to talk first?" stays as a QUIET secondary link to /book.
- Never-leak-revenue: no trials, receptionist carries the existing platform
  call cap; fine print states fair-use caps. Guards fail closed.

## Build plan (scout findings from Explore agent, 2026-07-11)
1. Migration 046: capture legacy `orders` table (exists in prod only, never
   checked in — shape from webhook inserts: stripe_session_id unique,
   stripe_payment_intent_id, product_slug, product_name, item_type,
   price_paid_cents, currency, email, name, status, created_at)
   + new `demo_orders` (lifecycle: outbound_lead_id, hub_demo_id, products
   jsonb, stripe ids, contact, status pending/paid/intake_done/delivered,
   intake jsonb, ref).
2. `lib/demo-order.ts`: catalog + zod.
3. `app/api/demo-order/checkout/route.ts`: mode=subscription, inline
   price_data lines (monthly recurring + one-time setup) — mirror
   app/api/admin/proposals/[id]/subscription/route.ts:40-60. metadata
   kind='demo-order' + ref (mms_ref cookie, else lead's rep affiliate code),
   mirrored into subscription_data.metadata (sidekick pattern
   app/api/sidekick/checkout/route.ts:60-80). success →
   /demo/order/[hubId]/thanks?session_id=..., cancel → hub url.
4. Webhook `app/api/store/webhook/route.ts`: add kind='demo-order' branch in
   checkout.session.completed (dispatch at line ~1405): insert demo_orders
   paid, notify Sarah (owner notify goes to Zoho + gmail per 8e0bbee), stamp
   outbound lead (status demo_booked→won path, note in messages thread).
   Recurring revenue + 25% commissions ride the existing invoice.paid handler
   (lines 569-623) reading subscription metadata.ref. Product (setup) 50%
   commission NOT applied (setup is fulfillment labor) — decision: setup fee
   pays the build, commissions ride the monthly only.
5. `/demo/order/[hubId]/thanks`: confirmation + intake form (mirror
   components/ClientIntakeForm.tsx pattern, prefill business/owner from lead;
   fields: hours, services offered, voice greeting style, brand
   colors/logo, domain, anything-else). Saves into demo_orders.intake,
   status intake_done. States the 7-day release promise.
6. `components/demo/MakeItRealCTA.tsx` (client, shared like DemoVoiceWidget):
   product picker preselected per surface, live total (setup + monthly),
   bundle auto-upgrade when all three picked, checkout POST → Stripe redirect,
   quiet /book link. Drop into: DemoHub close (replace static book block,
   components/demo/DemoHub.tsx:242-260), SiteDemoShell chip (90-97), OsDemoApp
   pill (210-218), sidekick DemoCallExperience (164-167).
7. Hub page query: widen app/demo/hub/[hubId]/page.tsx:39-43 select to include
   id, phone, email.
8. Design: pop-art MMS tokens per brand file; on dark surfaces use the
   surface's own skin. One signature moment: the order card's monthly line
   counts up like the leak calculator.

## Gotchas from memory
- Multiple concurrent writers on master: stage explicit paths only, never
  amend/rebase/force-push. Dev server singleton (Next 16): kill stale PID.
- zod v4 optional-field helpers end with .optional().
- body has text-white; explicit ink classes on light cards.
- useSearchParams needs Suspense (Next 15+).
- New public route → app/sitemap.ts only if content-driven (these are private
  demo routes, skip).
- PostgREST schema cache after DDL: NOTIFY pgrst, 'reload schema'.
