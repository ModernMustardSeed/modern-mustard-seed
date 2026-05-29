#!/usr/bin/env node
/**
 * Create Stripe Products + Prices for every store item, and write the
 * resulting price IDs back into data/products.ts.
 *
 * Idempotent: if a product already exists with the same metadata.slug, we
 * reuse it. If a default_price already matches, we reuse it. Re-running is
 * safe.
 *
 * Usage:
 *   node scripts/setup-stripe-products.mjs
 *
 * Requires:
 *   STRIPE_SECRET_KEY in .env.local (live or test mode — match the keys you
 *   wire into Vercel production env).
 */

import Stripe from 'stripe';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (process.env[k] === undefined) process.env[k] = v.replace(/^"|"$/g, '');
  }
}
loadEnv('.env.local');

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY in .env.local.');
  console.error('Add your Stripe secret key, then re-run.');
  process.exit(1);
}
const mode = key.startsWith('sk_live_') ? 'LIVE' : 'TEST';
console.log(`Stripe mode: ${mode}`);

const stripe = new Stripe(key);

// Mirror of data/products.ts in plain JS. We import via parsing to avoid
// needing tsx or building.
const file = readFileSync('data/products.ts', 'utf8');
function extractItems(kind /* 'products' | 'bundles' */) {
  // Crude but works: regex over the file to pull slug, name, priceUsd, pitch.
  const re = new RegExp(
    `slug:\\s*['"\\\`]([^'"\\\`]+)['"\\\`][\\s\\S]*?name:\\s*['"\\\`]([^'"\\\`]+)['"\\\`][\\s\\S]*?priceUsd:\\s*(\\d+)[\\s\\S]*?stripePriceId:\\s*['"\\\`]([^'"\\\`]*)['"\\\`]`,
    'g'
  );
  const items = [];
  let m;
  while ((m = re.exec(file)) !== null) {
    items.push({ slug: m[1], name: m[2], priceUsd: parseInt(m[3], 10), currentPriceId: m[4] });
  }
  return items;
}

const allItems = extractItems();
console.log(`Found ${allItems.length} items in data/products.ts`);

const results = [];
for (const item of allItems) {
  // Reuse existing product by metadata.slug if present
  const existing = await stripe.products.search({
    query: `metadata['slug']:'${item.slug}'`,
  });

  let product = existing.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: item.name,
      metadata: { slug: item.slug },
      shippable: false,
      tax_code: 'txcd_10103001', // digital good
    });
    console.log(`  + product ${item.slug} → ${product.id}`);
  } else {
    console.log(`  = product ${item.slug} → ${product.id} (reused)`);
  }

  // Find or create a price matching the current USD amount
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find((p) => p.unit_amount === item.priceUsd * 100 && p.currency === 'usd');
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: item.priceUsd * 100,
      currency: 'usd',
      metadata: { slug: item.slug },
      tax_behavior: 'exclusive',
    });
    console.log(`  + price   ${item.slug} → ${price.id}`);
  } else {
    console.log(`  = price   ${item.slug} → ${price.id} (reused)`);
  }

  // Ensure it's the product's default_price (so future Checkout sessions can
  // also use stripe.prices.retrieve(price.id))
  if (product.default_price !== price.id) {
    await stripe.products.update(product.id, { default_price: price.id });
  }

  results.push({ slug: item.slug, productId: product.id, priceId: price.id });
}

// Patch data/products.ts in place
let patched = file;
for (const r of results) {
  // Look for `slug: '<slug>',\n` and patch the nearby `stripePriceId: '',`
  // within the same object literal block.
  const slugLine = patched.indexOf(`slug: '${r.slug}',`);
  if (slugLine < 0) continue;
  const after = patched.slice(slugLine);
  const blockEnd = slugLine + after.indexOf("\n  },");
  const block = patched.slice(slugLine, blockEnd);
  const replaced = block.replace(/stripePriceId:\s*'[^']*'/, `stripePriceId: '${r.priceId}'`);
  patched = patched.slice(0, slugLine) + replaced + patched.slice(blockEnd);
}
writeFileSync('data/products.ts', patched, 'utf8');
console.log('\nPatched data/products.ts with new price IDs.');

console.log('\n=== Summary ===');
for (const r of results) console.log(`  ${r.slug.padEnd(35)} ${r.priceId}`);
console.log(`\nDone. ${results.length} items wired.`);
console.log(`Mode: ${mode}. ${mode === 'TEST' ? 'Use Stripe test card 4242 4242 4242 4242 to verify checkout.' : 'Live. Real charges will happen.'}`);
