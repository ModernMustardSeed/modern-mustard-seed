/**
 * Import review-mined leads (the "customers say nobody answers" list) into
 * outbound_leads. Input: a JSON file holding { kept: [...] } or a bare array
 * of leads shaped like the review-mined-leads workflow output.
 *
 * - Dedupes by phone (digits, leading 1 stripped) against prod AND in-batch.
 * - notes lead with `REVIEWS: "quote" (source)` so the cockpit ammo card and
 *   the reps open with the prospect's own 1-star pain.
 * - Owner: Mountain/Pacific states go to Polly, Central/Eastern to Sarah
 *   (aligns call windows with a Montana dialing day).
 *
 * Run: node scripts/import-review-leads.mjs <file.json>            (dry run)
 *      node scripts/import-review-leads.mjs <file.json> --apply    (write)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const file = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!file) {
  console.error('Usage: node scripts/import-review-leads.mjs <file.json> [--apply]');
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

// Finder agents sometimes hand back HTML-entity-encoded text from review pages.
const decode = (s) =>
  String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

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
// Same business can surface twice with different lines; one row per shop.
const nameKey = (n, s) => `${String(n ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)}|${String(s ?? '').toUpperCase().slice(0, 2)}`;
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
  const quote = decode(l.review_quote).replace(/\s+/g, ' ').replace(/"/g, "'").trim().slice(0, 300);
  const source = decode(l.review_source).trim();
  const url = l.review_url ? ` ${String(l.review_url).trim()}` : '';
  rows.push({
    business_name: decode(l.business_name).trim().slice(0, 200),
    contact_name: l.contact_name ? decode(l.contact_name).trim().slice(0, 200) : null,
    phone: String(l.phone).trim(),
    email: l.email ? String(l.email).trim().toLowerCase().slice(0, 200) : null,
    website: l.website ? String(l.website).trim().slice(0, 300) : null,
    niche: NICHES.has(l.niche) ? l.niche : 'other',
    city: l.city ? String(l.city).trim().slice(0, 120) : null,
    state: state || null,
    avg_job_value: Number.isFinite(Number(l.avg_job_value_guess)) && Number(l.avg_job_value_guess) > 0 ? Number(l.avg_job_value_guess) : null,
    est_missed_calls_week: null,
    close_rate_pct: null,
    status: 'new',
    source: 'review-mining',
    owner_rep_id: MOUNTAIN_PACIFIC.has(state) ? polly : sarah,
    dnc_checked: false,
    next_action_at: null,
    next_action: null,
    notes: `REVIEWS: "${quote}" (${source}${url})`,
    created_at: new Date().toISOString(),
  });
}

const byNiche = {};
const byState = {};
const byOwner = { Polly: 0, Sarah: 0, unassigned: 0 };
for (const r of rows) {
  byNiche[r.niche] = (byNiche[r.niche] ?? 0) + 1;
  byState[r.state ?? '?'] = (byState[r.state ?? '?'] ?? 0) + 1;
  byOwner[r.owner_rep_id === polly ? 'Polly' : r.owner_rep_id === sarah ? 'Sarah' : 'unassigned']++;
}
console.log(`Input: ${input.length} · importable: ${rows.length} · dupes skipped: ${dupes} · bad phones skipped: ${badPhone}`);
console.log('  by niche:', byNiche);
console.log('  by owner:', byOwner);
console.log('  with email:', rows.filter((r) => r.email).length, '· with website:', rows.filter((r) => r.website).length);
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
console.log(`\nDone. ${inserted} review-mined leads on the dial floor. Next: node scripts/enrich-outbound.mjs --apply for missing emails.`);
