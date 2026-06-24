/**
 * Prospect enrichment: given a business name and city, find its website, phone,
 * and a contact email so a rep never has to go hunting. Keyless by default
 * (OpenStreetMap / Nominatim + a light site scrape), and noticeably stronger
 * when FOURSQUARE_API_KEY is set (Foursquare has excellent US small-business
 * coverage). Everything degrades gracefully: whatever it can find, it returns;
 * the rep edits the rest.
 *
 * Sources, in order of trust for the website:
 *   1. the website already on the prospect (never overwritten)
 *   2. Foursquare Places (if a key is set)
 *   3. OpenStreetMap (Nominatim) website / contact:website tags
 * Email: OSM contact:email tag, else scraped from the site (mailto + regex).
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const FSQ_SEARCH = 'https://places-api.foursquare.com/places/search';
const FSQ_VERSION = '2025-06-17';
// A polite, identifying User-Agent is required by Nominatim's usage policy.
const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';

export type EnrichResult = {
  website: string | null;
  email: string | null;
  phone: string | null;
  sources: string[];
};

function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** Nominatim geocode of a city to a center point, for the Foursquare lookup. */
async function geocodeCenter(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(city)}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!arr.length) return null;
    return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
  } catch {
    return null;
  }
}

/** Look the business up in OpenStreetMap by name + city. Returns website, email,
 *  and phone tags when the place is mapped (extratags carries contact:* tags). */
async function lookupNominatim(business: string, city: string | null): Promise<{ website: string | null; email: string | null; phone: string | null }> {
  const q = [business, city].filter(Boolean).join(', ');
  try {
    const res = await fetch(`${NOMINATIM}?format=json&limit=3&extratags=1&q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { website: null, email: null, phone: null };
    const arr = (await res.json()) as Array<{ display_name?: string; extratags?: Record<string, string> }>;
    const target = normName(business);
    // Prefer the row whose name best matches the business.
    const best =
      arr.find((r) => normName(r.display_name?.split(',')[0] ?? '').includes(target) || target.includes(normName(r.display_name?.split(',')[0] ?? ''))) ??
      arr[0];
    const t = best?.extratags ?? {};
    return {
      website: t.website || t['contact:website'] || t.url || null,
      email: t.email || t['contact:email'] || null,
      phone: t.phone || t['contact:phone'] || null,
    };
  } catch {
    return { website: null, email: null, phone: null };
  }
}

interface FsqPlace {
  name?: string;
  tel?: string;
  website?: string;
  website_url?: string;
}

/** Look the business up in Foursquare around the city center. Best name match wins. */
async function lookupFoursquare(business: string, center: { lat: number; lon: number }): Promise<{ website: string | null; phone: string | null } | null> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return null;
  const params = new URLSearchParams({
    query: business,
    ll: `${center.lat},${center.lon}`,
    radius: '40000',
    limit: '5',
    fields: 'name,tel,website,location',
  });
  try {
    const res = await fetch(`${FSQ_SEARCH}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'X-Places-Api-Version': FSQ_VERSION, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: FsqPlace[] };
    const results = json.results ?? [];
    if (!results.length) return null;
    const target = normName(business);
    const best =
      results.find((r) => normName(r.name ?? '').includes(target) || target.includes(normName(r.name ?? ''))) ??
      results[0];
    return { website: best.website ?? best.website_url ?? null, phone: best.tel ?? null };
  } catch {
    return null;
  }
}

// Junk patterns that look like emails but never are (assets, vendor noise, placeholders).
const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|sentry\.io|googleapis|cloudflare|schema\.org|w3\.org/i;
const ROLE_PREFIX = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi)@/i;

function pickBestEmail(emails: string[], siteHost: string): string | null {
  const clean = Array.from(new Set(emails.map((e) => e.toLowerCase().trim())))
    .filter((e) => !EMAIL_BLOCK.test(e) && e.length <= 100 && /@[a-z0-9.-]+\.[a-z]{2,}$/.test(e));
  if (!clean.length) return null;
  clean.sort((a, b) => {
    // Prefer same-domain, then role addresses.
    const da = hostOf(a.split('@')[1]) === siteHost ? 1 : 0;
    const db = hostOf(b.split('@')[1]) === siteHost ? 1 : 0;
    if (da !== db) return db - da;
    const ra = ROLE_PREFIX.test(a) ? 1 : 0;
    const rb = ROLE_PREFIX.test(b) ? 1 : 0;
    return rb - ra;
  });
  return clean[0];
}

/** Fetch a page and pull candidate emails from mailto links and the raw text. */
async function emailsFromPage(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    let html = (await res.text()).slice(0, 400_000);
    // De-obfuscate the most common encodings.
    html = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*\[at\]\s*/gi, '@').replace(/\s*\(at\)\s*/gi, '@');
    const out: string[] = [];
    for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) out.push(m[1]);
    for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) out.push(m[0]);
    return out;
  } catch {
    return [];
  }
}

/** Scrape a business website for a contact email: homepage plus the usual contact pages. */
async function scrapeEmail(website: string): Promise<string | null> {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = '';
  try {
    origin = new URL(base).origin;
  } catch {
    return null;
  }
  const siteHost = hostOf(base);
  const pages = [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`];
  const collected: string[] = [];
  for (const page of pages) {
    const found = await emailsFromPage(page);
    collected.push(...found);
    // Stop early once we have a strong same-domain or role hit.
    const best = pickBestEmail(collected, siteHost);
    if (best && (hostOf(best.split('@')[1]) === siteHost || ROLE_PREFIX.test(best))) return best;
  }
  return pickBestEmail(collected, siteHost);
}

/**
 * Find a website, phone, and email for a business. Never overwrites a website
 * the prospect already has; fills phone/email only when found. Safe to call with
 * no keys set (uses OSM + a site scrape).
 */
export async function enrichProspect(input: { business: string; city: string | null; website?: string | null; phone?: string | null }): Promise<EnrichResult> {
  const sources: string[] = [];
  let website = input.website?.trim() || null;
  let phone = input.phone?.trim() || null;
  let email: string | null = null;

  // Run the two place lookups; geocode once for Foursquare.
  const center = input.city ? await geocodeCenter(input.city) : null;
  const [fsq, osm] = await Promise.all([
    center ? lookupFoursquare(input.business, center) : Promise.resolve(null),
    lookupNominatim(input.business, input.city),
  ]);

  if (!website && fsq?.website) { website = fsq.website; sources.push('foursquare'); }
  if (!website && osm.website) { website = osm.website; sources.push('osm'); }
  if (!phone && fsq?.phone) { phone = fsq.phone; sources.push('foursquare:phone'); }
  if (!phone && osm.phone) { phone = osm.phone; sources.push('osm:phone'); }

  // Email: OSM tag first (free, exact), then scrape the site.
  if (osm.email) { email = osm.email.toLowerCase(); sources.push('osm:email'); }
  if (!email && website) {
    const scraped = await scrapeEmail(website);
    if (scraped) { email = scraped; sources.push('site'); }
  }

  return { website, email, phone, sources };
}
