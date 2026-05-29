#!/usr/bin/env node
/**
 * Read-only check: confirm every stripePriceId in data/products.ts resolves to
 * an active Stripe Price, and report mode (live/test) + amount. Creates nothing.
 *
 * Usage: node scripts/verify-stripe-prices.mjs
 */
import Stripe from 'stripe';
import { readFileSync, existsSync } from 'node:fs';

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
if (!key) { console.error('Missing STRIPE_SECRET_KEY'); process.exit(1); }
console.log(`Stripe mode: ${key.startsWith('sk_live_') ? 'LIVE' : 'TEST'}\n`);
const stripe = new Stripe(key);

const file = readFileSync('data/products.ts', 'utf8');
const re = /slug:\s*'([^']+)'[\s\S]*?stripePriceId:\s*'([^']*)'/g;
const items = [];
let m;
while ((m = re.exec(file)) !== null) items.push({ slug: m[1], priceId: m[2] });

let bad = 0;
for (const it of items) {
  if (!it.priceId) { console.log(`  EMPTY  ${it.slug.padEnd(34)} (no price id)`); bad++; continue; }
  try {
    const p = await stripe.prices.retrieve(it.priceId);
    const ok = p.active ? 'ok   ' : 'INACT';
    if (!p.active) bad++;
    console.log(`  ${ok}  ${it.slug.padEnd(34)} ${it.priceId}  $${(p.unit_amount / 100).toFixed(0)} ${p.currency}`);
  } catch (e) {
    console.log(`  FAIL  ${it.slug.padEnd(34)} ${it.priceId}  ${e.message}`);
    bad++;
  }
}
console.log(`\n${items.length - bad}/${items.length} prices valid & active.`);
process.exit(bad ? 1 : 0);
