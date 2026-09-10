/**
 * BUILD WHAT THE ASKERS ASKED FOR.
 *
 *   pnpm exec tsx scripts/acq-build-for-askers.mts              # dry run: who is owed what
 *   pnpm exec tsx scripts/acq-build-for-askers.mts --apply      # build it
 *   pnpm exec tsx scripts/acq-build-for-askers.mts --only swan  # one business, by name fragment
 *
 * Sarah, 2026-09-10: "retry them and send when they are done, give what they
 * wanted, which was mostly already made, website and voice agent."
 *
 * WHO. lib/acq/askers.ts owns the definition, and the send script reads the
 * same one. People who came to us: the demo station, the self-serve build
 * page, a click on the free build or the Talking Website, consent, or a call
 * with Mr. Mustard.
 *
 * WHAT. The voice agent and the hub are minted here and are instant. The
 * website goes on the build queue and takes the local worker twenty to forty
 * minutes, longer when the machine is under memory pressure, because that
 * worker runs headless Claude Code on the flat subscription and refuses to
 * start a build it cannot finish. A failed website is re-queued from scratch,
 * which is what the Retry button on the board does.
 *
 * This never mails anybody. scripts/acq-send-late-suites.mts does that, after
 * the websites land.
 *
 * NO DAILY CAP IS CLAIMED. The caps on buildProspectSuite exist to stop an
 * unattended job from committing a week of the build queue on its own. A hand
 * on the lever is the cap.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_CANDIDATES = ['.env.local', resolve('../../products/modern-mustard-seed/.env.local')];
const envFile = ENV_CANDIDATES.find((p) => existsSync(p));
if (!envFile) {
  console.error('No .env.local found. Looked in:\n  ' + ENV_CANDIDATES.join('\n  '));
  process.exit(1);
}
for (const l of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const { findAskers, piecesOf } = await import('../lib/acq/askers');
const { buildProspectSuite } = await import('../lib/acq/suite');
const { readBuildWorkerVitals } = await import('../lib/build-worker');
type AcqProspect = import('../lib/acq/types').AcqProspect;

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith('[')) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be real values in .env.local.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const onlyIdx = argv.indexOf('--only');
const only = onlyIdx >= 0 ? argv[onlyIdx + 1] : undefined;

const { askers, skipped } = await findAskers(db, { only });

// Anything they asked for and cannot open. A website already on the anvil is
// left alone; re-queueing it would throw away a build that is running.
const owed = askers.filter((a) => a.missing.length > 0 && !a.building);
const onAnvil = askers.filter((a) => a.building);
const done = askers.filter((a) => a.complete);

console.log(`\n${askers.length} asked. ${done.length} have everything, ${onAnvil.length} on the anvil, ${owed.length} owed something.\n`);

if (onAnvil.length) {
  console.log('Already building:');
  for (const a of onAnvil) console.log(`  ${a.lead.business_name}: ${piecesOf(a)}`);
  console.log('');
}

if (!owed.length) {
  console.log('Nothing to build.');
} else {
  console.log(`${apply ? 'BUILDING' : 'Would build'} for ${owed.length}:`);
  for (const a of owed) {
    console.log(
      `  ${a.lead.business_name} <${a.lead.email}>\n` +
        `      has: ${piecesOf(a)}\n` +
        `      owed: ${a.missing.join(' + ')}${a.failed ? ' (the last website build failed)' : ''}\n` +
        `      asked: ${a.why.join(', ') || 'came in through the board'}\n` +
        `      mailed: ${a.sent}`,
    );
  }
}

if (skipped.length) {
  console.log(`\nLeft alone (${skipped.length}):`);
  for (const s of skipped) console.log(`  ${s.name}: ${s.reason}`);
}

const vitals = await readBuildWorkerVitals(db).catch(() => null);
if (vitals) {
  console.log(`\nBuild worker: ${JSON.stringify(vitals).slice(0, 300)}`);
}

if (!apply) {
  console.log('\nDry run. Add --apply to build.');
  process.exit(0);
}

let built = 0;
for (const a of owed) {
  const res = await buildProspectSuite(db, a.lead as AcqProspect, {
    site: true,
    designTier: 2,
    // A failed or missing website is re-queued from scratch. Without this a
    // row still holding a 'failed' status is skipped by the idempotency guard
    // and the retry silently does nothing.
    forceSite: true,
    by: 'askers',
  });
  if (res.ok) {
    built++;
    console.log(`  ${a.lead.business_name}: built ${res.created.join(', ') || 'nothing new'}${res.warnings.length ? ` (${res.warnings[0]})` : ''}`);
  } else {
    console.log(`  ${a.lead.business_name}: FAILED ${res.error}`);
  }
}

console.log(`\n${built} of ${owed.length} put through. The websites land as the build works through them.`);
console.log('When they are ready: pnpm exec tsx scripts/acq-send-late-suites.mts --apply');
