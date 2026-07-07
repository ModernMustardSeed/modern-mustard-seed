/**
 * Sidekick Forge activation:
 *   1. Applies supabase/migrations/036_sidekick.sql to the MMS CRM project
 *      via the Supabase Management API (same pattern as mustard/gleaner).
 *   2. Verifies sidekick_runs responds through PostgREST.
 *
 * Token resolution order: SUPABASE_ACCESS_TOKEN env, then the CLI's stored
 * token (~/.supabase/access-token), i.e. run `supabase login` once first.
 *
 * Run: node scripts/sidekick-apply-migration.mjs
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

const sql = readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '036_sidekick.sql'), 'utf8');
console.log('Applying 036_sidekick.sql via Management API to', REF, '...');
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
console.log('Migration applied.');

// Verify through PostgREST with the service role key.
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const svc = env.SUPABASE_SERVICE_ROLE_KEY;
if (url && svc) {
  const check = await fetch(`${url}/rest/v1/sidekick_runs?select=id&limit=1`, {
    headers: { apikey: svc, Authorization: `Bearer ${svc}` },
  });
  console.log('sidekick_runs PostgREST check:', check.status, check.ok ? 'OK' : await check.text());
} else {
  console.log('Skipping PostgREST check (no SUPABASE_URL / SERVICE_ROLE_KEY in env).');
}
