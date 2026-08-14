/**
 * GRADE THE RESERVOIR BY HAND.
 *
 * The cron runs this every pass. This is the version Sarah runs when she wants
 * to see the numbers rather than trust them, and it is read-and-report: it
 * changes reservoir state, and it never sends, dials or unpauses anything.
 *
 *   npm run acq:reservoir
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

const { replenishReservoir, nextCohorts, runwayDays } = await import('../lib/acq/reservoir');
const { getAcqSettings } = await import('../lib/acq/settings');

const started = Date.now();
const r = await replenishReservoir(db);
const settings = await getAcqSettings();

console.log(`\nRESERVOIR  (${((Date.now() - started) / 1000).toFixed(1)}s)\n`);
console.log(`  graded      ${r.scanned.toLocaleString()}`);
console.log(`  promoted    ${r.promoted.toLocaleString()}`);
console.log(`  demoted     ${r.demoted.toLocaleString()}`);
console.log(`  READY       ${r.readyAfter.toLocaleString()}  of a ${r.target.toLocaleString()} target`);
console.log(`  shortfall   ${r.shortfall.toLocaleString()}`);

if (Object.keys(r.heldBack).length) {
  console.log('\n  held back, and why:');
  for (const [reason, n] of Object.entries(r.heldBack).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(6)}  ${reason}`);
  }
}

// Runway is the number that decides whether sourcing is worth an afternoon.
// A raw count of prospects always sounds like plenty.
const today = settings.adaptive_daily_allowance ?? 100;
const ceiling = settings.global_rolling_24h_ceiling ?? 4500;
console.log('\n  runway');
console.log(`    at today's allowance (${today}/day)   ${runwayDays(r.readyAfter, today) ?? '?'} days`);
console.log(`    at the ceiling (${ceiling}/day)        ${runwayDays(r.readyAfter, ceiling) ?? '?'} days`);

const cohorts = await nextCohorts(db, { limit: 12, minSize: 10 });
console.log(`\n  next cohorts (one trade, one metro, released together so a blast never looks like a blast)`);
if (!cohorts.length) console.log('    none big enough to release yet');
for (const c of cohorts) console.log(`    ${String(c.size).padStart(5)}  ${c.name}`);
console.log('');
