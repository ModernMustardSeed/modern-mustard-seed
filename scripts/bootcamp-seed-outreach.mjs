// Seed the host outreach list: data/bootcamp-outreach.json into bootcamp_outreach.
//
// Run from the checkout, where .env.local and node_modules live:
//   node scripts/bootcamp-seed-outreach.mjs          write
//   node scripts/bootcamp-seed-outreach.mjs --dry    print what would change, write nothing
//
// Idempotent. A row is matched on lower(email) when the target has one, else
// on lower(name) + lower(brand). An existing row keeps its status, step,
// next_at and notes (the engine's progress is never reset by a reseed); only
// the research fields are refreshed. A new row starts queued, or hand when
// the contact path is a form, a booking page or a DM.
//
// PostgREST cannot upsert against the expression index on lower(email), so
// the match is done here in two reads and a batch of writes.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const DRY = process.argv.includes('--dry');
const SEED = resolve('data/bootcamp-outreach.json');
const TABLE = 'bootcamp_outreach';

const env = Object.fromEntries(
  readFileSync(resolve('.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^\s*[A-Za-z_][\w]*\s*=/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
    }),
);
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.supabase_url;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!url || !key) throw new Error('No Supabase URL or service role key in .env.local. Run this from the MMS checkout.');

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const CONTACT_TYPES = new Set(['email', 'form', 'booking', 'dm']);
const text = (v, max = 4000) => {
  if (v == null) return null;
  const s = Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v);
  const t = s.replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, max) : null;
};
const lower = (v) => (v || '').toString().trim().toLowerCase();

/** One seed entry to one table row, minus the progress columns. */
function toRow(t) {
  const contactType = CONTACT_TYPES.has(t.contactType) ? t.contactType : 'email';
  const email = contactType === 'email' ? lower(t.email || (t.contactPath || '').match(EMAIL_RE)?.[0]) || null : lower(t.email) || null;
  const fit = Number(t.fit);
  return {
    name: text(t.name, 160),
    brand: text(t.brand, 200),
    email,
    contact_path: text(t.contactPath, 600),
    contact_type: contactType,
    platforms: text(t.platforms, 300),
    audience: text(t.audience, 600),
    audience_source: text(t.audienceSource, 600),
    sells: text(t.sells, 1000),
    evidence: text(t.affiliateEvidence, 2000),
    hook: text(t.hook, 1000),
    vertical: text(t.vertical, 40) || 'ai-business',
    fit: Number.isFinite(fit) ? Math.min(5, Math.max(1, Math.round(fit))) : 3,
    tier: text(t.tier, 4) || 'B',
    source_urls: Array.isArray(t.sourceUrls) ? t.sourceUrls.filter((u) => typeof u === 'string' && u.trim()).slice(0, 12) : [],
  };
}

const seed = JSON.parse(readFileSync(SEED, 'utf8'));
if (!Array.isArray(seed)) throw new Error(`${SEED} is not a JSON array.`);
const em = JSON.stringify(seed).includes('—');
if (em) throw new Error('Em dash in the seed file. Remove it before seeding.');

const rows = seed.map(toRow).filter((r) => r.name);
if (rows.length !== seed.length) console.warn(`${seed.length - rows.length} entries had no name and were skipped.`);

const require = createRequire(resolve('package.json'));
const { createClient } = require('@supabase/supabase-js');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing, error: readErr } = await db.from(TABLE).select('id, email, name, brand, status').limit(5000);
if (readErr) throw new Error(`Could not read ${TABLE}: ${readErr.message}`);

const byEmail = new Map();
const byNameBrand = new Map();
for (const r of existing ?? []) {
  if (r.email) byEmail.set(lower(r.email), r);
  byNameBrand.set(`${lower(r.name)}|${lower(r.brand)}`, r);
}

let inserted = 0;
let updated = 0;
let failed = 0;
const counts = { email: 0, hand: 0, byVertical: {} };
const seenEmails = new Set();

for (const row of rows) {
  counts.byVertical[row.vertical] = (counts.byVertical[row.vertical] ?? 0) + 1;
  if (row.contact_type === 'email' && row.email) counts.email++;
  else counts.hand++;

  // The unique index is on lower(email): a repeat inside the seed file would
  // fail the insert, so the second copy is skipped out loud.
  if (row.email) {
    if (seenEmails.has(row.email)) {
      console.warn(`duplicate email in seed, skipped: ${row.email} (${row.name})`);
      continue;
    }
    seenEmails.add(row.email);
  }

  const match = (row.email && byEmail.get(row.email)) || byNameBrand.get(`${lower(row.name)}|${lower(row.brand)}`);
  if (match) {
    if (DRY) {
      console.log(`update  ${row.name}${row.brand ? ` (${row.brand})` : ''}  ${row.email || row.contact_type}  keeps status ${match.status}`);
      updated++;
      continue;
    }
    const { error } = await db.from(TABLE).update({ ...row, updated_at: new Date().toISOString() }).eq('id', match.id);
    if (error) {
      failed++;
      console.error(`FAILED update ${row.name}: ${error.message}`);
    } else updated++;
    continue;
  }

  const fresh = { ...row, status: row.contact_type === 'email' && row.email ? 'queued' : 'hand', step: 0, next_at: null };
  if (DRY) {
    console.log(`insert  ${row.name}${row.brand ? ` (${row.brand})` : ''}  ${row.email || row.contact_type}  -> ${fresh.status}`);
    inserted++;
    continue;
  }
  const { error } = await db.from(TABLE).insert(fresh);
  if (error) {
    failed++;
    console.error(`FAILED insert ${row.name}: ${error.message}`);
  } else inserted++;
}

console.log('');
console.log(`${DRY ? 'DRY RUN, nothing written. ' : ''}${rows.length} targets in the seed file.`);
console.log(`  ${counts.email} email rows (the cron sends these), ${counts.hand} hand rows (form, booking or DM: paste from the desk).`);
console.log(`  by vertical: ${Object.entries(counts.byVertical).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`  ${inserted} inserted, ${updated} updated, ${failed} failed.`);
if (failed) process.exit(1);
