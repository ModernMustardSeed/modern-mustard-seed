/**
 * Lighthouse gate for the money pages. Runs mobile + desktop against production
 * (or a URL passed as the first arg) and prints a scorecard. Standard pre-ship
 * check: every customer-facing surface should hold a11y / best-practices / SEO
 * at 100 and performance as high as the client budget allows.
 *
 * Usage:
 *   node scripts/lighthouse-money-pages.mjs                 # production
 *   node scripts/lighthouse-money-pages.mjs http://localhost:3059
 *   npm run lighthouse
 *
 * Needs Chrome. Set CHROME_PATH if it is not at the Windows default.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = (process.argv[2] || 'https://modernmustardseed.com').replace(/\/$/, '');
const PAGES = ['/', '/sidekick', '/demos', '/voice-agents/hvac', '/for/service-businesses'];
const CHROME =
  process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// a11y / best-practices / SEO must hold here; performance is a soft budget.
const HARD_100 = ['accessibility', 'best-practices', 'seo'];
const PERF_MIN = { mobile: 70, desktop: 90 };

function run(url, formFactor) {
  const dir = mkdtempSync(join(tmpdir(), 'lh-'));
  const out = join(dir, 'r.json');
  const args = [
    'node_modules/lighthouse/cli/index.js',
    url,
    '--quiet',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--chrome-flags=--headless=new --no-sandbox',
    '--output=json',
    `--output-path=${out}`,
  ];
  if (formFactor === 'desktop') args.push('--preset=desktop');
  else args.push('--form-factor=mobile', '--screenEmulation.mobile');
  spawnSync('node', args, { env: { ...process.env, CHROME_PATH: CHROME }, encoding: 'utf8' });
  try {
    const r = JSON.parse(readFileSync(out, 'utf8'));
    const s = Object.fromEntries(
      Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]),
    );
    return s;
  } catch {
    return null;
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows temp lock, ignore */
    }
  }
}

let failures = 0;
for (const ff of ['mobile', 'desktop']) {
  console.log(`\n=== ${ff.toUpperCase()} (${base}) ===`);
  console.log('page'.padEnd(26), 'perf  a11y  bp   seo');
  for (const path of PAGES) {
    const s = run(base + path, ff);
    if (!s) {
      console.log(path.padEnd(26), 'FAILED TO RUN');
      failures++;
      continue;
    }
    const row = `${String(s.performance).padEnd(5)} ${String(s.accessibility).padEnd(5)} ${String(s['best-practices']).padEnd(4)} ${s.seo}`;
    console.log(path.padEnd(26), row);
    for (const cat of HARD_100) {
      if (s[cat] < 100) {
        console.log(`   !! ${cat} = ${s[cat]} on ${path} (must be 100)`);
        failures++;
      }
    }
    if (s.performance < PERF_MIN[ff]) {
      console.log(`   ~ perf ${s.performance} below ${ff} budget ${PERF_MIN[ff]} on ${path}`);
    }
  }
}

console.log(failures === 0 ? '\nHARD GATES PASSED (a11y/bp/seo all 100).' : `\n${failures} HARD-GATE FAILURE(S).`);
process.exit(failures === 0 ? 0 : 1);
