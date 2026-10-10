#!/usr/bin/env node
/**
 * NO PRICES ON THE SITE, AND THE GATE HAS A TEST (2026-10-10).
 *
 * Sarah: "i dont want any prices on my site at all." Conversation first: no
 * price and no self-serve checkout on any public page. Prices live privately in
 * ops/pricing.json, the admin, proposals and pay links (lib/talk-first.ts).
 *
 * How it reads the site: it starts from every public route under app/ (admin,
 * api, portals, HQs, receipts and demo businesses are private or not ours) and
 * follows the imports into components/, data/ and lib/, plus every MDX file in
 * content/. In each file it reaches, it flags:
 *   1. a dollar amount in copy ($497, $1,055, `$${x}`),
 *   2. a price field rendered from MMS price data (priceUsd, priceCents, ...),
 *   3. a structured-data price (price:, priceRange, lowPrice) that is not zero,
 *   4. a fetch to a retired public checkout route.
 *
 * Someone else's number is allowed only by an entry in ALLOW with its reason: a
 * competitor's published plan on a comparison page, a lost-revenue calculator, a
 * demo business's menu. A gate that silently stops matching is no gate, so the
 * fixtures below run first, and the build fails if the detector drifts.
 *
 * Two layers, both in the build chain:
 *   source  node scripts/check-no-prices.mjs           before next build (--list shows allowed hits)
 *   output  node scripts/check-no-prices.mjs --output  after next build, reads every prerendered
 *           public page through lib/price-scan.mjs, the same detector the live crawl uses, so a
 *           price that arrives from a data file is caught where it actually renders.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pricesIn, allowedReason } from '../lib/price-scan.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ── The detector ─────────────────────────────────────────────────────── */

// `$1` to `$9` right before a quote or bracket is a regex replacement, not a price.
const DOLLAR = /\$\s?\d[\d,]*(?:\.\d+)?\s*[kKM]?(?<!\$\d(?=['"`)]))|\$\$\{|\$['"`]\s*\+/g;
// A price field is flagged where it renders (passed on, formatted, divided), not where it is compared (=== 0).
const PRICE_FIELD = /\b(?:priceUsd|priceCents|foundingPrice|futurePrice|individualTotal|setupCents|monthlyCents|bundleSetupCents|bundleMonthlyCents|perLocationUsd|amountCents)\b(?=\s*[)}.,/*`\]])/g;
// A price key whose value is a number, a quoted number, or a price expression. A zero is a
// free event and passes; a phrase ('Scoped and quoted privately') and prose ("not price: a") pass.
const LD_PRICE = /\b(?:price|lowPrice|highPrice|priceRange)\s*:\s*(?!['"`]?0(?:\.0+)?['"`]?\s*[,}\n])(?=[\d(]|['"`][\d$]|[\w.]*(?:price|cents|usd|amount)\w*\s*[,}\n.)/])/gi;
const RETIRED_CHECKOUT = /\/api\/(?:bootcamp|mustard-mode|programs|seed-to-system|store|launch-film|hundredfold|hatchery|geo|chief|ai-native|ads|press|pictures|mustard-launch|demo-agent|demo-order)\/checkout/g;

/** Comments are not copy. Strip block comments and whole-line comments, keep line numbers. */
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => ' '.repeat(m.length));
}

/** Every price hit in one file's source: [{ kind, line, text }]. `isData` skips field definitions. */
export function priceHits(src, { isData = false, isMdx = false } = {}) {
  const text = isMdx ? src : stripComments(src);
  const hits = [];
  const lineOf = (i) => text.slice(0, i).split('\n').length;
  const push = (kind, m) => hits.push({ kind, line: lineOf(m.index ?? 0), text: m[0] });
  for (const m of text.matchAll(DOLLAR)) push('dollar amount', m);
  if (!isMdx) {
    for (const m of text.matchAll(RETIRED_CHECKOUT)) push('retired checkout', m);
    for (const m of text.matchAll(LD_PRICE)) {
      // Only structured-data shapes: a key inside an object literal, not a prop or a word.
      const before = text.slice(Math.max(0, (m.index ?? 0) - 1), m.index ?? 0);
      if (/[\s{,]/.test(before)) push('structured-data price', m);
    }
    if (!isData) for (const m of text.matchAll(PRICE_FIELD)) push('price field rendered', m);
  }
  return hits;
}

/* ── Fixtures: the gate must keep catching these and keep passing those ── */

function selfTest() {
  const problems = [];
  const expect = (name, src, want, opts) => {
    const got = priceHits(src, opts).length;
    if (want === 0 ? got !== 0 : got < want) problems.push(`${name}: expected ${want === 0 ? 'no hits' : `at least ${want}`}, got ${got}`);
  };
  expect('a typed price', `<p>Take a seat, $97</p>`, 1);
  expect('a price with a comma', `'The public price becomes $1,997'`, 1);
  expect('an interpolated price', 'label={`Get it . $${program.priceUsd}`}', 2);
  expect('a concatenated price', `'Bundle · Save $' + item.savings`, 1);
  expect('a rendered price field', `<span>{usd(t.priceCents)}</span>`, 1);
  expect('a structured-data price', `offers: { '@type': 'Offer', price: (t.priceCents / 100).toFixed(2) }`, 1, { isData: true });
  expect('a retired checkout fetch', `await fetch('/api/store/checkout', { method: 'POST' })`, 1);
  expect('an MDX price', 'Tickets are $97, $297 and $497.', 3, { isMdx: true });
  expect('a free event is not a price', `offers: { '@type': 'Offer', price: '0.00', priceCurrency: 'USD' }`, 0, { isData: true });
  expect('a price in a comment is not copy', `// was $497 before 2026-10-10\nconst a = 1;`, 0);
  expect('a template literal without a dollar amount', 'const s = `${a} and ${b}`;', 0);
  expect('a field definition in data', `priceUsd: 197,`, 0, { isData: true });
  expect('a percentage is not a price', `<p>You earn 25% of every invoice.</p>`, 0);
  expect('a regex replacement is not a price', `list.replace(/, ([^,]*)$/, ' and $1')`, 0);
  expect('a comparison is not a render', `{tier.priceUsd === 0 ? 'Free' : 'Request a quote'}`, 0);
  expect('a quoted phrase is not a price', `price: 'Scoped and quoted privately',`, 0, { isData: true });
  expect('prose is not structured data', `The deciding question is not price: patient details are protected.`, 0);
  expect('a field passed to a formatter renders', `{usd(OPERATOR.priceCents)}`, 1);
  expect('a numeric price key', `{ id: 'website_build', price: 5750, qty: 1 }`, 1, { isData: true });
  return problems;
}

/* ── Which files are public ───────────────────────────────────────────── */

// Route segments that are private or not ours. A public route under one of these is a bug.
const PRIVATE_SEGMENTS = new Set(['admin', 'api', 'cc', 'portal', 'proposal', 'pay', 's', 'hq', 'welcome', 'success', 'thanks', 'login', 'demo', 'office', 'intake', 'review']);
// Private pages that sit under a public route: a host's own earnings dashboard.
const PRIVATE_PATHS = [/^bootcamp[\\/]host[\\/]\[slug\]/];
const ENTRY_FILES = /^(page|layout|opengraph-image|twitter-image|route|not-found|error|loading|template)\.(tsx|ts|mdx)$/;

function walk(dir, fn) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, fn);
    else fn(p);
  }
}

function publicEntries() {
  const out = [];
  walk(join(root, 'app'), (p) => {
    const segs = relative(join(root, 'app'), p).split(/[\\/]/);
    const file = segs.pop();
    if (!ENTRY_FILES.test(file)) return;
    if (segs.some((s) => PRIVATE_SEGMENTS.has(s))) return;
    if (PRIVATE_PATHS.some((re) => re.test(segs.join('/')))) return;
    out.push(p);
  });
  return out;
}

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = join(root, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null;
  for (const ext of ['', '.tsx', '.ts', '.mjs', '.js', '/index.tsx', '/index.ts']) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

// Private modules a public file may import without its contents being public copy.
const PRIVATE_MODULES = [/[\\/]components[\\/](admin|portal|cc)[\\/]/, /[\\/]lib[\\/](acq|factory|partner-desk[\\/](?!letters))[\\/]?/];

/** The render layer: public entries plus every component they reach. data/ and lib/
 *  are logic and source tables that admin shares; what they put on a page is read
 *  after the build, in the prerendered HTML (the output layer below). */
function reachable(entries) {
  const seen = new Set();
  const stack = [...entries];
  const components = join(root, 'components');
  while (stack.length) {
    const p = stack.pop();
    if (seen.has(p)) continue;
    seen.add(p);
    if (!/\.(tsx?|mjs)$/.test(p)) continue;
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(IMPORT)) {
      const r = resolveImport(p, m[1] ?? m[2]);
      if (r && r.startsWith(components) && !PRIVATE_MODULES.some((re) => re.test(r))) stack.push(r);
    }
  }
  return [...seen];
}

/* ── Someone else's number: allowed, with the reason ──────────────────── */

// Each entry was read by a person: every figure in the file is someone else's number.
// `kinds` defaults to dollar amounts only; a rendered MMS price field is never allowed.
const ALLOW = [
  { file: /^app[\\/]ai-receptionist-cost[\\/]page\.tsx$/, why: 'competitor plans as published on their pricing pages, with source and date', kinds: ['dollar amount', 'structured-data price'] },
  { file: /^data[\\/](alternatives-pages|compare-pages|best-pages|receptionist-cost)\.ts$/, why: 'competitor plans as published on their pricing pages, with source and date' },
  { file: /^content[\\/]blog[\\/]/, why: 'market and third-party figures in articles (tool plans, wages, answering-service rates)' },
  { file: /^content[\\/]playbooks[\\/]/, why: 'teaching content: tool costs and example pricing for the reader’s own product' },
  { file: /^content[\\/]work[\\/]/, why: 'client results and legacy costs in case studies' },
  { file: /^data[\\/]industries\.ts$/, why: 'lost-revenue math and market costs on industry pages' },
  { file: /^app[\\/](voice-agents[\\/]page|for[\\/]restaurants[\\/]page)\.tsx$/, why: 'lost-revenue math and an unsourced industry claim we refute' },
  { file: /^components[\\/](voice-agents[\\/]MissedCallMath|RestaurantCalculator|RestaurantVoiceSection|mustard[\\/]MissedMoney|RecoveryMachine|journey[\\/]JourneyCalculator)\.tsx$/, why: 'lost-revenue calculators: the visitor’s own numbers' },
  { file: /^(app[\\/]scaling-roadmap[\\/]page|components[\\/](RoadmapDocument|ScalingRoadmapEngine))\.tsx$/, why: 'the visitor’s revenue stages, not a price' },
  { file: /^app[\\/]future-proof[\\/]page\.tsx$/, why: 'the revenue band of the businesses we work with, not a price' },
  { file: /^app[\\/]marketing[\\/]page\.tsx$/, why: 'ad spend guidance: the client’s own budget on Meta or Google' },
  { file: /^components[\\/]celebrate[\\/]CelebrateSections\.tsx$/, why: 'the gift budget a team sets per person' },
  { file: /^components[\\/]mustard-mode[\\/]StartHere\.tsx$/, why: 'Anthropic’s Claude plan, which the visitor pays Anthropic' },
  { file: /^app[\\/]super-nomad[\\/]page\.tsx$/, why: 'example travel budgets inside the product' },
  { file: /^app[\\/]press[\\/]opengraph-image\.tsx$/, why: 'a demo business menu on the share card' },
  { file: /^components[\\/]demo-agent[\\/]BuildExperience\.tsx$/, why: 'an example business’s service call in a form placeholder' },
  { file: /^app[\\/]command-center[\\/]page\.tsx$/, why: 'a client screenshot’s alt text and illustrative third-party tool costs' },
  { file: /^app[\\/]sample-proposal[\\/]page\.tsx$/, why: 'line items render through ProposalDoc with hidePrices; verified no figure reaches the page', kinds: ['structured-data price'] },
];

function allowedWhy(rel, kind) {
  return ALLOW.find((a) => a.file.test(rel) && (a.kinds ?? ['dollar amount']).includes(kind))?.why ?? null;
}

/* ── Output layer: the prerendered pages after `next build` ───────────── */

function outputSelfTest() {
  const problems = [];
  const expect = (name, html, want) => {
    const got = pricesIn(html).length;
    if (want === 0 ? got !== 0 : got < want) problems.push(`output ${name}: expected ${want === 0 ? 'no hits' : `at least ${want}`}, got ${got}`);
  };
  expect('a price in a card', '<div><span>$497</span> one seat</div>', 1);
  expect('an encoded dollar sign', '<p>Take a seat, &#36;97</p>', 1);
  expect('a JSON-LD price', '<script type="application/ld+json">{"offers":{"price":"97.00"}}</script>', 1);
  expect('a free event in JSON-LD', '<script type="application/ld+json">{"offers":{"price":"0.00","priceCurrency":"USD"}}</script>', 0);
  expect('a price inside a script bundle is not copy', '<script>self.__next_f.push(["$1"])</script><p>Talk to Sarah</p>', 0);
  expect('a percentage', '<p>25% of every invoice</p>', 0);
  return problems;
}

/** Route for a prerendered file: .next/server/app/foo/bar.html -> /foo/bar, index.html -> /. */
function routeOf(rel) {
  const r = '/' + rel.replace(/\\/g, '/').replace(/\.html$/, '').replace(/(^|\/)index$/, '');
  return r === '/' ? '/' : r.replace(/\/$/, '');
}

function outputCheck() {
  const problems = outputSelfTest();
  if (problems.length) {
    console.error('NO-PRICES OUTPUT CHECK BROKEN: the page detector drifted. Fix lib/price-scan.mjs:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  const base = join(root, '.next', 'server', 'app');
  if (!existsSync(base)) {
    console.error('no prices (output): .next/server/app is missing. Run after `next build`.');
    process.exit(1);
  }
  const bad = [];
  let pages = 0;
  let allowedPages = 0;
  walk(base, (p) => {
    if (!p.endsWith('.html')) return;
    const route = routeOf(relative(base, p));
    const segs = route.split('/').filter(Boolean);
    if (segs.some((s) => PRIVATE_SEGMENTS.has(s)) || PRIVATE_PATHS.some((re) => re.test(segs.join('/')))) return;
    pages++;
    const hits = pricesIn(readFileSync(p, 'utf8'));
    if (!hits.length) return;
    if (allowedReason(route)) allowedPages++;
    else bad.push({ route, hits });
  });
  console.log(`no prices (output): ${pages} prerendered public pages read, ${allowedPages} allowed pages with figures that are not ours, ${bad.length} with a price`);
  if (bad.length) {
    console.error('\nA PRICE RENDERED ON A PUBLIC PAGE. Conversation first: take it out.');
    for (const b of bad) {
      console.error(`  ${b.route}`);
      for (const h of b.hits.slice(0, 4)) console.error(`      ${h.kind}: "${h.match}"  ... ${h.context}`);
    }
    process.exitCode = 1;
  }
}

/* ── Run ──────────────────────────────────────────────────────────────── */

if (process.argv.includes('--output')) {
  outputCheck();
  process.exit(process.exitCode ?? 0);
}

const fixtureProblems = [...selfTest(), ...outputSelfTest()];
if (fixtureProblems.length) {
  console.error('NO-PRICES GATE BROKEN: the detector drifted. Fix scripts/check-no-prices.mjs:');
  for (const p of fixtureProblems) console.error(`  - ${p}`);
  process.exit(1);
}

const files = reachable(publicEntries());
walk(join(root, 'content'), (p) => {
  if (p.endsWith('.mdx')) files.push(p);
});

const violations = [];
const allowed = [];
for (const p of files) {
  const rel = relative(root, p);
  const hits = priceHits(readFileSync(p, 'utf8'), { isData: /^data[\\/]/.test(rel), isMdx: rel.endsWith('.mdx') });
  if (!hits.length) continue;
  for (const h of hits) {
    const why = allowedWhy(rel, h.kind);
    (why ? allowed : violations).push({ rel, ...h, why });
  }
}

if (process.argv.includes('--list')) for (const a of allowed) console.log(`allowed  ${a.rel}:${a.line}  ${a.text}  (${a.why})`);
console.log(`no prices: ${files.length} public files read, ${allowed.length} allowed figures that are not ours, ${violations.length} violations`);
if (violations.length) {
  console.error('\nA PRICE IS ON THE PUBLIC SITE. Conversation first: take it out, or point the CTA at talkFirstHref().');
  for (const v of violations) console.error(`  ${v.rel}:${v.line}  [${v.kind}]  ${v.text}`);
  process.exitCode = 1;
}
