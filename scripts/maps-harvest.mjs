/**
 * GOOGLE MAPS HARVESTER — stage 1 of the Maps sourcing pipeline.
 *
 * Drives a real Chromium against Google Maps search and reads the result feed.
 * Maps is the only source we can reach that carries the three signals that
 * actually qualify a lead for MMS:
 *
 *   1. a STAR RATING + review count      → "they're good at the work, bad at the web"
 *   2. the presence or ABSENCE of a website link → the strongest build pitch there is
 *   3. a phone number on the card         → a lead we cannot call is not a lead
 *
 * Foursquare was the obvious API alternative and it is OUT OF CREDITS (429,
 * "no API credits remaining"), and there is no Google Places key on this
 * account. So we read the public search feed, slowly and politely, and cache
 * every run to disk so a re-run never re-scrapes.
 *
 * Writes raw cards to scripts/.cache/maps-<metro>.json. Stage 2
 * (source-maps.mjs) does all qualification, enrichment and writing. Nothing
 * here touches the database.
 *
 * Run:  node scripts/maps-harvest.mjs indy
 *       node scripts/maps-harvest.mjs indy --headed      (watch it work)
 *       node scripts/maps-harvest.mjs indy --fresh       (ignore the cache)
 *       node scripts/maps-harvest.mjs indy --queries 6   (smoke test)
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { METROS } from './metros.mjs';

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith('--'));
const positional = argv.filter((a) => !a.startsWith('--'));
const METRO_KEY = (positional[0] || 'indy').toLowerCase();
const HEADED = flags.includes('--headed');
const FRESH = flags.includes('--fresh');
const QUERY_CAP = Number((argv.find((a, i) => argv[i - 1] === '--queries') || 0)) || 0;

const metro = METROS[METRO_KEY];
if (!metro) {
  console.error(`Unknown metro "${METRO_KEY}". Known: ${Object.keys(METROS).join(', ')}`);
  process.exit(1);
}

const CACHE_DIR = 'scripts/.cache';
const CACHE = `${CACHE_DIR}/maps-${METRO_KEY}.json`;
mkdirSync(CACHE_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── the queries ──────────────────────────────────────────────────
// trade x geographic anchor. Maps already spreads results across the whole
// metro (a single "plumbers in Indianapolis" run returned businesses from
// Rucker Rd to Southeastern Ave), so a handful of anchors gives depth without
// a combinatorial explosion of queries.
function buildQueries() {
  const out = [];
  for (const trade of metro.trades) {
    for (const anchor of metro.anchors) out.push({ trade, anchor, q: `${trade} in ${anchor}` });
  }
  return QUERY_CAP ? out.slice(0, QUERY_CAP) : out;
}

/**
 * Read every card in the results feed.
 *
 * Runs in the page. Each result is an <a href*="/maps/place/">; the card is its
 * closest [jsaction] ancestor and carries rating, category, address, hours,
 * phone and (when they have one) a Website button whose href is the real URL
 * off their Business Profile. That href is Google's own answer for "what is
 * this business's website", which is exactly why this source does not suffer
 * the guessing problem that put walmart.com on a roofer.
 */
const EXTRACT = () => {
  const feed = document.querySelector('div[role="feed"]');
  if (!feed) return [];
  const links = [...feed.querySelectorAll('a[href*="/maps/place/"]')];
  return links.map((a) => {
    const card = a.closest('div[jsaction]') || a.parentElement;
    const text = card ? card.innerText : '';
    // "4.8 stars 312 Reviews" lives on the rating span's aria-label; the review
    // count is frequently absent from innerText, so prefer the label.
    const ratingEl = card?.querySelector('span[role="img"][aria-label*="star" i]');
    const ratingLabel = ratingEl?.getAttribute('aria-label') || '';
    const websiteEl = card?.querySelector('a[data-value="Website"], a[aria-label^="Visit"]');
    return {
      name: a.getAttribute('aria-label') || '',
      mapsUrl: a.href,
      ratingLabel,
      text,
      website: websiteEl?.href || null,
    };
  });
};

/**
 * Rating only, and only from the star element's own label.
 *
 * ⚠️ The review COUNT is not in this feed layout. The rating element's label is
 * literally "4.8 stars" with no count, and the count span (UY7F9) is not
 * rendered at all. An earlier version fell back to the first parenthesised
 * number on the card and harvested the AREA CODE: Hope Plumbing, Benjamin
 * Franklin and Carter's all came back with exactly "317 reviews" off their
 * "(317) ..." phone numbers. Counts now come from the detail pass
 * (maps-detail.mjs), which reads them off the place page, and stay null here.
 * Never re-add a positional fallback for a number this important.
 */
function parseRating(label, text) {
  let rating = null;
  const m = /([0-9](?:\.[0-9])?)\s*stars?/i.exec(label || '');
  if (m) rating = parseFloat(m[1]);
  if (rating == null) {
    // Layout fallback: a line that is nothing but the rating.
    const t = /^\s*([0-5](?:\.[0-9])?)\s*$/m.exec(text || '');
    if (t) rating = parseFloat(t[1]);
  }
  if (rating != null && (rating < 1 || rating > 5)) rating = null;
  return { rating, reviews: null };
}

// The card's info block reads "Plumber ·  · 6205 Rucker Rd" then
// "Open 24 hours · (317) 912-0222".
function parseCard(text) {
  const phone = (/\(\d{3}\)\s?\d{3}-\d{4}/.exec(text || '') || [null])[0];
  let category = null;
  let address = null;
  for (const line of (text || '').split('\n')) {
    if (!line.includes('·')) continue;
    if (/\(\d{3}\)/.test(line)) continue; // that's the hours+phone line
    const parts = line.split('·').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) continue;
    if (!category) category = parts[0];
    if (parts.length > 1) address = parts[parts.length - 1];
    break;
  }
  const closed = /permanently closed|temporarily closed/i.test(text || '');
  return { phone, category, address, closed };
}

async function harvestQuery(page, { q, trade, anchor }) {
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(q)}?hl=en&gl=us`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(3500);

  const consent = await page.$('button[aria-label*="Accept" i], button:has-text("Accept all")');
  if (consent) {
    await consent.click().catch(() => {});
    await page.waitForTimeout(2500);
  }

  const hasFeed = await page.$('div[role="feed"]');
  if (!hasFeed) return { rows: [], note: 'no feed (single result or blocked)' };

  // Scroll the feed until the count stops growing. Maps caps a search at roughly
  // 120 places; three stable rounds means we are genuinely at the end.
  let last = 0;
  let stable = 0;
  for (let i = 0; i < 18 && stable < 3; i++) {
    await page.evaluate(() => {
      const f = document.querySelector('div[role="feed"]');
      if (f) f.scrollTop = f.scrollHeight;
    });
    await page.waitForTimeout(1800);
    const n = await page.evaluate(() => document.querySelectorAll('div[role="feed"] a[href*="/maps/place/"]').length);
    if (n === last) stable++;
    else { stable = 0; last = n; }
  }

  const raw = await page.evaluate(EXTRACT);
  const rows = raw
    .map((r) => {
      const { rating, reviews } = parseRating(r.ratingLabel, r.text);
      const { phone, category, address, closed } = parseCard(r.text);
      return {
        name: (r.name || '').trim(),
        rating,
        reviews,
        phone,
        category,
        address,
        website: r.website,
        // ⚠️ KEEP THE WHOLE HREF. The `/data=!4m7!3m6!1s0x...` segment IS the
        // place identifier. Stripping it (an earlier version did) leaves
        // ".../maps/place/R+%26+R+Plumbing", which Google resolves against the
        // BROWSER's location: it rendered an empty pin at 47.99,-114.04 near
        // Kalispell instead of the Indianapolis plumber. The detail pass needs
        // this URL to land on the right business.
        mapsUrl: r.mapsUrl,
        closed,
        trade,
        anchor,
      };
    })
    .filter((r) => r.name && !r.closed);
  return { rows, note: null };
}

async function main() {
  const queries = buildQueries();
  console.log(`\nHarvesting Google Maps · ${metro.label} · ${queries.length} queries · ${HEADED ? 'headed' : 'headless'}`);

  // Resume: a harvest is slow and network-fragile, so completed queries are
  // remembered and skipped unless --fresh.
  let cache = { metro: METRO_KEY, label: metro.label, done: [], rows: [] };
  if (!FRESH && existsSync(CACHE)) {
    try {
      cache = JSON.parse(readFileSync(CACHE, 'utf8'));
      console.log(`Resuming cache: ${cache.rows.length} rows from ${cache.done.length} finished queries`);
    } catch { /* corrupt cache, start over */ }
  }
  const done = new Set(cache.done);

  const browser = await chromium.launch({ headless: !HEADED });
  const ctx = await browser.newContext({
    locale: 'en-US',
    timezoneId: metro.tz,
    viewport: { width: 1400, height: 1000 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  let i = 0;
  for (const spec of queries) {
    i++;
    if (done.has(spec.q)) { console.log(`  [${i}/${queries.length}] ${spec.q} — cached`); continue; }
    try {
      const { rows, note } = await harvestQuery(page, spec);
      cache.rows.push(...rows);
      cache.done.push(spec.q);
      done.add(spec.q);
      const noSite = rows.filter((r) => !r.website).length;
      console.log(`  [${i}/${queries.length}] ${spec.q} — ${rows.length} cards (${noSite} no-site)${note ? ` [${note}]` : ''}`);
    } catch (e) {
      console.warn(`  [${i}/${queries.length}] ${spec.q} — FAILED: ${e.message}`);
    }
    writeFileSync(CACHE, JSON.stringify(cache));
    await sleep(1200 + Math.floor(Math.random() * 900)); // be a polite guest
  }

  await browser.close();

  const uniq = new Set(cache.rows.map((r) => r.name.toLowerCase()));
  console.log(`\nHarvest complete: ${cache.rows.length} cards, ~${uniq.size} unique businesses`);
  console.log(`Cached → ${CACHE}`);
  console.log(`Next:  node scripts/source-maps.mjs ${METRO_KEY} 300\n`);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
