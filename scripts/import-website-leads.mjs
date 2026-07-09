/**
 * Import website-need leads (no site at all, or a dead/parked/ancient one)
 * into outbound_leads. Input: JSON with { kept: [...] } from the
 * website-need-leads workflow.
 *
 * notes lead with `WEBSITE: none — ...` or `WEBSITE: broken — ...` so the
 * cockpit's ammo card opens with exactly what we observed. Broken sites keep
 * their domain in website (the audit engine can score the wreckage); no-site
 * leads keep website null and carry their Facebook/listing URL in the note.
 *
 * Run: node scripts/import-website-leads.mjs <file.json>            (dry run)
 *      node scripts/import-website-leads.mjs <file.json> --apply    (write)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const file = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!file) {
  console.error('Usage: node scripts/import-website-leads.mjs <file.json> [--apply]');
  process.exit(1);
}

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }
const sb = createClient(env.SUPABASE_URL || env.supabase_url, env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key, {
  auth: { persistSession: false },
});

const raw = JSON.parse(readFileSync(file, 'utf8'));
const input = Array.isArray(raw) ? raw : raw.kept ?? raw.leads ?? [];
if (!input.length) {
  console.error('No leads in the file.');
  process.exit(1);
}

const phoneKey = (p) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};
const decode = (s) =>
  String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
const nameKey = (n, s) => `${String(n ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)}|${String(s ?? '').toUpperCase().slice(0, 2)}`;

const MOUNTAIN_PACIFIC = new Set(['MT', 'ID', 'WY', 'UT', 'CO', 'WA', 'OR', 'CA', 'NV', 'AZ', 'NM', 'AK', 'HI']);
const NICHES = new Set(['home_service', 'dental_medspa', 'real_estate', 'restaurant', 'other']);

const [{ data: existing, error: exErr }, { data: reps, error: repErr }] = await Promise.all([
  sb.from('outbound_leads').select('phone, business_name, state').limit(20000),
  sb.from('outbound_reps').select('id, name'),
]);
if (exErr || repErr) {
  console.error('Read failed:', (exErr || repErr).message);
  process.exit(1);
}
const known = new Set((existing ?? []).map((l) => phoneKey(l.phone)).filter((k) => k.length >= 7));
const knownNames = new Set((existing ?? []).map((l) => nameKey(l.business_name, l.state)));
const polly = (reps ?? []).find((r) => r.name === 'Polly')?.id ?? null;
const sarah = (reps ?? []).find((r) => r.name === 'Sarah')?.id ?? null;

let dupes = 0;
let badPhone = 0;
const rows = [];
for (const l of input) {
  const key = phoneKey(l.phone);
  if (key.length !== 10) { badPhone++; continue; }
  const nk = nameKey(decode(l.business_name), l.state);
  if (known.has(key) || knownNames.has(nk)) { dupes++; continue; }
  known.add(key);
  knownNames.add(nk);
  const state = String(l.state ?? '').trim().toUpperCase().slice(0, 2);
  const statusWord = l.website_status === 'broken' ? 'broken' : 'none';
  const evidence = decode(l.website_evidence).replace(/\s+/g, ' ').replace(/"/g, "'").trim().slice(0, 280);
  const presence = l.presence_url ? ` (${String(l.presence_url).trim()})` : '';
  rows.push({
    business_name: decode(l.business_name).trim().slice(0, 200),
    contact_name: l.contact_name ? decode(l.contact_name).trim().slice(0, 200) : null,
    phone: String(l.phone).trim(),
    email: l.email ? String(l.email).trim().toLowerCase().slice(0, 200) : null,
    website: l.website_status === 'broken' && l.broken_domain ? String(l.broken_domain).trim().slice(0, 300) : null,
    niche: NICHES.has(l.niche) ? l.niche : 'other',
    city: l.city ? String(l.city).trim().slice(0, 120) : null,
    state: state || null,
    avg_job_value: Number.isFinite(Number(l.avg_job_value_guess)) && Number(l.avg_job_value_guess) > 0 ? Number(l.avg_job_value_guess) : null,
    est_missed_calls_week: null,
    close_rate_pct: null,
    status: 'new',
    source: 'website-mining',
    owner_rep_id: MOUNTAIN_PACIFIC.has(state) ? polly : sarah,
    dnc_checked: false,
    next_action_at: null,
    next_action: null,
    notes: `WEBSITE: ${statusWord} — ${evidence}${presence}`,
    created_at: new Date().toISOString(),
  });
}

const byNiche = {};
const byMode = { none: 0, broken: 0 };
const byState = {};
for (const r of rows) {
  byNiche[r.niche] = (byNiche[r.niche] ?? 0) + 1;
  byMode[r.notes.startsWith('WEBSITE: broken') ? 'broken' : 'none']++;
  byState[r.state ?? '?'] = (byState[r.state ?? '?'] ?? 0) + 1;
}
console.log(`Input: ${input.length} · importable: ${rows.length} · dupes skipped: ${dupes} · bad phones skipped: ${badPhone}`);
console.log('  by mode:', byMode, '· by niche:', byNiche);
console.log('  with email:', rows.filter((r) => r.email).length, '· broken domains kept:', rows.filter((r) => r.website).length);
console.log('  states:', Object.keys(byState).length, JSON.stringify(byState));

if (!APPLY) {
  console.log('\nDry run only. Rerun with --apply to write.');
  process.exit(0);
}

let inserted = 0;
for (let i = 0; i < rows.length; i += 400) {
  const chunk = rows.slice(i, i + 400);
  const { error } = await sb.from('outbound_leads').insert(chunk);
  if (error) {
    console.error(`Insert failed at chunk ${i / 400}:`, error.message, `(inserted so far: ${inserted})`);
    process.exit(1);
  }
  inserted += chunk.length;
  console.log(`  inserted ${inserted}/${rows.length}`);
}
console.log(`\nDone. ${inserted} website-need leads on the dial floor.`);
