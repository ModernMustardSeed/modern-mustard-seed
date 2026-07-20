/**
 * A+ WESTERN SOURCER — single-owner service businesses that desperately need us.
 *
 * Every lead is a real OSM business with a real phone, is NOT a chain, is a
 * SERVICE business (trades, salons, clinics, auto, pro services, independent
 * restaurants), and carries a concrete "here's why I'm calling you" weakness.
 *
 * Visibility note: leads are ASSIGNED to a rep via owner_rep_id, but every rep
 * still sees the whole floor (only role='caller' scopes a rep, and we
 * deliberately leave owners on 'primary'). Assignment here drives the rep's
 * working batch, not permissions.
 *
 * What this adds over scripts/source.mjs:
 *   1. SERVICE selectors only. No department stores, no big-box retail — the
 *      generic ["shop"] selector in source.mjs is what let Nordstrom through.
 *   2. Cross-city chain auto-detection. Any business name that shows up in 2+
 *      of our cities is a chain we don't have in the blocklist yet (Loaf 'N Jug,
 *      Ted's Montana Grill). Caught automatically, no list maintenance.
 *   3. Social-only "website" detection. A business whose website is a Facebook
 *      page has NO real site — that's an A+ pitch, not a has-website lead.
 *   4. Owner-operator scoring. "Dave's Plumbing" / "Smith & Sons" are structural
 *      signals of the single-owner business we actually want called.
 *   5. A+ ranking. Oversample every city, score, keep only the best.
 *
 * Dry-run by default. Pass --apply to write.
 *
 * Run:  node scripts/source-western-aplus.mjs --owner Anthony
 *       node scripts/source-western-aplus.mjs --owner Anthony --apply
 */
import { readFileSync, writeFileSync } from 'node:fs';

function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const i = line.indexOf('=');
      const k = line.slice(0, i).trim().toLowerCase();
      if (!(k in out)) out[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const env = loadEnv('.env.local');
const SUPA_URL = env.supabase_url || env.SUPABASE_URL;
const SUPA_KEY = env.supabase_service_role_key || env.SUPABASE_SERVICE_ROLE_KEY;
const HUNTER = env.hunter_api_key || process.env.HUNTER_API_KEY || null;
const SB = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const OWNER_ARG = (argv.find((a, i) => argv[i - 1] === '--owner') || 'Anthony').trim();

// Busy western markets. Quotas sum above 400 so ranking has room to drop the weak.
// Montana is already heavily mined (Bozeman 102 / Kalispell 98 / Billings 77 on the
// floor), so those quotas lean on the no-website pool that earlier runs skipped.
// Colorado, Idaho, Washington, Oregon, Nevada, Utah and Wyoming are untouched ground.
const CITIES = [
  { place: 'Kalispell, MT', quota: 32 },
  { place: 'Whitefish, MT', quota: 20 },
  { place: 'Bozeman, MT', quota: 32 },
  { place: 'Billings, MT', quota: 32 },
  { place: 'Missoula, MT', quota: 22 },
  { place: 'Denver, CO', quota: 55 },
  { place: 'Colorado Springs, CO', quota: 40 },
  { place: 'Fort Collins, CO', quota: 26 },
  { place: 'Boise, ID', quota: 40 },
  { place: "Coeur d'Alene, ID", quota: 20 },
  { place: 'Spokane, WA', quota: 40 },
  { place: 'Bend, OR', quota: 26 },
  { place: 'Reno, NV', quota: 32 },
  { place: 'Salt Lake City, UT', quota: 36 },
  { place: 'Cheyenne, WY', quota: 18 },
];
const GLOBAL_TARGET = 400;
const RESTAURANT_SHARE = 0.18; // cap: this is a service-business list, not a menu
const UA = 'ModernMustardSeed-Sourcer/3.0 (sarah@modernmustardseed.com)';
const YEAR = 2026;

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const digitsOf = (p) => (p || '').replace(/[^0-9]/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pool(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx]); }
  }));
}

// A "website" that is really a social profile means the business has NO site of
// its own. That is the single strongest pitch we have, so we reclassify it.
const SOCIAL_HOSTS = /(^|\.)(facebook\.com|m\.facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|twitter\.com|x\.com|yelp\.com|tripadvisor\.|business\.site|sites\.google\.com|linktr\.ee|nextdoor\.com|angi\.com|thumbtack\.com|houzz\.com|square\.site|wixsite\.com|weebly\.com|blogspot\.|wordpress\.com|godaddysites\.com|myshopify\.com)/i;

const FRANCHISE = [
  // trades / auto / home
  'midas', 'jiffy lube', 'aamco', 'meineke', 'valvoline', 'les schwab', 'big o tires', 'firestone', 'goodyear', 'discount tire', 'pep boys', 'tires plus', 'brakes plus', 'grease monkey', 'christian brothers automotive', 'take 5 oil',
  'servpro', 'roto-rooter', 'roto rooter', 'mr rooter', 'orkin', 'terminix', 'merry maids', 'molly maid', 'chem-dry', 'stanley steemer', 'the maids', 'two men and a truck', 'certapro', 'five star painting', 'mosquito joe', 'trugreen', 'weed man', 'lawn doctor', 'aire serv', 'benjamin franklin plumbing', 'one hour heating', 'mister sparky',
  // hair / beauty / fitness
  'great clips', 'supercuts', 'sport clips', 'sportclips', 'fantastic sams', 'cost cutters', 'hair cuttery', "floyd's 99", 'floyds 99', 'drybar', 'european wax', 'massage envy', 'hand & stone', 'elements massage', 'amazing lash', 'deka lash', 'palm beach tan', 'sun tan city',
  'anytime fitness', 'planet fitness', 'snap fitness', 'crunch fitness', 'la fitness', "gold's gym", 'golds gym', 'orangetheory', 'ymca', 'f45', 'club pilates', 'pure barre', 'cyclebar', '9round', 'burn boot camp', 'vasa fitness', 'eos fitness', 'life time',
  // medical / dental
  'aspen dental', 'comfort dental', 'western dental', 'smile brands', 'heartland dental', 'pacific dental', 'gentle dental', 'bright now', 'kool smiles', 'banfield', 'vca animal', 'thrive pet', 'petiq',
  'concentra', 'nextcare', 'kaiser permanente', 'uchealth', 'intermountain', "st. luke's", 'providence medical', 'lenscrafters', 'pearle vision', 'visionworks', "america's best", 'my eyelab', 'stanton optical',
  // professional
  'h&r block', 'jackson hewitt', 'liberty tax', 'state farm', 'allstate', 'geico', 'farmers insurance', 'american family insurance', 'edward jones', 'ameriprise', 'northwestern mutual', 'primerica',
  'keller williams', 're/max', 'remax', 'coldwell banker', 'century 21', 'berkshire hathaway', 'compass real estate', 'exp realty', "sotheby's international",
  // retail / big box
  'walmart', 'walgreens', 'cvs', 'rite aid', 'target', 'costco', "sam's club", 'kroger', "smith's", 'safeway', 'albertsons', 'whole foods', 'trader joe', 'sprouts', 'natural grocers', 'king soopers', 'city market', 'fred meyer', 'winco', 'rosauers', 'super 1 foods',
  'dollar general', 'family dollar', 'dollar tree', 'big lots', 'five below',
  'home depot', "lowe's", 'lowes', 'ace hardware', 'true value', 'harbor freight', 'tractor supply', 'sherwin williams', 'benjamin moore', 'floor & decor', 'menards',
  'best buy', 'petco', 'petsmart', 'ulta', 'sephora', 'gnc', 'vitamin shoppe', 'ross', 'tj maxx', 'marshalls', 'michaels', 'hobby lobby', 'joann', 'bed bath', 'mattress firm', 'rei', "dick's sporting", "sportsman's warehouse", 'scheels', 'cabela', 'bass pro',
  'nordstrom', "macy's", 'macys', 'dillard', 'jcpenney', "kohl's", 'kohls', 'sears', 'burlington', 'nike', 'adidas', 'lululemon', 'athleta', 'old navy', 'banana republic', 'j.crew', 'forever 21', 'h&m', 'zara', 'uniqlo', "victoria's secret", 'bath & body works', 'foot locker', 'journeys', "claire's", 'gamestop', 'barnes & noble', 'party city', 'spirit halloween', 'goodwill', 'savers', "plato's closet", 'once upon a child', 'sierra trading',
  'verizon', 'at&t', 't-mobile', 'cricket wireless', 'metropcs', 'xfinity', 'comcast', 'spectrum', 'the ups store', 'fedex office', 'postnet',
  'autozone', 'napa auto', "o'reilly", 'advance auto', 'carquest', 'carmax', 'carvana',
  'u-haul', 'uhaul', 'penske', 'public storage', 'extra space', 'cubesmart', 'life storage',
  // food
  'starbucks', 'dutch bros', 'dunkin', 'mcdonald', 'subway', 'domino', 'pizza hut', 'taco bell', 'chipotle', 'panera', 'wendy', 'burger king', 'kfc', "arby's", 'sonic drive', 'dairy queen', "culver's", 'five guys', 'panda express', 'jimmy john', 'wingstop', 'little caesars', 'papa john', "marco's pizza", 'firehouse subs', 'jamba', 'smoothie king', 'jersey mike', 'qdoba', 'del taco', "carl's jr", 'in-n-out', 'whataburger', 'popeyes', 'chick-fil-a', 'raising cane', "freddy's", 'shake shack', 'noodles & company', 'potbelly', 'schlotzsky', 'einstein bros', 'caribou coffee', "peet's coffee", "scooter's coffee", 'human bean', 'black rock coffee', 'biggby',
  "applebee's", "chili's", 'olive garden', 'ihop', "denny's", 'red lobster', 'outback', 'texas roadhouse', 'buffalo wild', 'cracker barrel', 'waffle house', 'longhorn steakhouse', 'red robin', 'cheesecake factory', 'p.f. chang', 'pf chang', 'hooters', 'twin peaks', 'famous dave', 'mod pizza', 'blaze pizza', 'mellow mushroom', "ted's montana grill", 'teds montana grill', 'perkins', 'village inn', 'black bear diner', 'first watch', 'another broken egg', 'snooze an a.m.', 'cold stone', 'baskin', 'krispy kreme', 'tim hortons', 'nothing bundt', 'crumbl', 'insomnia cookies', 'wetzel', 'auntie anne', 'cinnabon', 'great harvest', 'mcalister', 'zaxby', 'bojangles', "church's chicken", 'papa murphy', 'round table pizza', "godfather's pizza", 'pizza ranch', 'illegal pete', "torchy's tacos", "chuy's", 'on the border',
  // convenience / fuel
  "loaf 'n jug", 'loaf n jug', '7-eleven', '7 eleven', 'circle k', 'maverik', 'sinclair', 'conoco', 'chevron', 'shell', 'exxon', 'mobil', 'phillips 66', 'holiday station', 'kum & go', "casey's", 'town pump', 'pilot travel', "love's travel", 'flying j', 'sapp bros', 'quiktrip', 'wawa', 'speedway', 'ampm', 'arco',
  // banks / lodging
  'wells fargo', 'chase bank', 'bank of america', 'us bank', 'u.s. bank', 'pnc bank', 'truist', 'regions bank', 'first interstate', 'glacier bank', 'zions bank', 'first citizens', 'credit union',
  'holiday inn', 'hampton inn', 'best western', 'comfort inn', 'la quinta', 'motel 6', 'super 8', 'days inn', 'marriott', 'hilton', 'hyatt', 'sheraton', 'residence inn', 'fairfield inn', 'springhill suites', 'towneplace', 'candlewood', 'staybridge', 'homewood suites', 'doubletree', 'embassy suites', 'americinn', 'quality inn', 'econo lodge', 'travelodge', 'red lion', 'wingate', 'tru by hilton', 'home2 suites',
  'enterprise rent', 'hertz', 'avis', 'budget rent', 'national car', 'alamo rent', 'thrifty car', 'dollar rent',
  'office depot', 'officemax', 'staples', 'fastsigns', 'signarama', 'minuteman press', 'alphagraphics', 'sir speedy',
];

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
  const a = t.amenity, s = t.shop, c = t.craft, o = t.office, h = t.healthcare, l = t.leisure;
  if (a === 'dentist' || h === 'dentist') return 'Dental clinic';
  if (a === 'veterinary') return 'Veterinary clinic';
  if (a === 'restaurant') return 'Restaurant';
  if (a === 'cafe') return 'Cafe';
  if (a === 'bar' || a === 'pub') return 'Bar / pub';
  if (a === 'clinic' || a === 'doctors' || h === 'clinic' || h === 'doctor' || h === 'centre') return 'Medical clinic';
  if (h === 'physiotherapist') return 'Physical therapy clinic';
  if (h === 'chiropractor') return 'Chiropractic clinic';
  if (h === 'optometrist' || s === 'optician') return 'Optometry clinic';
  if (h === 'podiatrist') return 'Podiatry clinic';
  if (h === 'psychotherapist' || h === 'counselling') return 'Counseling practice';
  if (a === 'spa' || s === 'massage') return 'Spa / massage';
  if (s === 'hairdresser') return 'Hair salon';
  if (s === 'beauty') return 'Beauty / medspa';
  if (s === 'nails') return 'Nail salon';
  if (s === 'tattoo') return 'Tattoo studio';
  if (s === 'car_repair') return 'Auto service';
  if (s === 'tyres') return 'Tire service';
  if (s === 'motorcycle_repair') return 'Motorcycle service';
  if (s === 'bicycle') return 'Bike shop';
  if (s === 'dry_cleaning' || s === 'laundry') return 'Dry cleaning service';
  if (s === 'florist') return 'Florist';
  if (s === 'funeral_directors') return 'Funeral home';
  if (s === 'locksmith') return 'Locksmith';
  if (s === 'pet_grooming') return 'Pet grooming';
  if (s === 'shoe_repair' || s === 'tailor' || s === 'sewing') return 'Repair / tailoring';
  if (s === 'photo' || s === 'photo_studio') return 'Photography studio';
  if (s === 'travel_agency') return 'Travel agency';
  if (s === 'storage_rental') return 'Storage rental';
  if (s === 'bakery') return 'Bakery';
  if (s === 'butcher') return 'Butcher';
  if (s === 'garden_centre') return 'Landscaping service';
  if (l === 'fitness_centre') return 'Gym / studio';
  if (a === 'driving_school') return 'Driving school';
  if (a === 'childcare' || a === 'kindergarten') return 'Childcare';
  if (a === 'animal_boarding') return 'Pet boarding';
  if (c === 'plumber') return 'Plumbing trade';
  if (c === 'electrician') return 'Electrical trade';
  if (c === 'hvac' || c === 'heating_engineer') return 'HVAC trade';
  if (c === 'roofer') return 'Roofing trade';
  if (c === 'carpenter' || c === 'joiner') return 'Carpentry trade';
  if (c === 'gardener' || c === 'landscape') return 'Landscaping service';
  if (c === 'painter') return 'Painting trade';
  if (c === 'floorer') return 'Flooring trade';
  if (c === 'tiler') return 'Tile trade';
  if (c === 'glaziery' || c === 'glazier') return 'Glass trade';
  if (c === 'window_construction') return 'Window trade';
  if (c === 'metal_construction' || c === 'blacksmith' || c === 'welder') return 'Metal fabrication trade';
  if (c === 'stonemason') return 'Masonry trade';
  if (c === 'insulation') return 'Insulation trade';
  if (c === 'caterer') return 'Catering service';
  if (o === 'lawyer') return 'Law firm';
  if (o === 'insurance') return 'Insurance agency';
  if (o === 'accountant' || o === 'tax_advisor') return 'Accounting firm';
  if (o === 'estate_agent') return 'Real estate';
  if (o === 'architect') return 'Architecture firm';
  if (o === 'financial') return 'Financial services';
  if (o === 'employment_agency') return 'Staffing agency';
  if (o === 'surveyor') return 'Surveying firm';
  if (o === 'notary') return 'Notary office';
  if (o === 'advertising_agency') return 'Marketing agency';
  if (s) return s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  if (c) return c.replace(/_/g, ' ') + ' trade';
  if (o) return o.replace(/_/g, ' ') + ' office';
  return 'Local service business';
}

function nicheFor(label) {
  const l = label.toLowerCase();
  if (/restaurant|cafe|bar|pub|bakery|butcher|catering|deli|diner/.test(l)) return 'restaurant';
  if (/dental|vet|medical|clinic|pharmacy|physical therapy|chiro|salon|spa|beauty|medspa|aesthet|health|optometry|podiatry|counseling|nail|tattoo|massage|pet groom|pet boarding/.test(l)) return 'dental_medspa';
  if (/real estate|realt|estate agent|broker|property/.test(l)) return 'real_estate';
  if (/plumb|electric|hvac|roof|carpen|landscap|paint|auto|tire|garage|handyman|construction|contractor|clean|pest|garden|glass|floor|insulat|fenc|gutter|trade|masonry|window|metal|locksmith|storage|dry clean/.test(l)) return 'home_service';
  return 'other';
}

const isRestaurantLabel = (label) => /restaurant|cafe|bar \/ pub|bakery|butcher/i.test(label);

// Structural hints that this is an owner-operated shop and not a corporate unit.
// "Dave's Plumbing", "Smith & Sons Roofing", "Miller Brothers HVAC".
const OWNER_OPERATED = /(\w)['’]s\s|\b(&|and)\s+(sons?|daughters?|brothers?|bros\.?|family|co\.?)\b|\bfamily\b|\bbrothers\b/i;

function buildQuery(bbox, mode) {
  const web = mode === 'nosite' ? '[!"website"][!"contact:website"][!"url"]' : '["website"]';
  const phone = '[~"^(phone|contact:phone)$"~"."]';
  // Service businesses only. Deliberately NOT a bare ["shop"] — that is what
  // pulls department stores and big-box retail into a cold-call list.
  const sel = [
    '["craft"]',
    '["healthcare"]',
    '["shop"~"^(hairdresser|beauty|nails|massage|tattoo|car_repair|tyres|motorcycle_repair|bicycle|dry_cleaning|laundry|florist|funeral_directors|locksmith|pet_grooming|optician|shoe_repair|tailor|sewing|photo|photo_studio|travel_agency|storage_rental|bakery|butcher|garden_centre)$"]',
    '["amenity"~"^(dentist|veterinary|clinic|doctors|spa|driving_school|childcare|kindergarten|animal_boarding)$"]',
    '["office"~"^(lawyer|accountant|tax_advisor|insurance|estate_agent|architect|financial|employment_agency|surveyor|notary|advertising_agency)$"]',
    '["leisure"~"^(fitness_centre)$"]',
    '["amenity"~"^(restaurant|cafe|bar|pub)$"]',
  ];
  return `[out:json][timeout:120];(${sel.map((s) => `nwr${web}${phone}${s}(${bbox});`).join('')});out tags 2000;`;
}

async function overpass(query) {
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.osm.jp/api/interpreter',
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of mirrors) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: `data=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(120000) });
        if (!res.ok) { console.warn(`    overpass ${res.status} @ ${hostOf(url)}`); continue; }
        const j = await res.json();
        if (j.elements?.length) return j.elements;
      } catch (e) { console.warn(`    overpass err @ ${hostOf(url)}: ${e.message}`); }
    }
    if (attempt < 2) { console.warn('    all mirrors soft-failed, backing off 10s...'); await sleep(10000); }
  }
  return [];
}

async function geocode(place) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const j = await res.json();
        if (j.length) { const b = j[0].boundingbox; return { south: +b[0], north: +b[1], west: +b[2], east: +b[3], display: j[0].display_name }; }
      }
    } catch {}
    await sleep(2000);
  }
  return null;
}

async function scrapeSite(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = ''; try { origin = new URL(base).origin; } catch { return { email: null, weak: [], dead: true }; }
  const host = hostOf(base); const collected = []; const weak = []; let home = false; let reached = false;
  for (const page of [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`]) {
    try {
      const res = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      reached = true;
      let html = (await res.text()).slice(0, 400000);
      if (!home && page === base) {
        home = true;
        if (!/<meta[^>]+name=["']viewport["']/i.test(html)) weak.push('not mobile-friendly');
        if (res.url && res.url.startsWith('http://')) weak.push('no HTTPS');
        const yrs = [...html.matchAll(/(?:©|&copy;|copyright)\s*\D{0,6}(20\d\d)/gi)].map((m) => +m[1]);
        const my = yrs.length ? Math.max(...yrs) : null;
        if (my && my <= YEAR - 2) weak.push(`stale (©${my})`);
        // A site with no booking/contact form is leaking every after-hours lead.
        if (!/<form/i.test(html) && !/calendly|acuity|booksy|vagaro|squareup\.com\/appointments|schedulicity|housecallpro|jobber/i.test(html)) weak.push('no booking form');
      }
      html = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*[\[(]at[\])]\s*/gi, '@');
      for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) collected.push(m[1]);
      for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) collected.push(m[0]);
      const b = bestEmail(collected, host);
      if (b && (hostOf(b.split('@')[1]) === host || ROLE.test(b)) && home) return { email: b, weak, dead: false };
    } catch {}
  }
  return { email: bestEmail(collected, host), weak, dead: !reached };
}

let hunterCalls = 0;
const HUNTER_CAP = 320; // stay inside the remaining monthly credit balance
async function hunterEmail(website) {
  if (!HUNTER || hunterCalls >= HUNTER_CAP) return null;
  const domain = hostOf(website);
  if (!domain) return null;
  hunterCalls++;
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER}&limit=5`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const j = await res.json();
    const emails = j?.data?.emails ?? [];
    const role = emails.find((e) => /^(info|contact|office|hello|sales|support)@/i.test(e.value ?? ''));
    const pick = (role ?? emails[0])?.value?.toLowerCase() ?? null;
    return pick && !EMAIL_BLOCK.test(pick) ? pick : null;
  } catch { return null; }
}

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
  const res = await fetch(`${SUPA_URL}/rest/v1/outbound_reps?select=id,name,role&active=eq.true`, { headers: SB });
  const reps = res.ok ? await res.json() : [];
  const want = norm(name);
  const rep = reps.find((r) => norm(r.name) === want) || reps.find((r) => want.includes(norm(r.name)) || norm(r.name).includes(want));
  return rep ? { id: rep.id, name: rep.name, role: rep.role } : { id: null, name, role: null };
}

async function insertRows(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 250) {
    const chunk = rows.slice(i, i + 250);
    const res = await fetch(`${SUPA_URL}/rest/v1/outbound_leads`, { method: 'POST', headers: { ...SB, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(chunk) });
    if (!res.ok) throw new Error(`Insert ${res.status}: ${(await res.text()).slice(0, 400)}`);
    inserted += chunk.length;
    console.log(`  inserted ${inserted}/${rows.length}`);
  }
  return inserted;
}

/** A+ score. Higher = more desperately in need of what MMS sells. */
function scoreOf(p) {
  let s = 0;
  if (p.noRealSite) s += 55;              // nothing to compete with, strongest pitch
  if (p.socialOnly) s += 12;              // facebook-page-as-website: extra painful
  if (p.dead) s += 45;                    // listed site does not even load
  for (const w of p.weak) {
    if (/^stale/.test(w)) s += 30;
    else if (w === 'not mobile-friendly') s += 28;
    else if (w === 'no HTTPS') s += 22;
    else if (w === 'no booking form') s += 14;
  }
  const niche = nicheFor(p.label);
  if (niche === 'home_service') s += 18;  // trades convert best for us
  else if (niche === 'dental_medspa') s += 14;
  else if (niche === 'restaurant') s += 4;
  if (p.ownerOperated) s += 12;           // single-owner signal
  if (p.email) s += 10;                   // callable AND emailable
  return s;
}

async function main() {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('Supabase env missing (.env.local supabase_url / supabase_service_role_key).');
  console.log(`\n=== A+ WESTERN SOURCER ===`);
  console.log(`owner ${OWNER_ARG} · target ${GLOBAL_TARGET} · ${APPLY ? 'APPLY' : 'DRY RUN'} · Hunter ${HUNTER ? 'ON' : 'off'}\n`);

  const owner = await resolveOwner(OWNER_ARG);
  if (!owner.id) throw new Error(`Rep "${OWNER_ARG}" not found on outbound_reps — refusing to insert unassigned leads.`);
  console.log(`Owner resolved: ${owner.name} (${owner.id}) role=${owner.role}`);

  const { names: seenNames, phones: seenPhones } = await floorKeys();
  console.log(`Floor dedupe set: ${seenNames.size} names / ${seenPhones.size} phones already on outbound_leads\n`);

  // ── PHASE 1: discovery across every city (no enrichment yet) ──
  const raw = [];
  for (const { place, quota } of CITIES) {
    const [cityRaw, stateRaw] = place.split(',').map((s) => s.trim());
    const city = cityRaw, state = (stateRaw || '').toUpperCase().slice(0, 2) || null;
    console.log(`→ ${place}`);
    const geo = await geocode(place);
    if (!geo) { console.warn(`  SKIP: could not geocode`); continue; }
    const bbox = `${geo.south},${geo.west},${geo.north},${geo.east}`;
    let got = 0;
    for (const mode of ['nosite', 'site']) {
      const els = await overpass(buildQuery(bbox, mode));
      for (const el of els) {
        const t = el.tags || {};
        const name = t.name; if (!name) continue;
        const phone = t.phone || t['contact:phone']; if (!phone) continue;
        const website = t.website || t['contact:website'] || t.url || null;
        raw.push({
          business: name, phone, website, city, state, quota,
          email: t.email || t['contact:email'] || null,
          label: labelFor(t),
        });
        got++;
      }
      await sleep(1500);
    }
    console.log(`  ${got} raw candidates`);
  }
  console.log(`\nDiscovery complete: ${raw.length} raw candidates across ${CITIES.length} cities`);

  // ── PHASE 2: chain detection + filtering + dedupe ──
  // A name appearing in 2+ of our cities is a chain we don't have listed yet.
  const cityCountByName = new Map();
  for (const p of raw) {
    const n = norm(p.business);
    if (!cityCountByName.has(n)) cityCountByName.set(n, new Set());
    cityCountByName.get(n).add(p.city);
  }
  const autoChains = new Set([...cityCountByName.entries()].filter(([, c]) => c.size >= 2).map(([n]) => n));
  if (autoChains.size) console.log(`Auto-detected ${autoChains.size} multi-city chains (e.g. ${[...autoChains].slice(0, 6).join(', ')})`);

  const runNames = new Set(), runPhones = new Set();
  const cand = [];
  let dropChain = 0, dropDupe = 0, dropOnFloor = 0;
  for (const p of raw) {
    const n = norm(p.business), d = digitsOf(p.phone);
    if (autoChains.has(n) || FRANCHISE.some((f) => n.includes(norm(f)))) { dropChain++; continue; }
    if (seenNames.has(n) || (d && seenPhones.has(d))) { dropOnFloor++; continue; }
    if (runNames.has(n) || (d && runPhones.has(d))) { dropDupe++; continue; }
    runNames.add(n); if (d) runPhones.add(d);
    const socialOnly = !!p.website && SOCIAL_HOSTS.test(hostOf(p.website));
    cand.push({
      ...p,
      socialOnly,
      noRealSite: !p.website || socialOnly,
      ownerOperated: OWNER_OPERATED.test(p.business),
      weak: [], dead: false,
    });
  }
  console.log(`Filtered: ${cand.length} unique fresh candidates (dropped ${dropChain} chain, ${dropOnFloor} already on floor, ${dropDupe} in-run dupes)`);

  // ── PHASE 3: enrich only the ones with a real site to score ──
  const toScrape = cand.filter((p) => p.website && !p.socialOnly);
  console.log(`\nScoring ${toScrape.length} live sites (weakness signals + email: scrape → Hunter)...`);
  let done = 0;
  await pool(toScrape, 8, async (p) => {
    const r = await scrapeSite(p.website);
    p.weak = r.weak; p.dead = r.dead;
    if (p.email && EMAIL_BLOCK.test(p.email)) p.email = null;
    if (!p.email) p.email = r.email;
    if (!p.email && !r.dead) p.email = await hunterEmail(p.website);
    if (++done % 50 === 0) console.log(`  scored ${done}/${toScrape.length}`);
  });
  for (const p of cand) if (p.noRealSite) p.weak = [p.socialOnly ? 'social page only, no real website' : 'no website'];
  console.log(`  scored ${done}/${toScrape.length} · Hunter calls used: ${hunterCalls}`);

  // ── PHASE 4: score, rank, apply per-city quota + restaurant cap ──
  for (const p of cand) p.score = scoreOf(p);
  cand.sort((a, b) => b.score - a.score);

  const perCity = new Map(), kept = [];
  let restaurants = 0;
  const restaurantCap = Math.round(GLOBAL_TARGET * RESTAURANT_SHARE);
  for (const p of cand) {
    if (kept.length >= GLOBAL_TARGET) break;
    const used = perCity.get(p.city) || 0;
    if (used >= p.quota) continue;
    if (isRestaurantLabel(p.label)) { if (restaurants >= restaurantCap) continue; restaurants++; }
    perCity.set(p.city, used + 1);
    kept.push(p);
  }
  // If quotas left us short of target, backfill with the next best regardless of city.
  if (kept.length < GLOBAL_TARGET) {
    const inKept = new Set(kept.map((p) => norm(p.business)));
    for (const p of cand) {
      if (kept.length >= GLOBAL_TARGET) break;
      if (inKept.has(norm(p.business))) continue;
      if (isRestaurantLabel(p.label) && restaurants >= restaurantCap) continue;
      if (isRestaurantLabel(p.label)) restaurants++;
      inKept.add(norm(p.business));
      kept.push(p);
    }
  }

  const rows = kept.map((p) => {
    const need = p.weak?.length ? ` · needs us: ${p.weak.join(', ')}` : '';
    return {
      business_name: String(p.business).slice(0, 200),
      contact_name: null,
      phone: String(p.phone).slice(0, 40),
      email: p.email ? String(p.email).slice(0, 200) : null,
      website: p.website ? String(p.website).slice(0, 300) : null,
      niche: nicheFor(p.label),
      city: p.city.slice(0, 120),
      state: p.state,
      status: 'new',
      source: 'western-aplus-2026-07',
      owner_rep_id: owner.id,
      dnc_checked: false,
      notes: `${p.label} · ${p.city}${p.state ? `, ${p.state}` : ''} · A+ score ${p.score}${need}`.slice(0, 2000),
    };
  });

  // ── report ──
  const byCity = {}, byNiche = {};
  for (const p of kept) { byCity[`${p.city}, ${p.state}`] = (byCity[`${p.city}, ${p.state}`] || 0) + 1; byNiche[nicheFor(p.label)] = (byNiche[nicheFor(p.label)] || 0) + 1; }
  console.log(`\n── QUALITY ──`);
  console.log(`  ${rows.length} A+ leads · every one has a phone`);
  console.log(`  no real website (site must be built): ${kept.filter((p) => p.noRealSite).length}`);
  console.log(`    of which social-page-only: ${kept.filter((p) => p.socialOnly).length}`);
  console.log(`  dead/broken website: ${kept.filter((p) => p.dead).length}`);
  console.log(`  outdated website (stale/not mobile/no HTTPS/no booking): ${kept.filter((p) => !p.noRealSite && !p.dead && p.weak.length).length}`);
  console.log(`  owner-operated name signal: ${kept.filter((p) => p.ownerOperated).length}`);
  console.log(`  with email: ${rows.filter((r) => r.email).length}/${rows.length} (${Math.round((rows.filter((r) => r.email).length / Math.max(rows.length, 1)) * 100)}%)`);
  console.log(`  every lead carries a "needs us" reason: ${kept.every((p) => p.weak.length) ? 'YES' : 'NO'}`);
  console.log(`  score range: ${kept.length ? `${kept[kept.length - 1].score} – ${kept[0].score}` : 'n/a'}`);
  console.log(`\n  BY CITY:`); Object.entries(byCity).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`    ${String(v).padStart(4)}  ${k}`));
  console.log(`\n  BY NICHE:`); Object.entries(byNiche).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`    ${String(v).padStart(4)}  ${k}`));
  console.log(`\n  TOP 12 SAMPLE:`);
  for (const p of kept.slice(0, 12)) console.log(`   [${String(p.score).padStart(3)}] ${p.business} · ${p.phone} · ${p.city} · ${p.label} · ${p.email || 'no email'} · ${p.weak.join(', ')}`);

  writeFileSync('scripts/.aplus-preview.json', JSON.stringify(rows, null, 1));
  console.log(`\n  full list written to scripts/.aplus-preview.json`);

  if (!APPLY) { console.log(`\nDRY RUN — nothing written to the floor. Re-run with --apply.\n`); return; }
  const n = await insertRows(rows);
  console.log(`\nAPPLIED — ${n} A+ leads on the outbound floor, assigned to ${owner.name}.\n`);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
