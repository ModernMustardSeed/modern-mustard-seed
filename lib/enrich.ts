/**
 * Prospect enrichment: given a business name and city, find THEIR website, phone,
 * and contact email. Rewritten 2026-07-22 after "Find site & email" returned
 * walmart.com for "Super Roofers", acehardware.com for a law office, and an LGBTQ
 * community center for a Las Vegas locksmith.
 *
 * THE BUG WAS ONE LINE, TWICE: both place lookups ended in `matches ?? results[0]`,
 * so when nothing matched the business name they returned whatever happened to be
 * nearest. A 40km radius around Arnold, Missouri puts a Walmart Supercenter at the
 * top of almost any query. The name matcher underneath was also a bare substring
 * test, and `'anything'.includes('')` is true, so a result with no name always
 * "matched".
 *
 * THE RULE NOW: NEVER GUESS. Every candidate must earn its place through a scored
 * name match with a hard floor, a domain that is plausibly theirs, and a page that
 * actually corroborates the business. Anything that cannot clear the bar is dropped
 * and reported as a skip. A blank field costs Sarah ten seconds. A wrong one costs
 * her an email to the wrong company.
 *
 * Sources: Foursquare Places (name + city), OpenStreetMap/Nominatim, and Hunter.io
 * (domain-search by company, plus email-verifier). Everything degrades gracefully:
 * with no keys it still runs OSM + a scrape, and it still refuses to guess.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const FSQ_SEARCH = 'https://places-api.foursquare.com/places/search';
const FSQ_VERSION = '2025-06-17';
const HUNTER_DOMAIN = 'https://api.hunter.io/v2/domain-search';
const HUNTER_VERIFY = 'https://api.hunter.io/v2/email-verifier';
// A polite, identifying User-Agent is required by Nominatim's usage policy.
const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';

/** Below this Dice score on business-name tokens, a candidate is a stranger. */
const NAME_FLOOR = 0.62;

/**
 * A hard wall-clock budget for the whole lookup, because the route dies at 45s and a
 * half-finished HTTP request is indistinguishable from a broken button. One dead host
 * used to cost 46 seconds on its own: 9s to time out the verify fetch, then 36 more
 * scraping four contact pages on the same corpse. Every fetch now asks the budget how
 * long it is allowed to take, and stages are skipped rather than run past the end.
 */
const BUDGET_MS = 34_000;
type Budget = { until: number };
const newBudget = (): Budget => ({ until: Date.now() + BUDGET_MS });
const left = (b: Budget) => b.until - Date.now();
/** Per-request timeout, clamped to whatever time is actually left. */
const cap = (b: Budget, want: number) => Math.max(1200, Math.min(want, left(b)));

export type EnrichResult = {
  website: string | null;
  email: string | null;
  phone: string | null;
  sources: string[];
  /** How sure we are about the website. null means we found nothing we trust. */
  confidence: 'high' | 'medium' | null;
  /** Plain-English reasons we threw candidates away, for the rep to read. */
  skipped: string[];
};

/* ────────────────────────────── name matching ────────────────────────────── */

/** Legal and filler words that carry no identity. */
const NOISE = new Set([
  'the', 'a', 'an', 'of', 'and', 'at', 'for', 'in', 'on', 'llc', 'l', 'inc', 'incorporated',
  'co', 'corp', 'corporation', 'ltd', 'limited', 'lp', 'llp', 'pllc', 'pc', 'pa', 'dba',
]);

/**
 * Words that describe an INDUSTRY rather than a business. Two companies sharing only
 * these is not a match: "Dubel Dentistry" and "Dayton Pediatric Dentistry" have
 * nothing in common but the trade.
 */
const GENERIC = new Set([
  'auto', 'automotive', 'repair', 'service', 'services', 'shop', 'store', 'company', 'group',
  'center', 'centre', 'clinic', 'hospital', 'dental', 'dentistry', 'dds', 'md', 'medical',
  'health', 'care', 'law', 'legal', 'office', 'offices', 'attorney', 'attorneys', 'firm',
  'roofing', 'roofers', 'roof', 'plumbing', 'plumber', 'hvac', 'heating', 'cooling', 'air',
  'electric', 'electrical', 'construction', 'contracting', 'contractors', 'builders',
  'landscaping', 'lawn', 'cleaning', 'cleaners', 'salon', 'spa', 'barber', 'barbershop',
  'nails', 'hair', 'beauty', 'cafe', 'coffee', 'restaurant', 'grill', 'bar', 'kitchen',
  'bakery', 'pizza', 'deli', 'diner', 'towing', 'tow', 'storage', 'insurance', 'realty',
  'real', 'estate', 'properties', 'pest', 'control', 'flooring', 'floors', 'paint',
  'painting', 'glass', 'tire', 'tires', 'wash', 'detailing', 'fitness', 'gym', 'studio',
  'veterinary', 'vet', 'animal', 'pet', 'pets', 'locksmith', 'security', 'solutions',
  'restoration', 'remodeling', 'kitchen', 'bath', 'window', 'windows', 'door', 'doors',
  'super', 'best', 'quality', 'affordable', 'professional', 'american', 'national', 'us',
]);

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toks(s: string): string[] {
  return norm(s).split(' ').filter((t) => t && !NOISE.has(t));
}

/** Levenshtein, capped: only used to forgive one typo in a long token. */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length === b.length) { i++; j++; }
    else if (a.length > b.length) i++;
    else j++;
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * How much two business names agree, 0 to 1 (Dice coefficient over identity tokens).
 * Sharing only industry words is explicitly not agreement.
 */
function nameScore(a: string, b: string): { score: number; sharedDistinctive: boolean } {
  const A = toks(a), B = toks(b);
  if (!A.length || !B.length) return { score: 0, sharedDistinctive: false };
  const used = new Set<number>();
  let hits = 0, distinctive = 0;
  for (const t of A) {
    for (let i = 0; i < B.length; i++) {
      if (used.has(i)) continue;
      if (t === B[i] || near(t, B[i])) {
        used.add(i); hits++;
        if (!GENERIC.has(t)) distinctive++;
        break;
      }
    }
  }
  return { score: (2 * hits) / (A.length + B.length), sharedDistinctive: distinctive > 0 };
}

/** The bar every candidate has to clear to be considered the same business at all. */
export function isSameBusiness(lead: string, candidate: string): boolean {
  const { score, sharedDistinctive } = nameScore(lead, candidate);
  if (score >= 0.85) return true;             // near-identical names
  return score >= NAME_FLOOR && sharedDistinctive; // otherwise a real shared word is required
}

/* ────────────────────────────── domain sanity ────────────────────────────── */

export function hostOf(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Domains that are never a small business's own website: directories, social,
 * marketplaces, national chains, and the marketing sites of website vendors.
 *
 * Deliberately NOT here: wixsite.com, godaddysites.com, business.site, square.site,
 * myshopify.com, weebly.com. Those ARE a lot of Main Street businesses' only site.
 */
const NOT_THEIR_SITE = [
  // directories and aggregators
  'yelp.com', 'yellowpages.com', 'yp.com', 'chambermaster.com', 'chamberofcommerce.com',
  'mapquest.com', 'tripadvisor.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com',
  'thumbtack.com', 'houzz.com', 'porch.com', 'nextdoor.com', 'foursquare.com', 'manta.com',
  'bizapedia.com', 'dnb.com', 'zoominfo.com', 'crunchbase.com', 'indeed.com', 'glassdoor.com',
  'healthgrades.com', 'zocdoc.com', 'vitals.com', 'avvo.com', 'justia.com', 'findlaw.com',
  'lawyers.com', 'martindale.com', 'apartments.com', 'zillow.com', 'realtor.com', 'trulia.com',
  // ordering and reservations
  'opentable.com', 'doordash.com', 'ubereats.com', 'grubhub.com', 'seamless.com', 'slicelife.com',
  'menufy.com', 'chownow.com', 'clover.com', 'resy.com',
  // social
  'facebook.com', 'fb.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com', 'pinterest.com', 'threads.net',
  // search and maps
  'google.com', 'goo.gl', 'bing.com', 'apple.com',
  // vendor marketing sites (their own product pages, not a customer's site)
  'wix.com', 'squarespace.com', 'godaddy.com', 'shopify.com', 'linktr.ee',
  // national chains that swallow local queries
  'walmart.com', 'target.com', 'costco.com', 'homedepot.com', 'lowes.com', 'acehardware.com',
  'autozone.com', 'oreillyauto.com', 'napaonline.com', 'advanceautoparts.com', 'jiffylube.com',
  'midas.com', 'meineke.com', 'firestonecompleteautocare.com', 'discounttire.com',
  'greatclips.com', 'supercuts.com', 'sportclips.com', 'subway.com', 'mcdonalds.com',
  'starbucks.com', 'dominos.com', 'pizzahut.com', 'papajohns.com', 'dunkindonuts.com',
  'usps.com', 'ups.com', 'fedex.com', 'statefarm.com', 'allstate.com', 'geico.com',
  'bettervet.com', 'vca.com', 'banfield.com', 'aspencare.com', 'aspendental.com',
];

/**
 * Website builders whose CUSTOMERS live on a subdomain. The apex is the vendor's own
 * marketing site and is useless, but jumperweldingtexas.weebly.com is a real welder's
 * real website. Blocking these outright would have thrown away legitimate small
 * businesses, which is the same class of mistake as saving walmart.com.
 */
const VENDOR_APEX = ['weebly.com', 'wordpress.com', 'wixsite.com', 'myshopify.com', 'square.site', 'business.site', 'godaddysites.com'];

/** Country code TLDs a US lead should never resolve to. */
const FOREIGN_TLD = /\.(ca|co\.uk|uk|au|nz|ie|in|de|fr|es|it|nl|se|no|dk|pl|br|mx|za|ph|sg|my)$/i;

export function badDomain(host: string): string | null {
  if (!host) return 'not a usable URL';
  if (VENDOR_APEX.includes(host)) return `${host} is the website builder's own page, not a customer site`;
  if (VENDOR_APEX.some((d) => host.endsWith(`.${d}`))) return null; // a customer's own subdomain
  if (NOT_THEIR_SITE.some((d) => host === d || host.endsWith(`.${d}`))) {
    return `${host} is a directory, chain, or social page, not their own site`;
  }
  if (FOREIGN_TLD.test(host)) return `${host} is a foreign domain for a US business`;
  return null;
}

/**
 * Does this domain look like it belongs to THIS business by name? Asymmetric on
 * purpose: "Walmart Auto Care Center" owns walmart.com, but "Prefix Coffee" does not
 * own starbucks.com. A Dice score would punish the long name and get this backwards.
 */
export function domainMatchesName(business: string, host: string): boolean {
  const label = domainLabel(host);
  if (!label) return false;
  const t = toks(business);
  const joined = t.join('');
  if (joined && (joined === label || joined.includes(label) || label.includes(joined))) return true;
  return t.some((tok) => !GENERIC.has(tok) && tok.length > 3 && label.includes(tok));
}

/** The registrable label, e.g. "globalrestoration" from "www.globalrestoration.net". */
export function domainLabel(host: string): string {
  const parts = host.split('.');
  return parts.length > 1 ? parts[parts.length - 2] : host;
}

/* ──────────────────────── candidate sources ──────────────────────── */

type Candidate = {
  name: string;
  website: string | null;
  phone: string | null;
  locality: string | null;
  source: string;
};

async function geocodeCenter(city: string, b: Budget): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(city)}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(cap(b, 8000)),
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!arr.length) return null;
    return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
  } catch {
    return null;
  }
}

interface FsqPlace {
  name?: string;
  tel?: string;
  website?: string;
  location?: { locality?: string; region?: string; country?: string };
}

/** Foursquare around the city. Returns EVERY candidate; scoring happens upstream. */
async function fromFoursquare(business: string, center: { lat: number; lon: number }, b: Budget): Promise<Candidate[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return [];
  const params = new URLSearchParams({
    query: business,
    ll: `${center.lat},${center.lon}`,
    radius: '40000',
    limit: '10',
    fields: 'name,tel,website,location',
  });
  try {
    const res = await fetch(`${FSQ_SEARCH}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'X-Places-Api-Version': FSQ_VERSION, Accept: 'application/json' },
      signal: AbortSignal.timeout(cap(b, 10000)),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: FsqPlace[] };
    return (json.results ?? []).map((r) => ({
      name: r.name ?? '',
      website: r.website ?? null,
      phone: r.tel ?? null,
      locality: r.location?.locality ?? null,
      source: 'foursquare',
    }));
  } catch {
    return [];
  }
}

/** OpenStreetMap. Only rows that actually name a business are worth anything. */
async function fromOsm(business: string, city: string | null, b: Budget): Promise<Candidate[]> {
  const q = [business, city].filter(Boolean).join(', ');
  try {
    const res = await fetch(`${NOMINATIM}?format=json&limit=5&extratags=1&namedetails=1&q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(cap(b, 8000)),
    });
    if (!res.ok) return [];
    const arr = (await res.json()) as Array<{
      display_name?: string;
      namedetails?: Record<string, string>;
      extratags?: Record<string, string>;
      type?: string;
    }>;
    return arr
      // A city, road, or county node is not a business, and its display_name will
      // happily half-match a business named after the town.
      .filter((r) => !['city', 'town', 'village', 'administrative', 'residential', 'road', 'county', 'state'].includes(r.type ?? ''))
      .map((r) => ({
        name: r.namedetails?.name ?? r.display_name?.split(',')[0] ?? '',
        website: r.extratags?.website || r.extratags?.['contact:website'] || r.extratags?.url || null,
        phone: r.extratags?.phone || r.extratags?.['contact:phone'] || null,
        locality: null,
        source: 'osm',
        email: r.extratags?.email || r.extratags?.['contact:email'] || null,
      })) as Candidate[];
  } catch {
    return [];
  }
}

/**
 * Hunter's domain-search by COMPANY NAME. This is the part of Sarah's paid key that
 * was never being used: it resolves a business name straight to a domain. It is not
 * geography-aware though (it offered superroofers.ca for a Missouri roofer), so its
 * answer still goes through the same name and domain gates as everyone else.
 */
async function fromHunterCompany(business: string, b: Budget): Promise<Candidate[]> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${HUNTER_DOMAIN}?company=${encodeURIComponent(business)}&limit=5&api_key=${key}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(cap(b, 10000)),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { domain?: string; organization?: string; country?: string } };
    const d = json.data;
    if (!d?.domain) return [];
    return [{
      name: d.organization || business,
      website: `https://${d.domain}`,
      phone: null,
      locality: null,
      source: 'hunter:company',
    }];
  } catch {
    return [];
  }
}

/* ──────────────────────── site verification ──────────────────────── */

const digits = (s: string) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

/**
 * Open the candidate site and prove it belongs to this business. Cheap, free, and
 * the single most valuable check here: it is what separates "a domain with their
 * words in it" from "their website".
 */
async function verifySite(
  url: string,
  business: string,
  city: string | null,
  phone: string | null,
  b: Budget,
): Promise<{ ok: boolean; strong: boolean; reachable: boolean; why: string }> {
  const host = hostOf(url);
  // A domain built out of their name is already good evidence.
  const labelMatch = domainMatchesName(business, host);

  let html = '';
  try {
    const res = await fetch(url.startsWith('http') ? url : `https://${url}`, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(cap(b, 9000)),
    });
    if (!res.ok) {
      return labelMatch
        ? { ok: true, strong: false, reachable: false, why: `domain matches the name but the site returned ${res.status}` }
        : { ok: false, strong: false, reachable: false, why: `site returned ${res.status} and the domain does not match the name` };
    }
    html = (await res.text()).slice(0, 300_000);
  } catch {
    return labelMatch
      ? { ok: true, strong: false, reachable: false, why: 'domain matches the name but the site did not respond' }
      : { ok: false, strong: false, reachable: false, why: 'site did not respond and the domain does not match the name' };
  }

  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const flat = norm(text);
  // The phone number on the page is the strongest possible proof of identity.
  const phoneHit = Boolean(phone && digits(phone).length >= 10 && digits(text).includes(digits(phone)));
  const distinctive = toks(business).filter((t) => !GENERIC.has(t) && t.length > 2);
  const nameHit = distinctive.length > 0 && distinctive.every((t) => flat.includes(t));
  const someNameHit = distinctive.some((t) => flat.includes(t));
  const cityHit = Boolean(city && flat.includes(norm(city.split(',')[0])));

  if (phoneHit) return { ok: true, strong: true, reachable: true, why: 'their phone number is on the page' };
  if (nameHit && (cityHit || labelMatch)) return { ok: true, strong: true, reachable: true, why: 'the page carries their name and location' };
  if (nameHit) return { ok: true, strong: false, reachable: true, why: 'the page carries their name' };
  if (labelMatch && someNameHit) return { ok: true, strong: false, reachable: true, why: 'the domain and page partly match their name' };
  return { ok: false, strong: false, reachable: true, why: 'the page never mentions this business' };
}

/* ────────────────────────────── email ────────────────────────────── */

const EMAIL_BLOCK =
  /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|sentry\.io|googleapis|cloudflare|schema\.org|w3\.org|godaddy\.com|squarespace\.com|shopify\.com|wordpress\.|jquery|bootstrap|@2x|no-?reply|donotreply|calendar\.google\.com|@group\.|sentry-next|\.png@|u003e/i;
const ROLE_PREFIX = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi|team|mail)@/i;
const FREEMAIL = /^(gmail|yahoo|hotmail|outlook|aol|icloud|comcast|att|verizon|msn|live|me|mac|protonmail|ymail|sbcglobal|bellsouth|cox|charter|earthlink)\./i;

async function emailsFromPage(url: string, b: Budget): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(cap(b, 7000)),
    });
    if (!res.ok) return [];
    let html = (await res.text()).slice(0, 400_000);
    html = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*\[at\]\s*/gi, '@').replace(/\s*\(at\)\s*/gi, '@');
    const out: string[] = [];
    for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) out.push(m[1]);
    for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) out.push(m[0]);
    return out;
  } catch {
    return [];
  }
}

/**
 * An email is only theirs if it lives on their own domain, or it was found on their
 * own verified site and is a normal consumer inbox (a huge share of Main Street
 * businesses run on gmail, and those addresses are perfectly real).
 */
function acceptableEmail(email: string, siteHost: string): boolean {
  const dom = email.split('@')[1] ?? '';
  if (!dom) return false;
  if (dom === siteHost || dom.endsWith(`.${siteHost}`) || siteHost.endsWith(`.${dom}`)) return true;
  return FREEMAIL.test(dom);
}

function pickBestEmail(emails: string[], siteHost: string): string | null {
  const clean = Array.from(new Set(emails.map((e) => e.toLowerCase().trim())))
    .filter((e) => !EMAIL_BLOCK.test(e) && e.length <= 100 && /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(e))
    .filter((e) => acceptableEmail(e, siteHost));
  if (!clean.length) return null;
  clean.sort((a, b) => {
    const da = (a.split('@')[1] === siteHost ? 1 : 0), db = (b.split('@')[1] === siteHost ? 1 : 0);
    if (da !== db) return db - da;
    const ra = ROLE_PREFIX.test(a) ? 1 : 0, rb = ROLE_PREFIX.test(b) ? 1 : 0;
    return rb - ra;
  });
  return clean[0];
}

async function scrapeEmail(website: string, b: Budget): Promise<string | null> {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = '';
  try { origin = new URL(base).origin; } catch { return null; }
  const siteHost = hostOf(base);
  const pages = [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`];
  const collected: string[] = [];
  for (const page of pages) {
    // Leave room for the Hunter lookup and the verifier rather than burning the whole
    // budget walking contact pages one at a time.
    if (left(b) < 9000) break;
    collected.push(...(await emailsFromPage(page, b)));
    const best = pickBestEmail(collected, siteHost);
    if (best && (best.split('@')[1] === siteHost || ROLE_PREFIX.test(best))) return best;
  }
  return pickBestEmail(collected, siteHost);
}

/** Hunter domain-search, run only against a domain we have already verified. */
async function hunterEmail(domain: string, b: Budget): Promise<string | null> {
  const key = process.env.HUNTER_API_KEY;
  if (!key || !domain) return null;
  try {
    const res = await fetch(`${HUNTER_DOMAIN}?domain=${encodeURIComponent(domain)}&limit=10&api_key=${key}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(cap(b, 10000)),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { emails?: Array<{ value: string; type: string; confidence: number }> } };
    const emails = (json.data?.emails ?? []).filter((e) => e?.value && !EMAIL_BLOCK.test(e.value));
    if (!emails.length) return null;
    emails.sort((a, b) => {
      const ga = a.type === 'generic' ? 1 : 0, gb = b.type === 'generic' ? 1 : 0;
      if (ga !== gb) return gb - ga;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    });
    return emails[0].value.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Hunter's email-verifier. Sarah is paying for it and it is the difference between
 * sending outreach and bouncing it. "risky" is kept on purpose: it usually means a
 * catch-all server, which most small businesses run.
 */
async function verifyEmail(email: string, b: Budget): Promise<{ ok: boolean; status: string }> {
  const key = process.env.HUNTER_API_KEY;
  // Out of time is not the same as undeliverable: keep the address, skip the check.
  if (!key || left(b) < 2500) return { ok: true, status: 'unchecked' };
  try {
    const res = await fetch(`${HUNTER_VERIFY}?email=${encodeURIComponent(email)}&api_key=${key}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(cap(b, 10000)),
    });
    if (!res.ok) return { ok: true, status: 'unchecked' };
    const json = (await res.json()) as { data?: { status?: string; result?: string; disposable?: boolean } };
    const status = json.data?.status || json.data?.result || 'unknown';
    if (json.data?.disposable) return { ok: false, status: 'disposable' };
    if (status === 'undeliverable' || status === 'invalid') return { ok: false, status };
    return { ok: true, status };
  } catch {
    return { ok: true, status: 'unchecked' };
  }
}

/* ────────────────────────────── the pipeline ────────────────────────────── */

export async function enrichProspect(input: {
  business: string;
  city: string | null;
  website?: string | null;
  phone?: string | null;
}): Promise<EnrichResult> {
  const sources: string[] = [];
  const skipped: string[] = [];
  const existingSite = input.website?.trim() || null;
  let website = existingSite;
  let phone = input.phone?.trim() || null;
  let email: string | null = null;
  let confidence: EnrichResult['confidence'] = existingSite ? 'high' : null;

  const budget = newBudget();

  const center = input.city ? await geocodeCenter(input.city, budget) : null;
  const [fsq, osm, hunter] = await Promise.all([
    center ? fromFoursquare(input.business, center, budget) : Promise.resolve([]),
    fromOsm(input.business, input.city, budget),
    existingSite ? Promise.resolve([]) : fromHunterCompany(input.business, budget),
  ]);

  // 1. Keep only candidates that are plausibly the same business by NAME. This is
  //    where walmart.com died: "Super Roofers" scores 0 against "Walmart Supercenter",
  //    and there is no longer a `?? results[0]` to fall back on.
  const all = [...fsq, ...osm, ...hunter];
  const matched = all.filter((c) => c.name && isSameBusiness(input.business, c.name));
  if (all.length && !matched.length) {
    const nearest = all.slice(0, 3).map((c) => c.name).filter(Boolean).join(', ');
    skipped.push(`No listing matched the name. Closest were: ${nearest || 'nothing usable'}.`);
  }

  // 2. Phone can come from any name-matched listing; it is low risk and easy to eyeball.
  if (!phone) {
    const withPhone = matched.find((c) => c.phone);
    if (withPhone?.phone) { phone = withPhone.phone; sources.push(`${withPhone.source}:phone`); }
  }

  // 3. Website: every matched candidate's URL runs the domain gate, then the page
  //    itself has to corroborate the business before we will save it.
  let siteReachable = true;
  if (!website) {
    const seen = new Set<string>();
    for (const c of matched) {
      if (!c.website) continue;
      if (left(budget) < 6000) { skipped.push('Ran out of time before every candidate site could be checked.'); break; }
      const host = hostOf(c.website);
      if (!host || seen.has(host)) continue;
      seen.add(host);
      const bad = badDomain(host);
      if (bad) { skipped.push(`Ignored ${bad}.`); continue; }
      const v = await verifySite(c.website, input.business, input.city, phone, budget);
      if (!v.ok) { skipped.push(`Ignored ${host}: ${v.why}.`); continue; }
      website = c.website;
      siteReachable = v.reachable;
      confidence = v.strong ? 'high' : 'medium';
      sources.push(`${c.source}:site(${v.why})`);
      break;
    }
  }

  // 4. Email, and only ever from a website we trust.
  if (website) {
    const host = hostOf(website);
    const osmEmail = (matched.find((c) => (c as Candidate & { email?: string }).email) as (Candidate & { email?: string }) | undefined)?.email;
    if (osmEmail && acceptableEmail(osmEmail.toLowerCase(), host)) {
      email = osmEmail.toLowerCase(); sources.push('osm:email');
    }
    // Never scrape a host that just failed to answer. That is where the 46-second
    // lookup came from: four contact-page fetches, each timing out on a dead server.
    if (!email && siteReachable) {
      const scraped = await scrapeEmail(website, budget);
      if (scraped) { email = scraped; sources.push('site'); }
    } else if (!email) {
      skipped.push('Their site did not respond, so it was not scraped for an email.');
    }
    if (!email) {
      const h = await hunterEmail(host, budget);
      if (h) { email = h; sources.push('hunter'); }
    }
    if (email) {
      const v = await verifyEmail(email, budget);
      if (!v.ok) { skipped.push(`Dropped ${email}: Hunter says ${v.status}.`); email = null; }
      else if (v.status !== 'unchecked') sources.push(`verified:${v.status}`);
    }
  } else if (!existingSite) {
    skipped.push('No website we could confirm belongs to them, so no email was guessed.');
  }

  return { website, email, phone, sources, confidence, skipped };
}
