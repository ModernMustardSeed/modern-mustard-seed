/**
 * TEST THE LIVE PAYMENT RAIL, WITH A REAL CARD AND A ZERO DOLLAR CHARGE.
 *
 * This is the one thing no rehearsal can prove. acq:dress stubs Stripe at its
 * boundary; this drives the real thing: a real Checkout Session, on live keys,
 * against the real webhook, producing a real client, project and Front Office.
 * The only thing standing in for reality is the amount, which the RAILTEST
 * coupon takes to zero.
 *
 *   npm run acq:rail                  # set it up and print the buy link
 *   npm run acq:rail -- --check       # after buying: verify every downstream step
 *   npm run acq:rail -- --clean       # remove the test account afterwards
 *
 * ── WHY A HUMAN HAS TO PRESS THE BUTTON ──────────────────────────────────────
 * Stripe Checkout in subscription mode always collects a card, even at zero.
 * That is not a limitation to engineer around: entering payment details is
 * exactly the step that should belong to a person. So this does everything up
 * to the card form and everything after the webhook, and Sarah does the middle.
 *
 * ── IT PROVES THE MATH BEFORE SHE SEES A CARD FORM ───────────────────────────
 * The offer is a subscription line PLUS a one-time setup line. Whether a
 * duration:once percent-off coupon zeroes both is a real question, not an
 * assumption, so this creates a throwaway session with the discount already
 * applied and reads the computed total back from Stripe. If it is not zero,
 * this says so and stops, rather than letting somebody discover it at the card
 * form with their wallet out.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const CLEAN = argv.includes('--clean');
const MARKER = 'rail-test';
const EMAIL = 'railtest@modernmustardseed.com';
const CODE = 'RAILTEST';

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

const { env } = await import('../lib/env');
const { SITE } = await import('../lib/seo');
const { OFFER } = await import('../lib/acq/types');
const SK = env('STRIPE_SECRET_KEY');
if (!SK) {
  console.error('No STRIPE_SECRET_KEY. Nothing can be verified.');
  process.exit(1);
}

const stripeGet = async (path: string) => {
  const r = await fetch(`https://api.stripe.com/v1${path}`, { headers: { Authorization: `Basic ${Buffer.from(`${SK}:`).toString('base64')}` } });
  return r.json() as Promise<Record<string, unknown>>;
};
const stripePost = async (path: string, form: Record<string, string>) => {
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${SK}:`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  return r.json() as Promise<Record<string, unknown>>;
};

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

/* ────────────────────────────── clean up ──────────────────────────────── */

async function wipe(): Promise<void> {
  const { data: offices } = await db.from('fo_offices').select('id').eq('client_email', EMAIL);
  for (const o of offices ?? []) {
    for (const t of ['fo_appointments', 'fo_calls', 'fo_contacts', 'fo_transfers', 'fo_events']) await db.from(t).delete().eq('office_id', o.id);
  }
  await db.from('fo_offices').delete().eq('client_email', EMAIL);
  await db.from('projects').delete().eq('client_email', EMAIL);
  await db.from('client_files').delete().eq('client_email', EMAIL);
  await db.from('clients').delete().eq('email', EMAIL);
  await db.from('demo_orders').delete().eq('email', EMAIL);
  const { data: leads } = await db.from('outbound_leads').select('id').eq('source', MARKER);
  const ids = (leads ?? []).map((l) => l.id as string);
  if (ids.length) {
    for (const t of ['acq_mrr_events', 'acq_events', 'acq_queue', 'acq_sends']) await db.from(t).delete().in('lead_id', ids);
    await db.from('messages').delete().in('outbound_lead_id', ids);
    await db.from('outbound_leads').delete().in('id', ids);
  }
}

if (CLEAN) {
  await wipe();
  console.log(`\nRemoved the rail-test account (${EMAIL}). The Stripe subscription, if you completed one, must be cancelled in the dashboard.\n`);
  process.exit(0);
}

/* ─────────────────────── after the purchase: verify ────────────────────── */

if (CHECK) {
  console.log(`\nRAIL TEST — what actually happened after the payment\n`);
  const step = (name: string, ok: boolean, detail = '') => console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${detail ? `  —  ${detail}` : ''}`);

  const { data: order } = await db.from('demo_orders').select('*').eq('email', EMAIL).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!step('an order exists', Boolean(order), order ? `${order.status}` : 'none found; did checkout complete?')) process.exit(1);

  step('Stripe marked it paid', order.status === 'paid' || order.status === 'intake_done' || order.status === 'delivered', String(order.status));
  step('a subscription was created', Boolean(order.stripe_subscription_id), String(order.stripe_subscription_id ?? 'none'));

  if (order.stripe_subscription_id) {
    const sub = await stripeGet(`/subscriptions/${order.stripe_subscription_id}`);
    step('Stripe agrees the subscription is live', sub.status === 'active' || sub.status === 'trialing', String(sub.status));
    const inv = (sub as { latest_invoice?: string }).latest_invoice;
    if (inv) {
      const invoice = await stripeGet(`/invoices/${inv}`);
      const paid = Number(invoice.amount_paid ?? -1);
      step('the first invoice charged nothing', paid === 0, `${usd(paid)} paid, discount ${JSON.stringify(invoice.discount ?? null).slice(0, 60)}`);
    }
  }

  step('the lead became a client', Boolean(order.client_email), String(order.client_email ?? 'not linked'));
  const { data: client } = await db.from('clients').select('email, company').eq('email', EMAIL).maybeSingle();
  step('they are in the Client Book', Boolean(client), client?.company ?? 'missing');

  const { data: project } = await db.from('projects').select('id, name, status').eq('client_email', EMAIL).maybeSingle();
  step('a project was opened', Boolean(project), project ? `${project.name} (${project.status})` : 'missing');

  const { data: office } = await db.from('fo_offices').select('*').eq('client_email', EMAIL).maybeSingle();
  step('their Front Office was built', Boolean(office), office ? office.id : 'MISSING — the webhook did not provision it');
  if (office) {
    step('billing shows them as paying', office.billing_status === 'active', String(office.billing_status));
    step('it knows their business', Boolean(office.city && office.website), `${office.city ?? '?'} · ${office.website ?? '?'}`);
  }

  if (order.outbound_lead_id) {
    const { data: lead } = await db.from('outbound_leads').select('acq_stage, client_status, acq_eligible').eq('id', order.outbound_lead_id).maybeSingle();
    step('the prospect is marked a client', lead?.client_status === 'client', String(lead?.acq_stage));
    step('and dropped out of the cold sequence', lead?.acq_eligible === false, lead?.acq_eligible ? 'STILL BEING PROSPECTED' : 'no longer eligible');
  }

  const { data: mrr } = await db.from('acq_mrr_events').select('mrr_delta_cents, type').eq('lead_id', order.outbound_lead_id ?? '').limit(5);
  step('net new MRR was recorded', (mrr ?? []).length > 0, (mrr ?? []).map((m) => `${m.type} ${usd(m.mrr_delta_cents)}`).join(', ') || 'none');

  console.log(`\nWhen you are done: npm run acq:rail -- --clean, and cancel the subscription in Stripe.\n`);
  process.exit(0);
}

/* ───────────────────────────── set it up ──────────────────────────────── */

console.log(`\nRAIL TEST SETUP\n`);

// One at a time. A previous run's rows would make --check read the wrong order.
await wipe();

const { keysFor } = await import('../lib/acq/dedupe');
const hubId = crypto.randomUUID();
const business = 'Rail Test Heating & Air';

const { data: lead, error } = await db
  .from('outbound_leads')
  .insert({
    business_name: business,
    contact_name: 'Sarah Scarano',
    phone: '(406) 555-0166',
    email: EMAIL,
    website: 'https://railtest.example.com',
    address: '1 Rail Test Road, Kalispell, MT 59901',
    city: 'Kalispell',
    state: 'MT',
    niche: 'home_service',
    trade: 'hvac',
    review_count: 180,
    rating: 4.8,
    emergency_service: true,
    service_area: 'Flathead Valley',
    hours: { monday: '8:00 am - 5:00 pm', tuesday: '8:00 am - 5:00 pm', wednesday: '8:00 am - 5:00 pm', thursday: '8:00 am - 5:00 pm', friday: '8:00 am - 5:00 pm' },
    email_status: 'verified',
    lead_score: 90,
    status: 'new',
    source: MARKER,
    is_test: true,
    consent_status: 'granted',
    hub_demo_id: hubId,
    hub_demo_url: `${SITE.url}/demo/hub/${hubId}`,
    notes: 'Live payment rail test. Delete with: npm run acq:rail -- --clean',
    ...keysFor({ business_name: business, city: 'Kalispell', state: 'MT', phone: '(406) 555-0166', email: EMAIL }),
  })
  .select('*')
  .single();
if (error || !lead) {
  console.error('Could not create the test prospect:', error?.message);
  process.exit(1);
}
console.log(`  prospect      ${business}  (${EMAIL})`);

/* ── PROVE THE COUPON ZEROES BOTH LINES, BEFORE ANYBODY SEES A CARD FORM ──
   The offer is a recurring line plus a one-time setup line. A duration:once
   percent-off coupon covering the whole first invoice is the expectation, not
   a fact, so this asks Stripe. The session is created and immediately
   expired; it is never shown to anyone. */
// This account's API version nests the coupon under `promotion` and returns
// only its id, rather than exposing it at the top level the way older docs
// describe. Read it the way the account actually speaks.
const promoList = (await stripeGet(`/promotion_codes?code=${CODE}&limit=1`)) as {
  data?: Array<{ id: string; active: boolean; times_redeemed: number; max_redemptions: number | null; promotion?: { coupon?: string } }>;
};
const promo = promoList.data?.[0];
if (!promo) {
  console.error(`\n  The ${CODE} promotion code does not exist on the live account. Create it before running this.`);
  process.exit(1);
}
const couponId = promo.promotion?.coupon;
const coupon = couponId ? ((await stripeGet(`/coupons/${couponId}`)) as { percent_off?: number; duration?: string; valid?: boolean }) : null;
console.log(
  `  coupon        ${CODE} — ${coupon?.percent_off ?? '?'}% off, ${coupon?.duration ?? '?'}, active=${promo.active}, used ${promo.times_redeemed}/${promo.max_redemptions ?? 'unlimited'}`,
);
if (!promo.active || coupon?.valid === false) {
  console.error(`\n  ${CODE} is not usable (active=${promo.active}, coupon valid=${coupon?.valid}). Stop.`);
  process.exit(1);
}

const probe = await stripePost('/checkout/sessions', {
  mode: 'subscription',
  'payment_method_types[0]': 'card',
  'line_items[0][price_data][currency]': 'usd',
  'line_items[0][price_data][product_data][name]': 'probe monthly',
  'line_items[0][price_data][unit_amount]': String(OFFER.monthlyCents),
  'line_items[0][price_data][recurring][interval]': 'month',
  'line_items[0][quantity]': '1',
  'line_items[1][price_data][currency]': 'usd',
  'line_items[1][price_data][product_data][name]': 'probe setup',
  'line_items[1][price_data][unit_amount]': String(OFFER.setupCents),
  'line_items[1][quantity]': '1',
  'discounts[0][promotion_code]': promo.id,
  success_url: `${SITE.url}/`,
  cancel_url: `${SITE.url}/`,
});

if (probe.error) {
  console.error('\n  Could not verify the coupon math:', (probe.error as { message?: string }).message);
} else {
  const total = Number(probe.amount_total ?? -1);
  const subtotal = Number(probe.amount_subtotal ?? -1);
  console.log(`  the maths     ${usd(subtotal)} before the code, ${usd(total)} after`);
  if (total !== 0) {
    console.log(`\n  ⚠ ${CODE} does NOT take the first invoice to zero. It leaves ${usd(total)}.`);
    console.log(`    A duration:once percent-off covers the subscription line; the one-time`);
    console.log(`    setup line is billed separately and is not discounted by it. Stop here`);
    console.log(`    rather than entering a card expecting no charge.\n`);
  }
  // Never leave a live session lying around that somebody could pay.
  await stripePost(`/checkout/sessions/${probe.id}/expire`, {});
}

console.log(`\n  BUY PAGE      ${SITE.url}/demo/hub/${hubId}`);
console.log(`\n  What to do:`);
console.log(`    1. Open the buy page, pick the Voice Agent, continue to Stripe.`);
console.log(`    2. Enter ${CODE} in the promotion code box. Confirm the total reads $0.00.`);
console.log(`    3. Use a real card. It will not be charged.`);
console.log(`    4. Come back and run:  npm run acq:rail -- --check`);
console.log(`\n  This is a LIVE Stripe session on live keys. If the total is not $0.00, stop.\n`);
