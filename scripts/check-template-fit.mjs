#!/usr/bin/env node
/**
 * RANDOM ONLY PICKS A TEMPLATE DESIGNED FOR THE TRADE (2026-08-26).
 *
 * Before this, templateFit scored an unlisted template a neutral 1, so anything
 * not explicitly in avoidFor could win a draw. That is how a massage studio in
 * Whitefish got Wild Reverent, a church system, and how a dental lead had a 70%
 * chance of drawing a system built for somebody else. The picker now draws only
 * from the templates whose fits list names the trade.
 *
 * That rule is only safe while every trade HAS a real set to draw from, which
 * is what this gate holds down:
 *
 *   1. EVERY TRADE HAS AT LEAST THREE. One template per trade means every
 *      dentist in the country gets the same website. Three is the floor that
 *      keeps rotation real and gives the same-town exclusion somewhere to go.
 *   2. NO TRADE IS BOTH FITTED AND AVOIDED. A key in fits and avoidFor at once
 *      resolves as avoided, so the fits entry is a lie that reads as coverage.
 *   3. EVERY KEY IS A REAL TRADE. A typo in a fits array does not fail, it just
 *      silently stops covering the trade it meant to cover.
 *   4. THE PICKER OBEYS. Simulated across every trade, Random never returns a
 *      template that is not designed for it, and exclusions never buy a misfit:
 *      a trade whose whole designed set is excluded repeats one of them rather
 *      than reaching for a template built for somebody else.
 *
 * Run:  node scripts/check-template-fit.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_TEMPLATES, FIT_DESIGNED, templateFit, siteTemplate, pickSiteTemplate } from '../lib/site-templates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FLOOR = 3;

/* The trade keys, read off the OsTradeKey union in data/demo-os-trades.ts.
   Parsed rather than imported because this gate is .mjs and the trades are TS. */
const src = readFileSync(path.join(ROOT, 'data', 'demo-os-trades.ts'), 'utf8');
const union = src.slice(src.indexOf('export type OsTradeKey ='));
const TRADES = [...union.slice(0, union.indexOf(';')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
if (TRADES.length < 20) {
  console.error('\nCould not read the OsTradeKey union out of data/demo-os-trades.ts.');
  console.error('This gate cannot verify trade coverage without it.\n');
  process.exit(1);
}
const known = new Set(TRADES);

const problems = [];

// 3. real keys only
for (const t of SITE_TEMPLATES) {
  for (const [field, list] of [['fits', t.fits], ['avoidFor', t.avoidFor]]) {
    for (const trade of list) {
      if (!known.has(trade)) problems.push(`${t.key} ${field} names "${trade}", which is not an OsTradeKey`);
    }
  }
  // 2. no contradiction
  const both = t.fits.filter((x) => t.avoidFor.includes(x));
  for (const x of both) problems.push(`${t.key} lists ${x} in BOTH fits and avoidFor, so the fits entry is dead`);
}

// 1. the floor
for (const trade of TRADES) {
  const designed = SITE_TEMPLATES.filter((t) => t.fits.includes(trade)).map((t) => t.key);
  if (designed.length < FLOOR) {
    problems.push(
      `${trade} has ${designed.length} template(s) designed for it (${designed.join(', ') || 'none'}), the floor is ${FLOOR}`,
    );
  }
}

// 4. the picker obeys, over enough draws to catch a weighting bug
let i = 7;
const rand = () => ((i = (i * 1103515245 + 12345) % 2147483648) / 2147483648);
for (const trade of TRADES) {
  const designed = SITE_TEMPLATES.filter((t) => templateFit(t, trade) === FIT_DESIGNED).map((t) => t.key);
  for (let n = 0; n < 500; n++) {
    const k = pickSiteTemplate({ trade, rand });
    if (templateFit(siteTemplate(k), trade) !== FIT_DESIGNED) {
      problems.push(`Random gave ${trade} the template ${k}, which is not designed for it`);
      break;
    }
  }
  // exclusions must never cost fit
  const k = pickSiteTemplate({ trade, exclude: designed, rand });
  if (!designed.includes(k)) {
    problems.push(`${trade} with its whole designed set excluded fell to ${k} instead of repeating one of ${designed.join(', ')}`);
  }
}

if (problems.length) {
  console.error('\nA TRADE CAN GET A TEMPLATE THAT WAS NOT BUILT FOR IT:\n');
  for (const p of problems) console.error('  x ' + p);
  console.error(`\nEvery trade needs at least ${FLOOR} templates naming it in fits. Widen the fits`);
  console.error('array of a template whose alsoFits line already covers the trade, or design one.');
  console.error('Do not solve it by loosening the picker back to neutral weights.\n');
  process.exit(1);
}

const thin = TRADES.map((t) => [t, SITE_TEMPLATES.filter((x) => x.fits.includes(t)).length])
  .sort((a, b) => a[1] - b[1])
  .slice(0, 3)
  .map(([t, n]) => `${t} ${n}`)
  .join(', ');
console.log(`template fit: ${TRADES.length} trades, all at ${FLOOR}+ designed templates (thinnest: ${thin})`);
