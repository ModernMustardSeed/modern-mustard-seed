#!/usr/bin/env node
/**
 * Put sites back from a .build-backups snapshot.
 *
 * Every fleet script writes the original before it touches a row precisely so
 * this exists. Used 2026-07-29 when the SVG-hero replacement shipped broken to
 * eight live sites: the drawn art survived, the photograph did not show, and the
 * layers doubled. Reverting first and debugging second is the only honest order.
 *
 *   node scripts/build-restore.mjs <prefix>            # dry run
 *   node scripts/build-restore.mjs <prefix> --apply
 *
 * prefix is the backup family, e.g. svghero, html, clash.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const prefix = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!prefix) { console.error('usage: build-restore.mjs <prefix> [--apply]'); process.exit(1); }

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const sb = createClient(
  process.env.supabase_url || process.env.SUPABASE_URL,
  process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const dir = path.join(process.cwd(), '.forge-backups');
const files = readdirSync(dir).filter((f) => f.startsWith(prefix + '-') && f.endsWith('.html'));

console.log(`${files.length} snapshot(s) with prefix "${prefix}"`);
if (!APPLY) { console.log('Dry run. Re-run with --apply.'); process.exit(0); }

let done = 0;
for (const f of files) {
  const id = f.slice(prefix.length + 1, -'.html'.length);
  const html = readFileSync(path.join(dir, f), 'utf8');
  const { error } = await sb.from('outbound_demo_sites').update({ html, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { console.log(`  FAILED ${id}: ${error.message}`); continue; }
  done += 1;
  console.log(`  restored ${id}`);
}
console.log(`\n${done} site(s) restored from ${prefix} snapshots.`);
