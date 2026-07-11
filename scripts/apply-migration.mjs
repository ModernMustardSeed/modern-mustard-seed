/**
 * Generic single-migration applier for the MMS CRM project, via the Supabase
 * Management API (the service-role key cannot run DDL). After each file it
 * pokes PostgREST to reload its schema cache so new tables/columns respond
 * immediately.
 *
 * Token resolution order: SUPABASE_ACCESS_TOKEN env, then the CLI's stored
 * token (~/.supabase/access-token), i.e. run `supabase login` once first.
 *
 * Run: node scripts/apply-migration.mjs 042_outbound_demo_sites.sql [more.sql...]
 */
import { readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REF = 'qqvohlvhynmtavdbvkha';

const files = process.argv.slice(2).filter((a) => a.endsWith('.sql'));
if (!files.length) {
  console.error('Usage: node scripts/apply-migration.mjs <file.sql> [more.sql...]  (names under supabase/migrations/)');
  process.exit(1);
}

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
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

async function query(sql, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`${label} FAILED:`, res.status, body.slice(0, 500));
    process.exit(1);
  }
  return body;
}

for (const file of files) {
  const sql = readFileSync(path.join(process.cwd(), 'supabase', 'migrations', file), 'utf8');
  console.log(`Applying ${file} via Management API to ${REF} ...`);
  const body = await query(sql, file);
  console.log('  applied.', body.slice(0, 120) || '(empty result, as expected for DDL)');
}

await query(`NOTIFY pgrst, 'reload schema';`, 'schema reload');
console.log('PostgREST schema cache reloaded.');
