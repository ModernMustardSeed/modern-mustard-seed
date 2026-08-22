/**
 * QUEUE A SOURCING RUN FROM THE TERMINAL.
 *
 * The admin button does this behind a login. This is the same thing for when
 * Sarah is already in a shell, and it prints the split it chose rather than
 * queueing a number and hoping.
 *
 *   npm run acq:queue -- --count=3000 --industry=new
 *   npm run acq:queue -- --count=500 --industry=electrical
 *   npm run acq:queue -- --count=1000 --industry=all --tier=2
 *
 * --industry:
 *   new      the thirteen trades we have never sourced. THE DEFAULT, because
 *            the proven three are already mined in every metro we cover and
 *            the last run came back 1,391 duplicates against 2,601 found.
 *            An electrician in Phoenix has never been looked at; an HVAC
 *            company in Phoenix has been looked at four times.
 *   all      all sixteen, weighted toward the new ones.
 *   proven   hvac, plumbing, roofing only.
 *   <key>    one trade.
 *
 * It queues. It does not source: that is the worker (`npm run acq:worker`),
 * which drives a real browser and therefore runs on this machine.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const arg = (k: string, d = '') => (argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');

/*
 * --help must not queue anything.
 *
 * It did. `npm run acq:queue -- --help` fell straight through to the insert
 * and booked a 3,000 lead run, because every unrecognised flag was simply
 * ignored. A script whose only side effect is creating work has to treat an
 * unknown intent as a question, not as consent.
 */
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`
  npm run acq:queue -- --count=3000 --industry=new
  npm run acq:queue -- --count=500  --industry=electrical
  npm run acq:queue -- --count=1000 --industry=all --tier=2

  --industry   new (default) | all | proven | one trade key
  --count      10 to 20000, default 3000
  --tier       1 priority metros, 2 plus secondary, 3 everything (default)
  --minScore   lead score floor, default 35
  --minReviews minimum public reviews, default 0

  Queues a run. The worker (npm run acq:worker) does the sourcing.
`);
  process.exit(0);
}

const COUNT = Math.max(10, Math.min(20000, Number(arg('count', '3000'))));
const INDUSTRY = arg('industry', 'new');
const TIER = Math.min(3, Math.max(1, Number(arg('tier', '3'))));
const MIN_SCORE = Number(arg('minScore', '35'));
const MIN_REVIEWS = Number(arg('minReviews', '0'));

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

const { SOURCEABLE_TRADES, PROVEN_TRADES } = await import('../lib/acq/trades');
const { TRADE_LABELS } = await import('../lib/acq/types');

const NEW_TRADES = SOURCEABLE_TRADES.filter((t) => !PROVEN_TRADES.includes(t));

let chosen: string[];
const weights: Record<string, number> = {};

if (INDUSTRY === 'new') {
  chosen = [...NEW_TRADES];
} else if (INDUSTRY === 'proven') {
  chosen = [...PROVEN_TRADES];
} else if (INDUSTRY === 'all') {
  // Weighted, not even. The proven three still get a share because fresh
  // metros do exist, but most of the budget goes where the duplicates are not.
  chosen = [...SOURCEABLE_TRADES];
  for (const t of chosen) weights[t] = PROVEN_TRADES.includes(t) ? 1 : 3;
} else if (SOURCEABLE_TRADES.includes(INDUSTRY as (typeof SOURCEABLE_TRADES)[number])) {
  chosen = [INDUSTRY];
} else {
  console.error(`Unknown industry "${INDUSTRY}". Try: new, all, proven, or one of ${SOURCEABLE_TRADES.join(', ')}`);
  process.exit(1);
}

if (!Object.keys(weights).length) for (const t of chosen) weights[t] = 1;

const totalWeight = chosen.reduce((s, t) => s + weights[t], 0);
const targets: Record<string, number> = {};
let assigned = 0;
for (const t of chosen) {
  targets[t] = Math.floor((COUNT * weights[t]) / totalWeight);
  assigned += targets[t];
}
// The remainder goes to the trades with the biggest tickets: if a run comes up
// short, it should come up short on the cheap jobs.
for (const t of chosen) {
  if (assigned >= COUNT) break;
  targets[t] += 1;
  assigned += 1;
}

const label = `${assigned} leads · ${INDUSTRY} · tier ${TIER}`;

const { data, error } = await db
  .from('acq_sourcing_runs')
  .insert({
    label,
    params: { targets, tier: TIER, requireEmail: true, minScore: MIN_SCORE, minReviews: MIN_REVIEWS, excludeChains: true, excludeExisting: true },
    target: assigned,
    status: 'queued',
  })
  .select('id')
  .single();

if (error || !data) {
  console.error('Could not queue the run:', error?.message);
  process.exit(1);
}

console.log(`\nQUEUED  ${label}`);
console.log(`  run id      ${data.id}`);
console.log(`  score floor ${MIN_SCORE}, minimum reviews ${MIN_REVIEWS}, email required\n`);
for (const t of chosen) console.log(`  ${String(targets[t]).padStart(5)}  ${TRADE_LABELS[t as keyof typeof TRADE_LABELS] ?? t}`);

const { data: worker } = await db
  .from('acq_sourcing_runs')
  .select('heartbeat_at')
  .not('heartbeat_at', 'is', null)
  .order('heartbeat_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const beatAge = worker?.heartbeat_at ? (Date.now() - Date.parse(worker.heartbeat_at)) / 60_000 : null;
console.log(
  beatAge !== null && beatAge < 5
    ? `\n  A worker is alive (last heartbeat ${beatAge.toFixed(1)}m ago). It will claim this within fifteen seconds.\n`
    : `\n  ⚠ NO WORKER IS RUNNING. This will sit queued until you start one:\n      npm run acq:worker\n`,
);
