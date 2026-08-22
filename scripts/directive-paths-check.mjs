#!/usr/bin/env node
/**
 * EVERY PATH A DIRECTIVE NAMES HAS TO EXIST.
 *
 * On 2026-08-21 the default demo tier was found telling the builder to read
 * "the anatomy, the parameter knobs, THE TEN LAWS" from `~/wildmere/TEMPLATE.md`
 * and the award-site skill from `~/modern-mustard-forge/...`. Neither had existed
 * on this machine for some time: they were on Sarah's old computer. The frame
 * library every hero fallback points at, `~/mms-demo-sites/_library/index.json`,
 * was missing too, and the directive itself calls a build that falls back to a
 * flat colour a FAILED build.
 *
 * None of that raised anything. The builder simply could not read its own design
 * system, improvised the whole standard on every job, and the only symptom was
 * that quality drifted between builds running the identical directive.
 *
 * So the paths are now checked. Two classes, deliberately:
 *   - REPO paths must exist. They travel with a checkout, so a missing one is a
 *     broken commit and this exits non-zero. That is why the flagship reference
 *     was moved into docs/ instead of living in a home directory.
 *   - HOME paths are workstation state a runner legitimately does not have. A
 *     missing one is reported and, on the workstation, is a real problem worth
 *     fixing (`node scripts/build-image-library.mjs` rebuilds the library).
 *
 * Run:  node scripts/directive-paths-check.mjs
 *       node scripts/directive-paths-check.mjs --strict   (home paths fail too)
 */
import { existsSync } from 'node:fs';
import os from 'node:os';
import * as D from '../lib/site-directive.mjs';

const STRICT = process.argv.includes('--strict');
const HOME = os.homedir().replace(/\\/g, '/');
const REPO = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '');

const ARGS = { falEnv: '', mediaNotes: '', previousVariant: null };
const BUILDERS = {
  cliDirective: () => D.cliDirective(ARGS),
  cliRealDirective: () => D.cliRealDirective(ARGS),
  cliEditDirective: () => D.cliEditDirective(),
  codexDemoDirective: () => D.codexDemoDirective(ARGS),
  tier2DemoDirective: () => D.tier2DemoDirective(ARGS),
  tier3DemoDirective: () => D.tier3DemoDirective(ARGS),
  apiDirective: () => D.apiDirective(),
  apiRealDirective: () => D.apiRealDirective(),
  apiEditDirective: () => D.apiEditDirective(),
};

/** Absolute paths to a real file, which is what a builder is told to go read. */
const PATH_RE = /([A-Za-z]:\/[^\s'`"()<>,;]+\.(?:md|json|txt|html|mjs|ts))/g;

const found = new Map();
for (const [name, build] of Object.entries(BUILDERS)) {
  let text = '';
  try { text = build() || ''; } catch (e) {
    console.error(`FAIL  ${name} threw while building: ${e.message}`);
    process.exit(1);
  }
  for (const m of text.matchAll(PATH_RE)) {
    if (!found.has(m[1])) found.set(m[1], new Set());
    found.get(m[1]).add(name);
  }
}

const short = (p) => p.replace(REPO, '<repo>').replace(HOME, '~');
let repoMissing = 0, homeMissing = 0;

for (const [p, who] of [...found].sort()) {
  const ok = existsSync(p);
  const isRepo = p.startsWith(REPO);
  if (!ok) { if (isRepo) repoMissing++; else homeMissing++; }
  const tag = ok ? 'ok   ' : (isRepo ? 'BROKEN' : 'absent');
  console.log(`${tag}  ${short(p).padEnd(52)} <- ${[...who].join(', ')}`);
}

console.log('');
if (repoMissing) {
  console.error(`${repoMissing} path(s) shipped in this repo do not exist. A directive that names a file the`);
  console.error('builder cannot open teaches it nothing and silently lowers the bar on every build.');
  process.exit(1);
}
if (homeMissing) {
  const msg = `${homeMissing} workstation path(s) absent here.`;
  if (STRICT) { console.error(msg + ' Running --strict, so that is a failure.'); process.exit(1); }
  console.log(msg + ' Expected on a runner. On the workstation, rebuild the frame');
  console.log('library with: node scripts/build-image-library.mjs');
}
console.log(`${found.size} referenced path(s) checked across ${Object.keys(BUILDERS).length} directives.`);
