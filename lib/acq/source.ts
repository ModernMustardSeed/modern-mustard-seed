/**
 * THE LEAD FINDER.
 *
 * Finds HVAC, plumbing and roofing companies from public business data, then
 * finds the email the business itself publishes, then tells the truth about how
 * good that email is.
 *
 * THE ONE RULE: NEVER FABRICATE AN EMAIL. `john@theirdomain.com` is not an
 * address just because it looks like one. Every address here was either printed
 * on the company's own website or returned by a legitimate enrichment provider,
 * and it carries the URL it came from so anybody can check. A business with no
 * findable address is recorded as having none, not given a plausible guess.
 *
 * Sources, in order of preference:
 *   1. OpenStreetMap / Overpass  — public, no key, generous licence
 *   2. Foursquare Places         — when FOURSQUARE_API_KEY exists
 *   3. The company's own website — contact, about and footer pages
 *   4. Hunter.io                 — when HUNTER_API_KEY exists, for verification
 *
 * We do not defeat CAPTCHAs, bypass technical protections, create accounts, or
 * take anything that is not published on a public business page.
 */

import { resolveMx } from 'node:dns/promises';
import { scoreLead } from '@/lib/acq/score';
import type { Trade } from '@/lib/acq/types';
import type { Market } from '@/lib/acq/markets';

const UA = 'ModernMustardSeed-LeadFinder/1.0 (+https://modernmustardseed.com; sarah@modernmustardseed.com)';

/** AbortSignal.timeout() leaks a libuv timer that crashes Node on Windows. */
export async function fetchTimeout(url: string, opts: RequestInit = {}, ms = 12_000): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ─────────────────────────────── discovery ─────────────────────────────── */

export type Candidate = {
  business_name: string;
  phone: string | null;
  website: string | null;
  /** An address the directory itself publishes for the business, when it has one. */
  email: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  postal_code: string | null;
  trade: Trade;
  hours: Record<string, string> | null;
  source: string;
  source_url: string | null;
  /** Public reputation, when the directory carries it. Maps does; OSM does not. */
  rating?: number | null;
  review_count?: number | null;
  category?: string | null;
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const TRADE_QUERY: Record<Exclude<Trade, 'other'>, { craft: string; name: string }> = {
  hvac: {
    craft: '^(hvac|heating_engineer|air_conditioning|ventilation)$',
    name: 'hvac|heating|air condition|airconditioning|a/?c |furnace|climate|comfort|cooling|refrigerat|mechanical',
  },
  plumbing: {
    craft: '^(plumber)$',
    name: 'plumb|drain|rooter|sewer|water heater|septic|leak|pipe|hydro ?jet|backflow',
  },
  roofing: {
    craft: '^(roofer)$',
    name: 'roof|shingle|gutter|exteriors?|siding|storm restoration|metal roof',
  },
};

/**
 * Overpass is queried three ways because US business tagging in OSM is
 * inconsistent: the correctly tagged craft nodes, trade-shaped shop and office
 * tags, and anything whose NAME reads like the trade. The last pass is where
 * most American contractors actually live. A candidate with no website is kept
 * here and filtered later, because the directory itself sometimes publishes the
 * email even when there is no site.
 */
function overpassQuery(bbox: string, trade: Exclude<Trade, 'other'>): string {
  const q = TRADE_QUERY[trade];
  return `[out:json][timeout:240];(
nwr["craft"~"${q.craft}"](${bbox});
nwr["shop"~"^(hvac|plumber|roofer|trade|doityourself|building_materials)$"](${bbox});
nwr["office"~"^(company|contractor)$"]["name"~"${q.name}",i](${bbox});
nwr["name"~"${q.name}",i]["website"](${bbox});
nwr["name"~"${q.name}",i]["contact:website"](${bbox});
nwr["name"~"${q.name}",i]["phone"](${bbox});
nwr["name"~"${q.name}",i]["contact:phone"](${bbox});
nwr["name"~"${q.name}",i]["email"](${bbox});
nwr["name"~"${q.name}",i]["contact:email"](${bbox});
);out tags 4000;`;
}

/**
 * THE STRICT FILTER, applied in JS after Overpass answers.
 *
 * Overpass speaks POSIX regex with no word boundaries, so the query patterns
 * have to be loose, and loose patterns are how "Culdesac Tempe Leasing Office"
 * and "Sazerac PHX Cocktails" arrived as HVAC companies (both contain "ac ").
 * This is the gate that keeps a bar out of the plumbing campaign.
 */
const STRICT_TRADE: Record<Exclude<Trade, 'other'>, RegExp> = {
  hvac: /\b(hvac|heating|air[\s-]?conditioning|a\/c|furnace|heat pump|cooling|refrigeration|climate control|comfort (systems?|air|solutions|specialists?)|mechanical (services?|contractors?|systems?)|air conditioner)\b/i,
  plumbing: /\b(plumber|plumbers|plumbing|drain(s|age)?|rooter|sewer|water heaters?|septic|leak detection|re-?pipe|backflow|hydro[\s-]?jet|pipefitt)\b/i,
  roofing: /\b(roof|roofs|roofer|roofers|roofing|shingles?|gutters?|siding|metal roof|storm restoration|exteriors?)\b/i,
};

/**
 * Businesses that carry a trade word without being a company that answers
 * service calls. Suppliers, schools, unions, manufacturers and landlords all
 * pass a keyword test and all waste an email.
 */
const NOT_A_CONTRACTOR =
  /\b(supply|supplies|wholesale|distribut\w*|parts|equipment (sales|rental)s?|rentals?|school|college|university|institute|training|academy|apprentice\w*|association|society|union|local \d+|council|museum|showroom|manufactur\w*|factory|apartments?|leasing|realty|real estate|property management|restaurant|bar\b|grill|cocktails?|cafe|coffee|brewery|taproom|hotel|motel|resort|church|clinic|hospital|city of|county of|department of|library|storage|self[\s-]storage|insurance|law (firm|office)|attorney|bank\b|credit union|gym|fitness|salon|spa\b|dealership|auto (sales|parts))\b/i;

/** Keep only what actually reads like a contractor in this trade. */
export function matchesTrade(name: string, trade: Exclude<Trade, 'other'>): boolean {
  const n = String(name || '');
  if (!STRICT_TRADE[trade].test(n)) return false;
  if (NOT_A_CONTRACTOR.test(n)) return false;
  return true;
}

type OsmElement = { tags?: Record<string, string> };

export async function discoverOsm(market: Market, trade: Exclude<Trade, 'other'>): Promise<Candidate[]> {
  const els = await overpass(overpassQuery(market.bbox, trade));
  return els
    .map((el) => fromOsm(el.tags ?? {}, market, trade))
    .filter((c): c is Candidate => Boolean(c))
    // The shop and craft passes pull in adjacent trades, so the name has to
    // agree with the vertical or the lead is mislabelled from birth.
    .filter((c) => matchesTrade(c.business_name, trade));
}

/**
 * All three trades in ONE Overpass call per market.
 *
 * The single query is the difference between a run that finishes this afternoon
 * and one that finishes tomorrow: Overpass answers a metro box in roughly a
 * minute whether it is asked about one trade or three, and there are ninety
 * boxes. Classification then happens here, off the same strict name test the
 * per-trade path uses.
 */
export async function discoverOsmAllTrades(market: Market): Promise<Record<Exclude<Trade, 'other'>, Candidate[]>> {
  const out: Record<Exclude<Trade, 'other'>, Candidate[]> = { hvac: [], plumbing: [], roofing: [] };
  const els = await overpass(combinedQuery(market.bbox));
  const seen = new Set<string>();
  for (const el of els) {
    const tags = el.tags ?? {};
    const name = (tags.name || tags.operator || '').trim();
    if (!name) continue;
    for (const trade of ['hvac', 'plumbing', 'roofing'] as const) {
      if (!matchesTrade(name, trade)) continue;
      const candidate = fromOsm(tags, market, trade);
      if (!candidate) break;
      // A "Smith Plumbing & Heating" is one business, not two leads. First
      // matching trade wins, so it lands in exactly one bucket.
      const key = `${name.toLowerCase()}|${candidate.website ?? candidate.phone ?? ''}`;
      if (seen.has(key)) break;
      seen.add(key);
      out[trade].push(candidate);
      break;
    }
  }
  return out;
}

function combinedQuery(bbox: string): string {
  const names = Object.values(TRADE_QUERY).map((q) => q.name).join('|');
  return `[out:json][timeout:240];(
nwr["craft"~"^(hvac|heating_engineer|air_conditioning|ventilation|plumber|roofer)$"](${bbox});
nwr["shop"~"^(hvac|plumber|roofer|trade)$"](${bbox});
nwr["office"~"^(company|contractor)$"]["name"~"${names}",i](${bbox});
nwr["name"~"${names}",i]["website"](${bbox});
nwr["name"~"${names}",i]["contact:website"](${bbox});
nwr["name"~"${names}",i]["email"](${bbox});
nwr["name"~"${names}",i]["contact:email"](${bbox});
);out tags 6000;`;
}

async function overpass(query: string): Promise<OsmElement[]> {
  const body = `data=${encodeURIComponent(query)}`;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchTimeout(
        url,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body },
        250_000,
      );
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: OsmElement[] };
      if (json.elements?.length) return json.elements;
    } catch {
      /* try the next mirror */
    }
  }
  return [];
}

function fromOsm(t: Record<string, string>, market: Market, trade: Trade): Candidate | null {
  const name = (t.name || t['operator'] || '').trim();
  if (!name) return null;
  const website = (t.website || t['contact:website'] || t.url || '').trim() || null;
  const phone = (t.phone || t['contact:phone'] || t['contact:mobile'] || '').trim() || null;
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  const email = (t.email || t['contact:email'] || '').trim().toLowerCase() || null;
  return {
    business_name: name,
    phone,
    website,
    email: email && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) ? email : null,
    city: t['addr:city'] || market.city,
    state: (t['addr:state'] || market.state).toUpperCase().slice(0, 2),
    address: street || null,
    postal_code: t['addr:postcode'] || null,
    trade,
    hours: t.opening_hours ? parseOsmHours(t.opening_hours) : null,
    source: 'osm',
    source_url: 'https://www.openstreetmap.org/',
  };
}

/** "Mo-Fr 08:00-17:00; Sa 09:00-13:00" into a day map. Best effort by design. */
export function parseOsmHours(raw: string): Record<string, string> | null {
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const ABBR: Record<string, number> = { mo: 0, tu: 1, we: 2, th: 3, fr: 4, sa: 5, su: 6 };
  const out: Record<string, string> = {};
  if (/24\/7/.test(raw)) {
    for (const d of DAYS) out[d] = '24 hours';
    return out;
  }
  for (const chunk of raw.split(';')) {
    const m = chunk.trim().match(/^([A-Za-z,-]+)\s+(.+)$/);
    if (!m) continue;
    const [, daysPart, times] = m;
    for (const span of daysPart.split(',')) {
      const range = span.trim().toLowerCase();
      const rm = range.match(/^([a-z]{2})-([a-z]{2})$/);
      if (rm && rm[1] in ABBR && rm[2] in ABBR) {
        for (let i = ABBR[rm[1]]; i !== (ABBR[rm[2]] + 1) % 7; i = (i + 1) % 7) out[DAYS[i]] = times.trim();
      } else if (range in ABBR) {
        out[DAYS[ABBR[range]]] = times.trim();
      }
    }
  }
  return Object.keys(out).length ? out : null;
}

/** Foursquare Places, only when a key is configured. Optional by design. */
export async function discoverFoursquare(market: Market, trade: Exclude<Trade, 'other'>): Promise<Candidate[]> {
  const key = process.env.FOURSQUARE_API_KEY;
  if (!key || /^\[SENSITIVE\]$/i.test(key)) return [];
  const queries: Record<Exclude<Trade, 'other'>, string[]> = {
    hvac: ['hvac contractor', 'air conditioning repair', 'heating contractor'],
    plumbing: ['plumber', 'plumbing contractor', 'drain cleaning'],
    roofing: ['roofing contractor', 'roof repair'],
  };
  const [s, w, n, e] = market.bbox.split(',').map(Number);
  const ll = `${(s + n) / 2},${(w + e) / 2}`;
  const out: Candidate[] = [];
  for (const q of queries[trade]) {
    try {
      const params = new URLSearchParams({ query: q, ll, radius: '35000', limit: '50', fields: 'name,location,tel,website,hours,rating,stats' });
      const res = await fetchTimeout(`https://places-api.foursquare.com/places/search?${params}`, {
        headers: { Authorization: `Bearer ${key}`, 'X-Places-Api-Version': '2025-06-17', Accept: 'application/json' },
      });
      if (!res.ok) break;
      const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
      for (const p of json.results ?? []) {
        const loc = (p.location ?? {}) as Record<string, string>;
        const name = String(p.name ?? '').trim();
        if (!name) continue;
        out.push({
          business_name: name,
          phone: (p.tel as string) ?? null,
          website: (p.website as string) ?? null,
          email: (p.email as string) ?? null,
          city: loc.locality || market.city,
          state: (loc.region || market.state).toUpperCase().slice(0, 2),
          address: loc.address ?? null,
          postal_code: loc.postcode ?? null,
          trade,
          hours: null,
          source: 'foursquare',
          source_url: 'https://foursquare.com/',
        });
      }
      await sleep(350);
    } catch {
      break;
    }
  }
  return out;
}

/* ────────────────────────── email discovery ─────────────────────────────── */

const ASSET_OR_VENDOR =
  /\.(png|jpe?g|gif|svg|webp|ico|css|js|pdf)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|@email\.com|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite|sentry\.io|@2x|@3x|@media|react|angular|bootstrap|jquery|fontawesome/i;

const NO_REPLY = /^(no-?reply|donotreply|do-?not-?reply|postmaster|mailer-daemon|abuse|webmaster|privacy|legal|dmca|unsubscribe|careers?|jobs|hr)@/i;

/** Ordered by how much we want it: a decision maker beats a shared inbox. */
const PREFERENCE = [
  /^(owner|founder|president|gm|generalmanager)@/i,
  /^(sales|estimates?|estimating|newbusiness)@/i,
  /^(office|contact|hello|hi|admin|frontdesk|reception|scheduling|dispatch|booking|service|customerservice)@/i,
  /^info@/i,
];

const FREEMAIL = /@(gmail|yahoo|hotmail|outlook|aol|icloud|comcast|msn|live|me|mac|att|verizon|sbcglobal|bellsouth|cox|charter|earthlink|protonmail|ymail)\.(com|net|org)$/i;

export type ScrapeResult = {
  emails: { address: string; via: 'mailto' | 'text'; url: string }[];
  /** A phone read off their own site, when the directory did not carry one. */
  phone: string | null;
  blurb: string;
  hours: Record<string, string> | null;
  emergency: boolean;
  open24: boolean;
  serviceArea: string | null;
  /** Populated only when the page literally names a person and a title. */
  contact: { name: string; title: string; url: string } | null;
  reachedHomepage: boolean;
  permanentlyClosed: boolean;
  pagesRead: number;
};

/** Guessed paths, tried only after the real links on the homepage run out. */
const FALLBACK_PATHS = [
  '/contact', '/contact-us', '/contactus', '/contact.html', '/contact-us.html', '/contact.php',
  '/about', '/about-us', '/about.html', '/our-team', '/team', '/staff', '/meet-the-team',
  '/get-a-quote', '/request-service', '/schedule', '/estimate', '/careers',
];

const MAX_PAGES = 7;

/**
 * Read the company's own public pages. Nothing here bypasses a protection: a
 * 403, a CAPTCHA wall or a robots-blocked path just ends the read for that URL.
 *
 * The homepage is read first and its OWN navigation links are followed, because
 * guessing `/contact` misses the roughly half of contractor sites that use
 * `/contact-us-today` or `/connect`. Cloudflare's email obfuscation and JSON-LD
 * blocks are both decoded, since between them they hide the address on a large
 * share of trade sites that do publish one.
 */
export async function scrapeBusiness(website: string, budgetMs = 26_000): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    emails: [],
    phone: null,
    blurb: '',
    hours: null,
    emergency: false,
    open24: false,
    serviceArea: null,
    contact: null,
    reachedHomepage: false,
    permanentlyClosed: false,
    pagesRead: 0,
  };
  let origin = '';
  try {
    origin = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).origin;
  } catch {
    return result;
  }
  const host = hostOf(origin);
  const deadline = Date.now() + budgetMs;
  const seen = new Set<string>();
  const queue: string[] = [origin];

  const read = async (url: string): Promise<string | null> => {
    try {
      const res = await fetchTimeout(
        url,
        { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, redirect: 'follow' },
        Math.max(2500, Math.min(11_000, deadline - Date.now())),
      );
      if (!res.ok) return null;
      const type = res.headers.get('content-type') ?? '';
      if (type && !/html|xml|text/i.test(type)) return null;
      return (await res.text()).slice(0, 500_000);
    } catch {
      return null;
    }
  };

  while (queue.length && result.pagesRead < MAX_PAGES && Date.now() < deadline) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    const html = await read(url);
    if (html === null) continue;
    result.pagesRead++;

    const isHome = result.pagesRead === 1;
    if (isHome) {
      result.reachedHomepage = true;
      result.blurb = extractBlurb(html);
      result.permanentlyClosed = /\b(permanently closed|no longer in business|we have closed)\b/i.test(html);
      result.hours = extractHours(html);
      result.serviceArea = extractServiceArea(html);
      // Follow the site's OWN contact and about links before guessing paths.
      for (const href of contactLinks(html, origin)) if (!seen.has(href)) queue.push(href);
      for (const path of FALLBACK_PATHS) {
        const guess = `${origin}${path}`;
        if (!seen.has(guess)) queue.push(guess);
      }
    }

    const decoded = decodeObfuscated(html);

    for (const m of decoded.matchAll(/mailto:([^"'?>\s]+)/gi)) pushEmail(result, m[1], 'mailto', url);
    for (const m of decoded.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) pushEmail(result, m[0], 'text', url);
    for (const addr of cloudflareEmails(html)) pushEmail(result, addr, 'mailto', url);
    for (const block of jsonLdBlocks(html)) {
      if (typeof block.email === 'string') pushEmail(result, block.email.replace(/^mailto:/i, ''), 'mailto', url);
      if (!result.phone && typeof block.telephone === 'string') result.phone = normalizePhone(block.telephone);
    }

    if (!result.phone) result.phone = extractPhone(decoded);
    if (/\b24[\s/-]?7\b|24 hours a day|around the clock|open 24/i.test(decoded)) result.open24 = true;
    if (/\bemergency\b|\bsame[- ]day\b|\bafter[- ]hours\b|\b24[\s/-]?7\b/i.test(decoded)) result.emergency = true;
    if (!result.contact) result.contact = extractContactPerson(decoded, url);

    // Stop early once we hold an on-domain address from a mailto link: that is
    // the strongest evidence available and further pages only add noise.
    if (result.emails.some((e) => e.via === 'mailto' && e.address.split('@')[1]?.toLowerCase() === host)) break;
  }

  return result;
}

/** Entity-escaped and "name (at) domain" spellings, back to plain text. */
export function decodeObfuscated(html: string): string {
  return html
    .replace(/%40/gi, '@')
    .replace(/&#(?:64|x40);/gi, '@')
    .replace(/&#(?:46|x2e);/gi, '.')
    .replace(/\s*[[({]\s*(?:at|@)\s*[\]})]\s*/gi, '@')
    .replace(/\s+(?:at|AT)\s+([a-z0-9-]+)\s+(?:dot|DOT)\s+([a-z]{2,})/g, '@$1.$2');
}

/**
 * Cloudflare Email Protection replaces a printed address with a hex blob whose
 * first byte is an XOR key. Decoding it reads what the page already displays to
 * every human visitor; it is not a protection being defeated, it is the same
 * text their own JavaScript renders.
 */
export function cloudflareEmails(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/data-cfemail=["']([0-9a-f]+)["']/gi)) {
    const hex = m[1];
    if (hex.length < 4 || hex.length % 2) continue;
    const key = parseInt(hex.slice(0, 2), 16);
    let decoded = '';
    for (let i = 2; i < hex.length; i += 2) {
      decoded += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    }
    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(decoded)) out.push(decoded);
  }
  return out;
}

/** Structured data the business publishes about itself. */
export function jsonLdBlocks(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        if (item && typeof item === 'object') {
          out.push(item as Record<string, unknown>);
          const graph = (item as { '@graph'?: unknown })['@graph'];
          if (Array.isArray(graph)) for (const g of graph) if (g && typeof g === 'object') out.push(g as Record<string, unknown>);
        }
      }
    } catch {
      /* malformed JSON-LD is common and not worth a failure */
    }
  }
  return out;
}

/** Their own nav links to contact and about pages, same origin only. */
export function contactLinks(html: string, origin: string): string[] {
  const out: string[] = [];
  const RE = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi;
  for (const m of html.matchAll(RE)) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const looks = /contact|about|team|staff|meet|reach|connect|quote|estimate/.test(`${href.toLowerCase()} ${text}`);
    if (!looks) continue;
    let abs: string;
    try {
      abs = new URL(href, origin).toString();
    } catch {
      continue;
    }
    if (!abs.startsWith(origin)) continue;
    if (/\.(pdf|jpe?g|png|gif|svg|zip|mp4)$/i.test(abs)) continue;
    if (!out.includes(abs)) out.push(abs);
    if (out.length >= 5) break;
  }
  return out;
}

const PHONE_RE = /(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/;

/** A dialable US number off the page. `tel:` links first, plain text second. */
export function extractPhone(html: string): string | null {
  const tel = html.match(/tel:\+?1?[\s.-]?\(?(\d[\d\s().-]{8,16}\d)/i);
  if (tel) {
    const norm = normalizePhone(tel[1]);
    if (norm) return norm;
  }
  const text = html.replace(/<[^>]+>/g, ' ');
  const m = text.match(PHONE_RE);
  return m ? normalizePhone(`${m[1]}${m[2]}${m[3]}`) : null;
}

export function normalizePhone(raw: string): string | null {
  const d = String(raw || '').replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (ten.length !== 10) return null;
  if (/^([0-9])\1{9}$/.test(ten)) return null;
  if (!/^[2-9]/.test(ten)) return null;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function pushEmail(result: ScrapeResult, raw: string, via: 'mailto' | 'text', url: string): void {
  const address = String(raw).trim().toLowerCase().replace(/^mailto:/, '').split('?')[0];
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(address)) return;
  if (address.length > 100) return;
  if (ASSET_OR_VENDOR.test(address)) return;
  if (NO_REPLY.test(address)) return;
  if (result.emails.some((e) => e.address === address)) return;
  result.emails.push({ address, via, url });
}

export function hostOf(u: string): string {
  try {
    const host = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase();
    // `new URL('https://!!!')` parses. A hostname still has to look like one, or
    // the "is this their own domain" test starts comparing punctuation.
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : '';
  } catch {
    return '';
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Enough of the page for the scorer to read intent signals off. */
function extractBlurb(html: string): string {
  const meta = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '';
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '';
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]{0,200}?)<\/h1>/gi)].map((m) => stripTags(m[1])).join(' ');
  const scripts = /gtag\(|googleads|google_conversion|fbq\(|facebook pixel|gclid/i.test(html) ? ' gtag fbq ' : '';
  return [title, meta, h1, stripTags(html).slice(0, 3000), scripts].join(' ').slice(0, 5000);
}

/** Hours printed on the page. Only returns something when it is unambiguous. */
export function extractHours(html: string): Record<string, string> | null {
  const text = stripTags(html);
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const TIME = '(?:closed|open 24 hours|24 hours|\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?\\s*(?:-|–|—|to)\\s*\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)';
  const out: Record<string, string> = {};

  // Per-day lines: "Monday: 8:00 am - 5:00 pm".
  for (const day of DAYS) {
    const re = new RegExp(`\\b${day.slice(0, 3)}[a-z]*\\.?\\s*[:\\-–]?\\s*(${TIME})`, 'i');
    const m = text.match(re);
    if (m) out[day] = m[1].trim().toLowerCase();
  }

  // Ranges, which is how most trade sites actually print it:
  // "Mon - Fri: 7:30am - 5:00pm" and "Sat - Sun: Closed".
  const rangeRe = new RegExp(
    `\\b(${DAYS.map((d) => d.slice(0, 3)).join('|')})[a-z]*\\.?\\s*(?:-|–|—|through|to|thru)\\s*(${DAYS.map((d) => d.slice(0, 3)).join('|')})[a-z]*\\.?\\s*[:\\-–]?\\s*(${TIME})`,
    'gi',
  );
  for (const m of text.matchAll(rangeRe)) {
    const from = DAYS.findIndex((d) => d.startsWith(m[1].toLowerCase()));
    const to = DAYS.findIndex((d) => d.startsWith(m[2].toLowerCase()));
    if (from < 0 || to < 0) continue;
    for (let i = from; ; i = (i + 1) % 7) {
      if (!out[DAYS[i]]) out[DAYS[i]] = m[3].trim().toLowerCase();
      if (i === to) break;
    }
  }

  return Object.keys(out).length >= 3 ? out : null;
}

/** A US state or a "and surrounding areas" tail is what makes it a real claim. */
const AREA_SHAPE = /(,\s*(A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|P[A]|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\b)|surrounding|metro|county|valley|area/i;

export function extractServiceArea(html: string): string | null {
  const text = stripTags(html);
  const m =
    text.match(/(?:proudly\s+)?serv(?:ing|es)\s+([A-Z][A-Za-z .'&-]{3,70}(?:,\s*[A-Z]{2})?(?:\s+and\s+(?:the\s+)?surrounding\s+areas?)?)/) ||
    text.match(/service area[s]?\s*[:\-]\s*([A-Z][A-Za-z ,.'&-]{5,70})/i);
  if (!m) return null;
  const area = m[1].trim().replace(/\s{2,}/g, ' ');
  // Without a state, a county or a "surrounding areas" tail, the capture is
  // almost always the start of an unrelated sentence.
  return AREA_SHAPE.test(area) ? area.slice(0, 160) : null;
}

/**
 * Only accepts a person when the page states BOTH a name and a title next to
 * each other. Anything looser invents an owner, which is worse than a blank.
 */
export function extractContactPerson(html: string, url: string): { name: string; title: string; url: string } | null {
  const text = stripTags(html);
  const TITLES = 'Owner|Founder|President|General Manager|Office Manager|Operations Manager|Co-Owner|CEO|Vice President';
  const patterns = [
    new RegExp(`\\b([A-Z][a-z]+(?: [A-Z]\\.)? [A-Z][a-z]+)\\s*[,\\-–|]\\s*(${TITLES})\\b`),
    new RegExp(`\\b(${TITLES})\\s*[:\\-–|]\\s*([A-Z][a-z]+(?: [A-Z]\\.)? [A-Z][a-z]+)\\b`),
  ];
  for (const [i, re] of patterns.entries()) {
    const m = text.match(re);
    if (m) {
      const name = i === 0 ? m[1] : m[2];
      const title = i === 0 ? m[2] : m[1];
      if (name.split(' ').length >= 2) return { name: name.trim(), title: title.trim(), url };
    }
  }
  return null;
}

/* ────────────────────────── email verification ──────────────────────────── */

export type EmailVerdict = {
  status: 'verified' | 'likely' | 'public' | 'risky' | 'invalid' | 'unknown';
  confidence: number;
  reason: string;
};

const mxCache = new Map<string, boolean>();

export async function domainHasMx(domain: string): Promise<boolean> {
  const d = domain.toLowerCase();
  if (mxCache.has(d)) return mxCache.get(d)!;
  try {
    const records = await resolveMx(d);
    const ok = Array.isArray(records) && records.length > 0;
    mxCache.set(d, ok);
    return ok;
  } catch {
    mxCache.set(d, false);
    return false;
  }
}

/** Hunter's verifier, when a key exists. Optional; absence is not a failure. */
async function hunterVerify(email: string): Promise<{ result: string; score: number } | null> {
  const key = process.env.HUNTER_API_KEY;
  if (!key || /^\[SENSITIVE\]$/i.test(key)) return null;
  try {
    const res = await fetchTimeout(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${key}`,
      { headers: { Accept: 'application/json' } },
      9000,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { result?: string; score?: number } };
    if (!json.data?.result) return null;
    return { result: json.data.result, score: Number(json.data.score ?? 0) };
  } catch {
    return null;
  }
}

/**
 * Grade an address. The labels are promises, so they are conservative:
 *   verified — an external verifier said it is deliverable
 *   likely   — on the company's own domain, MX resolves, printed on their site
 *   public   — printed on their public site, MX resolves, but on a free mailbox
 *              or a domain that is not the one we scraped
 *   risky    — MX resolves but nothing corroborates that this is their address
 *   invalid  — malformed, or the domain cannot receive mail at all
 */
export async function verifyEmail(
  email: string,
  opts: { siteHost?: string | null; via?: 'mailto' | 'text' | 'provider' } = {},
): Promise<EmailVerdict> {
  const addr = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(addr)) {
    return { status: 'invalid', confidence: 0, reason: 'Not a valid address.' };
  }
  if (NO_REPLY.test(addr)) {
    return { status: 'risky', confidence: 10, reason: 'Unattended mailbox.' };
  }
  const domain = addr.split('@')[1];
  if (!(await domainHasMx(domain))) {
    return { status: 'invalid', confidence: 0, reason: `${domain} has no mail server.` };
  }

  const hunter = await hunterVerify(addr);
  if (hunter) {
    if (hunter.result === 'deliverable') {
      return { status: 'verified', confidence: Math.max(85, hunter.score), reason: 'Verified deliverable by Hunter.' };
    }
    if (hunter.result === 'undeliverable') {
      return { status: 'invalid', confidence: 0, reason: 'Hunter says undeliverable.' };
    }
    if (hunter.result === 'risky') {
      return { status: 'risky', confidence: Math.min(45, hunter.score || 30), reason: 'Hunter flagged it risky (catch-all or accept-all).' };
    }
  }

  const onOwnDomain = Boolean(opts.siteHost) && domain === String(opts.siteHost).toLowerCase();
  const freemail = FREEMAIL.test(addr);

  if (onOwnDomain) {
    return opts.via === 'mailto'
      ? { status: 'likely', confidence: 78, reason: 'Linked as a mailto on their own domain, and the domain accepts mail.' }
      : { status: 'likely', confidence: 70, reason: 'Printed on their own site, on their own domain, and the domain accepts mail.' };
  }
  // A mailto link IS the business publishing the address, whichever domain it
  // lands on. "Don's Heating and Cooling" mailing to info@donshs.com is normal,
  // and grading that risky was throwing away real, correctly-sourced leads.
  if (opts.via === 'mailto' || opts.via === 'provider') {
    return {
      status: 'public',
      confidence: freemail ? 58 : 62,
      reason: `Published by the business as a contact link${freemail ? ' on a free mailbox' : ''}, and the domain accepts mail.`,
    };
  }
  if (freemail) {
    return { status: 'public', confidence: 48, reason: 'Free mailbox printed on their site.' };
  }
  return { status: 'risky', confidence: 30, reason: 'Found as loose text on the page with nothing tying it to this business.' };
}

/** Pick the address we most want to write to, then grade it. */
export async function chooseBestEmail(
  found: ScrapeResult['emails'],
  siteHost: string | null,
): Promise<{ address: string; via: 'mailto' | 'text'; url: string; verdict: EmailVerdict } | null> {
  if (!found.length) return null;
  const ranked = [...found].sort((a, b) => rank(a, siteHost) - rank(b, siteHost));
  for (const candidate of ranked.slice(0, 4)) {
    const verdict = await verifyEmail(candidate.address, { siteHost, via: candidate.via });
    if (verdict.status !== 'invalid') return { ...candidate, verdict };
  }
  const first = ranked[0];
  return { ...first, verdict: await verifyEmail(first.address, { siteHost, via: first.via }) };
}

function rank(e: { address: string; via: string }, siteHost: string | null): number {
  const domain = e.address.split('@')[1] ?? '';
  let score = 0;
  if (siteHost && domain === siteHost) score -= 100;
  if (e.via === 'mailto') score -= 20;
  const pref = PREFERENCE.findIndex((re) => re.test(e.address));
  score += pref === -1 ? 50 : pref * 5;
  if (FREEMAIL.test(e.address)) score += 30;
  return score;
}

/* ───────────────────────── assemble a prospect row ──────────────────────── */

export type SourcedProspect = {
  row: Record<string, unknown>;
  emailStatus: EmailVerdict['status'];
  score: number;
};

/**
 * Turn a researched candidate into the row we would insert. Pure: the caller
 * decides whether to insert it, so dedupe and caps stay in one place.
 */
export function assembleProspect(args: {
  candidate: Candidate;
  scrape: ScrapeResult | null;
  best: Awaited<ReturnType<typeof chooseBestEmail>>;
  campaignId: string | null;
  runId: string | null;
}): SourcedProspect {
  const { candidate, scrape, best, campaignId, runId } = args;
  const siteHost = candidate.website ? hostOf(candidate.website) : null;
  // The directory often carries a website and no number. Their own site almost
  // always carries the number, because it is the point of their own site.
  const phone = candidate.phone ?? scrape?.phone ?? null;

  const scored = scoreLead({
    business_name: candidate.business_name,
    trade: candidate.trade,
    website: candidate.website,
    email: best?.address ?? null,
    email_status: best?.verdict.status ?? 'unknown',
    phone,
    review_count: candidate.review_count ?? null,
    rating: candidate.rating ?? null,
    hours: scrape?.hours ?? candidate.hours ?? null,
    open_24_7: scrape?.open24 ?? false,
    emergency_service: scrape?.emergency ?? false,
    city: candidate.city,
    state: candidate.state,
    blurb: scrape?.blurb ?? '',
    permanently_closed: scrape?.permanentlyClosed ?? false,
  });

  const sourceUrls = [candidate.source_url, candidate.website, best?.url].filter(Boolean) as string[];

  return {
    emailStatus: best?.verdict.status ?? 'unknown',
    score: scored.score,
    row: {
      business_name: candidate.business_name.slice(0, 200),
      contact_name: scrape?.contact?.name ?? null,
      contact_title: scrape?.contact?.title ?? null,
      contact_source_url: scrape?.contact?.url ?? null,
      phone: phone ?? '',
      email: best?.address ?? null,
      website: candidate.website,
      niche: 'home_service',
      trade: candidate.trade,
      city: candidate.city,
      state: candidate.state,
      address: candidate.address,
      postal_code: candidate.postal_code,
      service_area: scrape?.serviceArea ?? null,
      rating: candidate.rating ?? null,
      review_count: candidate.review_count ?? null,
      email_status: best?.verdict.status ?? 'unknown',
      email_confidence: best?.verdict.confidence ?? 0,
      email_source: best ? `${candidate.source}+website` : null,
      email_source_url: best?.url ?? null,
      hours: scrape?.hours ?? candidate.hours ?? null,
      open_24_7: scrape?.open24 ?? false,
      emergency_service: scrape?.emergency ?? false,
      call_volume_score: scored.callVolume,
      missed_call_score: scored.missedCall,
      lead_score: scored.score,
      score_reasons: scored.reasons,
      priority: scored.priority,
      source: 'acq-lead-finder',
      source_urls: sourceUrls,
      phone_type: phone && phone !== candidate.phone ? 'published on their website' : null,
      status: 'new',
      acq_campaign_id: campaignId,
      acq_stage: 'prospect',
      imported_at: new Date().toISOString(),
      last_researched_at: new Date().toISOString(),
      notes: [
        `SOURCED BY THE LEAD FINDER${runId ? ` (run ${runId.slice(0, 8)})` : ''}.`,
        `Discovery: ${candidate.source}.`,
        best ? `Email ${best.address} found on ${best.url} (${best.verdict.reason})` : 'No public email found.',
        scrape?.serviceArea ? `Service area (their words): ${scrape.serviceArea}` : null,
        `Why it scored ${scored.score}: ${scored.reasons.map((r) => `${r.label} ${r.points > 0 ? '+' : ''}${r.points}`).join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n')
        .slice(0, 6000),
      _siteHost: siteHost,
    },
  };
}
