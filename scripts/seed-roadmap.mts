/**
 * Generate a Hundredfold Roadmap from the command line and (optionally) publish
 * it as a featured worked example on /scaling-roadmap.
 *
 * Runs on the FREE Claude Code engine by default (same subscription path the
 * audit worker uses), so seeding and re-seeding our own examples costs nothing.
 * Pass --engine api to force the metered path.
 *
 *   npx tsx scripts/seed-roadmap.mts https://modernmustardseed.com \
 *     --slug modern-mustard-seed --featured \
 *     --context ./scratch/mms-context.json \
 *     --out ./scratch/mms-roadmap.json
 *
 * Without --slug it behaves like a dry run: the roadmap is printed and written
 * to --out, and nothing is saved to the database.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name: string) => args.includes(`--${name}`);

const url = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') === false);
const target = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
if (!target) {
  console.error('Usage: npx tsx scripts/seed-roadmap.mts <url> [--slug s] [--featured] [--context f.json] [--out f.json] [--engine api|claude-code] [--save]');
  process.exit(1);
}
void url;

// Default to the subscription engine. Set BEFORE the module is imported, since
// the engine reads the env var at call time but the CLI probe runs on import.
process.env.ROADMAP_ENGINE = flag('engine') ?? 'claude-code';

// .env.local carries the Supabase service key (and the API key for --engine api).
try {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {
  /* no .env.local, fine for a dry run */
}
// lib/supabase reads the uppercase names; .env.local stores the lowercase ones.
process.env.SUPABASE_URL ??= process.env.supabase_url;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= process.env.supabase_service_role_key;

const { runScalingRoadmap } = await import('../lib/scaling-roadmap');
const { saveRoadmap } = await import('../lib/roadmap-store');

const contextFile = flag('context');
const context = contextFile ? JSON.parse(readFileSync(contextFile, 'utf8')) : {};

console.log(`Building the roadmap for ${target} on the ${process.env.ROADMAP_ENGINE} engine...`);
const started = Date.now();
const result = await runScalingRoadmap(target, context, {
  effort: (flag('effort') as 'medium' | 'high') ?? 'high',
});
const secs = Math.round((Date.now() - started) / 1000);

if (!result.ok) {
  console.error(`FAILED after ${secs}s: ${result.error}`);
  process.exitCode = 1;
} else {
  console.log(`Done in ${secs}s. ${result.report.business_name}: ${result.report.stage}, ${result.report.scale_score}/100`);
  console.log(`"${result.report.headline}"`);
  console.log(`Constraint: ${result.report.constraint.type} — ${result.report.constraint.title}`);

  const out = flag('out');
  if (out) {
    writeFileSync(out, JSON.stringify(result.report, null, 2), 'utf8');
    console.log(`Wrote ${out}`);
  }

  const slug = flag('slug');
  if (slug || has('save')) {
    const saved = await saveRoadmap({
      url: result.url,
      host: result.host,
      report: result.report,
      context,
      source: 'seed',
      slug,
      featured: has('featured'),
    });
    console.log(saved ? `Saved: /scaling-roadmap/r/${saved.slug}` : 'Save FAILED (check Supabase config)');
  } else {
    console.log('Dry run: nothing saved. Pass --slug or --save to publish.');
  }
}

// process.exit() after network I/O exits 127 on Windows; let the loop drain.
