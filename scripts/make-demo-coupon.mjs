/**
 * Mint a promo code for the demo funnel.
 *
 * Two jobs: let Sarah run a real order end to end without paying herself, and hand a
 * specific person a comp (a partner, a case-study client, a church, a friend).
 *
 * The checkout already sets allow_promotion_codes, so a code works the moment it
 * exists. That is also why the guards below are not optional: a 100% code that leaks
 * is a free product for the entire internet.
 *
 * GUARDS (rule: never leak revenue)
 *  - duration ONCE by default. It zeroes the FIRST invoice (setup + first month) and
 *    nothing after, so a comp can never become a free subscription forever. Use
 *    --forever only when you truly mean "this person never pays", and it will say so
 *    out loud before it does it.
 *  - max_redemptions defaults to 1. A code is for a person, not a crowd.
 *  - expires in 30 days by default. A code nobody used is a code nobody can leak.
 *  - the code string is unguessable unless you name it yourself.
 *
 * Usage:
 *   node scripts/make-demo-coupon.mjs                          # 100% off first invoice, 1 use, 30 days
 *   node scripts/make-demo-coupon.mjs --code SARAHTEST         # name it
 *   node scripts/make-demo-coupon.mjs --percent 50 --uses 3    # partial comp, 3 people
 *   node scripts/make-demo-coupon.mjs --forever                # free FOREVER (asks first)
 *   node scripts/make-demo-coupon.mjs --list                   # what is live right now
 *   node scripts/make-demo-coupon.mjs --kill CODE              # switch one off
 */
import Stripe from 'stripe';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const key = env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY is not set.');
  process.exit(1);
}
const stripe = new Stripe(key);
const LIVE = key.startsWith('sk_live');

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

async function list() {
  const codes = await stripe.promotionCodes.list({ limit: 50 });
  const mine = codes.data.filter((c) => c.metadata?.source === 'demo-funnel');
  if (!mine.length) return console.log('No demo-funnel promo codes exist.');
  console.log(`\n${mine.length} demo-funnel code(s):\n`);
  for (const c of mine) {
    const cp = c.coupon;
    const off = cp.percent_off ? `${cp.percent_off}% off` : `$${(cp.amount_off ?? 0) / 100} off`;
    const dur = cp.duration === 'forever' ? 'FOREVER' : cp.duration === 'once' ? 'first invoice only' : cp.duration;
    const used = `${c.times_redeemed}/${c.max_redemptions ?? '∞'}`;
    const exp = c.expires_at ? new Date(c.expires_at * 1000).toISOString().slice(0, 10) : 'no expiry';
    console.log(`  ${c.code.padEnd(18)} ${off.padEnd(10)} ${dur.padEnd(18)} used ${used.padEnd(6)} exp ${exp}  ${c.active ? '' : '(OFF)'}`);
  }
  console.log('');
}

async function kill(code) {
  const found = await stripe.promotionCodes.list({ code, limit: 1 });
  const pc = found.data[0];
  if (!pc) return console.error(`No promo code named ${code}.`);
  await stripe.promotionCodes.update(pc.id, { active: false });
  console.log(`${code} is switched off. Nobody can redeem it again.`);
}

async function main() {
  if (flag('list')) return list();
  const toKill = arg('kill');
  if (toKill) return kill(toKill);

  const percent = Number(arg('percent', '100'));
  const uses = Number(arg('uses', '1'));
  const days = Number(arg('days', '30'));
  const forever = flag('forever');
  const code = (arg('code') || `MMS${Math.random().toString(36).slice(2, 8).toUpperCase()}`).toUpperCase();

  if (!(percent > 0 && percent <= 100)) {
    console.error('--percent must be between 1 and 100.');
    process.exit(1);
  }

  // The one genuinely dangerous combination gets a human in the loop.
  if (forever && percent === 100) {
    console.log(`\n  ${LIVE ? 'LIVE STRIPE. ' : ''}You are about to create a code that makes the monthly bill $0 FOREVER,`);
    console.log(`  not just the first invoice. ${uses} redemption(s). That is a permanent free client.\n`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('  Type FOREVER to confirm: ');
    rl.close();
    if (answer.trim() !== 'FOREVER') {
      console.log('  Nothing created.');
      process.exit(0);
    }
  }

  const coupon = await stripe.coupons.create({
    percent_off: percent,
    // ONCE = the first invoice only, which is where the setup fee and the first month
    // live. Month two bills normally. This is what keeps a comp from silently becoming
    // a free subscription for life.
    duration: forever ? 'forever' : 'once',
    name: `Demo funnel ${percent}% ${forever ? '(forever)' : '(first invoice)'}`,
    metadata: { source: 'demo-funnel' },
  });

  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code,
    max_redemptions: uses,
    expires_at: Math.floor(Date.now() / 1000) + days * 24 * 60 * 60,
    metadata: { source: 'demo-funnel' },
  });

  console.log(`\n  CODE: ${promo.code}`);
  console.log(`  ${percent}% off ${forever ? 'EVERY invoice, forever' : 'the first invoice (setup + first month)'}`);
  console.log(`  ${uses} redemption${uses === 1 ? '' : 's'}, expires in ${days} days`);
  console.log(`  ${LIVE ? 'LIVE Stripe' : 'TEST Stripe'}`);
  console.log(`\n  They enter it at checkout under "Add promotion code".`);
  if (!forever && percent === 100) {
    console.log(`  Note: month TWO bills at the normal rate. Cancel the subscription if this was only a test.\n`);
  } else {
    console.log('');
  }
}

await main();
