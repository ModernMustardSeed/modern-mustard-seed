/**
 * Applies supabase/migrations/054_partner_forge.sql to the MMS CRM project via
 * the Supabase Management API, then verifies every new column and the
 * demo_events table respond through PostgREST.
 *
 * Token resolution order: SUPABASE_ACCESS_TOKEN env, then the CLI's stored
 * token (~/.supabase/access-token).
 *
 * Run: node scripts/forge-apply-migration.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REF = 'qqvohlvhynmtavdbvkha';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

function findToken() {
  if (env.SUPABASE_ACCESS_TOKEN) return env.SUPABASE_ACCESS_TOKEN.trim();
  const p = path.join(os.homedir(), '.supabase', 'access-token');
  if (existsSync(p)) return readFileSync(p, 'utf8').trim();
  return null;
}

const token = findToken();
if (!token) {
  console.error('No Supabase access token. Run `supabase login` or set SUPABASE_ACCESS_TOKEN, then rerun.');
  process.exit(1);
}

const file = '054_partner_forge.sql';
const sql = readFileSync(path.join(process.cwd(), 'supabase', 'migrations', file), 'utf8');
console.log(`Applying ${file} via Management API to`, REF, '...');
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const body = await res.text();
if (!res.ok) {
  console.error('Migration FAILED:', res.status, body.slice(0, 500));
  process.exit(1);
}
console.log('  applied.', body.slice(0, 120) || '(empty result, as expected for DDL)');

const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
const checks = [
  ['affiliates', 'id,can_forge,forge_daily_cap,forge_weekly_cap,forge_agreement_at,forge_qa_approved'],
  ['outbound_leads', 'id,affiliate_id,origin,forge_qa,last_seen_at'],
  ['outbound_demo_sites', 'id,affiliate_id,origin'],
  ['demo_events', 'id,event,origin,affiliate_id'],
];
for (const [table, select] of checks) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact' },
  });
  const count = r.headers.get('content-range');
  console.log(r.ok ? `  OK ${table} (rows ${count})` : `  MISSING ${table}: ${r.status} ${await r.text()}`);
  if (!r.ok) process.exit(1);
}
console.log('\n054 is live in prod.');
