/**
 * Pre-run the website audit on every lead that has a site but no audit yet, so
 * the score + report + the audit-driven call script and email are ready before a
 * rep ever opens the lead. Drives the real, deployed audit route (one Claude
 * audit per lead, cached on the row). Idempotent: skips already-audited leads.
 *
 * Cost: ~1 Claude audit per lead. Run:  node scripts/audit-all.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.BASE_URL || 'https://modernmustardseed.com';
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const get = (k) => { for (const l of env.split(/\r?\n/)) { if (l.toLowerCase().startsWith(k.toLowerCase() + '=')) { let v = l.slice(k.length + 1).trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return v; } } return ''; };
const sb = createClient(get('supabase_url'), get('supabase_service_role_key'), { auth: { persistSession: false } });

// Log in (Polly is an admin/owner; clean password) to drive the audit route.
const login = await fetch(`${BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'thompsonpolly71@gmail.com', password: 'Sailor22' }) });
if (!login.ok) { console.error('login failed', login.status, await login.text()); process.exit(1); }
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
if (!cookie) { console.error('no session cookie returned'); process.exit(1); }
console.log('logged in.');

const { data: rows } = await sb.from('rep_prospects').select('id,business,website').is('audit_score', null).not('website', 'is', null).order('created_at');
console.log(`leads to audit: ${rows.length}`);

let ok = 0, fail = 0, done = 0;
async function audit(p) {
  try {
    const res = await fetch(`${BASE}/api/admin/prospects/${p.id}/audit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{}', signal: AbortSignal.timeout(70000) });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.report) ok++; else { fail++; }
  } catch { fail++; }
  done++;
  if (done % 15 === 0) console.log(`...${done}/${rows.length} | audited ${ok} | failed ${fail}`);
}
// Concurrency 3 to respect the audit route + model rate limits.
let i = 0;
await Promise.all(Array.from({ length: 3 }, async () => { while (i < rows.length) { await audit(rows[i++]); } }));
console.log(`\nDONE. audited ${ok} | failed ${fail} | total ${rows.length}`);
