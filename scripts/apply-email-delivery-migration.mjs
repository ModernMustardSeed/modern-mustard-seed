/**
 * Applies supabase/migrations/041_email_delivery.sql to the MMS CRM project via
 * the Supabase Management API, then verifies the new columns + table respond
 * through PostgREST. Idempotent; safe to re-run.
 *
 * Run: node scripts/apply-email-delivery-migration.mjs
 * Token: SUPABASE_ACCESS_TOKEN env, or the CLI's ~/.supabase/access-token.
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
  console.error('No Supabase access token. Set SUPABASE_ACCESS_TOKEN or run `supabase login`, then rerun.');
  process.exit(1);
}

const sql = readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '041_email_delivery.sql'), 'utf8');
console.log('Applying 041_email_delivery.sql via Management API to', REF, '...');
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const body = await res.text();
if (!res.ok) {
  console.error('Migration FAILED:', res.status, body.slice(0, 800));
  process.exit(1);
}
console.log('  applied.', body.slice(0, 120) || '(empty result, as expected for DDL)');

const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
const checks = [
  ['emails', 'id,provider,provider_message_id,status,status_detail,delivered_at'],
  ['email_suppressions', 'email,reason,resolved,provider'],
];
let ok = true;
for (const [table, select] of checks) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact' },
  });
  const count = r.headers.get('content-range');
  console.log(r.ok ? `  OK ${table} (rows ${count})` : `  MISSING ${table}: ${r.status} ${(await r.text()).slice(0, 160)}`);
  if (!r.ok) ok = false;
}
if (!ok) process.exit(1);
console.log('\nDelivery tracking is live. Run scripts/email-reconcile.mjs to seed the suppression mirror.');
