/**
 * Applies supabase/migrations/035_outbound.sql to the MMS CRM project via the
 * Supabase Management API, then verifies the outbound_* tables and the
 * daily-stats view respond through PostgREST.
 *
 * Token resolution order: SUPABASE_ACCESS_TOKEN env, then the CLI's stored
 * token (~/.supabase/access-token), i.e. run `supabase login` once first.
 *
 * Run: node scripts/outbound-apply-migration.mjs
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
  console.error('No Supabase access token. Run `supabase login` (one browser click) or set SUPABASE_ACCESS_TOKEN, then rerun.');
  process.exit(1);
}

for (const file of ['035_outbound.sql', '038_outbound_unified.sql']) {
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
}

// Verify through PostgREST with the service key. The audit_score select also
// proves the 037 columns landed.
const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
const checks = [
  ['outbound_reps', '*'],
  ['outbound_leads', 'id,audit_score,pipeline_lead_id,email_open_count'],
  ['outbound_call_logs', '*'],
  ['outbound_pilots', '*'],
  ['outbound_scripts', '*'],
  ['outbound_daily_rep_stats', '*'],
  ['messages', 'id,outbound_lead_id'],
];
for (const [table, select] of checks) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact' },
  });
  const count = r.headers.get('content-range');
  console.log(r.ok ? `  OK ${table} (rows ${count})` : `  MISSING ${table}: ${r.status}`);
  if (!r.ok) process.exit(1);
}
console.log('\nOutbound tables are live. Next: node scripts/migrate-prospects-to-outbound.mjs --apply');
