/**
 * Reusable lead sourcer for the rep Tracker. Pulls service businesses that have
 * the things our outreach needs: a WEBSITE (we audit it), a PHONE, and a contact
 * EMAIL (scraped; Hunter fills the rest later). Website + phone are REQUIRED at
 * source, so the list is born clean. It also flags a "needs us" signal (site not
 * mobile-friendly, or a stale copyright year) so reps know who to hit first.
 *
 * These are exactly who Modern Mustard Seed converts: a real local business with
 * a real but weak website.
 *
 * Discovery: Foursquare Places (keyed). Email: homepage/contact scrape.
 * Run:  node scripts/source-leads.mjs "Austin" "Austin, TX" 80
 */
import { readFileSync, existsSync } from 'node:fs';

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
const env = { ...loadEnv('.env.local') };
const FS_KEY = env.foursquare_api_key;
const SUPA_URL = env.supabase_url;
const SUPA_KEY = env.supabase_service_role_key;
const REP_EMAIL = (env.admin_email || 'sarah@modernmustardseed.com').toLowerCase();
const REP_NAME = env.admin_name || 'Sarah Scarano';
const CITY = process.argv[2] || 'Austin';
const GEO = process.argv[3] || 'Austin, TX';
const TARGET = Number(process.argv[4] || 80);
if (!FS_KEY || !SUPA_URL || !SUPA_KEY) throw new Error('Need FOURSQUARE_API_KEY + supabase url/service key in .env.local');

const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';
const YEAR = 2026;

// Service verticals whose sites are reliably weak / DIY and who live or die on
// the phone. Label = leading notes token (drives the call-script hook).
const VERTICALS = [
  { q: 'med spa', label: 'Med spa', cap: 5 },
  { q: 'dentist', label: 'Dental clinic', cap: 5 },
  { q: 'chiropractor', label: 'Chiropractic clinic', cap: 4 },
  { q: 'physical therapy', label: 'Physical therapy clinic', cap: 4 },
  { q: 'law firm', label: 'Law firm', cap: 5 },
  { q: 'hvac contractor', label: 'HVAC trade', cap: 5 },
  { q: 'plumber', label: 'Plumbing trade', cap: 5 },
  { q: 'electrician', label: 'Electrical trade', cap: 4 },
  { q: 'roofing contractor', label: 'Roofing trade', cap: 4 },
  { q: 'landscaping', label: 'Landscaping service', cap: 4 },
  { q: 'pest control', label: 'Pest control service', cap: 3 },
  { q: 'auto repair shop', label: 'Auto service', cap: 5 },
  { q: 'med spa', label: 'Med spa', cap: 0 },
  { q: 'veterinarian', label: 'Veterinary clinic', cap: 4 },
  { q: 'real estate agency', label: 'Real estate', cap: 4 },
  { q: 'insurance agency', label: 'Insurance agency', cap: 4 },
  { q: 'accountant', label: 'Accounting firm', cap: 4 },
  { q: 'nail salon', label: 'Salon / spa', cap: 3 },
  { q: 'barber shop', label: 'Barber / salon', cap: 3 },
  { q: 'remodeling contractor', label: 'General contractor', cap: 4 },
  { q: 'tree service', label: 'Tree service trade', cap: 3 },
  { q: 'dog grooming', label: 'Pet grooming service', cap: 3 },
];

const FRANCHISE = ['midas', 'jiffy lube', 'great clips', 'supercuts', 'anytime fitness', 'planet fitness', 'servpro', 'roto-rooter', 'aamco', 'meineke', 'orkin', 'terminix', 'merry maids', 'molly maid', 'valvoline', 'les schwab', 'big o tires', 'firestone', 'mr. rooter', 'mr rooter', 'one hour heating', 'aspen dental', 'heartland dental', 'european wax', 'massage envy', 'snap fitness', 'h&r block', 'jackson hewitt', 'state farm', 'allstate', 'farmers insurance', 'keller williams', 're/max', 'coldwell banker'];

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(q) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const arr = await res.json();
  if (!arr.length) throw new Error(`Could not geocode ${q}`);
  return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
}
async function searchFsq(query, center) {
  const params = new URLSearchParams({ query, ll: `${center.lat},${center.lon}`, radius: '32000', limit: '50', fields: 'name,location,tel,website' });
  const res = await fetch(`https://places-api.foursquare.com/places/search?${params}`, { headers: { Authorization: `Bearer ${FS_KEY}`, 'X-Places-Api-Version': '2025-06-17', Accept: 'application/json' } });
  if (!res.ok) { console.warn(`  FSQ ${query}: ${res.status}`); return []; }
  return ((await res.json()).results ?? []).map((p) => ({ name: p.name, phone: p.tel ?? null, website: p.website ?? p.website_url ?? null }));
}

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
/** Scrape homepage + contact pages for an email AND capture a "needs us" signal. */
async function scrapeSite(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = '';
  try { origin = new URL(base).origin; } catch { return { email: null, weak: [] }; }
  const host = hostOf(base);
  const collected = [];
  const weak = [];
  let homeChecked = false;
  for (const page of [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`]) {
    try {
      const res = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
      if (!res.ok) continue;
      let html = (await res.text()).slice(0, 400_000);
      if (!homeChecked && page === base) {
        homeChecked = true;
        if (!/<meta[^>]+name=["']viewport["']/i.test(html)) weak.push('not mobile-friendly');
        if (res.url && res.url.startsWith('http://')) weak.push('no HTTPS');
        const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*\D{0,6}(20\d\d)/gi)].map((m) => +m[1]);
        const maxYear = years.length ? Math.max(...years) : null;
        if (maxYear && maxYear <= YEAR - 2) weak.push(`stale (©${maxYear})`);
      }
      html = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*[\[(]at[\])]\s*/gi, '@');
      for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) collected.push(m[1]);
      for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) collected.push(m[0]);
      const b = bestEmail(collected, host);
      if (b && (hostOf(b.split('@')[1]) === host || ROLE.test(b)) && homeChecked) return { email: b, weak };
    } catch { /* skip page */ }
  }
  return { email: bestEmail(collected, host), weak };
}
async function pool(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) { const idx = i++; await fn(items[idx]); } }));
}

async function existingKeys() {
  const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects?select=business,phone&limit=5000`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } });
  const rows = res.ok ? await res.json() : [];
  return { names: new Set(rows.map((r) => norm(r.business))), phones: new Set(rows.map((r) => (r.phone || '').replace(/[^0-9]/g, '')).filter(Boolean)) };
}
async function insertRows(rows) {
  const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects`, { method: 'POST', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  if (!res.ok) throw new Error(`Insert failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function main() {
  console.log(`Sourcing up to ${TARGET} website+phone service businesses in ${GEO}...`);
  const center = await geocode(GEO);
  const { names: seenNames, phones: seenPhones } = await existingKeys();
  console.log(`Already in tracker: ${seenNames.size} businesses (skipping dupes).`);

  const picked = [];
  for (const v of VERTICALS) {
    if (v.cap <= 0 || picked.length >= TARGET) continue;
    const places = await searchFsq(v.q, center);
    let kept = 0;
    for (const p of places) {
      if (kept >= v.cap || picked.length >= TARGET) break;
      const n = norm(p.name);
      if (!n || !p.phone || !p.website) continue; // REQUIRE website + phone
      const digits = p.phone.replace(/[^0-9]/g, '');
      if (seenNames.has(n) || (digits && seenPhones.has(digits)) || FRANCHISE.some((f) => n.includes(norm(f)))) continue;
      seenNames.add(n); if (digits) seenPhones.add(digits);
      picked.push({ business: p.name, phone: p.phone, website: p.website, label: v.label });
      kept++;
    }
    console.log(`  ${v.label.padEnd(22)} kept ${kept}  (total ${picked.length})`);
    await sleep(300);
  }

  console.log(`\nScraping ${picked.length} sites for email + weakness signal...`);
  await pool(picked, 6, async (p) => { const r = await scrapeSite(p.website); p.email = r.email; p.weak = r.weak; });

  const rows = picked.map((p) => {
    const need = p.weak?.length ? ` · needs us: ${p.weak.join(', ')}` : '';
    return {
      rep_email: REP_EMAIL, rep_name: REP_NAME,
      business: p.business.slice(0, 200), city: CITY,
      phone: p.phone ? p.phone.slice(0, 40) : null,
      website: p.website ? p.website.slice(0, 300) : null,
      email: p.email ? p.email.slice(0, 200) : null,
      channel: 'cold-call', status: 'to-contact',
      notes: `${p.label} · ${GEO} (Foursquare discovery)${need}`.slice(0, 2000),
    };
  });
  if (!rows.length) { console.log('Nothing new to insert.'); return; }
  await insertRows(rows);

  console.log(`\nInserted ${rows.length} ${CITY} prospects (all have website + phone).`);
  console.log(`  with email scraped: ${rows.filter((r) => r.email).length}/${rows.length} (Hunter fills the rest)`);
  console.log(`  flagged "needs us": ${rows.filter((r) => /needs us/.test(r.notes)).length}/${rows.length}`);
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
