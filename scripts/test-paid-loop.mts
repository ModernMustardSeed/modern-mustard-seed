/**
 * Drive the whole paid loop through production, without money.
 *
 * Sarah, 2026-08-28: "can you test the whole thing with a test payment?"
 *
 * A Stripe test-mode payment would not answer the question. Test events go to
 * test-mode webhook endpoints signed with a different secret, so the thing
 * being exercised would be a parallel setup, not the one Heath's money will
 * hit. What this does instead is build the exact `checkout.session.completed`
 * payload Stripe sends for a Payment Link, sign it with the live webhook
 * secret, and POST it to the live endpoint. Same route, same handler, same
 * database, same email provider. Only the money is absent.
 *
 * It runs against a throwaway plus-address and NEVER against a real client.
 * `sendIntakeWelcome` stamps `intake_welcomed_at`, and once that is set it
 * refuses to send again, so testing on Heath would silently suppress the
 * welcome email he gets when he really pays. That is the exact class of bug
 * this script exists to catch, and it would be embarrassing to cause it.
 *
 *   npx tsx scripts/test-paid-loop.mts            # website
 *   npx tsx scripts/test-paid-loop.mts cornerstone
 *   npx tsx scripts/test-paid-loop.mts --clean    # remove what a run left
 */
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
) as Record<string, string>;

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ENDPOINT = process.env.WEBHOOK_URL ?? 'https://modernmustardseed.com/api/store/webhook';
/* A plus address: it reaches her real inbox, so she sees exactly what a client
 * sees, and it is a distinct key so nothing real is touched. */
const TEST_EMAIL = 'sarah+looptest@modernmustardseed.com';

const ok = (b: boolean) => (b ? 'PASS' : 'FAIL');

async function clean() {
  for (const [t, c] of [
    ['client_intake', 'client_email'],
    ['client_files', 'client_email'],
    ['client_products', 'client_email'],
    ['projects', 'client_email'],
    ['clients', 'email'],
  ] as const) {
    const { error } = await db.from(t).delete().ilike(c, TEST_EMAIL);
    console.log(`  ${t.padEnd(16)} ${error ? 'skipped: ' + error.message.slice(0, 40) : 'cleared'}`);
  }
}

if (process.argv.includes('--clean')) {
  console.log('Clearing the test client.\n');
  await clean();
  process.exit(0);
}

const kind = process.argv.find((a) => a === 'cornerstone') ? 'cornerstone' : 'website';
const itemName =
  kind === 'website' ? 'Website, one time build' : 'Cornerstone, setup plus monthly';
const amount = kind === 'website' ? 49700 : 129400;

console.log(`Testing the ${kind} path against ${ENDPOINT}`);
console.log(`As ${TEST_EMAIL}\n`);

console.log('Starting from a clean slate.');
await clean();

/* The payload Stripe actually sends. The fields the handler reads are
 * customer_details.email, customer_details.name and metadata; the rest is
 * shaped correctly so nothing downstream trips over a missing key. */
const session = {
  id: `cs_test_loop_${Date.now()}`,
  object: 'checkout.session',
  amount_total: amount,
  currency: 'usd',
  customer_details: { email: TEST_EMAIL, name: 'Loop Test' },
  customer_email: null,
  mode: kind === 'website' ? 'payment' : 'subscription',
  payment_status: 'paid',
  status: 'complete',
  metadata: {
    client: 'wild-horse-construction',
    what: kind,
    kind,
    item_name: itemName,
    business: 'Loop Test Construction',
  },
};

const event = {
  id: `evt_test_loop_${Date.now()}`,
  object: 'event',
  api_version: '2024-06-20',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  livemode: true,
  data: { object: session },
};

/* Stripe's signature scheme: t=<unix>,v1=<hmac sha256 of "t.payload">. Getting
 * this right is the point: a handler that would reject Stripe's real signature
 * must reject ours too, or the test proves nothing. */
const payload = JSON.stringify(event);
const t = Math.floor(Date.now() / 1000);
const v1 = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
  .update(`${t}.${payload}`)
  .digest('hex');

console.log('\nPosting a signed checkout.session.completed to production.');
const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'stripe-signature': `t=${t},v1=${v1}` },
  body: payload,
});
const text = await res.text();
console.log(`  HTTP ${res.status}  ${text.slice(0, 160)}`);
if (!res.ok) {
  console.log('\nThe webhook rejected it. Nothing below will have happened.');
  process.exit(1);
}

// The handler does its work after responding, so give it a moment to land.
await new Promise((r) => setTimeout(r, 6000));

console.log('\nWhat actually landed:');

const { data: client } = await db
  .from('clients')
  .select('email, name, company, status, intake_key, intake_welcomed_at')
  .ilike('email', TEST_EMAIL)
  .maybeSingle();
console.log(`  ${ok(!!client)}  client row`);
if (client) {
  console.log(`         name=${client.name} company=${client.company} status=${client.status}`);
}

const { data: products } = await db
  .from('client_products')
  .select('kind, label, tier, status')
  .ilike('client_email', TEST_EMAIL);
console.log(`  ${ok((products?.length ?? 0) > 0)}  product card`);
for (const p of products ?? []) console.log(`         ${p.kind}: ${p.label} (${p.tier}) ${p.status}`);

console.log(`  ${ok(!!client?.intake_key)}  intake key minted`);
console.log(`  ${ok(!!client?.intake_welcomed_at)}  welcome email sent`);
if (client?.intake_key) {
  console.log(`\n  The form he gets:`);
  console.log(`  https://modernmustardseed.com/welcome/${client.intake_key}`);
}

/* Now the other half: submit the form the way his browser will, and check the
 * answers come back out where she can build from them. */
if (client?.intake_key) {
  console.log('\nSubmitting the intake form as he would.');
  const r = await fetch('https://modernmustardseed.com/api/intake/contractor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: client.intake_key,
      answers: {
        licenceNumber: 'TEST-12345',
        insurer: 'Test Mutual',
        domain: 'buy-mt',
        domainNotes: 'end to end test, please ignore',
        bestAt: 'custom homes and commercial',
        colours: 'the orange off the trucks',
        email: TEST_EMAIL,
      },
      files: [],
    }),
  });
  const out = (await r.json()) as Record<string, unknown>;
  console.log(`  HTTP ${r.status}  ${JSON.stringify(out)}`);

  await new Promise((rr) => setTimeout(rr, 3000));
  const { data: intake } = await db
    .from('client_intake')
    .select('status, submitted_at, answers')
    .ilike('client_email', TEST_EMAIL)
    .maybeSingle();
  console.log(`  ${ok(!!intake)}  answers stored`);
  if (intake) {
    const a = intake.answers as Record<string, unknown>;
    console.log(`         status=${intake.status}  domain=${a.domain}  licence=${a.licenceNumber}`);
  }

  const { data: proj } = await db
    .from('projects')
    .select('status')
    .ilike('client_email', TEST_EMAIL);
  console.log(`  ${(proj?.length ?? 0) ? 'INFO' : 'INFO'}  projects: ${JSON.stringify(proj)}`);
}

console.log('\nCheck the inbox for two emails: the welcome with the form link,');
console.log('and "Intake in: ..." with the answers.');
console.log('\nWhen you are done: npx tsx scripts/test-paid-loop.mts --clean');
