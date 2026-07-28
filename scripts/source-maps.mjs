/**
 * SOURCE-MAPS — stage 2. Turns a Google Maps harvest into qualified leads on the
 * outbound floor.
 *
 * The qualifier, in Sarah's words: "good reviews, but no website, or old
 * websites". So a lead has to prove BOTH halves:
 *
 *   GOOD AT THE WORK   → star rating at or above RATING_FLOOR on Maps
 *   BAD ON THE WEB     → no website at all, or a website that scores as weak
 *                        (stale copyright, not mobile-friendly, no HTTPS,
 *                        builder subdomain, dead host, Facebook-as-website)
 *
 * A business that is good at the work AND has a healthy modern site is DROPPED.
 * They do not need us, and a dial spent on one is a dial not spent on someone
 * who does.
 *
 * Website URLs come from Google's own Business Profile link, never from a
 * search guess, which structurally avoids the failure that once put walmart.com
 * on a roofer (see the NEVER GUESS rule in lib/enrich.ts). Emails are only ever
 * taken from that confirmed domain.
 *
 * Dry run by default. --apply writes.
 *
 * Run:  node scripts/source-maps.mjs indy 300
 *       node scripts/source-maps.mjs indy 300 --apply
 *       node scripts/source-maps.mjs indy 300 --no-detail --apply   (skip the place-page pass)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { METROS } from './metros.mjs';
import { chainBrand } from '../lib/chains.mjs';
import { detailPass } from './maps-detail.mjs';

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith('--'));
const positional = argv.filter((a) => !a.startsWith('--'));
const METRO_KEY = (positional[0] || 'indy').toLowerCase();
const TARGET = Number(positional[1] || 300);
const APPLY = flags.includes('--apply');
const NO_DETAIL = flags.includes('--no-detail');
// Insert the exact rows a previous dry run produced, instead of recomputing them.
// The scoring + detail pass takes ~15 minutes, so re-running it to apply would
// both waste that time and risk writing something subtly different from what was
// reviewed. --land writes what you actually inspected, re-checking floor dedupe
// first in case another session added leads in the meantime.
const LAND = flags.includes('--land');
// Re-run ONLY the place-page detail pass, on the rows a previous run could not
// resolve, reusing the cached selection. Lets a rate-limited detail pass be
// filled in without redoing the 20-minute selection and website scoring.
const RESUME_DETAIL = flags.includes('--resume-detail');
const OWNER_ARG = (argv.find((a, i) => argv[i - 1] === '--owner') || '').trim() || null;

const metro = METROS[METRO_KEY];
if (!metro) { console.error(`Unknown metro "${METRO_KEY}". Known: ${Object.keys(METROS).join(', ')}`); process.exit(1); }

const RATING_FLOOR = 4.0;   // "good reviews"
const CACHE = `scripts/.cache/maps-${METRO_KEY}.json`;
const DETAIL_CACHE = `scripts/.cache/maps-${METRO_KEY}-detail.json`;

// ── env ──────────────────────────────────────────────────────────
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

const UA = 'ModernMustardSeed-Sourcer/3.0 (sarah@modernmustardseed.com)';
const YEAR = 2026;
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const digitsOf = (p) => (p || '').replace(/[^0-9]/g, '').replace(/^1(?=\d{10}$)/, '');
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

/**
 * "(317) 912-0222" → "+13179120222". Deterministic, so every lead gets a
 * consistent dialable format whether or not the place-page detail pass reached
 * it. Anything that is not a clean 10-digit US number is left exactly as found
 * rather than mangled into a plausible-looking wrong number.
 */
function toE164(phone) {
  const d = digitsOf(phone);
  return /^\d{10}$/.test(d) ? `+1${d}` : phone;
}

// ── what is not a prospect ───────────────────────────────────────
// chainBrand() from lib/chains.mjs is the shared, deliberately-conservative
// list. These are the extra franchise/national names that show up specifically
// in home-services Maps results and cannot buy a website from a Kalispell studio.
const FRANCHISE_EXTRA = [
  'servpro', 'roto-rooter', 'roto rooter', 'mr. rooter', 'mr rooter', 'benjamin franklin plumbing',
  'one hour heating', 'mister sparky', 'aire serv', 'rainbow restoration', 'servicemaster',
  'paul davis', 'restoration 1', 'puroclean', 'stanley steemer', 'chem-dry', 'zerorez',
  'terminix', 'orkin', 'aptive', 'trugreen', 'weed man', 'lawn doctor', 'scotts lawn',
  'the grounds guys', 'mosquito joe', 'window genie', 'molly maid', 'merry maids', 'the maids',
  'two men and a truck', 'college hunks', 'junk king', '1-800-got-junk', 'got junk',
  'precision garage door', 'overhead door', 'garage door doctor', 'aaa garage',
  'anderson windows', 'renewal by andersen', 'champion windows', 'leaffilter', 'leaf filter',
  'bath fitter', 're-bath', 'rebath', 'closets by design', 'california closets',
  'budget blinds', 'kitchen tune-up', 'floor coverings international', 'cutco',
  'ars/rescue rooter', 'ars rescue rooter', 'mint condition', 'jan-pro', 'jani-king',
  'aamco', 'midas', 'meineke', 'jiffy lube', 'valvoline', 'firestone', 'goodyear',
  'discount tire', 'les schwab', 'pep boys', 'tires plus', 'monro', 'christian brothers automotive',
  'aspen dental', 'heartland dental', 'western dental', 'banfield', 'vca animal',
  'sport clips', 'great clips', 'supercuts', 'massage envy', 'european wax',
  'home depot', "lowe's", 'lowes', 'menards', 'ace hardware', 'sherwin williams', 'sherwin-williams',
];

// Maps categories that are never our buyer even when the trade query surfaced them.
const CATEGORY_BLOCK = /^(hardware store|home improvement store|building materials|department store|supermarket|grocery|corporate office|shopping mall|warehouse|distribution|wholesal|manufactur|school|government|city government|non-profit|charity|church|hospital|university|college|bank|credit union|gas station|convenience store|car dealer|auto parts store|furniture store|paint store|rental|storage|hotel|motel|apartment|real estate agency)/i;
// Anywhere in the category, not just the start: a "Plumbing supply store" or a
// "Heating equipment supplier" sells TO the trades, it is not a trade with a
// phone that rings for emergency jobs. Both slipped past the anchored list.
const CATEGORY_BLOCK_ANY = /(supply store|equipment supplier|wholesal|distributor|manufactur|\bsupplier\b)/i;

// 800/833/844/855/866/877/888. A toll-free line means a call centre or a
// multi-market operation, not the owner-operator we can sell to, and toll-free
// SMS needs its own carrier registration on top.
const TOLL_FREE = new Set(['800', '833', '844', '855', '866', '877', '888']);

/** Local owner-operator, or an out-of-market reseller wearing a local name? */
function phoneIsLocal(phone) {
  const d = digitsOf(phone);
  if (!/^\d{10}$/.test(d)) return false;
  const npa = d.slice(0, 3);
  if (TOLL_FREE.has(npa)) return false;
  return metro.areaCodes ? metro.areaCodes.includes(npa) : true;
}

/**
 * Drop listings whose "name" is really a domain string or has no words in it.
 * Caught in review: "garagedooropenersinstallation." made it into a shortlist.
 * A name like that is an SEO shell, and it also reads as spam in a cold text.
 */
function nameIsJunk(name) {
  const n = (name || '').trim();
  if (n.length < 3) return true;
  if (/^(https?:\/\/|www\.)/i.test(n)) return true;
  if (/\.(com|net|org|biz|us|info)\b/i.test(n)) return true;
  if (/^[a-z0-9-]{15,}\.?$/.test(n)) return true; // one long unbroken lowercase run
  if (!/[a-zA-Z]/.test(n)) return true;
  return false;
}

function isFranchise(name) {
  const n = norm(name);
  if (chainBrand(name)) return true;
  return FRANCHISE_EXTRA.some((f) => n.includes(norm(f)));
}

// ── website weakness scoring ─────────────────────────────────────
// Website builders and social pages used AS the website. Not blocked (a real
// welder's weebly site IS their site) but they score as weak, which is the point.
const BUILDER = /\.(wixsite|weebly|squarespace|godaddysites|business\.site|blogspot|wordpress)\.com$|\.myshopify\.com$/i;
const SOCIAL_AS_SITE = /^(m\.)?(facebook|instagram|linkedin|yelp|nextdoor|angi|houzz|thumbtack|porch|bbb)\./i;

const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|@email\.com|your@|youremail|yourname|firstname|lastname|name@|sample@|test@|user@|noreply|no-reply|donotreply|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite|modernmustardseed|sourcer|%2[f8]|u003d/i;
const ROLE = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi|service|scheduling)@/i;

function bestEmail(list, host) {
  const clean = [...new Set(list.map((e) => e.toLowerCase().trim()))]
    .filter((e) => !EMAIL_BLOCK.test(e) && e.length <= 100 && /@[a-z0-9.-]+\.[a-z]{2,}$/.test(e));
  if (!clean.length) return null;
  clean.sort((a, b) => {
    const da = hostOf(a.split('@')[1]) === host ? 1 : 0, db = hostOf(b.split('@')[1]) === host ? 1 : 0;
    if (da !== db) return db - da;
    return (ROLE.test(b) ? 1 : 0) - (ROLE.test(a) ? 1 : 0);
  });
  return clean[0];
}

// Site scoring is ~1000 HTTP fetches per run and the answers barely change day
// to day, so they persist keyed by URL. Re-running a metro after a logic change
// then costs nothing instead of twelve minutes.
const SCORE_CACHE_FILE = `scripts/.cache/site-scores.json`;
let SCORE_CACHE = {};
try { SCORE_CACHE = JSON.parse(readFileSync(SCORE_CACHE_FILE, 'utf8')); } catch {}
function saveScoreCache() {
  try { mkdirSync('scripts/.cache', { recursive: true }); writeFileSync(SCORE_CACHE_FILE, JSON.stringify(SCORE_CACHE)); } catch {}
}

async function scoreSiteCached(website) {
  if (SCORE_CACHE[website]) return SCORE_CACHE[website];
  const r = await scoreSite(website);
  SCORE_CACHE[website] = r;
  return r;
}

/** Fetch their site, score how weak it is, and pick up an email while we're there. */
async function scoreSite(website) {
  const host = hostOf(website);
  const weak = [];
  if (SOCIAL_AS_SITE.test(host)) weak.push('Facebook page used as their website');
  if (BUILDER.test(host)) weak.push('free website-builder page');

  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = ''; try { origin = new URL(base).origin; } catch { return { weak, email: null, reachable: false }; }

  const collected = [];
  let reachable = false;
  let homeScored = false;

  for (const page of [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`]) {
    // Never keep hammering a host that just failed to answer (the 46-second-lead
    // lesson from lib/enrich.ts).
    if (!reachable && homeScored) break;
    try {
      const res = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
      if (!res.ok) { if (page === base) homeScored = true; continue; }
      reachable = true;
      let html = (await res.text()).slice(0, 400000);
      if (!homeScored && page === base) {
        homeScored = true;
        if (!/<meta[^>]+name=["']viewport["']/i.test(html)) weak.push('not mobile-friendly');
        if (res.url && res.url.startsWith('http://')) weak.push('no HTTPS');
        const yrs = [...html.matchAll(/(?:©|&copy;|copyright)\s*\D{0,6}(20\d\d)/gi)].map((m) => +m[1]);
        const my = yrs.length ? Math.max(...yrs) : null;
        if (my && my <= YEAR - 2) weak.push(`stale (©${my})`);
      }
      html = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*[\[(]at[\])]\s*/gi, '@');
      for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) collected.push(m[1]);
      for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) collected.push(m[0]);
    } catch {
      if (page === base) homeScored = true;
    }
  }
  if (!reachable) weak.push('website does not load');
  return { weak, email: bestEmail(collected, host), reachable };
}

// Mailbox providers a real Main Street business plausibly runs on. An address at
// one of these is theirs; an address on some OTHER company's domain is not.
const CONSUMER_MX = new Set([
  'gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'protonmail.com', 'proton.me', 'comcast.net', 'att.net',
  'sbcglobal.net', 'bellsouth.net', 'verizon.net', 'cox.net', 'charter.net', 'earthlink.net',
  'juno.com', 'frontier.com', 'windstream.net', 'ymail.com', 'rocketmail.com', 'mail.com',
]);

/**
 * LAST-LINE EMAIL GATE, applied even to cached results.
 *
 * An email is theirs only if it sits on the domain Google published for them, or
 * on a consumer mailbox provider (a huge share of Main Street genuinely runs on
 * gmail). Anything on a THIRD company's domain is someone else's address that
 * happened to appear on their page: their web developer, a partner, a franchise
 * parent. Caught in review: "Jeff's Lawn Care Service" was carrying
 * office@morinlandscaping.com and "Perfect Timing Heating&Cooling" was carrying
 * micah@micahrich.com, its site builder. Pitching a lawn company at a different
 * landscaper's inbox is the same harm as the walmart.com incident.
 */
function emailAcceptable(email, website) {
  if (!email) return false;
  const domain = (email.split('@')[1] || '').toLowerCase();
  if (!domain) return false;
  if (CONSUMER_MX.has(domain)) return true;
  const site = hostOf(website || '');
  if (!site) return false;
  // Same registrable site, allowing a subdomain of it (mail.theirsite.com).
  return domain === site || domain.endsWith(`.${site}`) || site.endsWith(`.${domain}`);
}

/** Hunter, pointed only at a domain Google itself published for this business. */
async function hunterEmail(website) {
  if (!HUNTER) return null;
  const domain = hostOf(website);
  if (!domain || SOCIAL_AS_SITE.test(domain)) return null;
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER}&limit=5`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const j = await res.json();
    const emails = j?.data?.emails ?? [];
    const role = emails.find((e) => ROLE.test(e.value ?? ''));
    const pick = (role ?? emails[0])?.value?.toLowerCase() ?? null;
    return pick && !EMAIL_BLOCK.test(pick) ? pick : null;
  } catch { return null; }
}

async function pool(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

// ── niche enum ───────────────────────────────────────────────────
function nicheFor(category, trade) {
  const l = `${category || ''} ${trade || ''}`.toLowerCase();
  // ⚠️ WORD BOUNDARIES, NOT SUBSTRINGS. Unbounded /deli/ matched "reMODELIng"
  // and filed three remodelers as restaurants. Same class as the
  // `'anything'.includes('')` bug that put walmart.com on a roofer: a loose
  // matcher is confidently wrong rather than silent.
  if (/\b(restaurants?|cafes?|bars?|pubs?|bakery|bakeries|pizza|grill|diner|deli|food)\b/.test(l)) return 'restaurant';
  if (/dental|dentist|med spa|medspa|veterinar|vet|clinic|doctor|chiro|salon|spa|aesthetic|health/.test(l)) return 'dental_medspa';
  if (/real estate|realt|property/.test(l)) return 'real_estate';
  if (/plumb|electric|hvac|heating|cooling|roof|carpen|landscap|lawn|tree|paint|floor|remodel|contractor|fence|concrete|gutter|siding|window|deck|junk|moving|appliance|restoration|septic|chimney|insulat|handyman|foundation|paving|carpet|clean|pool|locksmith|excavat|garage|pest/.test(l)) return 'home_service';
  return 'other';
}

// ── floor dedupe ─────────────────────────────────────────────────
async function floorKeys() {
  const names = new Set(), phones = new Set();
  for (let from = 0; from < 200000; from += 1000) {
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
  return rep ? { id: rep.id, name: rep.name } : { id: null, name };
}

async function insertRows(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const res = await fetch(`${SUPA_URL}/rest/v1/outbound_leads`, {
      method: 'POST',
      headers: { ...SB, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Insert ${res.status}: ${(await res.text()).slice(0, 300)}`);
    inserted += chunk.length;
  }
  return inserted;
}

// ── main ─────────────────────────────────────────────────────────
/** Insert the reviewed rows file as-is, minus anything that reached the floor since. */
async function land() {
  const file = `scripts/.cache/maps-${METRO_KEY}-rows.json`;
  if (!existsSync(file)) throw new Error(`No reviewed rows at ${file}. Run the dry run first.`);
  const rows = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`\nLanding ${rows.length} reviewed rows from ${file}`);
  const { names, phones } = await floorKeys();
  const fresh = rows.filter((r) => !names.has(norm(r.business_name)) && !phones.has(digitsOf(r.phone)));
  if (fresh.length !== rows.length) console.log(`  ${rows.length - fresh.length} landed on the floor since the dry run, skipping those`);
  const n = await insertRows(fresh);
  console.log(`\nAPPLIED — ${n} leads inserted onto the outbound floor.\n`);
}

async function main() {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('Supabase env missing from .env.local');
  if (LAND) return land();
  if (!existsSync(CACHE)) throw new Error(`No harvest at ${CACHE}. Run: node scripts/maps-harvest.mjs ${METRO_KEY}`);

  // Resume: reuse the cached selection and only fill in what the detail pass
  // could not resolve last time.
  // Regenerate the rows file from the cached selection with no scraping at all.
  // Use after changing row-building logic (niche mapping, notes, email gate).
  if (flags.includes('--rebuild')) {
    if (!existsSync(DETAIL_CACHE)) throw new Error(`No detail cache at ${DETAIL_CACHE}.`);
    const keep = JSON.parse(readFileSync(DETAIL_CACHE, 'utf8'));
    console.log(`\n${metro.label} · rebuilding ${keep.length} rows from cache (no scraping)`);
    return buildAndReport(keep, await resolveOwner(OWNER_ARG || metro.owner));
  }

  if (RESUME_DETAIL) {
    if (!existsSync(DETAIL_CACHE)) throw new Error(`No detail cache at ${DETAIL_CACHE}. Run the full dry run first.`);
    const keep = JSON.parse(readFileSync(DETAIL_CACHE, 'utf8'));
    const owner = await resolveOwner(OWNER_ARG || metro.owner);
    const todo = keep.filter((r) => !r.city);
    console.log(`\n${metro.label} · resuming detail on ${todo.length} of ${keep.length} unresolved rows`);
    const { blocked } = await detailPass(todo, { onProgress: (d, t, b) => console.log(`    ${d}/${t}${b ? ` (${b} blocked)` : ''}`) });
    console.log(`  resolved a real city for ${keep.filter((r) => r.city).length}/${keep.length}${blocked ? ` · ${blocked} still blocked` : ''}`);
    writeFileSync(DETAIL_CACHE, JSON.stringify(keep));
    return buildAndReport(keep, owner);
  }

  const harvest = JSON.parse(readFileSync(CACHE, 'utf8'));
  console.log(`\n${metro.label} · harvest ${harvest.rows.length} cards from ${harvest.done.length} queries · target ${TARGET} · ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  // 1. dedupe inside the harvest (the same business surfaces under many trades)
  const byKey = new Map();
  for (const r of harvest.rows) {
    const key = digitsOf(r.phone) || norm(r.name);
    if (!key) continue;
    const prev = byKey.get(key);
    // keep the record that knows about a website, so we never mislabel someone
    // as "no website" just because one card omitted the button
    if (!prev || (!prev.website && r.website)) byKey.set(key, { ...(prev || {}), ...r, website: r.website || prev?.website || null });
  }
  let rows = [...byKey.values()];
  console.log(`  unique businesses: ${rows.length}`);

  // 2. hard gates
  const before = rows.length;
  rows = rows.filter((r) => r.phone);
  const noPhone = before - rows.length;
  const nonLocal = rows.filter((r) => !phoneIsLocal(r.phone));
  rows = rows.filter((r) => phoneIsLocal(r.phone));
  const junkName = rows.filter((r) => nameIsJunk(r.name));
  rows = rows.filter((r) => !nameIsJunk(r.name));
  console.log(`  dropped: ${nonLocal.length} toll-free/out-of-market numbers · ${junkName.length} junk names`);
  const chains = rows.filter((r) => isFranchise(r.name));
  rows = rows.filter((r) => !isFranchise(r.name));
  const badCat = rows.filter((r) => (CATEGORY_BLOCK.test(r.category || '') || CATEGORY_BLOCK_ANY.test(r.category || '')));
  rows = rows.filter((r) => !(CATEGORY_BLOCK.test(r.category || '') || CATEGORY_BLOCK_ANY.test(r.category || '')));
  const lowRated = rows.filter((r) => !(r.rating >= RATING_FLOOR));
  rows = rows.filter((r) => r.rating >= RATING_FLOOR);
  console.log(`  dropped: ${noPhone} no phone · ${chains.length} chains/franchises · ${badCat.length} wrong category · ${lowRated.length} rated under ${RATING_FLOOR}`);
  console.log(`  qualified on reputation: ${rows.length}`);

  // 3. dedupe against the WHOLE existing floor
  const { names: floorNames, phones: floorPhones } = await floorKeys();
  console.log(`  floor holds ${floorNames.size} names / ${floorPhones.size} phones`);
  const dupes = rows.filter((r) => floorNames.has(norm(r.name)) || floorPhones.has(digitsOf(r.phone)));
  rows = rows.filter((r) => !floorNames.has(norm(r.name)) && !floorPhones.has(digitsOf(r.phone)));
  console.log(`  dropped ${dupes.length} already on the floor · ${rows.length} fresh`);

  // 4. split by web presence. No-website leads are the strongest pitch and need
  //    no further proof, so they go straight through. Website leads must EARN a
  //    slot by scoring weak.
  const noSite = rows.filter((r) => !r.website);
  const hasSite = rows.filter((r) => r.website);
  console.log(`  no website: ${noSite.length} · has website: ${hasSite.length}`);

  // Rank no-site by rating, take what we need plus headroom.
  noSite.sort((a, b) => b.rating - a.rating);
  // 50/50 on purpose. A 4.8-star business with NO website is the strongest pitch
  // MMS has, but it can never carry an email (no domain to find one on), so it is
  // a phone-only lead. Weak-site leads come with a confirmed domain and land an
  // email roughly 60% of the time. An even split keeps both channels open.
  const noSiteKeep = noSite.slice(0, Math.min(noSite.length, Math.ceil(TARGET * 0.5)));

  // Score websites until we have enough weak ones to fill the rest.
  const needFromSites = Math.max(0, TARGET - noSiteKeep.length);
  // Only ~17% of live sites score weak (measured on the first 200: 34 weak, 166
  // healthy and correctly dropped), so budget ~7 scored sites per slot needed.
  const siteBudget = Math.min(hasSite.length, Math.max(needFromSites * 7, 200));
  hasSite.sort((a, b) => b.rating - a.rating);
  const siteCandidates = hasSite.slice(0, siteBudget);
  console.log(`\n  scoring ${siteCandidates.length} websites for weakness (need ${needFromSites})...`);
  let scored = 0;
  await pool(siteCandidates, 8, async (r) => {
    const { weak, email } = await scoreSiteCached(r.website);
    r.weak = weak;
    r.email = email;
    if (++scored % 100 === 0) { console.log(`    scored ${scored}/${siteCandidates.length}`); saveScoreCache(); }
  });
  saveScoreCache();
  const weakSites = siteCandidates.filter((r) => r.weak?.length);
  const healthySites = siteCandidates.filter((r) => !r.weak?.length);
  console.log(`  weak sites: ${weakSites.length} · healthy sites dropped (they don't need us): ${healthySites.length}`);

  weakSites.sort((a, b) => (b.weak.length - a.weak.length) || (b.rating - a.rating));
  const siteKeep = weakSites.slice(0, needFromSites);

  let keep = [...noSiteKeep, ...siteKeep].slice(0, TARGET);
  console.log(`\n  selected ${keep.length} (${keep.filter((r) => !r.website).length} no-site, ${keep.filter((r) => r.website).length} weak-site)`);

  // 5. Hunter for the ones with a Google-confirmed domain and still no email.
  const needEmail = keep.filter((r) => r.website && !r.email);
  if (HUNTER && needEmail.length) {
    console.log(`  Hunter domain-search on ${needEmail.length} confirmed domains...`);
    await pool(needEmail, 5, async (r) => { r.email = await hunterEmail(r.website); });
  }

  // 6. place-page detail pass: real city + ZIP, authoritative website check
  if (!NO_DETAIL) {
    // Reuse any place we have already resolved (keyed by map URL), so re-running
    // a metro after a filter change does not re-scrape Google and re-risk the
    // rate limiting.
    const PLACE_FILE = 'scripts/.cache/place-details.json';
    let places = {};
    try { places = JSON.parse(readFileSync(PLACE_FILE, 'utf8')); } catch {}
    let reused = 0;
    for (const r of keep) {
      const hit = places[r.mapsUrl];
      if (hit && hit.city) { Object.assign(r, hit); reused++; }
    }
    if (reused) console.log(`\n  reused ${reused} cached place details`);

    const todo = keep.filter((r) => !r.city);
    console.log(`  detail pass on ${todo.length} place pages (real city + ZIP)...`);
    const { blocked } = await detailPass(todo, { onProgress: (d, t, b) => console.log(`    ${d}/${t}${b ? ` (${b} blocked)` : ''}`) });
    const withCity = keep.filter((r) => r.city).length;
    console.log(`  resolved a real city for ${withCity}/${keep.length}${blocked ? ` · ${blocked} blocked by Google` : ''}`);
    // If the place page proves a website the feed missed, that lead is no longer
    // a "no website" pitch. Demote it rather than ship a false claim.
    const falseNoSite = keep.filter((r) => !r.website && r.hasWebsiteConfirmed);
    if (falseNoSite.length) {
      console.log(`  ⚠️ ${falseNoSite.length} "no website" leads actually have one — reclassified`);
      for (const r of falseNoSite) { r.website = r.websiteConfirmed; r.weak = ['website found on their profile, not scored']; }
    }
    for (const r of keep) {
      if (r.city) places[r.mapsUrl] = { city: r.city, state: r.state, zip: r.zip, addressFull: r.addressFull, phoneE164: r.phoneE164, detailName: r.detailName, hasWebsiteConfirmed: r.hasWebsiteConfirmed, websiteConfirmed: r.websiteConfirmed, detailOk: true };
    }
    writeFileSync(PLACE_FILE, JSON.stringify(places));
    writeFileSync(DETAIL_CACHE, JSON.stringify(keep));
  }

  const owner = await resolveOwner(OWNER_ARG || metro.owner);
  return buildAndReport(keep, owner);
}

/** Turn the selected businesses into outbound_leads rows, report, and optionally write. */
async function buildAndReport(keep, owner) {
  // Re-validate every email, including ones that came from the cache, so the
  // gate cannot be bypassed by a resumed run.
  let rejected = 0;
  for (const r of keep) {
    if (r.email && !emailAcceptable(r.email, r.website)) {
      r.rejectedEmail = r.email;
      r.email = null;
      rejected++;
    }
  }
  if (rejected) console.log(`  ⚠️ dropped ${rejected} emails that belong to another company's domain`);

  // 7. build the rows.
  //    source drives the cockpit's heat tier and ammo card:
  //      'website-mining' + notes starting "WEBSITE: none - ..." → no_website (+170) + gold ammo card
  //      'sourced' + a website                                    → normal, audit-driven heat
  const out = keep.map((r) => {
    const city = r.city || metro.primaryCity;
    const state = r.state || metro.state;
    const stars = `${r.rating.toFixed(1)}★ on Google`;
    const cat = r.category || r.trade;
    let notes, source;
    if (!r.website) {
      source = 'website-mining';
      notes = `WEBSITE: none - ${stars} but no website on their Google Business Profile. ${cat} in ${city}, ${state}. (${r.mapsUrl})`;
    } else {
      source = 'sourced';
      notes = `${cat} · ${city}, ${state} · ${stars} · needs us: ${r.weak.join(', ')} (${r.mapsUrl})`;
    }
    return {
      business_name: String(r.detailName || r.name).slice(0, 200),
      contact_name: null,
      phone: String(r.phoneE164 || toE164(r.phone)).slice(0, 40),
      email: r.email ? String(r.email).slice(0, 200) : null,
      website: r.website ? String(r.website).slice(0, 300) : null,
      niche: nicheFor(r.category, r.trade),
      city: String(city).slice(0, 120),
      state,
      status: 'new',
      source,
      owner_rep_id: owner.id,
      dnc_checked: false,
      notes: notes.slice(0, 2000),
    };
  });

  // ── report ──
  const withEmail = out.filter((r) => r.email).length;
  const cities = {};
  out.forEach((r) => { cities[r.city] = (cities[r.city] || 0) + 1; });
  const niches = {};
  out.forEach((r) => { niches[r.niche] = (niches[r.niche] || 0) + 1; });
  console.log(`\n── Quality ──`);
  console.log(`  ${out.length} leads · every one has a phone and a ${RATING_FLOOR}+ Google rating`);
  console.log(`  no website (strongest pitch): ${out.filter((r) => !r.website).length}`);
  console.log(`  weak/outdated website:        ${out.filter((r) => r.website).length}`);
  console.log(`  with email: ${withEmail}/${out.length} (${Math.round((withEmail / out.length) * 100)}%)`);
  console.log(`  cities: ${Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x.join(' ')).join(' · ')}`);
  console.log(`  niches: ${Object.entries(niches).sort((a, b) => b[1] - a[1]).map((x) => x.join(' ')).join(' · ')}`);
  console.log(`  owner: ${owner.name}${owner.id ? '' : ' (REP NOT FOUND — owner_rep_id null)'}`);
  console.log(`\n  sample:`);
  for (const r of out.slice(0, 10)) {
    console.log(`   ${r.email ? '✉' : ' '} ${r.business_name} · ${r.phone} · ${r.city} · ${r.website ? 'weak site' : 'NO SITE'} · ${r.email || 'no email'}`);
  }

  mkdirSync('scripts/.cache', { recursive: true });
  writeFileSync(`scripts/.cache/maps-${METRO_KEY}-rows.json`, JSON.stringify(out, null, 1));
  console.log(`\n  rows written to scripts/.cache/maps-${METRO_KEY}-rows.json for inspection`);

  if (!APPLY) { console.log(`\nDRY RUN — nothing written. Re-run with --apply.\n`); return; }
  const n = await insertRows(out);
  console.log(`\nAPPLIED — ${n} leads on the outbound floor, assigned to ${owner.name}.\n`);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
