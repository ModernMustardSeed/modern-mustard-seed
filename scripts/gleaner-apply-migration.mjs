/**
 * One-shot Gleaner activation:
 *   1. Applies supabase/migrations/033_gleaner.sql to the MMS CRM project via
 *      the Supabase Management API (needs a personal access token).
 *   2. Verifies the four gleaner_* tables respond through PostgREST.
 *
 * Token resolution order: SUPABASE_ACCESS_TOKEN env, then the CLI's stored
 * token (~/.supabase/access-token), i.e. run `supabase login` once first.
 *
 * Run: node scripts/gleaner-apply-migration.mjs
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

const sql = readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '033_gleaner.sql'), 'utf8');
console.log('Applying 033_gleaner.sql via Management API to', REF, '...');
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
console.log('Migration applied. API said:', body.slice(0, 200) || '(empty result, as expected for DDL)');

// Verify through PostgREST with the service key.
const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
for (const table of ['gleaner_verticals', 'gleaner_runs', 'gleaner_events', 'gleaner_demos']) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact' },
  });
  const count = r.headers.get('content-range');
  console.log(r.ok ? `  OK ${table} (rows ${count})` : `  MISSING ${table}: ${r.status}`);
  if (!r.ok) process.exit(1);
}
console.log('\nGleaner tables are live. Pull the lever in /admin/gleaner or run scripts/gleaner-first-run.mjs.');
