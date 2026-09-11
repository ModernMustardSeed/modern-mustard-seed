// lib/enrich.ts
var NOMINATIM = "https://nominatim.openstreetmap.org/search";
var FSQ_SEARCH = "https://places-api.foursquare.com/places/search";
var FSQ_VERSION = "2025-06-17";
var HUNTER_DOMAIN = "https://api.hunter.io/v2/domain-search";
var HUNTER_VERIFY = "https://api.hunter.io/v2/email-verifier";
var UA = "ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)";
var NAME_FLOOR = 0.62;
var BUDGET_MS = 34e3;
var newBudget = () => ({ until: Date.now() + BUDGET_MS });
var left = (b) => b.until - Date.now();
var cap = (b, want) => Math.max(1200, Math.min(want, left(b)));
var NOISE = /* @__PURE__ */ new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "at",
  "for",
  "in",
  "on",
  "llc",
  "l",
  "inc",
  "incorporated",
  "co",
  "corp",
  "corporation",
  "ltd",
  "limited",
  "lp",
  "llp",
  "pllc",
  "pc",
  "pa",
  "dba",
  // The orphaned possessive. norm() turns "Joe's Bar" into "joe s bar", and that
  // stray "s" was scoring as a shared identity token: "Joe's Bar" matched a
  // Tokyo Joe's franchise on {joe, s} alone.
  "s"
]);
var GENERIC = /* @__PURE__ */ new Set([
  "auto",
  "automotive",
  "repair",
  "service",
  "services",
  "shop",
  "store",
  "company",
  "group",
  "center",
  "centre",
  "clinic",
  "hospital",
  "dental",
  "dentistry",
  "dds",
  "md",
  "medical",
  "health",
  "care",
  "law",
  "legal",
  "office",
  "offices",
  "attorney",
  "attorneys",
  "firm",
  "roofing",
  "roofers",
  "roof",
  "plumbing",
  "plumber",
  "hvac",
  "heating",
  "cooling",
  "air",
  "electric",
  "electrical",
  "construction",
  "contracting",
  "contractors",
  "builders",
  "landscaping",
  "lawn",
  "cleaning",
  "cleaners",
  "salon",
  "spa",
  "barber",
  "barbershop",
  "nails",
  "hair",
  "beauty",
  "cafe",
  "coffee",
  "restaurant",
  "grill",
  "bar",
  "kitchen",
  "bakery",
  "pizza",
  "deli",
  "diner",
  "towing",
  "tow",
  "storage",
  "insurance",
  "realty",
  "real",
  "estate",
  "properties",
  "pest",
  "control",
  "flooring",
  "floors",
  "paint",
  "painting",
  "glass",
  "tire",
  "tires",
  "wash",
  "detailing",
  "fitness",
  "gym",
  "studio",
  "veterinary",
  "vet",
  "animal",
  "pet",
  "pets",
  "locksmith",
  "security",
  "solutions",
  "restoration",
  "remodeling",
  "kitchen",
  "bath",
  "window",
  "windows",
  "door",
  "doors",
  "super",
  "best",
  "quality",
  "affordable",
  "professional",
  "american",
  "national",
  "us",
  // Filler that reads like a name but identifies nobody. Every one of these was
  // caught scoring as identity in a batch run: "Cordera Family Dentistry"
  // matched "Brinton Family Dentistry" on {family, dentistry}, and "a Better
  // Self Storage" matched "Falcon Self Storage" on {self, storage}.
  "family",
  "self",
  "better",
  "modern",
  "premier",
  "elite",
  "advanced",
  "general",
  "complete",
  "total",
  "custom",
  "first",
  "new",
  "old",
  "plus",
  "pros",
  "expert",
  "experts",
  "specialist",
  "specialists",
  "discount",
  "value",
  "friendly",
  "reliable"
]);
function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function toks(s) {
  return norm(s).split(" ").filter((t) => t && !NOISE.has(t));
}
function near(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length === b.length) {
      i++;
      j++;
    } else if (a.length > b.length) i++;
    else j++;
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
function localTokens(city) {
  return new Set(city ? toks(city) : []);
}
var NO_LOCAL = /* @__PURE__ */ new Set();
function nameScore(a, b, local = NO_LOCAL) {
  const A = toks(a), B = toks(b);
  if (!A.length || !B.length) return { score: 0, sharedDistinctive: false };
  const used = /* @__PURE__ */ new Set();
  let hits = 0, distinctive = 0;
  for (const t of A) {
    for (let i = 0; i < B.length; i++) {
      if (used.has(i)) continue;
      if (t === B[i] || near(t, B[i])) {
        used.add(i);
        hits++;
        if (!GENERIC.has(t) && !local.has(t)) distinctive++;
        break;
      }
    }
  }
  return { score: 2 * hits / (A.length + B.length), sharedDistinctive: distinctive > 0 };
}
function isSameBusiness(lead, candidate, city) {
  const { score, sharedDistinctive } = nameScore(lead, candidate, localTokens(city));
  if (score >= 0.85) return true;
  return score >= NAME_FLOOR && sharedDistinctive;
}
function hostOf(url) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}
var NOT_THEIR_SITE = [
  // directories and aggregators
  "yelp.com",
  "yellowpages.com",
  "yp.com",
  "chambermaster.com",
  "chamberofcommerce.com",
  "mapquest.com",
  "tripadvisor.com",
  "bbb.org",
  "angi.com",
  "angieslist.com",
  "homeadvisor.com",
  "thumbtack.com",
  "houzz.com",
  "porch.com",
  "nextdoor.com",
  "foursquare.com",
  "manta.com",
  "bizapedia.com",
  "dnb.com",
  "zoominfo.com",
  "crunchbase.com",
  "indeed.com",
  "glassdoor.com",
  "healthgrades.com",
  "zocdoc.com",
  "vitals.com",
  "avvo.com",
  "justia.com",
  "findlaw.com",
  "lawyers.com",
  "martindale.com",
  "apartments.com",
  "zillow.com",
  "realtor.com",
  "trulia.com",
  // ordering and reservations
  "opentable.com",
  "doordash.com",
  "ubereats.com",
  "grubhub.com",
  "seamless.com",
  "slicelife.com",
  "menufy.com",
  "chownow.com",
  "clover.com",
  "resy.com",
  // social
  "facebook.com",
  "fb.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "pinterest.com",
  "threads.net",
  // search and maps
  "google.com",
  "goo.gl",
  "bing.com",
  "apple.com",
  // vendor marketing sites (their own product pages, not a customer's site)
  "wix.com",
  "squarespace.com",
  "godaddy.com",
  "shopify.com",
  "linktr.ee",
  // national chains that swallow local queries
  "walmart.com",
  "target.com",
  "costco.com",
  "homedepot.com",
  "lowes.com",
  "acehardware.com",
  "autozone.com",
  "oreillyauto.com",
  "napaonline.com",
  "advanceautoparts.com",
  "jiffylube.com",
  "midas.com",
  "meineke.com",
  "firestonecompleteautocare.com",
  "discounttire.com",
  "greatclips.com",
  "supercuts.com",
  "sportclips.com",
  "subway.com",
  "mcdonalds.com",
  "starbucks.com",
  "dominos.com",
  "pizzahut.com",
  "papajohns.com",
  "dunkindonuts.com",
  "usps.com",
  "ups.com",
  "fedex.com",
  "statefarm.com",
  "allstate.com",
  "geico.com",
  "bettervet.com",
  "vca.com",
  "banfield.com",
  "aspencare.com",
  "aspendental.com"
];
var VENDOR_APEX = ["weebly.com", "wordpress.com", "wixsite.com", "myshopify.com", "square.site", "business.site", "godaddysites.com"];
var FOREIGN_TLD = /\.(ca|co\.uk|uk|au|nz|ie|in|de|fr|es|it|nl|se|no|dk|pl|br|mx|za|ph|sg|my)$/i;
function badDomain(host) {
  if (!host) return "not a usable URL";
  if (VENDOR_APEX.includes(host)) return `${host} is the website builder's own page, not a customer site`;
  if (VENDOR_APEX.some((d) => host.endsWith(`.${d}`))) return null;
  if (NOT_THEIR_SITE.some((d) => host === d || host.endsWith(`.${d}`))) {
    return `${host} is a directory, chain, or social page, not their own site`;
  }
  if (FOREIGN_TLD.test(host)) return `${host} is a foreign domain for a US business`;
  return null;
}
function domainMatchesName(business, host) {
  const label = domainLabel(host);
  if (!label) return false;
  const t = toks(business);
  const joined = t.join("");
  if (joined && (joined === label || joined.includes(label) || label.includes(joined))) return true;
  return t.some((tok) => !GENERIC.has(tok) && tok.length > 3 && label.includes(tok));
}
function domainLabel(host) {
  const parts = host.split(".");
  return parts.length > 1 ? parts[parts.length - 2] : host;
}
function domainCarriesFullName(business, host) {
  const joined = toks(business).join("");
  if (!host || joined.length < 5) return false;
  const flat = host.replace(/^www\./, "").replace(/[.-]/g, "");
  return flat.includes(joined);
}
async function geocodeCenter(city, b) {
  try {
    const res = await fetch(`${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(city)}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(cap(b, 8e3))
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!arr.length) return null;
    return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
  } catch {
    return null;
  }
}
async function fromFoursquare(business, center, b) {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return [];
  const params = new URLSearchParams({
    query: business,
    ll: `${center.lat},${center.lon}`,
    radius: "40000",
    limit: "10",
    fields: "name,tel,website,location"
  });
  try {
    const res = await fetch(`${FSQ_SEARCH}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "X-Places-Api-Version": FSQ_VERSION, Accept: "application/json" },
      signal: AbortSignal.timeout(cap(b, 1e4))
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []).map((r) => ({
      name: r.name ?? "",
      website: r.website ?? null,
      phone: r.tel ?? null,
      locality: r.location?.locality ?? null,
      source: "foursquare"
    }));
  } catch {
    return [];
  }
}
async function fromOsm(business, city, b) {
  const q = [business, city].filter(Boolean).join(", ");
  try {
    const res = await fetch(`${NOMINATIM}?format=json&limit=5&extratags=1&namedetails=1&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(cap(b, 8e3))
    });
    if (!res.ok) return [];
    const arr = await res.json();
    return arr.filter((r) => !["city", "town", "village", "administrative", "residential", "road", "county", "state"].includes(r.type ?? "")).map((r) => ({
      name: r.namedetails?.name ?? r.display_name?.split(",")[0] ?? "",
      website: r.extratags?.website || r.extratags?.["contact:website"] || r.extratags?.url || null,
      phone: r.extratags?.phone || r.extratags?.["contact:phone"] || null,
      locality: null,
      source: "osm",
      email: r.extratags?.email || r.extratags?.["contact:email"] || null
    }));
  } catch {
    return [];
  }
}
async function fromHunterCompany(business, b) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${HUNTER_DOMAIN}?company=${encodeURIComponent(business)}&limit=5&api_key=${key}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(cap(b, 1e4))
    });
    if (!res.ok) return [];
    const json = await res.json();
    const d = json.data;
    if (!d?.domain) return [];
    return [{
      name: d.organization || business,
      website: `https://${d.domain}`,
      phone: null,
      locality: null,
      source: "hunter:company",
      geoBlind: true
    }];
  } catch {
    return [];
  }
}
var digits = (s) => s.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
async function verifySite(url, business, city, phone, b) {
  const host = hostOf(url);
  const labelMatch = domainMatchesName(business, host);
  const none = { phoneHit: false, nameHit: false, cityHit: false, labelMatch };
  let html = "";
  try {
    const res = await fetch(url.startsWith("http") ? url : `https://${url}`, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(cap(b, 9e3))
    });
    if (!res.ok) {
      return labelMatch ? { ok: true, strong: false, reachable: false, why: `domain matches the name but the site returned ${res.status}`, ...none } : { ok: false, strong: false, reachable: false, why: `site returned ${res.status} and the domain does not match the name`, ...none };
    }
    html = (await res.text()).slice(0, 3e5);
  } catch {
    return labelMatch ? { ok: true, strong: false, reachable: false, why: "domain matches the name but the site did not respond", ...none } : { ok: false, strong: false, reachable: false, why: "site did not respond and the domain does not match the name", ...none };
  }
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const flat = norm(text);
  const phoneHit = Boolean(phone && digits(phone).length >= 10 && digits(text).includes(digits(phone)));
  const local = localTokens(city);
  const distinctive = toks(business).filter((t) => !GENERIC.has(t) && !local.has(t) && t.length > 2);
  const nameHit = distinctive.length > 0 && distinctive.every((t) => flat.includes(t));
  const someNameHit = distinctive.some((t) => flat.includes(t));
  const cityHit = Boolean(city && flat.includes(norm(city.split(",")[0])));
  const sig = { phoneHit, nameHit, cityHit, labelMatch };
  if (phoneHit) return { ok: true, strong: true, reachable: true, why: "their phone number is on the page", ...sig };
  if (nameHit && cityHit) return { ok: true, strong: true, reachable: true, why: "the page carries their name and city", ...sig };
  if (nameHit && labelMatch) return { ok: true, strong: true, reachable: true, why: "their name is on the page and in the domain", ...sig };
  if (nameHit) return { ok: true, strong: false, reachable: true, why: "the page carries their name", ...sig };
  if (labelMatch && someNameHit) return { ok: true, strong: false, reachable: true, why: "the domain and page partly match their name", ...sig };
  return { ok: false, strong: false, reachable: true, why: "the page never mentions this business", ...sig };
}
var EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|sentry\.io|googleapis|cloudflare|schema\.org|w3\.org|godaddy\.com|squarespace\.com|shopify\.com|wordpress\.|jquery|bootstrap|@2x|no-?reply|donotreply|calendar\.google\.com|@group\.|sentry-next|\.png@|u003e/i;
var ROLE_PREFIX = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi|team|mail)@/i;
var FREEMAIL = /^(gmail|yahoo|hotmail|outlook|aol|icloud|comcast|att|verizon|msn|live|me|mac|protonmail|ymail|sbcglobal|bellsouth|cox|charter|earthlink)\./i;
async function emailsFromPage(url, b) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(cap(b, 7e3))
    });
    if (!res.ok) return [];
    let html = (await res.text()).slice(0, 4e5);
    html = html.replace(/%40/gi, "@").replace(/&#64;|&#x40;/gi, "@").replace(/\s*\[at\]\s*/gi, "@").replace(/\s*\(at\)\s*/gi, "@");
    const out = [];
    for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) out.push(m[1]);
    for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) out.push(m[0]);
    return out;
  } catch {
    return [];
  }
}
function acceptableEmail(email, siteHost) {
  const dom = email.split("@")[1] ?? "";
  if (!dom) return false;
  if (dom === siteHost || dom.endsWith(`.${siteHost}`) || siteHost.endsWith(`.${dom}`)) return true;
  return FREEMAIL.test(dom);
}
function pickBestEmail(emails, siteHost) {
  const clean = Array.from(new Set(emails.map((e) => e.toLowerCase().trim()))).filter((e) => !EMAIL_BLOCK.test(e) && e.length <= 100 && /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(e)).filter((e) => acceptableEmail(e, siteHost));
  if (!clean.length) return null;
  clean.sort((a, b) => {
    const da = a.split("@")[1] === siteHost ? 1 : 0, db = b.split("@")[1] === siteHost ? 1 : 0;
    if (da !== db) return db - da;
    const ra = ROLE_PREFIX.test(a) ? 1 : 0, rb = ROLE_PREFIX.test(b) ? 1 : 0;
    return rb - ra;
  });
  return clean[0];
}
async function scrapeEmail(website, b) {
  const base = website.startsWith("http") ? website : `https://${website}`;
  let origin = "";
  try {
    origin = new URL(base).origin;
  } catch {
    return null;
  }
  const siteHost = hostOf(base);
  const pages = [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`];
  const collected = [];
  for (const page of pages) {
    if (left(b) < 9e3) break;
    collected.push(...await emailsFromPage(page, b));
    const best = pickBestEmail(collected, siteHost);
    if (best && (best.split("@")[1] === siteHost || ROLE_PREFIX.test(best))) return best;
  }
  return pickBestEmail(collected, siteHost);
}
async function hunterEmail(domain, b) {
  const key = process.env.HUNTER_API_KEY;
  if (!key || !domain) return null;
  try {
    const res = await fetch(`${HUNTER_DOMAIN}?domain=${encodeURIComponent(domain)}&limit=10&api_key=${key}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(cap(b, 1e4))
    });
    if (!res.ok) return null;
    const json = await res.json();
    const emails = (json.data?.emails ?? []).filter((e) => e?.value && !EMAIL_BLOCK.test(e.value));
    if (!emails.length) return null;
    emails.sort((a, b2) => {
      const ga = a.type === "generic" ? 1 : 0, gb = b2.type === "generic" ? 1 : 0;
      if (ga !== gb) return gb - ga;
      return (b2.confidence ?? 0) - (a.confidence ?? 0);
    });
    return emails[0].value.toLowerCase();
  } catch {
    return null;
  }
}
async function verifyEmail(email, b) {
  const key = process.env.HUNTER_API_KEY;
  if (!key || left(b) < 2500) return { ok: true, status: "unchecked" };
  try {
    const res = await fetch(`${HUNTER_VERIFY}?email=${encodeURIComponent(email)}&api_key=${key}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(cap(b, 1e4))
    });
    if (!res.ok) return { ok: true, status: "unchecked" };
    const json = await res.json();
    const status = json.data?.status || json.data?.result || "unknown";
    if (json.data?.disposable) return { ok: false, status: "disposable" };
    if (status === "undeliverable" || status === "invalid") return { ok: false, status };
    return { ok: true, status };
  } catch {
    return { ok: true, status: "unchecked" };
  }
}
async function verifyCandidateSite(input) {
  const none = { phoneHit: false, cityHit: false, nameHit: false };
  const host = hostOf(input.url);
  const bad = host ? badDomain(host) : "not a usable URL";
  if (bad) return { ok: false, website: null, confidence: null, why: bad, ...none };
  const v = await verifySite(input.url, input.business, input.city, input.phone, newBudget());
  const sig = { phoneHit: v.phoneHit, cityHit: v.cityHit, nameHit: v.nameHit };
  if (!v.ok || !v.reachable) return { ok: false, website: null, confidence: null, why: v.why, ...sig };
  return { ok: true, website: input.url, confidence: v.strong ? "high" : "medium", why: v.why, ...sig };
}
async function enrichProspect(input) {
  const sources = [];
  const skipped = [];
  const existingSite = input.website?.trim() || null;
  let website = existingSite;
  let phone = input.phone?.trim() || null;
  let email = null;
  let confidence = existingSite ? "high" : null;
  const budget = newBudget();
  const center = input.city ? await geocodeCenter(input.city, budget) : null;
  const [fsq, osm, hunter] = await Promise.all([
    center ? fromFoursquare(input.business, center, budget) : Promise.resolve([]),
    fromOsm(input.business, input.city, budget),
    existingSite ? Promise.resolve([]) : fromHunterCompany(input.business, budget)
  ]);
  const all = [...fsq, ...osm, ...hunter];
  const matched = all.filter((c) => c.name && isSameBusiness(input.business, c.name, input.city));
  if (all.length && !matched.length) {
    const nearest = all.slice(0, 3).map((c) => c.name).filter(Boolean).join(", ");
    skipped.push(`No listing matched the name. Closest were: ${nearest || "nothing usable"}.`);
  }
  if (!phone) {
    const withPhone = matched.find((c) => c.phone);
    if (withPhone?.phone) {
      phone = withPhone.phone;
      sources.push(`${withPhone.source}:phone`);
    }
  }
  let siteReachable = true;
  if (!website) {
    const seen = /* @__PURE__ */ new Set();
    for (const c of matched) {
      if (!c.website) continue;
      if (left(budget) < 6e3) {
        skipped.push("Ran out of time before every candidate site could be checked.");
        break;
      }
      const host = hostOf(c.website);
      if (!host || seen.has(host)) continue;
      seen.add(host);
      const bad = badDomain(host);
      if (bad) {
        skipped.push(`Ignored ${bad}.`);
        continue;
      }
      const v = await verifySite(c.website, input.business, input.city, phone, budget);
      if (!v.ok) {
        skipped.push(`Ignored ${host}: ${v.why}.`);
        continue;
      }
      if (c.geoBlind && !v.phoneHit && !v.cityHit && !domainCarriesFullName(input.business, host)) {
        skipped.push(`Ignored ${host}: one word of their name matched, but nothing ties it to ${input.city ?? "their area"}.`);
        continue;
      }
      website = c.website;
      siteReachable = v.reachable;
      confidence = v.strong ? "high" : "medium";
      sources.push(`${c.source}:site(${v.why})`);
      break;
    }
  }
  if (website) {
    const host = hostOf(website);
    const osmEmail = matched.find((c) => c.email)?.email;
    if (osmEmail && acceptableEmail(osmEmail.toLowerCase(), host)) {
      email = osmEmail.toLowerCase();
      sources.push("osm:email");
    }
    if (!email && siteReachable) {
      const scraped = await scrapeEmail(website, budget);
      if (scraped) {
        email = scraped;
        sources.push("site");
      }
    } else if (!email) {
      skipped.push("Their site did not respond, so it was not scraped for an email.");
    }
    if (!email) {
      const h = await hunterEmail(host, budget);
      if (h) {
        email = h;
        sources.push("hunter");
      }
    }
    if (email) {
      const v = await verifyEmail(email, budget);
      if (!v.ok) {
        skipped.push(`Dropped ${email}: Hunter says ${v.status}.`);
        email = null;
      } else if (v.status !== "unchecked") sources.push(`verified:${v.status}`);
    }
  } else if (!existingSite) {
    skipped.push("No website we could confirm belongs to them, so no email was guessed.");
  }
  return { website, email, phone, sources, confidence, skipped };
}
export {
  badDomain,
  domainCarriesFullName,
  domainLabel,
  domainMatchesName,
  enrichProspect,
  hostOf,
  isSameBusiness,
  localTokens,
  verifyCandidateSite
};
