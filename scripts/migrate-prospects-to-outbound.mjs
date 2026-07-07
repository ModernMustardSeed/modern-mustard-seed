/**
 * One dial floor: copy the Tracker's rep_prospects into outbound_leads so the
 * Outbound Cockpit is the single working list. Idempotent: dedupes by phone
 * (digits, leading 1 stripped) against outbound_leads AND within the batch, so
 * rerunning never duplicates. rep_prospects is left untouched.
 *
 * Mapping:
 *   status  to-contact→new · contacted→contacted · demoed/booked→demo_booked ·
 *           won→won · not-interested→lost · do_not_call=true→dnc
 *   niche   from the leading category token in notes (same regexes as the UI)
 *   owner   sarah@modernmustardseed.com→Sarah · thompsonpolly71@gmail.com→Polly
 *   carried website, email, audit_* , lead_id→pipeline_lead_id, last_email_at,
 *           email_opened_at/count, created_at (so lead age survives)
 * Rows without a phone are skipped (the cockpit is a dial floor); their count
 * is reported so nothing disappears silently.
 *
 * Run: node scripts/migrate-prospects-to-outbound.mjs           (dry run)
 *      node scripts/migrate-prospects-to-outbound.mjs --apply   (write)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const url = env.SUPABASE_URL || env.supabase_url;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!url || !key) {
  console.error('Missing supabase_url / supabase_service_role_key.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const phoneKey = (raw) => {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};

const STATUS_MAP = {
  'to-contact': 'new',
  contacted: 'contacted',
  demoed: 'demo_booked',
  booked: 'demo_booked',
  won: 'won',
  'not-interested': 'lost',
};

function guessNiche(notes) {
  const v = String(notes ?? '').slice(0, 80).toLowerCase();
  if (/dent|medspa|med spa|aesthet|spa|chiro|clinic|salon|vet/.test(v)) return 'dental_medspa';
  if (/real ?estate|realt|broker|property/.test(v)) return 'real_estate';
  if (/restaurant|cafe|coffee|food|pizza|grill|bar|bakery|brew/.test(v)) return 'restaurant';
  if (/hvac|plumb|roof|electric|landscap|paint|clean|pest|garage|contractor|handyman|tree|excavat|auto|repair|tow|construction|concrete|fence|window|door|septic|well/.test(v)) return 'home_service';
  return 'other';
}

const [{ data: prospects, error: pErr }, { data: existing, error: oErr }, { data: reps, error: rErr }] = await Promise.all([
  sb.from('rep_prospects').select('*').limit(10000),
  sb.from('outbound_leads').select('id, phone').limit(10000),
  sb.from('outbound_reps').select('id, name'),
]);
if (pErr || oErr || rErr) {
  console.error('Read failed:', (pErr || oErr || rErr).message);
  process.exit(1);
}

const repByEmail = new Map();
for (const r of reps ?? []) {
  if (r.name === 'Sarah') repByEmail.set('sarah@modernmustardseed.com', r.id);
  if (r.name === 'Polly') repByEmail.set('thompsonpolly71@gmail.com', r.id);
}

const known = new Set((existing ?? []).map((l) => phoneKey(l.phone)).filter((k) => k.length >= 7));

let noPhone = 0;
let dupes = 0;
const rows = [];
for (const p of prospects ?? []) {
  const k = phoneKey(p.phone);
  if (k.length < 7) { noPhone++; continue; }
  if (known.has(k)) { dupes++; continue; }
  known.add(k);
  rows.push({
    business_name: p.business,
    contact_name: null,
    phone: p.phone,
    email: p.email ?? null,
    website: p.website ?? null,
    niche: guessNiche(p.notes),
    city: p.city ?? null,
    state: null,
    status: p.do_not_call ? 'dnc' : (STATUS_MAP[p.status] ?? 'new'),
    source: 'tracker',
    owner_rep_id: repByEmail.get(String(p.rep_email ?? '').toLowerCase()) ?? null,
    dnc_checked: false,
    notes: p.notes ?? null,
    audit_score: p.audit_score ?? null,
    audit_url: p.audit_url ?? null,
    audit_json: p.audit_json ?? null,
    audit_at: p.audit_at ?? null,
    pipeline_lead_id: p.lead_id ?? null,
    last_email_at: p.last_email_at ?? null,
    email_opened_at: p.email_opened_at ?? null,
    email_open_count: p.email_open_count ?? 0,
    // Always present: PostgREST bulk inserts require identical keys per row.
    created_at: p.created_at ?? new Date().toISOString(),
  });
}

const byNiche = {};
const byStatus = {};
const byOwner = { Sarah: 0, Polly: 0, unassigned: 0 };
const ownerName = new Map((reps ?? []).map((r) => [r.id, r.name]));
for (const r of rows) {
  byNiche[r.niche] = (byNiche[r.niche] ?? 0) + 1;
  byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const n = r.owner_rep_id ? ownerName.get(r.owner_rep_id) ?? 'unassigned' : 'unassigned';
  byOwner[n] = (byOwner[n] ?? 0) + 1;
}

console.log(`Tracker prospects: ${prospects?.length ?? 0}`);
console.log(`  migratable: ${rows.length}`);
console.log(`  skipped, no dialable phone: ${noPhone}`);
console.log(`  skipped, phone already in outbound: ${dupes}`);
console.log('  by status:', byStatus);
console.log('  by niche:', byNiche);
console.log('  by owner:', byOwner);
console.log(`  with audits: ${rows.filter((r) => r.audit_score != null).length} · with email: ${rows.filter((r) => r.email).length}`);

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
console.log(`\nDone. ${inserted} leads now on the Outbound dial floor. The Tracker rows were not modified.`);
