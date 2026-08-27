#!/usr/bin/env node
/**
 * Seed the Opps Desk from data/opps-seed.json. Idempotent on the listing URL:
 * rows already on the desk keep their status, notes and contact.
 *
 *   node scripts/opps-seed.mjs            # insert what is missing
 *   node scripts/opps-seed.mjs --dry      # show what would be inserted
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '..');
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const url = process.env.SUPABASE_URL || process.env.supabase_url;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed (in .env.local).');
  process.exit(1);
}
const dry = process.argv.includes('--dry');
const db = createClient(url, key, { auth: { persistSession: false } });
const rows = JSON.parse(fs.readFileSync(path.join(root, 'data', 'opps-seed.json'), 'utf8'));

const { data: existing, error: readErr } = await db.from('opps').select('url');
if (readErr) {
  console.error('Could not read opps:', readErr.message);
  process.exit(1);
}
const have = new Set((existing ?? []).map((r) => r.url));
const fresh = rows.filter((r) => !have.has(r.url));
console.log(`${rows.length} in file, ${have.size} already on the desk, ${fresh.length} to insert.`);
if (dry || fresh.length === 0) process.exit(0);

const now = new Date().toISOString();
const payload = fresh.map((r) => ({
  company: r.company,
  title: r.title,
  url: r.url,
  group: r.group,
  type: String(r.type || 'contract').toLowerCase(),
  pay: r.pay ?? null,
  why_fit: r.why_fit ?? null,
  source: r.source ?? null,
  deadline: r.deadline ?? null,
  verified: Boolean(r.verified),
  priority: r.deadline ? 1 : 2,
  last_action_at: now,
}));
for (let i = 0; i < payload.length; i += 50) {
  const { error } = await db.from('opps').insert(payload.slice(i, i + 50));
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }
}
console.log(`Inserted ${payload.length}.`);
