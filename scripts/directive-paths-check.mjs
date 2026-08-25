#!/usr/bin/env node
/**
 * EVERY PATH A DIRECTIVE NAMES HAS TO EXIST.
 *
 * On 2026-08-21 the default demo tier was found telling the builder to read
 * "the anatomy, the parameter knobs, THE TEN LAWS" from `~/wildmere/TEMPLATE.md`
 * and the award-site skill from `~/modern-mustard-build/...`. Neither had existed
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

/**
 * THE CAPABILITY CHECK, NOT JUST THE PATH CHECK.
 *
 * Every path above can exist and the build can still have silently lost a
 * capability, because the law CHOOSES its image block from what is installed and
 * then only names the winner. On 2026-08-25 the ref-capable renderer was missing,
 * pickImageBlock fell through to the plugin that states outright "There is no
 * reference-image support", and this checker validated the fallback and printed
 * all-green, twice a day, for weeks.
 *
 * What it cost: PROGRESS_SLIDER_RULE, which every build receives, tells the
 * builder to lock a before/after camera with --ref-mode composition. With the
 * fallback tool that is impossible, so it rendered the two frames independently
 * and shipped a slider of two DIFFERENT buildings, in the one section whose
 * entire effect is that they are the same building.
 *
 * So: a directive that DEMANDS a flag must be handed a tool that HAS it. This
 * asserts the pairing rather than trusting that a green path list means a whole
 * build system.
 */
const text = (build) => { try { return build() || ''; } catch { return ''; } };
/* Only the LOCAL engines are in scope. The serverless failsafe has no filesystem
   and no renderer at all (it paints one hero with fal and splices it in), so it
   names no image tool and the ref procedure is inert there rather than broken. */
const RENDERER = /(codex-image|genimage)\.mjs/;
const demandsRef = Object.entries(BUILDERS)
  .filter(([, b]) => RENDERER.test(text(b)))
  .filter(([, b]) => text(b).includes('--ref-mode'));
if (demandsRef.length) {
  const withoutRef = demandsRef.filter(([, b]) => !/codex-image\.mjs/.test(text(b)));
  if (withoutRef.length) {
    console.error('');
    console.error('CAPABILITY MISMATCH. These directives tell the builder to use --ref-mode, but the');
    console.error('image tool they were handed does not support reference images:');
    for (const [name] of withoutRef) console.error(`  x ${name}`);
    console.error('');
    console.error('The builder cannot obey, so it renders each frame independently and the');
    console.error('before/after slider ships two different buildings. Restore the ref-capable');
    console.error('renderer rather than deleting the rule that needs it.');
    process.exit(1);
  }
  console.log(`ref-capable renderer is wired to all ${demandsRef.length} directive(s) that ask for --ref-mode.`);
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
