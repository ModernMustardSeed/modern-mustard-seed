/**
 * WHAT IS STUCK RIGHT NOW.
 *
 * Prints the same report the daily digest sends, against live data, on demand.
 * Read-only: it queries and formats, and changes nothing.
 *
 *   pnpm exec tsx scripts/loop-stalls.mts
 */
import { readFileSync } from 'node:fs';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=("?)(.*)\2\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
  }
} catch {
  /* rely on the ambient environment */
}

const { getSupabase } = await import('../lib/supabase');
const { findStalls } = await import('../lib/acq/stalls');

const db = getSupabase();
if (!db) {
  console.error('No Supabase client. Is .env.local present with the service role key?');
  process.exit(1);
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'America/Denver' }) : 'no date';

const stalls = await findStalls(db);
const rule = '='.repeat(74);
console.log(`\n${rule}\nTHE LOOP, RIGHT NOW\n${rule}`);

if (!stalls.length) {
  console.log('\nNothing is stuck. Every check ran and every one came back clean.\n');
  process.exit(0);
}

for (const s of stalls) {
  console.log(`\n[${s.severity.toUpperCase()}] ${s.title}`);
  console.log(`  ${s.detail}`);
  for (const e of s.examples) console.log(`    - ${e.label}  (since ${when(e.since)})`);
  if (s.examples.length && s.count > s.examples.length) console.log(`    ... and ${s.count - s.examples.length} more`);
}
console.log(`\n${rule}\n${stalls.filter((s) => s.severity === 'critical').length} critical, ${stalls.filter((s) => s.severity === 'warn').length} to watch.\n`);
