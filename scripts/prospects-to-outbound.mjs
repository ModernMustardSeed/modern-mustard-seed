/**
 * Fold the rep prospect tracker (`rep_prospects`) into the outbound dial floor
 * (`outbound_leads`), so there is ONE system instead of two.
 *
 * The tracker was a separate list with its own table, its own API routes, its
 * own audit and enrich endpoints, and its own 1000-row ceiling. Every prospect
 * in it already carries a website, which is exactly what the cockpit needs to
 * run an audit, so they belong on the dial floor with everything else.
 *
 * Matching is on the phone number (digits only, US country code stripped),
 * the same key the CSV importer and the manual add already dedupe on. A
 * prospect that matches an existing lead does NOT create a duplicate: it fills
 * in whatever that lead is missing (website, email, audit, open tracking) and
 * leaves everything else alone. Only genuinely new businesses are inserted.
 *
 * National chains are skipped through the shared `chainBrand` list, same as
 * every other importer, so a Walmart Pharmacy in the tracker does not become a
 * lead someone has to dial.
 *
 * Nothing is written without --apply.
 *
 *   node scripts/prospects-to-outbound.mjs            (dry run, prints the plan)
 *   node scripts/prospects-to-outbound.mjs --apply    (write)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chainBrand } from '../lib/chains.mjs';

const APPLY = process.argv.includes('--apply');

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const sb = createClient(
  env.SUPABASE_URL || env.supabase_url,
  env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key,
  { auth: { persistSession: false } },
);

const phoneKey = (p) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};

/**
 * PostgREST caps every response at max_rows (1000), which is the same ceiling
 * that was hiding rows in the tracker UI. Page explicitly.
 */
async function fetchAll(table, columns) {
  const page = 1000;
  const rows = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await sb.from(table).select(columns).order('id', { ascending: true }).range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
  }
  return rows;
}

/** tracker status -> dial-floor status. */
const STATUS = {
  'to-contact': 'new',
  contacted: 'contacted',
  demoed: 'demo_booked',
  booked: 'demo_booked',
  won: 'won',
  'not-interested': 'lost',
};

/**
 * The tracker's add form stored the business type as the leading token of
 * notes ("Trade · called twice"), so the niche is recoverable rather than
 * defaulted for everyone.
 */
const NICHE_BY_TYPE = [
  [/^real estate/i, 'real_estate'],
  [/^(trade|home service|contractor)/i, 'home_service'],
  [/^(restaurant|cafe|bar|food)/i, 'restaurant'],
  [/^(dental|dentist|medspa|med spa|medical|clinic)/i, 'dental_medspa'],
];
function nicheOf(notes) {
  const head = String(notes ?? '').split('·')[0].trim();
  for (const [rx, niche] of NICHE_BY_TYPE) if (rx.test(head)) return niche;
  return 'other';
}

/** "Kalispell, MT" -> {city:"Kalispell", state:"MT"}; "Phoenix" -> state null. */
function splitCity(city) {
  const s = String(city ?? '').trim();
  if (!s) return { city: null, state: null };
  const m = s.match(/^(.*?)[,\s]+([A-Z]{2})$/);
  return m ? { city: m[1].trim(), state: m[2] } : { city: s, state: null };
}

const prospects = await fetchAll('rep_prospects', '*');
const leads = await fetchAll('outbound_leads', 'id, business_name, phone, city, website, email, audit_score, audit_url, audit_at, notes, source, status');
// outbound_reps has NO email column, only a name. Selecting one that does not
// exist returns a 400 whose `.data` is null, which silently becomes "no reps"
// and drops ownership on every row. Ask for what exists, and fail loudly.
const repsRes = await sb.from('outbound_reps').select('id, name, active');
if (repsRes.error) { console.error('outbound_reps:', repsRes.error.message); process.exit(1); }
const reps = repsRes.data ?? [];

console.log(`rep_prospects: ${prospects.length}   outbound_leads: ${leads.length}   reps: ${reps.length}`);

const byPhone = new Map();
for (const l of leads) {
  const k = phoneKey(l.phone);
  if (k.length >= 7 && !byPhone.has(k)) byPhone.set(k, l);
}

/**
 * Match the tracker's rep to a dial-floor rep so ownership survives the move.
 * Reps are identified by first name only ("Sarah", "Polly"), and that is also
 * how the cockpit's rep switcher resolves them, so match the same way: the
 * tracker's rep_name contains the rep's name. Falls back to the local part of
 * the email for rows where rep_name was never filled in.
 */
function repIdFor(p) {
  const name = String(p.rep_name ?? '').toLowerCase();
  const local = String(p.rep_email ?? '').split('@')[0].toLowerCase();
  return reps.find((r) => {
    const rn = String(r.name ?? '').toLowerCase();
    return rn && (name.includes(rn) || local.includes(rn));
  })?.id ?? null;
}

const inserts = [];
const updates = [];
const skipped = { chain: [], nophone: [], nochange: [] };

for (const p of prospects) {
  const brand = chainBrand(p.business ?? '');
  if (brand) { skipped.chain.push(`${p.business} (${brand})`); continue; }

  const key = phoneKey(p.phone);
  if (key.length < 7) { skipped.nophone.push(p.business); continue; }

  const existing = byPhone.get(key);
  const { city, state } = splitCity(p.city);

  if (existing) {
    // Fill blanks only. Never overwrite what the dial floor already knows.
    const patch = {};
    if (!existing.website && p.website) patch.website = p.website;
    if (!existing.email && p.email) patch.email = p.email;
    if (existing.audit_score == null && p.audit_score != null) {
      patch.audit_score = p.audit_score;
      patch.audit_url = p.audit_url;
      patch.audit_json = p.audit_json;
      patch.audit_at = p.audit_at;
    }
    if (!existing.city && city) patch.city = city;
    if (!Object.keys(patch).length) { skipped.nochange.push(p.business); continue; }
    updates.push({ id: existing.id, business: p.business, patch });
    continue;
  }

  inserts.push({
    business_name: String(p.business).slice(0, 200),
    phone: String(p.phone).slice(0, 40),
    email: p.email ? String(p.email).slice(0, 200) : null,
    website: p.website ? String(p.website).slice(0, 300) : null,
    niche: nicheOf(p.notes),
    city,
    state,
    status: p.do_not_call ? 'dnc' : (STATUS[p.status] ?? 'new'),
    source: `tracker:${p.channel ?? 'cold-call'}`,
    owner_rep_id: repIdFor(p),
    dnc_checked: Boolean(p.do_not_call),
    notes: p.notes ? String(p.notes).slice(0, 4000) : null,
    audit_score: p.audit_score ?? null,
    audit_url: p.audit_url ?? null,
    audit_json: p.audit_json ?? null,
    audit_at: p.audit_at ?? null,
    last_email_at: p.last_email_at ?? null,
    email_opened_at: p.email_opened_at ?? null,
    email_open_count: p.email_open_count ?? 0,
    pipeline_lead_id: p.lead_id ?? null,
  });
}

console.log(`\nPLAN`);
console.log(`  insert as new leads : ${inserts.length}`);
console.log(`  merge into existing : ${updates.length}`);
console.log(`  skipped, chain      : ${skipped.chain.length}`);
console.log(`  skipped, no phone   : ${skipped.nophone.length}`);
console.log(`  already complete    : ${skipped.nochange.length}`);

const tally = (rows, k) => Object.entries(rows.reduce((a, x) => ((a[x[k]] = (a[x[k]] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
if (inserts.length) {
  console.log(`  niche  : ${JSON.stringify(tally(inserts, 'niche'))}`);
  console.log(`  status : ${JSON.stringify(tally(inserts, 'status'))}`);
  console.log(`  owned  : ${inserts.filter((i) => i.owner_rep_id).length}/${inserts.length} matched to a rep`);
  console.log(`  sample : ${inserts.slice(0, 5).map((i) => `${i.business_name} [${i.city ?? '?'}]`).join(' | ')}`);
}
if (skipped.chain.length) console.log(`  chains : ${skipped.chain.slice(0, 8).join(', ')}`);
if (skipped.nophone.length) console.log(`  nophone: ${skipped.nophone.slice(0, 8).join(', ')}`);

if (!APPLY) {
  console.log('\nDRY RUN. Nothing written. Re-run with --apply to write.');
  process.exit(0);
}

let ins = 0;
for (let i = 0; i < inserts.length; i += 200) {
  const chunk = inserts.slice(i, i + 200);
  const { error } = await sb.from('outbound_leads').insert(chunk);
  if (error) { console.error('insert failed:', error.message); process.exit(1); }
  ins += chunk.length;
  process.stdout.write(`\r  inserted ${ins}/${inserts.length}`);
}
let upd = 0;
for (const u of updates) {
  const { error } = await sb.from('outbound_leads').update(u.patch).eq('id', u.id);
  if (error) { console.error(`\nupdate ${u.business} failed:`, error.message); process.exit(1); }
  upd++;
  process.stdout.write(`\r  merged ${upd}/${updates.length}   `);
}
console.log(`\n\nDone. ${ins} inserted, ${upd} merged into existing leads.`);
