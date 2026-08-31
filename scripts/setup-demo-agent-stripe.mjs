/**
 * SUPERSEDED. Nothing reads these env price IDs any more: /api/demo-agent/checkout
 * builds inline price_data from data/demo-agent.ts, which is the only source of
 * truth for what a Voice Agent costs. Kept for the Stripe catalog, re-synced to
 * the 2026-08-31 prices so running it cannot mint a stale product.
 *
 * Create the DEMO_AGENT Stripe products + prices (idempotent by product name).
 *   VOICE AGENT setup       $297 one-time -> STRIPE_PRICE_DEMO_AGENT_SETUP
 *   VOICE AGENT monthly     $297/mo       -> STRIPE_PRICE_DEMO_AGENT_MONTHLY
 *   VOICE AGENT PRO setup   $597 one-time -> STRIPE_PRICE_DEMO_AGENT_PRO_SETUP
 *   VOICE AGENT PRO monthly $597/mo       -> STRIPE_PRICE_DEMO_AGENT_PRO_MONTHLY
 *
 * Checkout runs in subscription mode with the setup fee as a one-time line
 * item on the first invoice. Prints the env lines to set locally and in
 * Vercel. Run: node scripts/setup-demo agent-stripe.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Stripe from 'stripe';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* none */ }

const key = env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY missing');
  process.exit(1);
}
const stripe = new Stripe(key);

const ITEMS = [
  { envName: 'STRIPE_PRICE_DEMO_AGENT_SETUP', product: 'DEMO_AGENT setup', desc: 'One-time hand installation of your AI front desk: persona tuning, line setup, booking wiring, live within 7 days. Credited toward any custom build over $2,500.', amount: 29700, recurring: null },
  { envName: 'STRIPE_PRICE_DEMO_AGENT_MONTHLY', product: 'DEMO_AGENT', desc: 'Your AI front desk answering 24/7: 500 answered minutes a month (hard-capped, message-taking mode at the cap), call summaries to your inbox, urgent calls flagged. Month to month.', amount: 29700, recurring: { interval: 'month' } },
  { envName: 'STRIPE_PRICE_DEMO_AGENT_PRO_SETUP', product: 'DEMO_AGENT PRO setup', desc: 'One-time hand installation of your AI front desk, Pro tier: everything in VOICE AGENT setup plus calendar booking integration and caller memory. Credited toward any custom build over $2,500.', amount: 59700, recurring: null },
  { envName: 'STRIPE_PRICE_DEMO_AGENT_PRO_MONTHLY', product: 'DEMO_AGENT PRO', desc: 'The Pro front desk: 1,200 answered minutes a month (hard-capped), caller memory, real calendar booking, a monthly retrain call with Sarah, priority support. Month to month.', amount: 59700, recurring: { interval: 'month' } },
];

const lines = [];
for (const item of ITEMS) {
  const existing = await stripe.products.list({ active: true, limit: 100 });
  let product = existing.data.find((p) => p.name === item.product);
  if (!product) {
    product = await stripe.products.create({ name: item.product, description: item.desc });
    console.log('created product', product.id, item.product);
  } else {
    console.log('found product', product.id, item.product);
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find((p) =>
    p.unit_amount === item.amount &&
    p.currency === 'usd' &&
    (item.recurring ? p.recurring?.interval === item.recurring.interval : !p.recurring)
  );
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: item.amount,
      currency: 'usd',
      ...(item.recurring ? { recurring: item.recurring } : {}),
    });
    console.log('created price', price.id);
  } else {
    console.log('found price', price.id);
  }
  lines.push(`${item.envName}=${price.id}`);
}

console.log('\nSet these in .env.local and Vercel (production):');
for (const l of lines) console.log(l);
