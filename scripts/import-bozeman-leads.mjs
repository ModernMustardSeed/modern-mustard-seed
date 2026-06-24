/**
 * One-off importer: pull ~100 Bozeman, MT service businesses and trades into the
 * rep_prospects Tracker, with website + phone + a scraped contact email, owned by
 * Sarah, status to-contact. These are the missed-call-prone local businesses
 * Mr. Mustard (the AI voice SDR) demos best for.
 *
 * Discovery: Foursquare Places (keyed). Email: light homepage/contact scrape.
 * Insert: Supabase PostgREST with the service-role key (migration 027 columns).
 *
 * Run:  node scripts/import-bozeman-leads.mjs [targetCount]
 */

import { readFileSync, existsSync } from 'node:fs';

// ---- env -------------------------------------------------------------------
function loadEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = { ...loadEnv('.env.video'), ...loadEnv('.env.local') };
const FS_KEY = env.foursquare_api_key;
const SUPA_URL = env.supabase_url;
const SUPA_KEY = env.supabase_service_role_key;
const REP_EMAIL = (env.admin_email || 'sarah@modernmustardseed.com').toLowerCase();
const REP_NAME = env.admin_name || 'Sarah Scarano';
const TARGET = Number(process.argv[2] || 100);

if (!FS_KEY) throw new Error('FOURSQUARE_API_KEY missing from .env.local');
if (!SUPA_URL || !SUPA_KEY) throw new Error('Supabase url/service key missing from .env.local');

const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';
const CITY = 'Bozeman';
const GEO = 'Bozeman, MT';

// Verticals to pull. The label is the leading notes token, which drives the
// per-lead call-script hook, so it must read naturally and match the hook regex.
const VERTICALS = [
  { q: 'med spa', label: 'Med spa', cap: 4 },
  { q: 'physical therapy', label: 'Physical therapy clinic', cap: 4 },
  { q: 'auto body shop', label: 'Auto service', cap: 4 },
  { q: 'tire shop', label: 'Auto service', cap: 3 },
  { q: 'appliance repair', label: 'Appliance repair trade', cap: 3 },
  { q: 'septic tank service', label: 'Septic trade', cap: 3 },
  { q: 'tree service', label: 'Tree service trade', cap: 4 },
  { q: 'carpet cleaning', label: 'Cleaners', cap: 3 },
  { q: 'handyman', label: 'Handyman trade', cap: 3 },
  { q: 'remodeling contractor', label: 'General contractor', cap: 3 },
  { q: 'gutter installation', label: 'Gutter trade', cap: 3 },
  { q: 'optometrist', label: 'Optometry clinic', cap: 3 },
  { q: 'nail salon', label: 'Salon / spa', cap: 3 },
  { q: 'barber shop', label: 'Barber / salon', cap: 3 },
  { q: 'dog grooming', label: 'Pet grooming service', cap: 3 },
  { q: 'massage therapist', label: 'Salon / spa', cap: 3 },
];

const FRANCHISE = ['midas', 'jiffy lube', 'great clips', 'supercuts', 'anytime fitness', 'planet fitness', 'servpro', 'roto-rooter', 'aamco', 'meineke', 'orkin', 'terminix', 'merry maids', 'molly maid', 'valvoline', 'les schwab', 'big o tires', 'firestone', 'mr. rooter', 'mr rooter', 'one hour heating', 'aspen dental', 'heartland dental', 'european wax', 'massage envy', 'snap fitness'];

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- geocode ---------------------------------------------------------------
async function geocode(q) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const arr = await res.json();
  if (!arr.length) throw new Error(`Could not geocode ${q}`);
  return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
}

// ---- foursquare ------------------------------------------------------------
async function searchFsq(query, center) {
  const params = new URLSearchParams({ query, ll: `${center.lat},${center.lon}`, radius: '32000', limit: '50', fields: 'name,location,tel,website' });
  const res = await fetch(`https://places-api.foursquare.com/places/search?${params}`, {
    headers: { Authorization: `Bearer ${FS_KEY}`, 'X-Places-Api-Version': '2025-06-17', Accept: 'application/json' },
  });
  if (!res.ok) { console.warn(`  FSQ ${query}: ${res.status} ${(await res.text()).slice(0, 120)}`); return []; }
  const json = await res.json();
  return (json.results ?? []).map((p) => ({ name: p.name, phone: p.tel ?? null, website: p.website ?? p.website_url ?? null }));
}

// ---- email scrape ----------------------------------------------------------
const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite/i;
const ROLE = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi|service|scheduling)@/i;
function bestEmail(list, host) {
  const clean = [...new Set(list.map((e) => e.toLowerCase().trim()))].filter((e) => !EMAIL_BLOCK.test(e) && e.length <= 100 && /@[a-z0-9.-]+\.[a-z]{2,}$/.test(e));
  if (!clean.length) return null;
  clean.sort((a, b) => {
    const da = hostOf(a.split('@')[1]) === host ? 1 : 0, db = hostOf(b.split('@')[1]) === host ? 1 : 0;
    if (da !== db) return db - da;
    return (ROLE.test(b) ? 1 : 0) - (ROLE.test(a) ? 1 : 0);
  });
  return clean[0];
}
async function pageEmails(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    if (!res.ok) return [];
    let html = (await res.text()).slice(0, 400_000).replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*[\[(]at[\])]\s*/gi, '@');
    const out = [];
    for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) out.push(m[1]);
    for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) out.push(m[0]);
    return out;
  } catch { return []; }
}
async function scrapeEmail(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = '';
  try { origin = new URL(base).origin; } catch { return null; }
  const host = hostOf(base);
  const collected = [];
  for (const page of [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`]) {
    collected.push(...(await pageEmails(page)));
    const b = bestEmail(collected, host);
    if (b && (hostOf(b.split('@')[1]) === host || ROLE.test(b))) return b;
  }
  return bestEmail(collected, host);
}

// pooled map for concurrency-limited async work
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

// ---- supabase --------------------------------------------------------------
async function existingKeys() {
  const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects?select=business,phone&limit=5000`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  const rows = res.ok ? await res.json() : [];
  const names = new Set(rows.map((r) => norm(r.business)));
  const phones = new Set(rows.map((r) => (r.phone || '').replace(/[^0-9]/g, '')).filter(Boolean));
  return { names, phones };
}
async function insertRows(rows) {
  const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Insert failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// ---- run -------------------------------------------------------------------
async function main() {
  console.log(`Discovering ~${TARGET} service/trade businesses in ${GEO}...`);
  const center = await geocode(GEO);
  const { names: seenNames, phones: seenPhones } = await existingKeys();
  console.log(`Already in tracker: ${seenNames.size} businesses (will skip dupes).`);

  const picked = [];
  for (const v of VERTICALS) {
    const places = await searchFsq(v.q, center);
    let kept = 0;
    for (const p of places) {
      if (kept >= v.cap || picked.length >= TARGET) break;
      const n = norm(p.name);
      if (!n || !p.phone) continue; // need a name and a callable number
      const digits = p.phone.replace(/[^0-9]/g, '');
      if (seenNames.has(n) || (digits && seenPhones.has(digits)) || FRANCHISE.some((f) => n.includes(norm(f)))) continue;
      seenNames.add(n);
      if (digits) seenPhones.add(digits);
      picked.push({ business: p.name, phone: p.phone, website: p.website, label: v.label });
      kept++;
    }
    console.log(`  ${v.label.padEnd(20)} kept ${kept}  (total ${picked.length})`);
    await sleep(300); // be polite to the API
    if (picked.length >= TARGET) break;
  }

  console.log(`\nScraping emails for ${picked.filter((p) => p.website).length} sites...`);
  await pool(picked, 6, async (p) => {
    if (p.website) p.email = await scrapeEmail(p.website);
    return p;
  });

  const rows = picked.map((p) => ({
    rep_email: REP_EMAIL,
    rep_name: REP_NAME,
    business: p.business.slice(0, 200),
    city: CITY,
    phone: p.phone ? p.phone.slice(0, 40) : null,
    website: p.website ? p.website.slice(0, 300) : null,
    email: p.email ? p.email.slice(0, 200) : null,
    channel: 'cold-call',
    status: 'to-contact',
    notes: `${p.label} · Bozeman, MT (Foursquare discovery)`,
  }));

  if (!rows.length) { console.log('Nothing new to insert.'); return; }
  await insertRows(rows);

  const withSite = rows.filter((r) => r.website).length;
  const withEmail = rows.filter((r) => r.email).length;
  console.log(`\nInserted ${rows.length} new Bozeman prospects.`);
  console.log(`  with website: ${withSite}/${rows.length}`);
  console.log(`  with email:   ${withEmail}/${rows.length}`);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
