/**
 * Insert a verified batch of Kalispell-area trade/construction/home-service
 * leads (sourced via web search) into the rep Tracker, assigned to Sarah. For
 * each: scrape the real site for an email + phone + a "needs us" signal, fall
 * back to Hunter for the email and to the provided phone, dedupe vs the tracker,
 * and only keep leads that end up with website + phone + email (great leads).
 *
 * Run: HUNTER_API_KEY=xxx node scripts/insert-kalispell-trades.mjs
 */
import { readFileSync } from 'node:fs';

const LEADS = [
  { business: 'Taylor Heating & Cooling', website: 'https://www.taylorheatair.com', phone: '', city: 'Kalispell', category: 'HVAC trade' },
  { business: 'McCrorie Heating & Cooling', website: 'https://www.mccroriehvac.com', phone: '', city: 'Kalispell', category: 'HVAC trade' },
  { business: 'Ace Heating and Air', website: 'https://ace-comfort.com', phone: '', city: 'Kalispell', category: 'HVAC trade' },
  { business: 'Performance Heating & Air', website: 'https://www.performanceheatingair.com', phone: '', city: 'Kalispell', category: 'HVAC trade' },
  { business: 'Temp Right Service', website: 'https://tempright.com', phone: '', city: 'Kalispell', category: 'HVAC trade' },
  { business: 'Rocky Mountain Plumbing & Heating', website: 'https://www.rockymtplumbing.com', phone: '', city: 'Kalispell', category: 'Plumbing trade' },
  { business: 'Wild West Plumbing, Heating, and Cooling', website: 'https://www.wildwestplumbing.com', phone: '', city: 'Kalispell', category: 'Plumbing trade' },
  { business: 'J&R Plumbing', website: 'https://www.jrplumbers.com', phone: '', city: 'Kalispell', category: 'Plumbing trade' },
  { business: 'Empire Plumbing', website: 'https://www.empireplumbingllc.com', phone: '', city: 'Kalispell', category: 'Plumbing trade' },
  { business: 'Kalispell Electric', website: 'https://www.kalispellelectric.com', phone: '', city: 'Kalispell', category: 'Electrical trade' },
  { business: 'Tradewind Electric', website: 'https://www.tradewindelectric.net', phone: '', city: 'Kalispell', category: 'Electrical trade' },
  { business: 'Electric Montana', website: 'https://electricmontana.com', phone: '', city: 'Kalispell', category: 'Electrical trade' },
  { business: 'Elliott Electric Inc', website: 'https://www.elliottelectricmt.com', phone: '', city: 'Whitefish', category: 'Electrical trade' },
  { business: 'Northwest Roofing Specialists', website: 'https://northwestroofingspecialists.com', phone: '+1 406-871-5840', city: 'Kalispell', category: 'Roofing trade' },
  { business: 'Glacier Roofing & Exteriors', website: 'https://myglacierhome.com', phone: '+1 406-303-3563', city: 'Kalispell', category: 'Roofing trade' },
  { business: 'Roof Ops, LLC', website: 'https://www.roofopsmt.com', phone: '', city: 'Kalispell', category: 'Roofing trade' },
  { business: 'TCG Montana', website: 'https://www.tcgmontana.com', phone: '', city: 'Kalispell', category: 'General contractor' },
  { business: 'Kalispell Contracting', website: 'https://kalispellcontracting.com', phone: '', city: 'Kalispell', category: 'General contractor' },
  { business: 'Montana Trophy Homes', website: 'https://www.montanatrophyhomes.com', phone: '', city: 'Kalispell', category: 'General contractor' },
  { business: 'Majors Excavation', website: 'https://majorsexcavation.com', phone: '', city: 'Kalispell', category: 'Excavation trade' },
  { business: 'Glacier Ridge Excavation', website: 'https://glacierridgeexcavation.com', phone: '', city: 'Columbia Falls', category: 'Excavation trade' },
  { business: 'Swanscapes Landscaping', website: 'https://www.swanscapesmt.com', phone: '', city: 'Kalispell', category: 'Landscaping service' },
  { business: 'Superior Land and Lawncare', website: 'https://superiorlandandlawncare.com', phone: '+1 406-250-8891', city: 'Kalispell', category: 'Landscaping service' },
  { business: 'Birdsong Landscape LLC', website: 'https://www.birdsonglandscape.com', phone: '', city: 'Kalispell', category: 'Landscaping service' },
  { business: 'Hagestad Painting & Coatings, Inc.', website: 'https://www.hagestadpainting.com', phone: '+1 406-253-4976', city: 'Kalispell', category: 'Painting trade' },
  { business: 'Exclusive Finishes', website: 'https://exclusivefinishesinc.com', phone: '', city: 'Kalispell', category: 'Painting trade' },
  { business: 'Cinderella & Co.', website: 'https://kalispellpainting.com', phone: '', city: 'Kalispell', category: 'Painting trade' },
  { business: 'Artisan Concrete Works', website: 'https://artisanconcretework.com', phone: '', city: 'Kalispell', category: 'Concrete trade' },
  { business: 'TM Schuster Construction, LLC', website: 'https://www.tmschusterconstruction.com', phone: '+1 406-261-5904', city: 'Kalispell', category: 'Concrete trade' },
  { business: 'The Carpet Store', website: 'https://carpetstorekalispell.com', phone: '', city: 'Kalispell', category: 'Flooring trade' },
  { business: 'Bigfoot Flooring', website: 'https://bigfootkalispell.com', phone: '+1 406-871-3630', city: 'Kalispell', category: 'Flooring trade' },
  { business: 'Valley Fence Inc.', website: 'https://www.valleyfencemt.com', phone: '', city: 'Kalispell', category: 'Fencing trade' },
  { business: 'Montana Fence', website: 'https://www.montanafence.com', phone: '+1 406-755-7650', city: 'Kalispell', category: 'Fencing trade' },
  { business: 'Riverside Garage Doors', website: 'https://riversidegaragedoors.com', phone: '+1 406-752-6505', city: 'Kalispell', category: 'Garage door service' },
  { business: 'Total Garage Solutions', website: 'https://totalgaragesolutions.net', phone: '+1 406-755-4120', city: 'Kalispell', category: 'Garage door service' },
  { business: 'Kalispell Tree Care', website: 'https://kalispelltreecare.com', phone: '+1 406-285-7383', city: 'Kalispell', category: 'Tree service trade' },
  { business: 'Dedicated Tree Works', website: 'https://dedicatedtreeworks.com', phone: '+1 406-249-5897', city: 'Kalispell', category: 'Tree service trade' },
  { business: 'Robison Drywall', website: 'https://robisondrywall.com', phone: '+1 406-686-5232', city: 'Kalispell', category: 'Drywall trade' },
  { business: 'Ready Freddy Inc.', website: 'https://www.readyfreddy.co', phone: '+1 406-752-4552', city: 'Kalispell', category: 'Septic service' },
  { business: 'Allwest Drilling Inc', website: 'https://allwestdrilling.com', phone: '+1 406-883-3151', city: 'Kalispell', category: 'Well / water trade' },
  { business: 'Ponderosa Drilling', website: 'https://ponderosadrilling.com', phone: '', city: 'Bigfork', category: 'Well / water trade' },
  { business: 'Distinctive Countertops & Cabinetry', website: 'https://www.distinctive-countertops.com', phone: '+1 406-751-5000', city: 'Kalispell', category: 'Cabinetry trade' },
  { business: 'NSL Seamless Gutters', website: 'https://nslseamlessgutters.com', phone: '+1 406-499-1488', city: 'Kalispell', category: 'Gutter service' },
  { business: 'Lindberg Masonry', website: 'https://www.lindbergmasonry.com', phone: '+1 406-270-4785', city: 'Kalispell', category: 'Masonry trade' },
  { business: 'Sharp Automotive Repair', website: 'https://www.autorepairkalispell.com', phone: '+1 406-890-2228', city: 'Kalispell', category: 'Auto service' },
];

function loadEnv(file) { const out = {}; try { for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) { if (!line || line.startsWith('#') || !line.includes('=')) continue; const i = line.indexOf('='); out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, ''); } } catch {} return out; }
const env = loadEnv('.env.local');
const SUPA_URL = env.supabase_url, SUPA_KEY = env.supabase_service_role_key;
const HUNTER_KEY = process.env.HUNTER_API_KEY || env.hunter_api_key || '';
const REP_EMAIL = (env.admin_email || 'sarah@modernmustardseed.com').toLowerCase();
const REP_NAME = env.admin_name || 'Sarah Scarano';
const STATE = 'MT';
const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';
const YEAR = 2026;
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite/i;
const ROLE = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi|service|scheduling|estimates|estimating|dispatch)@/i;
function bestEmail(list, host) { const clean = [...new Set(list.map((e) => e.toLowerCase().trim()))].filter((e) => !EMAIL_BLOCK.test(e) && e.length <= 100 && /@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)); if (!clean.length) return null; clean.sort((a, b) => { const da = hostOf(a.split('@')[1]) === host ? 1 : 0, db = hostOf(b.split('@')[1]) === host ? 1 : 0; if (da !== db) return db - da; return (ROLE.test(b) ? 1 : 0) - (ROLE.test(a) ? 1 : 0); }); return clean[0]; }
function bestPhone(list) { const clean = [...new Set(list.map((p) => p.replace(/[^0-9]/g, '')).filter((d) => d.length === 10 || (d.length === 11 && d.startsWith('1'))).map((d) => d.length === 11 ? d.slice(1) : d))]; if (!clean.length) return null; const local = clean.find((d) => d.startsWith('406')); const d = local || clean[0]; return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`; }
async function scrapeSite(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = ''; try { origin = new URL(base).origin; } catch { return { email: null, phone: null, weak: [] }; }
  const host = hostOf(base); const emails = []; const phones = []; const weak = []; let home = false;
  for (const page of [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`]) {
    try {
      const res = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      let html = (await res.text()).slice(0, 500000);
      if (!home && page === base) { home = true; if (!/<meta[^>]+name=["']viewport["']/i.test(html)) weak.push('not mobile-friendly'); if (res.url && res.url.startsWith('http://')) weak.push('no HTTPS'); const yrs = [...html.matchAll(/(?:©|&copy;|copyright)\s*\D{0,6}(20\d\d)/gi)].map((m) => +m[1]); const my = yrs.length ? Math.max(...yrs) : null; if (my && my <= YEAR - 2) weak.push(`stale (©${my})`); }
      for (const m of html.matchAll(/tel:\+?([0-9().\-\s]{7,})/gi)) phones.push(m[1]);
      for (const m of html.matchAll(/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g)) phones.push(m[0]);
      html = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*[\[(]at[\])]\s*/gi, '@');
      for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) emails.push(m[1]);
      for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) emails.push(m[0]);
      if (emails.length && phones.length && home) break;
    } catch {}
  }
  return { email: bestEmail(emails, host), phone: bestPhone(phones), weak };
}
async function hunterEmail(domain) {
  if (!HUNTER_KEY || !domain) return null;
  try { const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${HUNTER_KEY}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) }); if (!res.ok) return null; const j = await res.json(); const emails = (j.data?.emails ?? []).filter((e) => e?.value && !EMAIL_BLOCK.test(e.value)); if (!emails.length) return null; emails.sort((a, b) => ((b.type === 'generic') - (a.type === 'generic')) || ((b.confidence ?? 0) - (a.confidence ?? 0))); return emails[0].value.toLowerCase(); } catch { return null; }
}
async function pool(items, limit, fn) { let i = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) { const idx = i++; await fn(items[idx]); } })); }
async function existingKeys() { const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects?select=business,phone&limit=6000`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }); const rows = res.ok ? await res.json() : []; return { names: new Set(rows.map((r) => norm(r.business))), phones: new Set(rows.map((r) => (r.phone || '').replace(/[^0-9]/g, '')).filter(Boolean)) }; }
async function insertRows(rows) { const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects`, { method: 'POST', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rows) }); if (!res.ok) throw new Error(`Insert ${res.status}: ${(await res.text()).slice(0, 300)}`); }

const { names: seen, phones: seenPhones } = await existingKeys();
console.log(`Tracker has ${seen.size} businesses. Processing ${LEADS.length} web-sourced trade leads${HUNTER_KEY ? ' (Hunter ON)' : ''}...`);
const fresh = LEADS.filter((l) => !seen.has(norm(l.business)));
console.log(`${fresh.length} new after dedupe.`);
await pool(fresh, 6, async (l) => {
  const r = await scrapeSite(l.website);
  l.email = r.email || (await hunterEmail(hostOf(l.website)));
  l.phone = (l.phone && l.phone.replace(/[^0-9]/g, '').length >= 10) ? l.phone : r.phone;
  l.weak = r.weak;
});
const rows = [];
for (const l of fresh) {
  if (!l.phone || !l.email) continue; // great leads only: website + phone + email
  const digits = l.phone.replace(/[^0-9]/g, '');
  if (digits && seenPhones.has(digits)) continue;
  if (digits) seenPhones.add(digits);
  const need = l.weak?.length ? ` · needs us: ${l.weak.join(', ')}` : '';
  rows.push({ rep_email: REP_EMAIL, rep_name: REP_NAME, business: l.business.slice(0, 200), city: l.city, phone: l.phone.slice(0, 40), website: l.website.slice(0, 300), email: l.email.slice(0, 200), channel: 'cold-call', status: 'to-contact', notes: `${l.category} · ${l.city}, ${STATE} (web)${need}`.slice(0, 2000) });
}
const incomplete = fresh.filter((l) => !(l.phone && l.email));
console.log(`complete (website+phone+email): ${rows.length} | dropped incomplete: ${incomplete.length}`);
if (incomplete.length) console.log('  incomplete:', incomplete.map((l) => `${l.business}(${!l.phone ? 'no-phone' : ''}${!l.email ? 'no-email' : ''})`).join(', '));
if (rows.length) { await insertRows(rows); console.log(`\nInserted ${rows.length} complete Kalispell trade leads, assigned to ${REP_NAME}.`); }
