/**
 * THE upgraded lead sourcer. Supersedes source-leads(-osm).mjs / source-trades.mjs.
 * One command, a clean "City, ST", and every lead is born reachable and useful.
 *
 * PHONE is always required (a lead we can't call is not a lead). Beyond that,
 * three discovery modes decide WHAT we go after:
 *
 *   default   → has a website + phone. Auditable incumbents. Email found INLINE
 *               at source (homepage/contact scrape, then Hunter.io fallback).
 *   --no-site → has a phone but NO website at all. These need a site built from
 *               scratch: the strongest MMS pitch, nothing to compete with. No
 *               domain means no email to find, so they're phone-first by design.
 *   --needy   → has a website, but bias HARD toward the outdated ones (stale
 *               copyright, not mobile-friendly, no HTTPS). Oversamples, scores
 *               every site, keeps the weak ones, drops the pristine.
 *   --mix     → half no-site, half outdated-site in one run (implies --needy).
 *
 * Lands leads DIRECTLY on the outbound floor (outbound_leads), deduped against
 * the WHOLE table (paginated, not a capped 1000), assigned to a rep, niche
 * mapped, "needs us" weakness flagged, chains removed, variety-capped per type.
 * Email is PREFERRED not required (Sarah's split rule): a lead with no findable
 * email is still kept, just flagged.
 *
 * Dry-run by default (prints the quality report); pass --apply to write.
 *
 * Run:  node scripts/source.mjs "Kalispell, MT" 80
 *       node scripts/source.mjs "Kalispell, MT" 80 --owner Polly --apply
 *       node scripts/source.mjs "Savannah, GA" 60 --owner Polly --no-site --apply
 *       node scripts/source.mjs "Savannah, GA" 60 --owner Polly --mix --apply
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
const NO_SITE = flags.includes('--no-site'); // businesses with NO website (need one built)
const MIX = flags.includes('--mix');         // half no-site, half outdated-site
const NEEDY = flags.includes('--needy') || MIX; // bias the has-website pool toward stale/weak sites
const PER_LABEL_CAP = 12;                     // variety cap per business type, per run
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
  'office depot','officemax','staples','publix','h-e-b','kroger','food lion','winn-dixie','hard rock','cheesecake factory','p.f. chang','pf chang','red robin','cracker barrel','waffle house','red lobster','longhorn steakhouse','buffalo wild wings','pizza ranch','cold stone','baskin','krispy kreme','tim hortons','wingstreet','hooters','twin peaks',
];

// Reject template placeholders + junk, aligned with enrich-outbound's hardened filter.
// `modernmustardseed` + the url-encoding artifacts (%2f, %28, u003d) block a real
// bug: our own User-Agent carries sarah@modernmustardseed.com, and a page that
// reflects the UA (error echo, access log) would otherwise be scraped back as the
// lead's email. Never capture our own address, and never trust an encoded fragment.
const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|@email\.com|your@|youremail|yourname|firstname|lastname|name@|sample@|test@|user@|noreply|no-reply|donotreply|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite|modernmustardseed|sourcer|%2[f8]|u003d/i;
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

// Real, local, callable business categories. The only thing that changes between
// the two discovery modes is whether we require a website tag or its ABSENCE.
const BIZ_SELECTORS = [
  '["amenity"~"^(restaurant|cafe|fast_food|bar|pub|dentist|clinic|doctors|veterinary|pharmacy|spa)$"]',
  '["shop"]',
  '["craft"]',
  '["office"]',
  '["healthcare"]',
];
// Match either phone key (phone / contact:phone) with any non-empty value.
const PHONE_SEL = '[~"^(phone|contact:phone)$"~"."]';

function buildQuery(bbox, mode) {
  // mode 'site'   → has a website + phone (auditable incumbents, some outdated)
  // mode 'nosite' → has a phone but NO website at all (needs one built)
  const web = mode === 'nosite' ? '[!"website"][!"contact:website"][!"url"]' : '["website"]';
  const parts = BIZ_SELECTORS.map((sel) => `nwr${web}${PHONE_SEL}${sel}(${bbox});`).join('');
  return `[out:json][timeout:90];(${parts});out tags 800;`;
}

async function overpass(query) {
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
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: `data=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(90000) });
        if (!res.ok) { console.warn(`overpass ${url}: ${res.status}`); continue; }
        const j = await res.json();
        if (j.elements?.length) return j.elements;
      } catch (e) { console.warn(`overpass ${url} err: ${e.message}`); }
    }
    if (attempt === 0) { console.warn('all mirrors soft-failed, backing off 8s...'); await sleep(8000); }
  }
  return [];
}

// Select fresh, deduped, chain-free, variety-capped leads from an OSM element set.
// requireWebsite=true keeps only businesses with a site; false keeps only those
// WITHOUT one. Mutates the shared seen* sets so pools don't collide.
function pickFrom(els, { limit, requireWebsite, seenNames, seenPhones }) {
  const capByLabel = {};
  const picked = [];
  for (const el of els) {
    if (picked.length >= limit) break;
    const t = el.tags || {};
    const name = t.name; if (!name) continue;
    const website = t.website || t['contact:website'] || t.url || null;
    const phone = t.phone || t['contact:phone'];
    if (!phone) continue;
    if (requireWebsite && !website) continue;
    if (!requireWebsite && website) continue;
    const n = norm(name), digits = digitsOf(phone);
    if (seenNames.has(n) || (digits && seenPhones.has(digits)) || FRANCHISE.some((f) => n.includes(norm(f)))) continue;
    const label = labelFor(t);
    capByLabel[label] = capByLabel[label] || 0;
    if (capByLabel[label] >= PER_LABEL_CAP) continue;
    seenNames.add(n); if (digits) seenPhones.add(digits); capByLabel[label]++;
    picked.push({ business: name, phone, website, email: t.email || t['contact:email'] || null, label, weak: [] });
  }
  return picked;
}

// Score every has-website lead's site (weakness signals) and find its email.
// We ALWAYS scrape so --needy can rank by how outdated the site is, even when
// OSM already handed us an email.
async function enrich(list) {
  await pool(list, 6, async (p) => {
    if (p.email && EMAIL_BLOCK.test(p.email)) p.email = null;
    const r = await scrapeSite(p.website);
    p.weak = r.weak;
    if (!p.email) p.email = r.email;
    if (!p.email) p.email = await hunterEmail(p.website);
  });
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

  const owner = await resolveOwner(OWNER_ARG);
  const { names: seenNames, phones: seenPhones } = await floorKeys();
  console.log(`Floor dedupe set: ${seenNames.size} names / ${seenPhones.size} phones already on outbound_leads`);

  // How the target splits across the two discovery modes.
  const wantNoSite = NO_SITE ? TARGET : MIX ? Math.round(TARGET / 2) : 0;
  const wantSite = NO_SITE ? 0 : MIX ? TARGET - wantNoSite : TARGET;
  const mode = NO_SITE ? 'no-website only' : MIX ? 'mix (no-site + outdated-site)' : NEEDY ? 'outdated-site biased' : 'has-website';
  console.log(`Mode: ${mode} → ${wantSite} has-website, ${wantNoSite} no-website`);

  const picked = [];

  // ── has-website pool (incumbents; --needy biases toward the outdated) ──
  if (wantSite > 0) {
    const els = await overpass(buildQuery(bbox, 'site'));
    console.log(`OSM (has-website): ${els.length} businesses with website + phone`);
    // Oversample when we want outdated ones so we can keep the weak sites and
    // drop the pristine after scoring them.
    const pickLimit = NEEDY ? Math.min(els.length, wantSite * 3) : wantSite;
    const poolRows = pickFrom(els, { limit: pickLimit, requireWebsite: true, seenNames, seenPhones });
    console.log(`  picked ${poolRows.length} has-website candidates${NEEDY ? ' (oversampled to keep the outdated ones)' : ''}`);
    console.log(`  scoring sites + finding emails (scrape → Hunter)...`);
    await enrich(poolRows);
    poolRows.sort((a, b) => {
      if (NEEDY) { const wa = a.weak?.length ? 1 : 0, wb = b.weak?.length ? 1 : 0; if (wa !== wb) return wb - wa; }
      return (b.email ? 1 : 0) - (a.email ? 1 : 0);
    });
    picked.push(...poolRows.slice(0, wantSite));
  }

  // ── no-website pool (need a site built; the strongest MMS pitch) ──
  if (wantNoSite > 0) {
    const els = await overpass(buildQuery(bbox, 'nosite'));
    console.log(`OSM (no-website): ${els.length} businesses with a phone but NO website`);
    const poolRows = pickFrom(els, { limit: wantNoSite, requireWebsite: false, seenNames, seenPhones });
    for (const p of poolRows) { p.email = null; p.weak = ['no website']; } // phone-first; no domain to email
    console.log(`  picked ${poolRows.length} no-website leads (phone-first, flagged "no website")`);
    picked.push(...poolRows);
  }

  if (!picked.length) { console.log('\nNothing fresh found in that area for that mode.\n'); return; }

  const rows = picked.map((p) => {
    const need = p.weak?.length ? ` · needs us: ${p.weak.join(', ')}` : '';
    return {
      business_name: String(p.business).slice(0, 200),
      contact_name: null,
      phone: String(p.phone).slice(0, 40),
      email: p.email ? String(p.email).slice(0, 200) : null,
      website: p.website ? String(p.website).slice(0, 300) : null,
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

  const noSiteN = rows.filter((r) => !r.website).length;
  const withEmail = rows.filter((r) => r.email).length;
  const flagged = rows.filter((r) => /needs us/.test(r.notes)).length;
  console.log(`\n── Quality ──`);
  console.log(`  ${rows.length} leads · every one has a phone`);
  console.log(`  no website (needs one built): ${noSiteN}`);
  console.log(`  has website: ${rows.length - noSiteN}`);
  console.log(`  with email: ${withEmail}/${rows.length} (${rows.length ? Math.round((withEmail / rows.length) * 100) : 0}%)  ← inline scrape + Hunter`);
  console.log(`  "needs us" flagged (no site / stale / not mobile / no HTTPS): ${flagged}`);
  console.log(`  assigned to: ${owner.name}${owner.id ? '' : ' (rep not found — owner_rep_id null)'}`);
  if (rows.length) {
    console.log(`\n  sample:`);
    for (const r of rows.slice(0, 8)) console.log(`   ${r.email ? '✉ ' : '  '}${r.business_name} · ${r.phone} · ${r.email || 'no email'}${r.website ? '' : ' [no site]'}`);
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
