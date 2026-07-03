/**
 * Create the MUSTARD MODE Stripe products + prices (idempotent by product name).
 *   MUSTARD MODE Player   $197 one-time  -> STRIPE_PRICE_MUSTARD_PLAYER
 *   MUSTARD MODE Builder  $397 one-time  -> STRIPE_PRICE_MUSTARD_BUILDER
 *   MUSTARD MODE Founders' Cabinet $97/mo -> STRIPE_PRICE_MUSTARD_CABINET
 *
 * Prints the env lines to set locally and in Vercel. Run:
 *   node scripts/setup-mustard-stripe.mjs
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
  { envName: 'STRIPE_PRICE_MUSTARD_PLAYER', product: 'MUSTARD MODE Player', desc: 'The coach app: Mr. Mustard live AI coach, 4 tracks, 28 missions, the prompt library, progress HUD. Lifetime access.', amount: 19700, recurring: null },
  { envName: 'STRIPE_PRICE_MUSTARD_BUILDER', product: 'MUSTARD MODE Builder', desc: 'Everything in Player plus the Builder vault (9 blueprints) and a personal studio review of your boss mission. Lifetime access.', amount: 39700, recurring: null },
  { envName: 'STRIPE_PRICE_MUSTARD_CABINET', product: "MUSTARD MODE Founders' Cabinet", desc: 'Everything in Player and Builder while active, monthly live build-alongs with Sarah, every future drop, priority coach lane.', amount: 9700, recurring: { interval: 'month' } },
];

const lines = [];
for (const item of ITEMS) {
  // Idempotent: reuse an active product with the same name (list + filter,
  // because Stripe's search syntax chokes on apostrophes in names).
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
