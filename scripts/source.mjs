/**
 * THE upgraded lead sourcer. Supersedes source-leads(-osm).mjs / source-trades.mjs.
 * One command, a clean "City, ST", and every lead is born the way we want it:
 *
 *   WEBSITE + PHONE required (auditable + reachable), and an EMAIL found INLINE
 *   at source (homepage/contact scrape first, Hunter.io domain-search fallback),
 *   so leads arrive ready to email, not "we'll enrich later" (which never runs).
 *
 * Lands leads DIRECTLY on the outbound floor (outbound_leads), deduped against
 * the WHOLE table (paginated, not a capped 1000), assigned to a rep, niche
 * mapped, "needs us" weakness flagged, chains removed, variety-capped per type.
 * Email is PREFERRED not required (Sarah's split rule): a website+phone lead with
 * no findable email is still kept, just flagged and sorted last.
 *
 * Dry-run by default (prints the quality report); pass --apply to write.
 *
 * Run:  node scripts/source.mjs "Kalispell, MT" 80
 *       node scripts/source.mjs "Kalispell, MT" 80 --owner Polly --apply
 */
import { readFileSync } from 'node:fs';

function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const i = line.indexOf('=');
      out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const env = loadEnv('.env.local');
const SUPA_URL = env.supabase_url || env.SUPABASE_URL;
const SUPA_KEY = env.supabase_service_role_key || env.SUPABASE_SERVICE_ROLE_KEY;
const HUNTER = env.hunter_api_key || process.env.HUNTER_API_KEY || null;
const SB = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

// ── args ─────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith('--'));
const positional = argv.filter((a) => !a.startsWith('--'));
const APPLY = flags.includes('--apply');
const PLACE = positional[0] || 'Kalispell, MT';
const TARGET = Number(positional[1] || 80);
const OWNER_ARG = (argv.find((a, i) => argv[i - 1] === '--owner') || 'Sarah').trim();
const [CITY_RAW, STATE_RAW] = PLACE.split(',').map((s) => s.trim());
const CITY = CITY_RAW || PLACE;
const STATE = (STATE_RAW || '').toUpperCase().slice(0, 2) || null;

const UA = 'ModernMustardSeed-Sourcer/2.0 (sarah@modernmustardseed.com)';
const YEAR = 2026;
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const digitsOf = (p) => (p || '').replace(/[^0-9]/g, '');

// National chains and big-box retail: wasted cold-call dials, filtered out so the
// floor only gets real local businesses. Matched as a substring of the name.
const FRANCHISE = [
  'midas','jiffy lube','great clips','supercuts','sport clips','anytime fitness','planet fitness','snap fitness','crunch fitness','la fitness',"gold's gym",'orangetheory','ymca',
  'servpro','roto-rooter','aamco','meineke','orkin','terminix','merry maids','molly maid','valvoline','les schwab','big o tires','firestone','goodyear','mr rooter','discount tire','pep boys','tires plus','brakes plus',
  'aspen dental','european wax','massage envy','h&r block','jackson hewitt','state farm','allstate','geico','farmers insurance','edward jones','keller williams','re/max','coldwell banker','century 21','berkshire hathaway',
  'walmart','walgreens','cvs','rite aid','target','costco','sam\'s club','kroger','smith\'s','safeway','albertsons','whole foods','trader joe','dollar general','family dollar','dollar tree','big lots',
  'home depot',"lowe's",'lowes','ace hardware','true value','harbor freight','tractor supply','sherwin williams','benjamin moore','floor & decor',
  'best buy','petco','petsmart','ulta','sephora','gnc','ross','tj maxx','marshalls','michaels',"hobby lobby",'joann','bed bath','mattress firm','rei','dick\'s sporting','sportsman\'s warehouse',
  'verizon','at&t','t-mobile','cricket wireless','metropcs','xfinity','comcast','spectrum','the ups store','fedex office',
  'autozone','napa','o\'reilly','advance auto',
  'starbucks','dutch bros','dunkin','mcdonald','subway','dominos',"domino's",'pizza hut','taco bell','chipotle','panera','wendy','burger king','kfc',"arby's","sonic",'dairy queen',"culver's",'five guys','panda express',"jimmy john",'wingstop','little caesars','papa john',"marco's",'firehouse subs','jamba','smoothie king','jersey mike','qdoba','del taco','carl\'s jr','in-n-out','whataburger','popeyes','chick-fil-a','raising cane',
  "applebee's",'chili','olive garden','ihop','denny','red lobster','outback','texas roadhouse','buffalo wild',
  'wells fargo','chase','bank of america','us bank','pnc bank','truist','regions bank','first interstate','glacier bank',
];

// Reject template placeholders + junk, aligned with enrich-outbound's hardened filter.
const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|@email\.com|your@|youremail|yourname|firstname|lastname|name@|sample@|test@|user@|noreply|no-reply|donotreply|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite/i;
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

function labelFor(t) {
  const a = t.amenity, s = t.shop, c = t.craft, o = t.office, h = t.healthcare;
  if (a === 'dentist' || h === 'dentist') return 'Dental clinic';
  if (a === 'veterinary') return 'Veterinary clinic';
  if (a === 'restaurant' || a === 'cafe' || a === 'fast_food' || a === 'bar' || a === 'pub' || a === 'ice_cream') return 'Restaurant';
  if (a === 'pharmacy') return 'Pharmacy';
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

// Map the readable label to the outbound_leads niche enum.
function nicheFor(label) {
  const l = label.toLowerCase();
  if (/restaurant|cafe|food|bar|pub|ice cream|bakery|pizza|grill|diner|deli/.test(l)) return 'restaurant';
  if (/dental|vet|medical|clinic|pharmacy|physical therapy|chiro|salon|spa|beauty|medspa|aesthet|health/.test(l)) return 'dental_medspa';
  if (/real estate|realt|estate agent|broker|property/.test(l)) return 'real_estate';
  if (/plumb|electric|hvac|roof|carpen|landscap|paint|auto|garage|handyman|construction|contractor|clean|pest|garden|glaz|floor|insulat|fenc|gutter|trade/.test(l)) return 'home_service';
  return 'other';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pool(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx]); }
  }));
}

// ── discovery: geocode + overpass ────────────────────────────────
async function geocode(place) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;
  const j = await res.json();
  if (!j.length) return null;
  const b = j[0].boundingbox; // [south, north, west, east]
  return { south: +b[0], north: +b[1], west: +b[2], east: +b[3], display: j[0].display_name };
}

async function overpass(bbox) {
  const q = `[out:json][timeout:90];(nwr["website"]["phone"]["amenity"~"^(restaurant|cafe|fast_food|bar|pub|dentist|clinic|doctors|veterinary|pharmacy|spa)$"](${bbox});nwr["website"]["phone"]["shop"](${bbox});nwr["website"]["phone"]["craft"](${bbox});nwr["website"]["phone"]["office"](${bbox});nwr["website"]["phone"]["healthcare"](${bbox}););out tags 800;`;
  // Overpass mirrors 504/429 under load; try several with a backoff so a transient
  // outage doesn't return an empty run.
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.osm.jp/api/interpreter',
  ];
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of mirrors) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: `data=${encodeURIComponent(q)}`, signal: AbortSignal.timeout(90000) });
        if (!res.ok) { console.warn(`overpass ${url}: ${res.status}`); continue; }
        const j = await res.json();
        if (j.elements?.length) return j.elements;
      } catch (e) { console.warn(`overpass ${url} err: ${e.message}`); }
    }
    if (attempt === 0) { console.warn('all mirrors soft-failed, backing off 8s...'); await sleep(8000); }
  }
  return [];
}

// ── email: scrape then Hunter (inline) ───────────────────────────
async function scrapeSite(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = ''; try { origin = new URL(base).origin; } catch { return { email: null, weak: [] }; }
  const host = hostOf(base); const collected = []; const weak = []; let home = false;
  for (const page of [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`]) {
    try {
      const res = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
      if (!res.ok) continue;
      let html = (await res.text()).slice(0, 400000);
      if (!home && page === base) {
        home = true;
        if (!/<meta[^>]+name=["']viewport["']/i.test(html)) weak.push('not mobile-friendly');
        if (res.url && res.url.startsWith('http://')) weak.push('no HTTPS');
        const yrs = [...html.matchAll(/(?:©|&copy;|copyright)\s*\D{0,6}(20\d\d)/gi)].map((m) => +m[1]);
        const my = yrs.length ? Math.max(...yrs) : null;
        if (my && my <= YEAR - 2) weak.push(`stale (©${my})`);
      }
      html = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*[\[(]at[\])]\s*/gi, '@');
      for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) collected.push(m[1]);
      for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) collected.push(m[0]);
      const b = bestEmail(collected, host);
      if (b && (hostOf(b.split('@')[1]) === host || ROLE.test(b)) && home) return { email: b, weak };
    } catch {}
  }
  return { email: bestEmail(collected, host), weak };
}

async function hunterEmail(website) {
  if (!HUNTER) return null;
  const domain = hostOf(website);
  if (!domain) return null;
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER}&limit=5`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const j = await res.json();
    const emails = j?.data?.emails ?? [];
    const role = emails.find((e) => /^(info|contact|office|hello|sales|support)@/i.test(e.value ?? ''));
    const pick = (role ?? emails[0])?.value?.toLowerCase() ?? null;
    return pick && !EMAIL_BLOCK.test(pick) ? pick : null;
  } catch { return null; }
}

// ── floor: full-table dedupe + rep lookup + insert ───────────────
async function floorKeys() {
  const names = new Set(), phones = new Set();
  for (let from = 0; from < 100000; from += 1000) {
    const res = await fetch(`${SUPA_URL}/rest/v1/outbound_leads?select=business_name,phone&order=id.asc&offset=${from}&limit=1000`, { headers: SB });
    if (!res.ok) break;
    const rows = await res.json();
    if (!rows.length) break;
    for (const r of rows) { names.add(norm(r.business_name)); const d = digitsOf(r.phone); if (d) phones.add(d); }
    if (rows.length < 1000) break;
  }
  return { names, phones };
}

async function resolveOwner(name) {
  const res = await fetch(`${SUPA_URL}/rest/v1/outbound_reps?select=id,name&active=eq.true`, { headers: SB });
  const reps = res.ok ? await res.json() : [];
  const want = norm(name);
  const rep = reps.find((r) => norm(r.name) === want) || reps.find((r) => want.includes(norm(r.name)) || norm(r.name).includes(want));
  return rep ? { id: rep.id, name: rep.name } : { id: null, name: name };
}

async function insertRows(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(`${SUPA_URL}/rest/v1/outbound_leads`, { method: 'POST', headers: { ...SB, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(chunk) });
    if (!res.ok) throw new Error(`Insert ${res.status}: ${(await res.text()).slice(0, 300)}`);
    inserted += chunk.length;
  }
  return inserted;
}

// ── main ─────────────────────────────────────────────────────────
async function main() {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('Supabase env missing (.env.local supabase_url / supabase_service_role_key).');
  console.log(`\nSourcing "${PLACE}" · target ${TARGET} · owner ${OWNER_ARG} · ${APPLY ? 'APPLY' : 'DRY RUN'} · Hunter ${HUNTER ? 'ON' : 'off'}`);

  const geo = await geocode(PLACE);
  if (!geo) throw new Error(`Could not geocode "${PLACE}". Try "City, ST".`);
  const bbox = `${geo.south},${geo.west},${geo.north},${geo.east}`;
  console.log(`Geocoded → ${geo.display}`);

  const els = await overpass(bbox);
  console.log(`OSM: ${els.length} businesses with website + phone tags`);
  if (!els.length) { console.log('Nothing found in that area.'); return; }

  const owner = await resolveOwner(OWNER_ARG);
  const { names: seenNames, phones: seenPhones } = await floorKeys();
  console.log(`Floor dedupe set: ${seenNames.size} names / ${seenPhones.size} phones already on outbound_leads`);

  const capByLabel = {};
  const picked = [];
  for (const el of els) {
    if (picked.length >= TARGET) break;
    const t = el.tags || {};
    const name = t.name; if (!name) continue;
    const website = t.website || t['contact:website'] || t.url;
    const phone = t.phone || t['contact:phone'];
    if (!website || !phone) continue;
    const n = norm(name), digits = digitsOf(phone);
    if (seenNames.has(n) || (digits && seenPhones.has(digits)) || FRANCHISE.some((f) => n.includes(norm(f)))) continue;
    const label = labelFor(t);
    capByLabel[label] = capByLabel[label] || 0;
    if (capByLabel[label] >= 10) continue; // variety cap per type
    seenNames.add(n); if (digits) seenPhones.add(digits); capByLabel[label]++;
    picked.push({ business: name, phone, website, email: t.email || t['contact:email'] || null, label });
  }
  console.log(`Picked ${picked.length} fresh leads (deduped, chains removed, capped per type)`);

  console.log(`Finding emails inline (scrape → Hunter) for ${picked.length}...`);
  await pool(picked, 6, async (p) => {
    if (p.email && EMAIL_BLOCK.test(p.email)) p.email = null;
    if (!p.email) { const r = await scrapeSite(p.website); p.email = r.email; p.weak = r.weak; }
    if (!p.email) p.email = await hunterEmail(p.website);
  });

  // Prefer email+phone: complete leads first, incomplete (kept, flagged) last.
  picked.sort((a, b) => (b.email ? 1 : 0) - (a.email ? 1 : 0));

  const rows = picked.map((p) => {
    const need = p.weak?.length ? ` · needs us: ${p.weak.join(', ')}` : '';
    return {
      business_name: String(p.business).slice(0, 200),
      contact_name: null,
      phone: String(p.phone).slice(0, 40),
      email: p.email ? String(p.email).slice(0, 200) : null,
      website: String(p.website).slice(0, 300),
      niche: nicheFor(p.label),
      city: CITY.slice(0, 120),
      state: STATE,
      status: 'new',
      source: 'sourced',
      owner_rep_id: owner.id,
      dnc_checked: false,
      notes: `${p.label} · ${CITY}${STATE ? `, ${STATE}` : ''} (sourced)${need}`.slice(0, 2000),
    };
  });

  const withEmail = rows.filter((r) => r.email).length;
  const flagged = rows.filter((r) => /needs us/.test(r.notes)).length;
  console.log(`\n── Quality ──`);
  console.log(`  ${rows.length} leads · 100% website + phone`);
  console.log(`  with email: ${withEmail}/${rows.length} (${rows.length ? Math.round((withEmail / rows.length) * 100) : 0}%)  ← inline scrape + Hunter`);
  console.log(`  no email (kept, flagged, sorted last): ${rows.length - withEmail}`);
  console.log(`  "needs us" weakness flagged: ${flagged}`);
  console.log(`  assigned to: ${owner.name}${owner.id ? '' : ' (rep not found — owner_rep_id null)'}`);
  if (rows.length) {
    console.log(`\n  sample:`);
    for (const r of rows.slice(0, 8)) console.log(`   ${r.email ? '✉ ' : '  '}${r.business_name} · ${r.phone} · ${r.email || 'no email'}`);
  }

  if (!APPLY) {
    console.log(`\nDRY RUN — nothing written. Re-run with --apply to land these ${rows.length} on the floor.\n`);
    return;
  }
  if (!rows.length) { console.log('\nNothing to insert.\n'); return; }
  const n = await insertRows(rows);
  console.log(`\nAPPLIED — inserted ${n} leads onto the outbound floor, assigned to ${owner.name}.\n`);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
