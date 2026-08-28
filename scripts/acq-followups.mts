/**
 * WHO IS WAITING ON A PERSON, printed to the terminal.
 *
 * The same list the Follow-up screen shows, on demand, read-only.
 *
 *   pnpm exec tsx scripts/acq-followups.mts
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
const { findFollowups } = await import('../lib/acq/followups');

const db = getSupabase();
if (!db) {
  console.error('No Supabase client. Is .env.local present with the service role key?');
  process.exit(1);
}

const when = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
const list = await findFollowups(db);
const rule = '='.repeat(78);

console.log(`\n${rule}\nWAITING ON A PERSON  (${list.length})\n${rule}`);
let group = '';
for (const f of list) {
  if (f.move !== group) {
    group = f.move;
    console.log(`\n${group}`);
  }
  const l = f.lead as unknown as Record<string, unknown>;
  const where = [l.city, l.state].filter(Boolean).join(', ');
  console.log(`  ${String(l.business_name).slice(0, 34).padEnd(36)} ${String(l.phone ?? 'no phone').padEnd(16)} ${String(l.email ?? 'no email').slice(0, 34).padEnd(36)} ${where}`);
  console.log(`      ${when(f.at)} · ${f.why.slice(0, 150)}`);
}
console.log(`\n${rule}\n`);
