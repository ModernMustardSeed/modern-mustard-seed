/**
 * THE GUARD THAT KEEPS "NO PATH BUYS MORE FOR LESS" TRUE.
 *
 * lib/demo-order.ts prices the website in three page rungs and the Talking
 * Website bundle per rung. The invariant, at every rung: the bundle costs at
 * least the priciest single piece and less than the two pieces apart, and each
 * rung costs strictly more than the one below it. A repricing that breaks it
 * makes a la carte irrational somewhere and every bundle leaks.
 *
 * The check itself lives next to the prices (ladderViolations). This script
 * runs it in the build chain so a bad number cannot reach production. Node 24
 * strips the types; the resolve hook below is only there to turn the repo's
 * "@/" alias into a path, because lib/demo-order.ts imports data/demo-agent.
 *
 * Exits non-zero on any violation so it can gate a build.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      import { existsSync } from 'node:fs';
      export async function resolve(spec, ctx, next) {
        if (spec.startsWith('@/')) {
          const base = ${JSON.stringify(pathToFileURL(root + '/').href)} + spec.slice(2);
          for (const ext of ['.ts', '.tsx', '/index.ts']) {
            const url = base + ext;
            if (existsSync(new URL(url))) return next(url, ctx);
          }
        }
        return next(spec, ctx);
      }
    `),
);

const { ladderViolations, SITE_RUNGS, SITE_RUNG_KEYS } = await import(pathToFileURL(resolve(root, 'lib/demo-order.ts')).href);

const usd = (c) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
for (const k of SITE_RUNG_KEYS) {
  const r = SITE_RUNGS[k];
  console.log(
    `price ladder: ${r.label.padEnd(16)} site ${usd(r.setupCents)} + ${usd(r.monthlyCents)}/mo   talking website ${usd(r.bundleSetupCents)} + ${usd(r.bundleMonthlyCents)}/mo`,
  );
}

const problems = ladderViolations();
if (problems.length) {
  console.error('\nPRICE LADDER BROKEN. Fix lib/demo-order.ts before this ships:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log('price ladder: holds at every rung');
}
