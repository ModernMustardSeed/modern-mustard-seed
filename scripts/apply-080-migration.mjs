/**
 * Applies supabase/migrations/080_audit_queue.sql to the MMS project via the
 * Supabase Management API, then VERIFIES the table and the claim function
 * actually respond. Same shape as scripts/forge-apply-migration.mjs.
 *
 * Verification is not optional here: migration 037 appeared to apply cleanly
 * and then 404'd through PostgREST because the schema cache was stale, so a
 * "success" print alone has already been wrong once on this project.
 *
 * Run: node scripts/apply-080-migration.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REF = 'qqvohlvhynmtavdbvkha';
const FILE = 'supabase/migrations/080_audit_queue.sql';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

function findToken() {
  if (env.SUPABASE_ACCESS_TOKEN) return env.SUPABASE_ACCESS_TOKEN.trim();
  const stored = path.join(os.homedir(), '.supabase', 'access-token');
  if (existsSync(stored)) return readFileSync(stored, 'utf8').trim();
  return null;
}

const token = findToken();
if (!token) {
  console.error('No Supabase access token. Set SUPABASE_ACCESS_TOKEN or run `supabase login`.');
  process.exit(1);
}

const sql = readFileSync(FILE, 'utf8');
console.log(`applying ${FILE} to ${REF} (${sql.length} bytes)`);

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  console.error(`FAILED ${res.status}:`, (await res.text()).slice(0, 800));
  process.exit(1);
}
console.log('applied.');

// PostgREST caches the schema; a brand new table 404s until it reloads. This
// exact trap cost a debugging session on migration 037.
await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: "notify pgrst, 'reload schema';" }),
});
console.log('schema cache reloaded.');

// Now prove it through the same path the app uses.
const url = env.SUPABASE_URL || env.supabase_url;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!url || !key) {
  console.log('No service key locally, skipping the PostgREST check.');
  process.exit(0);
}

await new Promise((r) => setTimeout(r, 1500));

const table = await fetch(`${url}/rest/v1/audit_jobs?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
console.log(`audit_jobs via PostgREST: ${table.status} ${table.ok ? 'OK' : await table.text()}`);

const rpc = await fetch(`${url}/rest/v1/rpc/claim_audit_job`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_worker: 'migration-check' }),
});
const claimed = rpc.ok ? await rpc.json() : await rpc.text();
console.log(`claim_audit_job: ${rpc.status} ${rpc.ok ? `OK (claimed ${Array.isArray(claimed) ? claimed.length : '?'} job(s), expected 0 on an empty queue)` : claimed}`);

if (!table.ok || !rpc.ok) process.exit(1);
console.log('\n080 verified live.');
