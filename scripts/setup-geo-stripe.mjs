/**
 * Create the GEO DESK Stripe products + prices (idempotent by name).
 *   THE FIX PACK    $297 one-time -> STRIPE_PRICE_GEO_FIXPACK
 *   THE FULL DESK   $497 one-time -> STRIPE_PRICE_GEO_FULLDESK
 *   INSTALLED       $997 one-time -> STRIPE_PRICE_GEO_INSTALLED (dark tier)
 *   THE WATCH       $97/mo        -> STRIPE_PRICE_GEO_WATCH
 *   THE WATCH PRO   $197/mo       -> STRIPE_PRICE_GEO_WATCHPRO
 *
 * Run: node scripts/setup-geo-stripe.mjs
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
  { envName: 'STRIPE_PRICE_GEO_FIXPACK', product: 'GEO DESK The Fix Pack', desc: 'Your missing AI-findability signals, written for your business from your live site: llms.txt, ai.txt, JSON-LD structured data, meta rewrites, citable FAQ block, platform-matched install guide, 3 re-scans. Instant delivery.', amount: 29700, recurring: null },
  { envName: 'STRIPE_PRICE_GEO_FULLDESK', product: 'GEO DESK The Full Desk', desc: 'The Fix Pack plus 90 days of monthly re-grades: score deltas, drift alerts, and next fixes, delivered by email.', amount: 49700, recurring: null },
  { envName: 'STRIPE_PRICE_GEO_INSTALLED', product: 'GEO DESK Installed For You', desc: 'The Full Desk plus hands-on installation on your platform and live verification of every signal, with a before/after graded report.', amount: 99700, recurring: null },
  { envName: 'STRIPE_PRICE_GEO_WATCH', product: 'GEO DESK The Watch', desc: 'One website re-graded monthly: score delta email in plain words, drift alerts. Honest reports, never ranking promises. Cancel anytime.', amount: 9700, recurring: { interval: 'month' } },
  { envName: 'STRIPE_PRICE_GEO_WATCHPRO', product: 'GEO DESK The Watch Pro', desc: 'Up to three websites re-graded monthly with per-site deltas and drift alerts. Cancel anytime.', amount: 19700, recurring: { interval: 'month' } },
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
