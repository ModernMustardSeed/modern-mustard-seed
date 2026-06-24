/**
 * Email backfill: for prospects that have a website but no email yet, scrape
 * harder. Beyond the usual contact pages, this reads the homepage, follows any
 * link that looks like contact/quote/book/appointment, and scrapes those too.
 * PATCHes the email where one is found. Scoped by ?city= (default Bozeman).
 *
 * Run:  node scripts/backfill-emails.mjs [City]
 */

import { readFileSync, existsSync } from 'node:fs';

function loadEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = { ...loadEnv('.env.video'), ...loadEnv('.env.local') };
const SUPA_URL = env.supabase_url;
const SUPA_KEY = env.supabase_service_role_key;
const CITY = process.argv[2] || 'Bozeman';
const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';

const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const EMAIL_BLOCK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$|sentry|wixpress|\.wix\.com|example\.|yourdomain|domain\.com|email\.com|googleapis|cloudflare|schema\.org|w3\.org|godaddy|squarespace|\.wixsite|wordpress|jpg|sentry\.io/i;
const ROLE = /^(info|contact|hello|office|sales|admin|support|frontdesk|reception|booking|hi|service|scheduling|appointments?)@/i;

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
async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    if (!res.ok) return '';
    return (await res.text()).slice(0, 500_000);
  } catch { return ''; }
}
function emailsIn(html) {
  const h = html.replace(/%40/gi, '@').replace(/&#64;|&#x40;/gi, '@').replace(/\s*[\[(]at[\])]\s*/gi, '@');
  const out = [];
  for (const m of h.matchAll(/mailto:([^"'?>\s]+)/gi)) out.push(m[1]);
  for (const m of h.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) out.push(m[0]);
  return out;
}
function contactLinks(html, origin) {
  const links = new Set();
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (/contact|quote|book|appointment|schedule|reach|get-in-touch|estimate/i.test(href)) {
      try { links.add(new URL(href, origin).href); } catch { /* skip */ }
    }
  }
  return [...links].slice(0, 4);
}

async function findEmail(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = '';
  try { origin = new URL(base).origin; } catch { return null; }
  const host = hostOf(base);
  const collected = [];
  const home = await fetchHtml(base);
  collected.push(...emailsIn(home));
  let b = bestEmail(collected, host);
  if (b && (hostOf(b.split('@')[1]) === host || ROLE.test(b))) return b;

  // Common paths + links discovered on the homepage.
  const paths = ['/contact', '/contact-us', '/contactus', '/contact.html', '/about', '/about-us', '/get-a-quote', '/quote', '/book', '/schedule', '/appointments'];
  const urls = [...new Set([...paths.map((p) => origin + p), ...contactLinks(home, origin)])];
  for (const u of urls) {
    collected.push(...emailsIn(await fetchHtml(u)));
    b = bestEmail(collected, host);
    if (b && (hostOf(b.split('@')[1]) === host || ROLE.test(b))) return b;
  }
  return bestEmail(collected, host);
}

async function pool(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx]); }
  }));
}

async function main() {
  const url = `${SUPA_URL}/rest/v1/rep_prospects?city=eq.${encodeURIComponent(CITY)}&website=not.is.null&email=is.null&select=id,business,website&limit=1000`;
  const res = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } });
  const rows = await res.json();
  console.log(`${CITY}: ${rows.length} prospects with a site but no email. Scraping harder...`);

  let found = 0;
  await pool(rows, 6, async (r) => {
    const email = await findEmail(r.website);
    if (!email) return;
    const patch = await fetch(`${SUPA_URL}/rest/v1/rep_prospects?id=eq.${r.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email }),
    });
    if (patch.ok) { found++; console.log(`  + ${r.business}: ${email}`); }
  });

  console.log(`\nBackfilled ${found} more emails.`);
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
