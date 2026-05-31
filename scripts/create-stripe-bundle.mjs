/** One-time: create the Zero to One bundle product + $797 price in Stripe. */
import Stripe from 'stripe';
import { readFileSync } from 'node:fs';

function loadEnv(key) {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && m[1] === key) return m[2].trim().replace(/^"(.*)"$/, '$1').replace(/\\[rn]$/, '');
  }
  return null;
}

const stripe = new Stripe(loadEnv('STRIPE_SECRET_KEY'));
const NAME = 'The Zero to One Bundle';
const existing = await stripe.products.search({ query: `name:'${NAME}' AND active:'true'` });
let product = existing.data[0] || (await stripe.products.create({
  name: NAME,
  description: 'Idea to Spec plus The Terminal. Spec it, then build it. The front half and back half of zero to one.',
  tax_code: 'txcd_10103001',
}));
const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
let price = prices.data.find((p) => p.unit_amount === 79700 && p.currency === 'usd' && p.type === 'one_time')
  || (await stripe.prices.create({ product: product.id, unit_amount: 79700, currency: 'usd', tax_behavior: 'exclusive' }));
console.log(`STRIPE_PRICE_ZERO_TO_ONE=${price.id}`);
