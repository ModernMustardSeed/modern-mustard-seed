/**
 * What the Lead Finder queue actually looks like right now, and whether any
 * worker is alive on it.
 *
 *   node scripts/acq-worker-status.mjs
 *
 * Read-only. It never claims a run and never writes a row.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('No Supabase URL or service key in .env.local');
const db = createClient(url, key, { auth: { persistSession: false } });

const mins = (iso) => (iso ? Math.round((Date.now() - new Date(iso).getTime()) / 60000) : null);

const { data: runs, error } = await db
  .from('acq_sourcing_runs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(12);
if (error) throw new Error(error.message);

console.log('\n============ LEAD FINDER QUEUE ============\n');
if (!runs.length) console.log('No runs at all.');
for (const r of runs) {
  const age = mins(r.created_at);
  const beat = mins(r.heartbeat_at);
  console.log(`${r.status.toUpperCase().padEnd(9)} ${r.id}`);
  console.log(`  created   ${age}m ago  (${r.created_at})`);
  console.log(`  heartbeat ${beat === null ? 'never' : `${beat}m ago`}`);
  console.log(`  market    ${r.current_market ?? '—'}   tier ${r.tier ?? '—'}`);
  console.log(`  targets   ${JSON.stringify(r.targets ?? r.split ?? {})}`);
  console.log(`  counters  searched ${r.searched ?? 0} · found ${r.found ?? 0} · email ${r.with_email ?? 0} · inserted ${r.inserted ?? 0}`);
  if (r.error) console.log(`  ERROR     ${String(r.error).slice(0, 300)}`);
  const last = Array.isArray(r.log) ? r.log[r.log.length - 1] : null;
  if (last) console.log(`  last log  ${last.line ?? JSON.stringify(last)}`);
  console.log('');
}

const queued = runs.filter((r) => r.status === 'queued');
const running = runs.filter((r) => r.status === 'running');
const alive = running.filter((r) => (mins(r.heartbeat_at) ?? 9999) < 10);

console.log('-------------------------------------------');
console.log('queued            :', queued.length, queued.length ? `(oldest ${Math.max(...queued.map((r) => mins(r.created_at)))}m)` : '');
console.log('running rows      :', running.length);
console.log('workers alive     :', alive.length, alive.length ? '' : '(nothing has beaten in the last 10 minutes)');
console.log('');
