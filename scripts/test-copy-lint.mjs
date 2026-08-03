/**
 * Unit tests for lib/site-copy-lint.mjs. Zero deps, run with `node`.
 *
 * A linter that cries wolf gets switched off, so the NEGATIVE cases here matter
 * more than the positive ones: real sentences from real forged sites that must
 * stay silent. Every "clean" case below is lifted from a shipped build.
 */
import { copyFindings, visibleText, hasHighSeverity } from '../lib/site-copy-lint.mjs';

let pass = 0;
let fail = 0;

function check(label, html, expectIds, businessName) {
  const got = copyFindings(html, businessName).map((f) => f.id).sort();
  const want = [...expectIds].sort();
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL ${label}\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`);
    return;
  }
  console.log(`PASS ${label}`);
}

/* ── the defects that actually shipped ─────────────────────────────── */
check('the stutter that shipped', '<p>This is Olivia\'s Chocolates\'s command center</p>', ['double-possessive', 'business-name-possessive'], "Olivia's Chocolates");
// English genuinely allows 's on a singular noun ending in s. These must stay quiet
// or the linter gets muted, which costs more than every typo it would ever find.
check('singular nouns ending in s are correct', '<p>the business\'s phone, the glass\'s edge, the class\'s roster</p>', []);
check('Valley Glass is house style, never high', '<p>Valley Glass\'s crew arrives at seven.</p>', ['business-name-possessive'], 'Valley Glass');
check('a order', '<p>Called after hours, wants a quote on a order.</p>', ['article-agreement']);
check('a appointment', '<p>Pricing on a appointment</p>', ['article-agreement']);
check('unfilled token', '<p>Best {job} experience we have had</p>', ['unfilled-token']);
check('anti voice agent', '<p>I answer my own phone. We are not a call center.</p>', ['anti-voice-agent']);
check('lorem', '<p>Lorem ipsum dolor sit amet</p>', ['placeholder-prose']);
check('em dash', '<p>Hand rolled — by us.</p>', ['em-dash']);
check('doubled word', '<p>We serve the the whole valley</p>', ['double-space-sentence']);
check('an before consonant', '<p>Book an roofing visit</p>', ['an-before-consonant']);
check('name ending in s, in alt text', '<img alt="Palmers\'s truck">', ['double-possessive']);

/* ── must stay SILENT. These are real lines from shipped builds. ───── */
check('clean chocolate site', '<h1>Olivia\'s Chocolates</h1><p>Hand rolled in Kalispell. Shipped by the case. Ask for a sample kit and a quote.</p>', [], "Olivia's Chocolates");
check('correct plural possessive', '<p>Olivia\'s Chocolates\' gift boxes are built to order.</p>', [], "Olivia's Chocolates");
check('already-possessive name left alone', '<p>Joe\'s kitchen runs on time.</p>', [], "Joe's");
check("it's / that's are not names", '<p>It\'s the best. That\'s why.</p>', []);
check('an hour is correct', '<p>We answer within an hour.</p>', []);
check('a job is correct', '<p>Quote on a job, comparing two shops.</p>', []);
check('an order is correct', '<p>Wants a quote on an order.</p>', []);
check('base64 is never linted', `<img src="data:image/jpeg;base64,${'a'.repeat(400)}the the${'b'.repeat(200)}">`, []);
check('script bodies are never linted', '<script>const a = {job: 1}; // the the</script><p>Fine copy.</p>', []);
check('svg filter refs are never linted', '<svg><filter id="n"><feTurbulence/></filter></svg><p>Fine copy.</p>', []);
check('honest owner pride still allowed', '<p>My name is on the truck. You deal with the man who pours the slab.</p>', []);

/* ── visibleText behaviour ─────────────────────────────────────────── */
// Element boundaries become newlines on purpose, so a nav link can never weld
// itself onto the heading beneath it and read as a doubled word.
const vt = visibleText('<style>.a{}</style><h1>Hi</h1><img alt="A shop counter"><script>x</script>');
if (vt === 'Hi\nA shop counter') {
  console.log('PASS visibleText keeps alt, drops style+script, breaks on elements');
  pass++;
} else {
  console.log(`FAIL visibleText -> ${JSON.stringify(vt)}`);
  fail++;
}

// The false positive that would have muted this linter: adjacent elements.
const adjacent = copyFindings('<a>Menu</a><h2>Menu</h2><span>01</span><span>01</span>');
if (!adjacent.length) { console.log('PASS adjacent elements are not a doubled word'); pass++; }
else { console.log(`FAIL adjacent elements flagged ${JSON.stringify(adjacent.map((f) => f.id))}`); fail++; }

// But a genuine doubled word inside one element still gets caught.
const doubled = copyFindings('<p>We serve the the whole valley</p>').map((f) => f.id);
if (doubled.includes('double-space-sentence')) { console.log('PASS a real doubled word inside one element is caught'); pass++; }
else { console.log('FAIL real doubled word missed'); fail++; }

// And "a" / "order" split across elements is not an article error.
const split = copyFindings('<p>Pick a</p><h3>order</h3>').map((f) => f.id);
if (!split.includes('article-agreement')) { console.log('PASS a/an never spans two elements'); pass++; }
else { console.log('FAIL a/an spanned an element boundary'); fail++; }

const sev = hasHighSeverity(copyFindings('<p>Hand rolled — by us.</p>'));
if (sev === false) { console.log('PASS an em dash alone is not high severity'); pass++; }
else { console.log('FAIL em dash severity'); fail++; }

/* ── THE SOURCE GUARD ───────────────────────────────────────────────
 *
 * The linter above reads STORED html: forged demos and client sites. But the
 * defect Sarah found on 2026-08-03 was not in stored html at all. It was in
 * React that wraps those pages, and never gets written to a row: the live call
 * pill on every demo site, the command center tour, the Demo Station emails.
 * The watchdog is structurally blind to all of it.
 *
 * So this walks the source instead, and fails on a hand-written possessive.
 * lib/business-name.ts exists precisely so nobody has to write one by hand, and
 * this is what keeps that true. Entity forms are included because they are how
 * seven of them hid from the first sweep.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SCAN_DIRS = ['app', 'components', 'lib', 'data'];
const HAND_ROLLED = /\}(?:'|’|&apos;|&#39;|&rsquo;)s\b/;
// First NAMES legitimately take 's ("Chris's card"), and these are the only
// files allowed to interpolate one. Everything else must go through possessive().
const ALLOWED = new Set([
  'business-name.ts', // the helper itself, and its own documentation
  'site-copy-lint.mjs', // the rules quote the bad pattern in order to match it
  'PartnerHub.tsx', // {row.name.split(' ')[0]}'s card, a first name
  'CampaignDetail.tsx', // {rep.first}'s Zoho, a first name
  'site-directive.mjs', // {owner}'s phone: a placeholder the builder fills with a FIRST name
]);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next') continue;
    const full = `${dir}/${name}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const offenders = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(`${ROOT}/${dir}`)) {
    const base = file.split('/').pop();
    if (ALLOWED.has(base)) continue;
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (HAND_ROLLED.test(line)) offenders.push(`${file.replace(ROOT, '')}:${i + 1}`);
    });
  }
}

if (offenders.length) {
  console.log(`\nFAIL source guard: ${offenders.length} hand-written possessive(s). Use possessive() from lib/business-name.ts.`);
  offenders.slice(0, 12).forEach((o) => console.log(`     ${o}`));
  fail++;
} else {
  console.log('PASS source guard: no hand-written possessives outside lib/business-name.ts');
  pass++;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
