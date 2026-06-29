/**
 * Trades / construction / home-services lead sourcer for the rep Tracker.
 * Discovery: Foursquare Places (trade-specific searches) PLUS OpenStreetMap as a
 * supplement. Requires a WEBSITE (we audit it) and a PHONE; scrapes a contact
 * email and flags a "needs us" signal; assigns every lead to Sarah. Hunter fills
 * the remaining emails afterward via enrich-prospects.mjs.
 *
 * Run: node scripts/source-trades.mjs "Kalispell" MT 48.05 -114.55 48.60 -113.90 60
 *      (city  state  south west north east  target)
 */
import { readFileSync } from 'node:fs';

function loadEnv(file) { const out = {}; try { for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) { if (!line || line.startsWith('#') || !line.includes('=')) continue; const i = line.indexOf('='); out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, ''); } } catch {} return out; }
const env = loadEnv('.env.local');
const SUPA_URL = env.supabase_url, SUPA_KEY = env.supabase_service_role_key;
const FS_KEY = process.env.FOURSQUARE_API_KEY || env.foursquare_api_key;
const REP_EMAIL = (env.admin_email || 'sarah@modernmustardseed.com').toLowerCase();
const REP_NAME = env.admin_name || 'Sarah Scarano';
const CITY = process.argv[2] || 'Kalispell';
const STATE = process.argv[3] || 'MT';
const S = process.argv[4], W = process.argv[5], N = process.argv[6], E = process.argv[7];
const TARGET = Number(process.argv[8] || 60);
const GEO = `${CITY}, ${STATE}`;
const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';
const YEAR = 2026;
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Trade / construction / home-service searches (Foursquare query, label, cap).
const VERTICALS = [
  ['hvac contractor', 'HVAC trade', 6], ['plumber', 'Plumbing trade', 6], ['electrician', 'Electrical trade', 6],
  ['roofing contractor', 'Roofing trade', 5], ['general contractor', 'General contractor', 6], ['remodeling contractor', 'Remodeling contractor', 4],
  ['landscaping', 'Landscaping service', 5], ['tree service', 'Tree service trade', 3], ['painting contractor', 'Painting trade', 4],
  ['flooring contractor', 'Flooring trade', 3], ['concrete contractor', 'Concrete trade', 3], ['fence contractor', 'Fencing trade', 3],
  ['excavating contractor', 'Excavation trade', 3], ['handyman', 'Handyman service', 3], ['pest control', 'Pest control service', 3],
  ['auto repair shop', 'Auto service', 5], ['garage door', 'Garage door service', 2], ['drywall contractor', 'Drywall trade', 2],
  ['masonry contractor', 'Masonry trade', 2], ['septic service', 'Septic service', 2], ['cabinet maker', 'Cabinetry trade', 2],
  ['welding', 'Welding trade', 2], ['paving contractor', 'Paving trade', 2], ['gutter installation', 'Gutter service', 2],
  ['window installation', 'Window trade', 2], ['cleaning service', 'Cleaning service', 3], ['snow removal', 'Snow removal service', 2],
  ['well drilling', 'Well / water trade', 2], ['heating oil', 'Heating fuel service', 2], ['glass company', 'Glass trade', 2],
];

const FRANCHISE = ['midas','jiffy lube','servpro','roto-rooter','aamco','meineke','orkin','terminix','merry maids','molly maid','valvoline','les schwab','big o tires','firestone','mr rooter','mr handyman','two men and a truck','1-800','ace hardware','true value','napa','autozone','o reilly','discount tire','grease monkey','precision tune','maaco','glass doctor','window world','leaffilter','culligan','stanley steemer','chemdry','one hour heating','aire serv','mister sparky','benjamin franklin'];

const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite/i;
const ROLE = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi|service|scheduling|estimates|estimating|dispatch)@/i;
function bestEmail(list, host) { const clean = [...new Set(list.map((e) => e.toLowerCase().trim()))].filter((e) => !EMAIL_BLOCK.test(e) && e.length <= 100 && /@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)); if (!clean.length) return null; clean.sort((a, b) => { const da = hostOf(a.split('@')[1]) === host ? 1 : 0, db = hostOf(b.split('@')[1]) === host ? 1 : 0; if (da !== db) return db - da; return (ROLE.test(b) ? 1 : 0) - (ROLE.test(a) ? 1 : 0); }); return clean[0]; }
async function scrapeSite(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = ''; try { origin = new URL(base).origin; } catch { return { email: null, weak: [] }; }
  const host = hostOf(base); const collected = []; const weak = []; let home = false;
  for (const page of [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`]) {
    try {
      const res = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
      if (!res.ok) continue;
      let html = (await res.text()).slice(0, 400000);
      if (!home && page === base) { home = true; if (!/<meta[^>]+name=["']viewport["']/i.test(html)) weak.push('not mobile-friendly'); if (res.url && res.url.startsWith('http://')) weak.push('no HTTPS'); const yrs = [...html.matchAll(/(?:©|&copy;|copyright)\s*\D{0,6}(20\d\d)/gi)].map((m) => +m[1]); const my = yrs.length ? Math.max(...yrs) : null; if (my && my <= YEAR - 2) weak.push(`stale (©${my})`); }
      html = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*[\[(]at[\])]\s*/gi, '@');
      for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) collected.push(m[1]);
      for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) collected.push(m[0]);
      const b = bestEmail(collected, host); if (b && (hostOf(b.split('@')[1]) === host || ROLE.test(b)) && home) return { email: b, weak };
    } catch {}
  }
  return { email: bestEmail(collected, host), weak };
}
async function pool(items, limit, fn) { let i = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) { const idx = i++; await fn(items[idx]); } })); }

async function geocode(q) { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } }); const a = await res.json(); if (!a.length) throw new Error(`geocode ${q}`); return { lat: +a[0].lat, lon: +a[0].lon }; }
async function searchFsq(query, center) {
  const params = new URLSearchParams({ query, ll: `${center.lat},${center.lon}`, radius: '40000', limit: '50', fields: 'name,location,tel,website' });
  const res = await fetch(`https://places-api.foursquare.com/places/search?${params}`, { headers: { Authorization: `Bearer ${FS_KEY}`, 'X-Places-Api-Version': '2025-06-17', Accept: 'application/json' } });
  if (!res.ok) { console.warn(`  FSQ ${query}: ${res.status}`); return { ok: res.status !== 429, places: [] }; }
  return { ok: true, places: ((await res.json()).results ?? []).map((p) => ({ name: p.name, phone: p.tel ?? null, website: p.website ?? null, city: p.location?.locality || CITY })) };
}
async function overpass(bbox) {
  const q = `[out:json][timeout:120];(nwr["website"]["craft"](${bbox});nwr["website"]["office"~"^(construction_company|architect|surveyor|engineer)$"](${bbox});nwr["website"]["shop"~"^(doityourself|hardware|trade|electrical|paint|flooring|garden_centre|kitchen|tiles|glaziery|locksmith|window_construction|gutter|fencing)$"](${bbox});nwr["website"]["amenity"="car_repair"](${bbox}););out tags 800;`;
  for (const url of ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']) {
    try { const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: `data=${encodeURIComponent(q)}`, signal: AbortSignal.timeout(120000) }); if (!res.ok) continue; const j = await res.json(); if (j.elements?.length) return j.elements; } catch {}
  }
  return [];
}

async function existingKeys() { const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects?select=business,phone&limit=6000`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }); const rows = res.ok ? await res.json() : []; return { names: new Set(rows.map((r) => norm(r.business))), phones: new Set(rows.map((r) => (r.phone || '').replace(/[^0-9]/g, '')).filter(Boolean)) }; }
async function insertRows(rows) { const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects`, { method: 'POST', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rows) }); if (!res.ok) throw new Error(`Insert ${res.status}: ${(await res.text()).slice(0, 300)}`); }

async function main() {
  console.log(`Trades sourcing ${GEO}, target ${TARGET}...`);
  const { names: seenNames, phones: seenPhones } = await existingKeys();
  console.log(`Already in tracker: ${seenNames.size} businesses (skipping dupes).`);
  const picked = [];
  const consider = (name, phone, website, city, label) => {
    if (picked.length >= TARGET) return;
    if (!name || !phone || !website) return;
    const n = norm(name); const digits = (phone || '').replace(/[^0-9]/g, '');
    if (seenNames.has(n) || (digits && seenPhones.has(digits)) || FRANCHISE.some((f) => n.includes(norm(f)))) return;
    seenNames.add(n); if (digits) seenPhones.add(digits);
    picked.push({ business: name, phone, website, city: city || CITY, label });
  };

  // 1) Foursquare trade searches (primary).
  if (FS_KEY) {
    let center; try { center = await geocode(GEO); } catch (e) { console.warn('geocode failed:', e.message); }
    if (center) {
      for (const [q, label, cap] of VERTICALS) {
        if (picked.length >= TARGET) break;
        const { ok, places } = await searchFsq(q, center);
        if (!ok) { console.warn('  Foursquare rate-limited; stopping FSQ, will use OSM.'); break; }
        let kept = 0; const before = picked.length;
        for (const p of places) { if (kept >= cap || picked.length >= TARGET) break; const had = picked.length; consider(p.name, p.phone, p.website, p.city, label); if (picked.length > had) kept++; }
        console.log(`  ${label.padEnd(22)} +${picked.length - before}  (total ${picked.length})`);
        await sleep(300);
      }
    }
  } else { console.log('No FOURSQUARE_API_KEY; OSM only.'); }

  // 2) OpenStreetMap supplement (fills any gap, no key).
  if (picked.length < TARGET && S) {
    console.log(`OSM supplement (have ${picked.length}/${TARGET})...`);
    const els = await overpass(`${S},${W},${N},${E}`);
    for (const el of els) { if (picked.length >= TARGET) break; const t = el.tags || {}; consider(t.name, t.phone || t['contact:phone'], t.website || t['contact:website'] || t.url, t['addr:city'], 'Home services'); }
    console.log(`  after OSM: ${picked.length}`);
  }

  if (!picked.length) { console.log('Nothing new to insert.'); return; }
  console.log(`\nScraping ${picked.length} sites for email + a "needs us" signal...`);
  await pool(picked, 6, async (p) => { const r = await scrapeSite(p.website); p.email = r.email; p.weak = r.weak; });
  const rows = picked.map((p) => { const need = p.weak?.length ? ` · needs us: ${p.weak.join(', ')}` : ''; return { rep_email: REP_EMAIL, rep_name: REP_NAME, business: String(p.business).slice(0, 200), city: String(p.city).slice(0, 80), phone: String(p.phone).slice(0, 40), website: String(p.website).slice(0, 300), email: p.email ? String(p.email).slice(0, 200) : null, channel: 'cold-call', status: 'to-contact', notes: `${p.label} · ${GEO}${need}`.slice(0, 2000) }; });
  await insertRows(rows);
  console.log(`\nInserted ${rows.length} ${CITY} trade/service leads (website + phone), assigned to ${REP_NAME}.`);
  console.log(`  with email already: ${rows.filter((r) => r.email).length}/${rows.length} (Hunter fills the rest next)`);
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
