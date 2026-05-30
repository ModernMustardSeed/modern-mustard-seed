/**
 * One-time: create the two $497 flagship program products + prices in Stripe.
 * Reads STRIPE_SECRET_KEY from .env.local. Prints the price ids to wire into env.
 * Idempotent-ish: looks up by product name first so re-runs do not duplicate.
 */
import Stripe from 'stripe';
import { readFileSync } from 'node:fs';

function loadEnv(key) {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && m[1] === key) return m[2].trim().replace(/^"(.*)"$/, '$1').replace(/\\r$/, '');
  }
  return null;
}

const key = loadEnv('STRIPE_SECRET_KEY');
if (!key) { console.error('No STRIPE_SECRET_KEY in .env.local'); process.exit(1); }
const stripe = new Stripe(key);

const PROGRAMS = [
  { name: 'The Terminal', env: 'STRIPE_PRICE_THE_TERMINAL', desc: 'Become a fullstack, zero-to-one builder using Claude Code, the command line, and MCP.' },
  { name: 'Idea to Spec', env: 'STRIPE_PRICE_IDEA_TO_SPEC', desc: 'Turn any idea into a validated, production-ready spec a builder can ship.' },
];

const out = {};
for (const p of PROGRAMS) {
  // Reuse an existing product with this exact name if present.
  const existing = await stripe.products.search({ query: `name:'${p.name}' AND active:'true'` });
  let product = existing.data[0];
  if (!product) {
    product = await stripe.products.create({ name: p.name, description: p.desc, tax_code: 'txcd_10103001' });
  }
  // Reuse an existing $497 one-time price if present.
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find((pr) => pr.unit_amount === 49700 && pr.currency === 'usd' && pr.type === 'one_time');
  if (!price) {
    price = await stripe.prices.create({ product: product.id, unit_amount: 49700, currency: 'usd', tax_behavior: 'exclusive' });
  }
  out[p.env] = price.id;
  console.log(`${p.name}: product ${product.id}  price ${price.id}`);
}

console.log('\n--- ENV LINES ---');
for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`);
console.log('--- END ---');
