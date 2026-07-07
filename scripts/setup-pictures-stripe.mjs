/**
 * Create the MUSTARD PICTURES Stripe products + prices (idempotent by name).
 *   THE SPOT      $197 one-time -> STRIPE_PRICE_PICTURES_SPOT
 *   THE PREMIERE  $497 one-time -> STRIPE_PRICE_PICTURES_PREMIERE
 *   SEASON PASS   $197/mo       -> STRIPE_PRICE_PICTURES_SEASON
 *
 * Prints the env lines for .env.local and Vercel. Run:
 *   node scripts/setup-pictures-stripe.mjs
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
  { envName: 'STRIPE_PRICE_PICTURES_SPOT', product: 'MUSTARD PICTURES The Spot', desc: 'A ~30 second AI-generated commercial built for your business from your Screen Test: three cuts (16:9, 9:16, 4:5), styled captions, original score, end card. Hand-reviewed, delivered within 2 business days. Full commercial rights.', amount: 19700, recurring: null },
  { envName: 'STRIPE_PRICE_PICTURES_PREMIERE', product: 'MUSTARD PICTURES The Premiere', desc: 'The talking picture: everything in The Spot plus a voiced lip-synced lead, a poster frame, the ready-to-run ad Launch Kit, and one revision pass. Priority production, delivered within 3 business days.', amount: 49700, recurring: null },
  { envName: 'STRIPE_PRICE_PICTURES_SEASON', product: 'MUSTARD PICTURES Season Pass', desc: 'One new Spot-tier commercial every month so your ads never go stale: seasonal angles, holidays, promotions. One spot per month, no rollover, cancel anytime.', amount: 19700, recurring: { interval: 'month' } },
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
