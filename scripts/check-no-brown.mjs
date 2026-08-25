#!/usr/bin/env node
/**
 * NO BROWN, ENFORCED (2026-08-25).
 *
 * Sarah: "i hate brown - please take brown off now and never use it anywhere
 * again." The second half of that sentence is the hard part, so it gets a gate
 * rather than a good intention.
 *
 * Three things are checked, and the first two are the ones that actually keep
 * brown off a customer's screen:
 *
 *   1. THE LAW IS IN THE LAW. Every build directive must carry NO_BROWN. A rule
 *      that quietly stops being handed to the builder is a rule that does not
 *      exist, which is exactly how the before/after slider lost its camera lock.
 *   2. THE SHIM IS WIRED. takeBrownOff must be applied on both paths a built
 *      document can leave by: the demo route and the published client site. The
 *      143 sites already built are only clean because of it.
 *   3. THE SOURCE DOES NOT GET BROWNER. Brown literals already in the repo are
 *      counted against a recorded baseline. Adding one fails. This deliberately
 *      does not demand the existing ones be fixed in the same breath: most are
 *      the admin's own brass-gold tokens, and repainting a brand is Sarah's call,
 *      not a build gate's.
 *
 * Run:  node scripts/check-no-brown.mjs
 *       node scripts/check-no-brown.mjs --list      (show every literal)
 *       node scripts/check-no-brown.mjs --baseline  (re-record after a cleanup)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'scripts', 'no-brown-baseline.json');
const LIST = process.argv.includes('--list');
const RECORD = process.argv.includes('--baseline');

/* The one definition of brown, kept identical to lib/no-brown.ts and the shim in
   lib/closing-band.ts. Brown is warm hue that is dark or dull; vivid orange,
   gold, terracotta, brick, cream and warm grey are not brown. */
function rgbOf(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function hslOf({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l };
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}
export function isBrown(hex) {
  const q = hslOf(rgbOf(hex));
  if (q.s < 0.18) return false;
  if (q.h < 20 || q.h > 50) return false;
  if (q.l <= 0.12) return q.s >= 0.40;
  if (q.l <= 0.50) return q.s <= 0.70;
  if (q.l <= 0.62) return q.s <= 0.60;
  if (q.l <= 0.82) return q.s >= 0.30 && q.s <= 0.55;
  return false;
}

const problems = [];

// 1. every directive carries the law
const law = await import('../lib/site-directive.mjs');
const ARGS = { falEnv: '', mediaNotes: '', previousVariant: null };
const ENGINES = {
  cliDirective: () => law.cliDirective(ARGS),
  cliRealDirective: () => law.cliRealDirective(ARGS),
  codexDemoDirective: () => law.codexDemoDirective(ARGS),
  tier2DemoDirective: () => law.tier2DemoDirective(ARGS),
  tier3DemoDirective: () => law.tier3DemoDirective(ARGS),
};
for (const [name, build] of Object.entries(ENGINES)) {
  let text = '';
  try { text = build() || ''; } catch (e) { problems.push(`${name} threw: ${e.message}`); continue; }
  if (!text.includes('NO BROWN')) problems.push(`${name} no longer carries the NO_BROWN law`);
}

// 2. the serve-time shim is wired on both exits
const WIRED = [
  ['app/demo/site/[siteId]/raw/route.ts', 'the demo link a prospect opens'],
  ['lib/site-publish.ts', 'the site published onto a client domain'],
];
for (const [rel, what] of WIRED) {
  const p = path.join(ROOT, rel);
  if (!existsSync(p)) { problems.push(`${rel} is missing, so ${what} cannot be checked`); continue; }
  // Import lines are stripped first. Checking for the bare name would pass on a
  // file that imports takeBrownOff and never calls it, which is exactly what the
  // first drill of this gate did: the wiring was removed and the check stayed green.
  const body = readFileSync(p, 'utf8')
    .split(String.fromCharCode(10))
    .filter(function(l){ return !/^\s*import/.test(l); })
    .join(String.fromCharCode(10));
  if (!/takeBrownOff\s*\(/.test(body)) {
    problems.push(`${rel} does not CALL takeBrownOff, so ${what} can still ship brown`);
  }
}

// 3. source literals, against a baseline
const SKIP = new Set(['node_modules', '.git', '.next', 'public', 'docs', 'content', '_archive', '.claude', '.vercel', 'supabase', 'vapi', 'social-drafts']);
const EXT = /\.(tsx?|css|mjs|js)$/;
const found = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { walk(p); continue; }
    if (!EXT.test(name)) continue;
    readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
        const hex = '#' + m[1];
        if (isBrown(hex)) found.push({ hex: hex.toLowerCase(), where: `${path.relative(ROOT, p)}:${i + 1}` });
      }
    });
  }
})(ROOT);

if (RECORD) {
  writeFileSync(BASELINE, JSON.stringify({ count: found.length, recorded: 'run with --baseline' }, null, 2) + '\n');
  console.log(`baseline recorded: ${found.length} brown literal(s)`);
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).count : null;
if (LIST) for (const f of found) console.log(`  ${f.hex}  ${f.where}`);

if (baseline !== null && found.length > baseline) {
  const byHex = {};
  for (const f of found) byHex[f.hex] = (byHex[f.hex] || 0) + 1;
  problems.push(
    `brown literals went UP: ${baseline} -> ${found.length}. Most common: ` +
      Object.entries(byHex).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, n]) => `${h} x${n}`).join(', ') +
      `. Run with --list to see them.`,
  );
}

if (problems.length) {
  console.error('\nBROWN IS BACK:\n');
  for (const p of problems) console.error('  x ' + p);
  console.error('\nBrown is warm hue that has been darkened or dulled. Reach for a vivid orange or');
  console.error('gold, a terracotta, a cream, or a near-neutral charcoal instead of splitting the');
  console.error('difference, because the middle of that road is where brown lives.\n');
  process.exit(1);
}

console.log(
  `no brown: law carried by ${Object.keys(ENGINES).length} engines, shim wired on ${WIRED.length} exits, ` +
    `${found.length} source literal(s) against a baseline of ${baseline ?? found.length}`,
);
