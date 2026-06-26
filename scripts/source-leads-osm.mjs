/**
 * OpenStreetMap lead sourcer (no API key, no Foursquare rate limit). Pulls
 * service businesses that already carry BOTH a website and a phone tag in OSM,
 * so every lead is born auditable + reachable, then scrapes a contact email and
 * flags a "needs us" signal. Same shape as source-leads.mjs, different source.
 *
 * Run: node scripts/source-leads-osm.mjs "Scottsdale" 33.25 -112.35 33.75 -111.65 100
 *      (city  south west north east  target)
 */
import { readFileSync } from 'node:fs';

function loadEnv(file) { const out = {}; try { for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) { if (!line || line.startsWith('#') || !line.includes('=')) continue; const i = line.indexOf('='); out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, ''); } } catch {} return out; }
const env = loadEnv('.env.local');
const SUPA_URL = env.supabase_url, SUPA_KEY = env.supabase_service_role_key;
const REP_EMAIL = (env.admin_email || 'sarah@modernmustardseed.com').toLowerCase();
const REP_NAME = env.admin_name || 'Sarah Scarano';
const CITY = process.argv[2] || 'Scottsdale';
const S = process.argv[3], W = process.argv[4], N = process.argv[5], E = process.argv[6];
const TARGET = Number(process.argv[7] || 100);
const GEO = `${CITY}, AZ`;
const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';
const YEAR = 2026;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

const FRANCHISE = ['midas','jiffy lube','great clips','supercuts','anytime fitness','planet fitness','servpro','roto-rooter','aamco','meineke','orkin','terminix','merry maids','molly maid','valvoline','les schwab','big o tires','firestone','mr rooter','aspen dental','european wax','massage envy','snap fitness','h&r block','state farm','allstate','keller williams','re/max','coldwell banker','walmart','walgreens','cvs','starbucks','mcdonald','subway','dominos','pizza hut','taco bell','autozone','napa','discount tire','jersey mike','chipotle'];

// Map OSM tags to a readable category label (drives the call-script hook).
function labelFor(t) {
  const a = t.amenity, s = t.shop, c = t.craft, o = t.office, h = t.healthcare;
  if (a === 'dentist' || h === 'dentist') return 'Dental clinic';
  if (a === 'veterinary') return 'Veterinary clinic';
  if (a === 'restaurant' || a === 'cafe' || a === 'fast_food' || a === 'bar' || a === 'pub' || a === 'ice_cream') return 'Restaurant';
  if (a === 'pharmacy') return 'Pharmacy clinic';
  if (a === 'clinic' || a === 'doctors' || h === 'clinic' || h === 'doctor' || h === 'centre') return 'Medical clinic';
  if (h === 'physiotherapist') return 'Physical therapy clinic';
  if (h === 'chiropractor') return 'Chiropractic clinic';
  if (s === 'hairdresser' || s === 'beauty' || a === 'spa' || s === 'massage') return 'Salon / spa';
  if (s === 'car_repair' || s === 'tyres' || s === 'car_parts') return 'Auto service';
  if (c === 'plumber') return 'Plumbing trade';
  if (c === 'electrician') return 'Electrical trade';
  if (c === 'hvac' || c === 'heating_engineer') return 'HVAC trade';
  if (c === 'roofer') return 'Roofing trade';
  if (c === 'carpenter' || c === 'joiner') return 'Carpentry trade';
  if (c === 'gardener' || c === 'landscape' || s === 'garden_centre') return 'Landscaping service';
  if (c === 'painter') return 'Painting trade';
  if (o === 'lawyer') return 'Law firm';
  if (o === 'insurance') return 'Insurance agency';
  if (o === 'accountant') return 'Accounting firm';
  if (o === 'estate_agent') return 'Real estate';
  if (s) return s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  if (c) return c.replace(/_/g, ' ') + ' trade';
  if (o) return o.replace(/_/g, ' ') + ' office';
  return 'Local business';
}

const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite/i;
const ROLE = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi|service|scheduling)@/i;
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

async function overpass(bbox) {
  const q = `[out:json][timeout:90];(nwr["website"]["phone"]["amenity"~"^(restaurant|cafe|fast_food|bar|pub|dentist|clinic|doctors|veterinary|pharmacy|spa)$"](${bbox});nwr["website"]["phone"]["shop"](${bbox});nwr["website"]["phone"]["craft"](${bbox});nwr["website"]["phone"]["office"](${bbox});nwr["website"]["phone"]["healthcare"](${bbox}););out tags 600;`;
  for (const url of ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: `data=${encodeURIComponent(q)}`, signal: AbortSignal.timeout(90000) });
      if (!res.ok) { console.warn(`overpass ${url}: ${res.status}`); continue; }
      const j = await res.json(); if (j.elements?.length) return j.elements;
    } catch (e) { console.warn(`overpass ${url} err: ${e.message}`); }
  }
  return [];
}
async function existingKeys() { const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects?select=business,phone&limit=5000`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }); const rows = res.ok ? await res.json() : []; return { names: new Set(rows.map((r) => norm(r.business))), phones: new Set(rows.map((r) => (r.phone || '').replace(/[^0-9]/g, '')).filter(Boolean)) }; }
async function insertRows(rows) { const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects`, { method: 'POST', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rows) }); if (!res.ok) throw new Error(`Insert ${res.status}: ${(await res.text()).slice(0, 300)}`); }

async function main() {
  const bbox = `${S},${W},${N},${E}`;
  console.log(`OSM sourcing ${GEO} bbox=${bbox}, target ${TARGET}...`);
  const els = await overpass(bbox);
  console.log(`OSM returned ${els.length} businesses with website+phone tags`);
  const { names: seenNames, phones: seenPhones } = await existingKeys();
  const capByLabel = {};
  const picked = [];
  for (const el of els) {
    if (picked.length >= TARGET) break;
    const t = el.tags || {};
    const name = t.name; if (!name) continue;
    const website = t.website || t['contact:website'] || t.url; const phone = t.phone || t['contact:phone'];
    if (!website || !phone) continue;
    const n = norm(name); const digits = (phone || '').replace(/[^0-9]/g, '');
    if (seenNames.has(n) || (digits && seenPhones.has(digits)) || FRANCHISE.some((f) => n.includes(norm(f)))) continue;
    const label = labelFor(t);
    capByLabel[label] = (capByLabel[label] || 0); if (capByLabel[label] >= 8) continue; // variety cap
    seenNames.add(n); if (digits) seenPhones.add(digits); capByLabel[label]++;
    picked.push({ business: name, phone, website, email: t.email || t['contact:email'] || null, label });
  }
  console.log(`picked ${picked.length} (deduped, chains removed, capped per type)`);
  console.log(`scraping ${picked.length} sites for email + weakness...`);
  await pool(picked, 6, async (p) => { if (!p.email) { const r = await scrapeSite(p.website); p.email = r.email; p.weak = r.weak; } });
  const rows = picked.map((p) => { const need = p.weak?.length ? ` · needs us: ${p.weak.join(', ')}` : ''; return { rep_email: REP_EMAIL, rep_name: REP_NAME, business: String(p.business).slice(0, 200), city: CITY, phone: String(p.phone).slice(0, 40), website: String(p.website).slice(0, 300), email: p.email ? String(p.email).slice(0, 200) : null, channel: 'cold-call', status: 'to-contact', notes: `${p.label} · ${GEO} (OpenStreetMap)${need}`.slice(0, 2000) }; });
  if (!rows.length) { console.log('Nothing to insert.'); return; }
  await insertRows(rows);
  console.log(`\nInserted ${rows.length} ${CITY} leads (all have website + phone).`);
  console.log(`  with email: ${rows.filter((r) => r.email).length}/${rows.length} (Hunter fills the rest)`);
  console.log(`  flagged needs-us: ${rows.filter((r) => /needs us/.test(r.notes)).length}/${rows.length}`);
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
