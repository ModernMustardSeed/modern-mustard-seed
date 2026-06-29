/**
 * Trades / construction / home-services lead sourcer (OpenStreetMap, no API key).
 * Pulls blue-collar local businesses (plumbers, electricians, HVAC, roofers,
 * builders, landscapers, painters, contractors, auto, etc.) that carry a website
 * tag, requires a phone, scrapes a contact email, flags a "needs us" signal, and
 * assigns them to Sarah. Hunter fills the remaining emails via enrich-prospects.
 *
 * Run: node scripts/source-trades.mjs "Kalispell" MT 48.10 -114.52 48.55 -113.95 60
 *      (city  state  south west north east  target)
 */
import { readFileSync } from 'node:fs';

function loadEnv(file) { const out = {}; try { for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) { if (!line || line.startsWith('#') || !line.includes('=')) continue; const i = line.indexOf('='); out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, ''); } } catch {} return out; }
const env = loadEnv('.env.local');
const SUPA_URL = env.supabase_url, SUPA_KEY = env.supabase_service_role_key;
const REP_EMAIL = (env.admin_email || 'sarah@modernmustardseed.com').toLowerCase();
const REP_NAME = env.admin_name || 'Sarah Scarano';
const CITY = process.argv[2] || 'Kalispell';
const STATE = process.argv[3] || 'MT';
const S = process.argv[4], W = process.argv[5], N = process.argv[6], E = process.argv[7];
const TARGET = Number(process.argv[8] || 60);
const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';
const YEAR = 2026;
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

const FRANCHISE = ['midas','jiffy lube','servpro','roto-rooter','aamco','meineke','orkin','terminix','merry maids','molly maid','valvoline','les schwab','big o tires','firestone','mr rooter','mr handyman','two men and a truck','1-800','ace hardware','true value','napa','autozone','o reilly','discount tire','grease monkey','precision tune','maaco','glass doctor','window world','leaffilter','culligan','stanley steemer','chemdry'];

function labelFor(t) {
  const s = t.shop, c = t.craft, o = t.office, a = t.amenity;
  if (c === 'plumber') return 'Plumbing trade';
  if (c === 'electrician') return 'Electrical trade';
  if (c === 'hvac' || c === 'heating_engineer') return 'HVAC trade';
  if (c === 'roofer') return 'Roofing trade';
  if (c === 'carpenter' || c === 'joiner') return 'Carpentry trade';
  if (c === 'painter') return 'Painting trade';
  if (c === 'gardener' || c === 'landscape') return 'Landscaping service';
  if (c === 'plasterer') return 'Plastering trade';
  if (c === 'tiler') return 'Tiling trade';
  if (c === 'flooring' || c === 'floorer') return 'Flooring trade';
  if (c === 'stonemason' || c === 'mason') return 'Masonry trade';
  if (c === 'insulation') return 'Insulation trade';
  if (c === 'window_construction' || c === 'glaziery') return 'Window / glass trade';
  if (c === 'metal_construction' || c === 'blacksmith' || c === 'welder') return 'Metal / welding trade';
  if (c === 'builder' || c) return (c ? c.replace(/_/g, ' ') + ' trade' : 'General contractor');
  if (o === 'construction_company') return 'General contractor';
  if (o === 'architect') return 'Architecture firm';
  if (o === 'surveyor') return 'Surveying firm';
  if (o === 'engineer') return 'Engineering firm';
  if (a === 'car_repair') return 'Auto service';
  if (s === 'doityourself' || s === 'hardware' || s === 'trade') return 'Hardware / supply';
  if (s) return s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) + ' service';
  return 'Home services';
}

const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite/i;
const ROLE = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi|service|scheduling|estimates|estimating)@/i;
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
  const q = `[out:json][timeout:120];(nwr["website"]["craft"](${bbox});nwr["website"]["office"~"^(construction_company|architect|surveyor|engineer)$"](${bbox});nwr["website"]["shop"~"^(doityourself|hardware|trade|electrical|paint|flooring|garden_centre|kitchen|bathroom_furnishing|tiles|fireplace|glaziery|locksmith|security|appliance|window_construction|gutter|interior_decoration|fencing|swimming_pool)$"](${bbox});nwr["website"]["amenity"="car_repair"](${bbox}););out tags 800;`;
  for (const url of ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: `data=${encodeURIComponent(q)}`, signal: AbortSignal.timeout(120000) });
      if (!res.ok) { console.warn(`overpass ${url}: ${res.status}`); continue; }
      const j = await res.json(); if (j.elements?.length) return j.elements;
    } catch (e) { console.warn(`overpass ${url} err: ${e.message}`); }
  }
  return [];
}
async function existingKeys() { const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects?select=business,phone&limit=6000`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }); const rows = res.ok ? await res.json() : []; return { names: new Set(rows.map((r) => norm(r.business))), phones: new Set(rows.map((r) => (r.phone || '').replace(/[^0-9]/g, '')).filter(Boolean)) }; }
async function insertRows(rows) { const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects`, { method: 'POST', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rows) }); if (!res.ok) throw new Error(`Insert ${res.status}: ${(await res.text()).slice(0, 300)}`); }

async function main() {
  const bbox = `${S},${W},${N},${E}`;
  console.log(`Trades sourcing ${CITY}, ${STATE} bbox=${bbox}, target ${TARGET}...`);
  const els = await overpass(bbox);
  console.log(`OSM returned ${els.length} trade/construction/service businesses with a website tag`);
  const { names: seenNames, phones: seenPhones } = await existingKeys();
  const capByLabel = {};
  const picked = [];
  for (const el of els) {
    if (picked.length >= TARGET) break;
    const t = el.tags || {};
    const name = t.name; if (!name) continue;
    const website = t.website || t['contact:website'] || t.url;
    const phone = t.phone || t['contact:phone'] || t['phone:mobile'];
    if (!website || !phone) continue; // must be auditable AND reachable
    const n = norm(name); const digits = (phone || '').replace(/[^0-9]/g, '');
    if (seenNames.has(n) || (digits && seenPhones.has(digits)) || FRANCHISE.some((f) => n.includes(norm(f)))) continue;
    const label = labelFor(t);
    capByLabel[label] = (capByLabel[label] || 0); if (capByLabel[label] >= 12) continue;
    seenNames.add(n); if (digits) seenPhones.add(digits); capByLabel[label]++;
    picked.push({ business: name, phone, website, email: t.email || t['contact:email'] || null, city: t['addr:city'] || CITY, label });
  }
  console.log(`picked ${picked.length} (deduped vs tracker, chains removed, capped per type)`);
  if (!picked.length) { console.log('Nothing to insert. Try a wider bbox.'); return; }
  console.log(`scraping ${picked.length} sites for email + a "needs us" signal...`);
  await pool(picked, 6, async (p) => { if (!p.email) { const r = await scrapeSite(p.website); p.email = r.email; p.weak = r.weak; } });
  const rows = picked.map((p) => { const need = p.weak?.length ? ` · needs us: ${p.weak.join(', ')}` : ''; return { rep_email: REP_EMAIL, rep_name: REP_NAME, business: String(p.business).slice(0, 200), city: String(p.city).slice(0, 80), phone: String(p.phone).slice(0, 40), website: String(p.website).slice(0, 300), email: p.email ? String(p.email).slice(0, 200) : null, channel: 'cold-call', status: 'to-contact', notes: `${p.label} · ${CITY}, ${STATE} (OpenStreetMap)${need}`.slice(0, 2000) }; });
  await insertRows(rows);
  const byType = {}; for (const p of picked) byType[p.label] = (byType[p.label] || 0) + 1;
  console.log(`\nInserted ${rows.length} ${CITY} trade/service leads (all have website + phone), assigned to ${REP_NAME}.`);
  console.log(`  with email already: ${rows.filter((r) => r.email).length}/${rows.length} (Hunter fills the rest next)`);
  console.log(`  by type:`, Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(', '));
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
