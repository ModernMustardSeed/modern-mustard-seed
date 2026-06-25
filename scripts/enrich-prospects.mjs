/**
 * Bulk, ADDITIVE email enrichment for the rep Tracker.
 *
 * For every prospect with no email, find a contact email and fill it in WITHOUT
 * touching anything else (audits, notes, status, lead links are all preserved).
 * Mirrors lib/enrich.ts: find a website (Foursquare key, else OSM), scrape it for
 * an email, and fall back to Hunter.io when HUNTER_API_KEY is set. Also backfills
 * the linked pipeline lead's email when the prospect was already promoted.
 *
 * Run: node scripts/enrich-prospects.mjs            (free: scrape only)
 *      HUNTER_API_KEY=xxx node scripts/enrich-prospects.mjs   (paid fallback on)
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const get = (k) => { for (const l of env.split(/\r?\n/)) { if (l.toLowerCase().startsWith(k.toLowerCase() + '=')) { let v = l.slice(k.length + 1).trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return v; } } return ''; };
const sb = createClient(get('supabase_url'), get('supabase_service_role_key'), { auth: { persistSession: false } });
const FSQ_KEY = process.env.FOURSQUARE_API_KEY || get('FOURSQUARE_API_KEY');
const HUNTER_KEY = process.env.HUNTER_API_KEY || '';
const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|sentry\.io|googleapis|cloudflare|schema\.org|w3\.org/i;
const ROLE_PREFIX = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi)@/i;
const normName = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (url) => { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

function pickBestEmail(emails, siteHost) {
  const clean = Array.from(new Set(emails.map((e) => e.toLowerCase().trim()))).filter((e) => !EMAIL_BLOCK.test(e) && e.length <= 100 && /@[a-z0-9.-]+\.[a-z]{2,}$/.test(e));
  if (!clean.length) return null;
  clean.sort((a, b) => {
    const da = hostOf(a.split('@')[1]) === siteHost ? 1 : 0, db = hostOf(b.split('@')[1]) === siteHost ? 1 : 0;
    if (da !== db) return db - da;
    return (ROLE_PREFIX.test(b) ? 1 : 0) - (ROLE_PREFIX.test(a) ? 1 : 0);
  });
  return clean[0];
}
async function emailsFromPage(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    if (!res.ok) return [];
    let html = (await res.text()).slice(0, 400000);
    html = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*\[at\]\s*/gi, '@').replace(/\s*\(at\)\s*/gi, '@');
    const out = [];
    for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) out.push(m[1]);
    for (const m of html.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) out.push(m[0]);
    return out;
  } catch { return []; }
}
async function scrapeEmail(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = ''; try { origin = new URL(base).origin; } catch { return null; }
  const siteHost = hostOf(base);
  const collected = [];
  for (const page of [base, `${origin}/contact`, `${origin}/contact-us`, `${origin}/about`]) {
    collected.push(...(await emailsFromPage(page)));
    const best = pickBestEmail(collected, siteHost);
    if (best && (hostOf(best.split('@')[1]) === siteHost || ROLE_PREFIX.test(best))) return best;
  }
  return pickBestEmail(collected, siteHost);
}
async function hunterEmail(domain) {
  if (!HUNTER_KEY || !domain) return null;
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${HUNTER_KEY}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const j = await res.json();
    const emails = (j.data?.emails ?? []).filter((e) => e?.value && !EMAIL_BLOCK.test(e.value));
    if (!emails.length) return null;
    emails.sort((a, b) => ((b.type === 'generic') - (a.type === 'generic')) || ((b.confidence ?? 0) - (a.confidence ?? 0)));
    return emails[0].value.toLowerCase();
  } catch { return null; }
}

const geoCache = new Map();
async function geocode(city) {
  if (!city) return null;
  const key = city.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key);
  let out = null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (res.ok) { const a = await res.json(); if (a[0]) out = { lat: +a[0].lat, lon: +a[0].lon }; }
  } catch { /* ignore */ }
  geoCache.set(key, out);
  await sleep(1100); // Nominatim politeness (1/sec), only on cache miss
  return out;
}
async function fsqWebsite(business, center) {
  if (!FSQ_KEY || !center) return null;
  const p = new URLSearchParams({ query: business, ll: `${center.lat},${center.lon}`, radius: '40000', limit: '5', fields: 'name,tel,website,location' });
  try {
    const res = await fetch(`https://places-api.foursquare.com/places/search?${p}`, { headers: { Authorization: `Bearer ${FSQ_KEY}`, 'X-Places-Api-Version': '2025-06-17', Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const results = (await res.json()).results ?? [];
    const target = normName(business);
    const best = results.find((r) => normName(r.name).includes(target) || target.includes(normName(r.name))) ?? results[0];
    return best ? { website: best.website ?? null, phone: best.tel ?? null } : null;
  } catch { return null; }
}

const { data: rows } = await sb.from('rep_prospects').select('id,business,city,website,phone,email,lead_id').is('email', null).order('created_at');
console.log(`email-less prospects: ${rows.length}${HUNTER_KEY ? ' (Hunter ON)' : ' (free: scrape only)'}`);
let found = 0, sites = 0, done = 0;
for (const p of rows) {
  let website = p.website?.trim() || null, phone = p.phone?.trim() || null, email = null;
  if (!website) {
    const center = await geocode(p.city);
    const fsq = await fsqWebsite(p.business, center);
    if (fsq?.website) { website = fsq.website; if (!phone && fsq.phone) phone = fsq.phone; }
  }
  if (website) { email = await scrapeEmail(website); if (!email) email = await hunterEmail(hostOf(website)); }
  const patch = { updated_at: new Date().toISOString() };
  if (!p.website && website) { patch.website = website; sites++; }
  if (!p.phone && phone) patch.phone = phone;
  if (email) { patch.email = email; found++; }
  if (Object.keys(patch).length > 1) await sb.from('rep_prospects').update(patch).eq('id', p.id);
  if (email && p.lead_id) { // backfill the linked pipeline lead, additively
    const { data: lead } = await sb.from('leads').select('email').eq('id', p.lead_id).maybeSingle();
    if (lead && !lead.email) await sb.from('leads').update({ email }).eq('id', p.lead_id);
  }
  done++;
  if (done % 20 === 0) console.log(`...${done}/${rows.length} | emails +${found} | sites +${sites}`);
}
console.log(`DONE. processed ${done} | emails found ${found} | websites discovered ${sites}`);
