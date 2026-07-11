/**
 * Source ~200 Kansas City leads for Easton Parker and drop them straight onto
 * the Outbound dial floor, owned by him. Unlike source-leads(-osm).mjs (which
 * feed the old rep_prospects Tracker and require a website to audit), Easton is
 * COLD-CALLING to say "I'm local" -- so we require a PHONE only and keep every
 * reachable local business. Even mix: ~100 restaurants/food service + ~100 other
 * local service (salons, auto, clinics, trades, pro services, fitness).
 *
 * Idempotent: upserts the Easton rep by name and dedupes new leads against
 * everything already in outbound_leads (and itself). Re-runnable.
 *
 * Run:  node scripts/source-kc-easton.mjs
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
const SUPA_URL = env.supabase_url;
const SUPA_KEY = env.supabase_service_role_key;
if (!SUPA_URL || !SUPA_KEY) throw new Error('Need supabase_url + supabase_service_role_key in .env.local');

const UA = 'ModernMustardSeed-Outbound/1.0 (sarah@modernmustardseed.com)';
// Kansas City metro bbox: KCMO + KCK core + inner suburbs. south,west,north,east
const BBOX = '38.90,-94.78,39.35,-94.40';
const FOOD_TARGET = 100;
const SERVICE_TARGET = 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const digitsOf = (p) => (p || '').replace(/[^0-9]/g, '').replace(/^1(\d{10})$/, '$1');
function fmtPhone(p) {
  const d = digitsOf(p);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return (p || '').trim();
}

// National chains / franchises -- Easton's list must be independent locals.
const FRANCHISE = [
  'midas','jiffy lube','great clips','supercuts','sport clips','anytime fitness','planet fitness','servpro','roto-rooter','aamco','meineke','orkin','terminix','merry maids','molly maid','valvoline','les schwab','big o tires','firestone','mr rooter','aspen dental','european wax','massage envy','snap fitness','h&r block','state farm','allstate','farmers insurance','keller williams','re/max','coldwell banker','walmart','walgreens','cvs','target','starbucks','mcdonald','subway','domino','pizza hut','papa john','taco bell','autozone','napa','discount tire','jersey mike','chipotle','applebee','olive garden','panera','chick-fil-a','chick fil a','wendy','burger king','sonic','popeye','kfc','dairy queen','qdoba','hardee','arby','ihop','denny','buffalo wild','panda express','jimmy john','freddy','raising cane','culver','sweetgreen','five guys','chili','red lobster','outback','texas roadhouse','cracker barrel','waffle house','dunkin','baskin','cold stone','jamba','smoothie king','tropical smoothie','wingstop','marco','little caesar','noodles & company','first watch','7-eleven','quiktrip','casey','circle k','minit','o\'reilly','advance auto','pep boys','tuffy','maaco','gerber collision','caliber collision','ulta','sally beauty','regis','fantastic sams','cost cutters','banfield','vca ','petsmart','petco','anytime','orangetheory','crunch fitness','la fitness','24 hour fitness','gold\'s gym','snap','massage heights','hand & stone','amazing lash','drybar','sola salon','edward jones','jackson hewitt','liberty tax','geico','progressive','churchs chicken','church\'s chicken','firehouse subs','firehouse','dave\'s hot chicken','daves hot chicken','sharks fish','del taco','white castle','long john silver','captain d','golden corral','mcalister','papa murphy','freddys','freddy\'s','jason\'s deli','jasons deli','cane\'s','canes','which wich','potbelly','schlotzsky','einstein','moe\'s southwest','moes','pei wei','auntie anne','cinnabon','tim hortons','krispy kreme','sbarro','quiznos','blimpie','charley','cici','godfather','round table','wing street','marco\'s',
];
const isChain = (name) => { const n = norm(name); return FRANCHISE.some((f) => n.includes(norm(f))); };

function labelFor(t) {
  const a = t.amenity, s = t.shop, c = t.craft, o = t.office, h = t.healthcare, l = t.leisure;
  if (a === 'restaurant') return 'Restaurant';
  if (a === 'fast_food') return 'Fast-casual';
  if (a === 'cafe' || a === 'coffee') return 'Cafe';
  if (a === 'bar' || a === 'pub' || a === 'biergarten') return 'Bar / pub';
  if (a === 'ice_cream') return 'Dessert shop';
  if (a === 'food_court') return 'Food hall';
  if (a === 'dentist' || h === 'dentist' || s === 'dentist') return 'Dental clinic';
  if (a === 'veterinary' || h === 'veterinary') return 'Veterinary clinic';
  if (a === 'pharmacy') return 'Pharmacy';
  if (a === 'clinic' || a === 'doctors' || h === 'clinic' || h === 'doctor' || h === 'centre') return 'Medical clinic';
  if (h === 'physiotherapist') return 'Physical therapy';
  if (h === 'chiropractor') return 'Chiropractic';
  if (a === 'spa' || s === 'massage' || h === 'massage') return 'Spa / massage';
  if (s === 'hairdresser' || s === 'barber') return 'Salon / barber';
  if (s === 'beauty' || s === 'cosmetics' || s === 'nails') return 'Beauty / nails';
  if (s === 'car_repair' || s === 'tyres' || s === 'car_parts') return 'Auto service';
  if (s === 'optician') return 'Optical';
  if (s === 'jewelry') return 'Jeweler';
  if (s === 'florist') return 'Florist';
  if (s === 'bakery') return 'Bakery';
  if (s === 'dry_cleaning' || s === 'laundry') return 'Dry cleaner';
  if (s === 'pet' || s === 'pet_grooming') return 'Pet groomer';
  if (c === 'plumber') return 'Plumbing trade';
  if (c === 'electrician') return 'Electrical trade';
  if (c === 'hvac' || c === 'heating_engineer') return 'HVAC trade';
  if (c === 'roofer') return 'Roofing trade';
  if (c === 'carpenter' || c === 'joiner') return 'Carpentry trade';
  if (c === 'gardener' || c === 'landscape' || s === 'garden_centre') return 'Landscaping';
  if (c === 'painter') return 'Painting trade';
  if (o === 'lawyer') return 'Law firm';
  if (o === 'insurance') return 'Insurance agency';
  if (o === 'accountant') return 'Accounting firm';
  if (o === 'estate_agent') return 'Real estate';
  if (l === 'fitness_centre') return 'Gym / studio';
  if (s) return s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  if (c) return c.replace(/_/g, ' ') + ' trade';
  if (o) return o.replace(/_/g, ' ') + ' office';
  return 'Local business';
}

// Map to the outbound_leads niche enum: home_service | dental_medspa | real_estate | restaurant | other
function nicheFor(t) {
  const a = t.amenity, s = t.shop, c = t.craft, o = t.office, h = t.healthcare, l = t.leisure;
  if (['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'biergarten', 'ice_cream', 'food_court'].includes(a)) return 'restaurant';
  if (['dentist', 'veterinary', 'clinic', 'doctors', 'pharmacy', 'spa'].includes(a)) return 'dental_medspa';
  if (h) return 'dental_medspa';
  if (['hairdresser', 'barber', 'beauty', 'cosmetics', 'nails', 'massage'].includes(s)) return 'dental_medspa';
  if (['car_repair', 'tyres', 'car_parts', 'dry_cleaning', 'laundry', 'florist', 'pet', 'pet_grooming'].includes(s)) return 'home_service';
  if (c) return 'home_service';
  if (o === 'estate_agent') return 'real_estate';
  if (l === 'fitness_centre') return 'dental_medspa';
  return 'other';
}

async function overpass(query) {
  const q = `[out:json][timeout:120];(${query.replace(/;\s*$/, '')};);out tags 800;`;
  for (const url of ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: `data=${encodeURIComponent(q)}`,
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) { console.warn(`overpass ${url}: ${res.status}`); await sleep(1500); continue; }
      const j = await res.json();
      if (j.elements?.length) return j.elements;
    } catch (e) { console.warn(`overpass ${url} err: ${e.message}`); }
  }
  return [];
}

async function existingKeys() {
  const res = await fetch(`${SUPA_URL}/rest/v1/outbound_leads?select=business_name,phone&limit=5000`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  const rows = res.ok ? await res.json() : [];
  return {
    names: new Set(rows.map((r) => norm(r.business_name))),
    phones: new Set(rows.map((r) => digitsOf(r.phone)).filter(Boolean)),
  };
}

async function upsertRep() {
  const res = await fetch(`${SUPA_URL}/rest/v1/outbound_reps?on_conflict=name`, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([{ name: 'Easton', role: 'caller', daily_dial_goal: 25, daily_demo_goal: 1, active: true }]),
  });
  if (!res.ok) throw new Error(`rep upsert ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return j[0].id;
}

async function insertRows(rows) {
  const res = await fetch(`${SUPA_URL}/rest/v1/outbound_leads`, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insert ${res.status}: ${(await res.text()).slice(0, 400)}`);
}

function pick(els, target, seen, capPerLabel) {
  const capByLabel = {};
  const out = [];
  for (const el of els) {
    if (out.length >= target) break;
    const t = el.tags || {};
    const name = t.name;
    const phone = t.phone || t['contact:phone'] || t['phone:mobile'];
    if (!name || !phone) continue;
    const d = digitsOf(phone);
    if (d.length !== 10) continue; // US local, clean
    const n = norm(name);
    if (seen.names.has(n) || seen.phones.has(d) || isChain(name)) continue;
    const label = labelFor(t);
    capByLabel[label] = capByLabel[label] || 0;
    if (capPerLabel && capByLabel[label] >= capPerLabel) continue;
    seen.names.add(n); seen.phones.add(d); capByLabel[label]++;
    const stateRaw = (t['addr:state'] || '').trim().toUpperCase();
    const state = /^[A-Z]{2}$/.test(stateRaw) ? stateRaw : (stateRaw === 'KANSAS' ? 'KS' : stateRaw === 'MISSOURI' ? 'MO' : 'MO');
    out.push({
      business_name: String(name).slice(0, 200),
      contact_name: null,
      phone: fmtPhone(phone),
      email: t.email || t['contact:email'] || null,
      website: t.website || t['contact:website'] || t.url || null,
      niche: nicheFor(t),
      city: (t['addr:city'] || 'Kansas City').slice(0, 80),
      state,
      status: 'new',
      source: 'kc-easton',
      dnc_checked: false,
      notes: `${label} · Kansas City — Easton's local list. Open with: "Hi, I'm Easton, I'm local here in KC."`.slice(0, 2000),
    });
  }
  return out;
}

async function main() {
  const mode = (process.argv[2] || 'both').toLowerCase(); // both | food | service
  console.log(`Sourcing Kansas City leads for Easton (mode=${mode})...`);
  const repId = await upsertRep();
  console.log(`Easton rep ready: ${repId}`);

  const seen = await existingKeys();
  console.log(`Dedupe set: ${seen.names.size} existing names, ${seen.phones.size} existing phones on the floor.`);

  // FOOD ~100
  let food = [];
  if (mode === 'both' || mode === 'food') {
    const foodEls = await overpass(
      `nwr["phone"]["amenity"~"^(restaurant|fast_food|cafe|bar|pub|biergarten|ice_cream|food_court)$"](${BBOX})`,
    );
    console.log(`OSM food: ${foodEls.length} with phone`);
    food = pick(foodEls, FOOD_TARGET, seen, 0); // no per-label cap; food is one bucket
  }

  // SERVICE ~100 (variety-capped so it isn't all salons)
  let service = [];
  if (mode === 'both' || mode === 'service') {
  const svcEls = await overpass(
    `nwr["phone"]["shop"~"^(hairdresser|barber|beauty|cosmetics|nails|car_repair|tyres|car_parts|optician|jewelry|florist|bakery|dry_cleaning|laundry|pet|pet_grooming|massage)$"](${BBOX});` +
    `nwr["phone"]["amenity"~"^(dentist|clinic|doctors|veterinary|pharmacy|spa)$"](${BBOX});` +
    `nwr["phone"]["craft"](${BBOX});` +
    `nwr["phone"]["office"~"^(lawyer|insurance|accountant|estate_agent)$"](${BBOX});` +
    `nwr["phone"]["healthcare"](${BBOX});` +
    `nwr["phone"]["leisure"="fitness_centre"](${BBOX})`,
  );
  console.log(`OSM service: ${svcEls.length} with phone`);
  service = pick(svcEls, SERVICE_TARGET, seen, 14);
  }

  const all = [...food, ...service];
  console.log(`\nPicked ${all.length}: ${food.length} food + ${service.length} service (deduped, chains removed).`);
  if (!all.length) { console.log('Nothing to insert.'); return; }

  const withRep = all.map((r) => ({ ...r, owner_rep_id: repId }));
  // insert in chunks with identical keys per row
  for (let i = 0; i < withRep.length; i += 100) {
    await insertRows(withRep.slice(i, i + 100));
    console.log(`  inserted ${Math.min(i + 100, withRep.length)}/${withRep.length}`);
  }

  const byNiche = {};
  for (const r of all) byNiche[r.niche] = (byNiche[r.niche] || 0) + 1;
  console.log(`\nDone. ${all.length} KC leads assigned to Easton.`);
  console.log('By niche:', JSON.stringify(byNiche));
  console.log(`With phone: ${all.length}/${all.length}. With website: ${all.filter((r) => r.website).length}. With email: ${all.filter((r) => r.email).length}.`);
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
