/**
 * Create the MUSTARD LAUNCH Stripe products + prices (idempotent by product name).
 *   The Launch Kit   $197 one-time  -> STRIPE_PRICE_LAUNCH_KIT
 *   The Launch Room  $97/mo         -> STRIPE_PRICE_LAUNCH_ROOM
 *
 * Prints the env lines to set locally and in Vercel. Run:
 *   node scripts/setup-mustard-launch-stripe.mjs
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
  { envName: 'STRIPE_PRICE_LAUNCH_KIT', product: 'MUSTARD LAUNCH Kit', desc: 'Your whole launch package, generated: three name directions, positioning, your offer and pricing, and a 30/60/90 plan with the copy written. Lifetime access.', amount: 19700, recurring: null },
  { envName: 'STRIPE_PRICE_LAUNCH_ROOM', product: 'MUSTARD LAUNCH Room', desc: 'Everything in the Launch Kit plus Mr. Mustard live: your AI launch coach on chat, regenerating assets and coaching you mission by mission to Launch Day.', amount: 9700, recurring: { interval: 'month' } },
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
