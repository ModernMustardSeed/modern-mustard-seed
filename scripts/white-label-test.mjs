import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const out = 'artifacts/white-label-tests';
await mkdir(out, { recursive: true });
const mocks = {
  '@/lib/supabase': 'export const getSupabase = () => null;',
  '@/lib/stripe': 'export const getStripe = () => globalThis.wlTest.stripe;',
  '@/lib/white-label/store': 'export const listClients = async () => { if(globalThis.wlTest.failRead) throw Error("read failed"); return globalThis.wlTest.clients; }; export const updateAgency = async () => {}; export const updateClient = async (id,p) => { globalThis.wlTest.clients.find(c=>c.id===id).stripe_items=p.stripe_items; };',
};
async function compile(entry, name) {
  await build({ entryPoints: [entry], outfile: `${out}/${name}.mjs`, bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'controlled-dependencies', setup(b) { b.onResolve({ filter: /^@\/lib\/(supabase|stripe|white-label\/store)$/ }, a => ({ path: a.path, namespace: 'mock' })); b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: mocks[a.path], loader: 'js' })); } }] });
  return import(pathToFileURL(`${process.cwd()}/${out}/${name}.mjs`).href);
}
const keys = await compile('lib/white-label/key.ts', 'keys');
const delivery = await compile('lib/white-label/delivery.ts', 'delivery');
const billing = await compile('lib/white-label/billing.ts', 'billing');
process.env.ADMIN_SESSION_SECRET = 'white-label-test-secret-only';
let checks = 0;
const check = (fn) => { fn(); checks++; };
const price = keys.wlKey('north-agency');
const portal = keys.accessKey('portal', 'north-agency');
const review = keys.accessKey('review', 'client-1');
check(() => assert.equal(keys.accessKeyValid('portal', 'north-agency', price), false));
check(() => assert.equal(keys.wlKeyValid('north-agency', portal), false));
check(() => assert.equal(keys.accessKeyValid('portal', 'north-agency', portal), true));
check(() => assert.equal(keys.accessKeyValid('review', 'client-2', review), false));
check(() => assert.equal(keys.accessKeyValid('portal', 'north-agency', review), false));
check(() => assert.equal(delivery.safeReviewUrl('javascript:alert(1)'), ''));
check(() => assert.equal(delivery.safeReviewUrl('https://user:pass@example.com'), ''));
check(() => assert.ok(delivery.serviceConflict(['phone-and-site-agent', 'ai-receptionist'])));
check(() => assert.ok(delivery.serviceConflict(['site-5', 'site-20'])));
check(() => assert.equal(delivery.serviceConflict(['site-5', 'ai-receptionist']), null));
const preview = { ...delivery.emptyDelivery, url: 'https://example.com/', summary: 'Test the contact form and confirmation.' };
check(() => assert.ok(delivery.launchError('building', 'live', null, ['site-5'], null, preview)));
check(() => assert.equal(delivery.launchError('building', 'review', null, ['site-5'], null, preview), null));
check(() => assert.equal(delivery.launchError('review', 'live', 'approved', ['site-5'], null, preview), null));
check(() => assert.ok(delivery.launchError('review', 'live', 'approved', ['site-5'], null, { ...preview, feedback: 'Fix the form.' })));
check(() => assert.ok(delivery.launchError('building', 'review', null, ['ai-receptionist'], null, preview)));

function scenario(clients, sub = null) {
  const calls = [];
  const stripe = {
    customers: { create: async (_p, opts) => { calls.push(['customer', opts]); return { id: 'cus_test' }; } },
    products: { search: async () => ({ data: [{ id: 'prod_test' }] }) },
    invoiceItems: { create: async (p, opts) => { calls.push(['setup', p.amount, opts.idempotencyKey]); return { id: `ii_${calls.length}` }; } },
    invoices: { create: async (_p, opts) => { calls.push(['invoice', opts.idempotencyKey]); return { id: 'inv_test' }; }, finalizeInvoice: async () => { if(globalThis.wlTest.failFinalize) throw Error('temporary invoice failure'); calls.push(['finalize']); } },
    subscriptions: { retrieve: async () => sub, cancel: async () => { calls.push(['cancel']); }, create: async () => { calls.push(['subscription']); return { id: 'sub_test' }; } },
    subscriptionItems: { update: async () => {}, create: async () => {}, del: async () => { calls.push(['delete-item']); } },
  };
  globalThis.wlTest = { clients, stripe, calls };
  return calls;
}
const agency = { id: 'agency-1', name: 'Test Agency', email: 'test@example.com', slug: 'test', stripe_customer_id: 'cus_test', stripe_subscription_id: null };
const client = (id, lines) => ({ id, business: id, status: 'live', lines, stripe_items: {} });
let calls = scenario([client('one-time', ['automation'])]);
check(() => assert.equal((calls.length), 0));
assert.equal((await billing.syncAgencyBilling(agency)).ok, true);
check(() => assert.equal(calls.filter(c => c[0] === 'invoice').length, 1));
check(() => assert.match(calls.find(c => c[0] === 'setup')[2], /wl-setup-one-time-automation/));
await billing.syncAgencyBilling(agency);
check(() => assert.equal(calls.filter(c => c[0] === 'setup').length, 1));
check(() => assert.equal(calls.filter(c => c[0] === 'invoice').length, 1));
calls = scenario([client('retry-finalize', ['automation'])]); globalThis.wlTest.failFinalize = true;
assert.equal((await billing.syncAgencyBilling(agency)).ok, false);
globalThis.wlTest.failFinalize = false;
assert.equal((await billing.syncAgencyBilling(agency)).ok, true);
check(() => assert.equal(calls.filter(c => c[0] === 'setup').length, 1));
check(() => assert.equal(calls.filter(c => c[0] === 'invoice')[0][1], calls.filter(c => c[0] === 'invoice')[1][1]));
const recoveryClient = client('recover', ['automation']); recoveryClient.stripe_items = { 'setup:automation': 'ii_pending' };
calls = scenario([recoveryClient]);
await billing.syncAgencyBilling(agency);
check(() => assert.equal(calls.filter(c => c[0] === 'setup').length, 0));
check(() => assert.equal(calls.filter(c => c[0] === 'invoice').length, 1));
calls = scenario([client('phone', ['ai-receptionist'])]);
assert.equal((await billing.syncAgencyBilling(agency)).ok, true);
check(() => assert.equal(calls.filter(c => c[0] === 'subscription').length, 1));
calls = scenario([client('one-time', ['automation'])], { id: 'sub_test', status: 'active', items: { data: [{ id: 'si_test', metadata: { wl_line: 'ai-receptionist' }, price: { unit_amount: 14700 }, quantity: 1 }] } });
await billing.syncAgencyBilling({ ...agency, stripe_subscription_id: 'sub_test' });
check(() => assert.equal(calls.filter(c => c[0] === 'cancel').length, 1));
check(() => assert.equal(calls.filter(c => c[0] === 'delete-item').length, 0));
calls = scenario([]); globalThis.wlTest.failRead = true;
check(() => assert.equal(calls.length, 0));
assert.equal((await billing.syncAgencyBilling(agency)).ok, false);
check(() => assert.equal(calls.length, 0));
delete process.env.ADMIN_SESSION_SECRET;
check(() => assert.equal(keys.accessKeyValid('portal', 'north-agency', portal), false));
console.log(`White label: ${checks} security, approval and billing checks passed. No live database, invoice or email writes.`);
