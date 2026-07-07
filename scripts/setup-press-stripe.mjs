/**
 * Create the MUSTARD PRESS Stripe products + prices (idempotent by name).
 *   THE PIECE       $97 one-time -> STRIPE_PRICE_PRESS_PIECE
 *   THE KIT        $297 one-time -> STRIPE_PRICE_PRESS_KIT
 *   THE HAND PRESS $497 one-time -> STRIPE_PRICE_PRESS_HANDPRESS
 *
 * Prints the env lines for .env.local and Vercel. Run:
 *   node scripts/setup-press-stripe.mjs
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
  { envName: 'STRIPE_PRICE_PRESS_PIECE', product: 'MUSTARD PRESS The Piece', desc: 'Your typeset menu, price list, or rate sheet as a clean print-ready US Letter PDF, delivered instantly on payment. Full commercial rights, yours forever.', amount: 9700 },
  { envName: 'STRIPE_PRICE_PRESS_KIT', product: 'MUSTARD PRESS The Kit', desc: 'The Piece plus a matching flyer, business card, and window or yard piece: one brand system set from the same type case. Hand-assembled, delivered within 2 business days, one revision pass included.', amount: 29700 },
  { envName: 'STRIPE_PRICE_PRESS_HANDPRESS', product: 'MUSTARD PRESS The Hand Press', desc: 'A hands-on collateral rethink with Sarah: a working session on your offer and pricing, two concept directions, the full kit, and print vendor handoff. Five slots per week.', amount: 49700 },
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
  let price = prices.data.find((p) => p.unit_amount === item.amount && p.currency === 'usd' && !p.recurring);
  if (!price) {
    price = await stripe.prices.create({ product: product.id, unit_amount: item.amount, currency: 'usd' });
    console.log('created price', price.id);
  } else {
    console.log('found price', price.id);
  }
  lines.push(`${item.envName}=${price.id}`);
}

console.log('\nSet these in .env.local and Vercel (production):');
for (const l of lines) console.log(l);
