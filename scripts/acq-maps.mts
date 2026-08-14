/**
 * MAPS DISCOVERY for the Lead Finder.
 *
 * Same technique as scripts/maps-harvest.mjs, which is already the house method
 * for sourcing: drive a real Chromium against the public Google Maps search feed
 * and read the cards a human sees. It exists because Maps is the only source we
 * can reach that carries the three signals that qualify a trades lead: the star
 * rating and review count (how much this phone rings), the presence or absence of
 * a website (whether there is anything to read an email off), and a phone number.
 *
 * OpenStreetMap stays in the pipeline as a supplement. It is excellent data and
 * completely free, and it is also thin on US contractors: a Phoenix HVAC query
 * returns roughly sixty businesses, of which eight are new to us. The same query
 * on Maps returns well over a hundred, with review counts attached.
 *
 * This file lives in scripts/ and is imported only by the worker, never by
 * anything under app/. Playwright is a devDependency and must never end up in
 * the Vercel bundle.
 *
 * Politeness: one browser for the whole run, one query at a time, a real
 * User-Agent, a pause between queries, and no attempt to defeat anything. If the
 * feed does not render, the query is skipped and the run moves on.
 */
import { chromium, type Browser, type Page } from 'playwright';
import type { Market } from '../lib/acq/markets';
import type { Candidate } from '../lib/acq/source';

type Trade = 'hvac' | 'plumbing' | 'roofing';

/** Search phrases per trade, ordered so the first one is the highest yield. */
const QUERIES: Record<Trade, string[]> = {
  hvac: ['hvac contractors', 'air conditioning repair', 'heating and cooling companies'],
  plumbing: ['plumbers', 'plumbing contractors', 'drain cleaning service'],
  roofing: ['roofing contractors', 'roof repair companies', 'roofing companies'],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Read every card in the results feed. Runs inside the page.
 *
 * The Website button's href is Google's own answer to "what is this business's
 * website", which is why this source does not suffer the guessing problem that
 * once put walmart.com on a roofer.
 */
const EXTRACT = `(() => {
  const feed = document.querySelector('div[role="feed"]');
  if (!feed) return [];
  return [...feed.querySelectorAll('a[href*="/maps/place/"]')].map((a) => {
    const card = a.closest('div[jsaction]') || a.parentElement;
    const text = card ? card.innerText : '';
    const ratingEl = card ? card.querySelector('span[role="img"][aria-label*="star" i]') : null;
    const websiteEl = card ? card.querySelector('a[data-value="Website"], a[aria-label^="Visit"]') : null;
    return {
      name: a.getAttribute('aria-label') || '',
      mapsUrl: a.href,
      ratingLabel: ratingEl ? (ratingEl.getAttribute('aria-label') || '') : '',
      text,
      website: websiteEl ? websiteEl.href : null,
    };
  });
})()`;

type RawCard = { name: string; mapsUrl: string; ratingLabel: string; text: string; website: string | null };

/**
 * Rating and review count off the star element's own label ("4.8 stars 312
 * Reviews"). NEVER fall back to the first parenthesised number on the card: that
 * is the area code, and an earlier version of the house harvester gave three
 * Indianapolis plumbers exactly "317 reviews" that way.
 */
function parseRating(label: string, text: string): { rating: number | null; reviews: number | null } {
  let rating: number | null = null;
  let reviews: number | null = null;
  const m = /([0-9](?:\.[0-9])?)\s*stars?/i.exec(label);
  if (m) rating = parseFloat(m[1]);
  const r = /([\d,]+)\s*reviews?/i.exec(label);
  if (r) reviews = Number(r[1].replace(/,/g, ''));
  if (reviews == null) {
    // The feed sometimes renders "4.8(312)" as plain text on its own line.
    const t = /(?:^|\s)([0-5](?:\.[0-9])?)\s*\(([\d,]+)\)/.exec(text);
    if (t) {
      if (rating == null) rating = parseFloat(t[1]);
      reviews = Number(t[2].replace(/,/g, ''));
    }
  }
  if (rating != null && (rating < 1 || rating > 5)) rating = null;
  if (reviews != null && (reviews < 0 || reviews > 200000)) reviews = null;
  return { rating, reviews };
}

function parseCard(text: string): { phone: string | null; category: string | null; address: string | null; closed: boolean; open24: boolean } {
  const phone = (/\(\d{3}\)\s?\d{3}-\d{4}/.exec(text) || [null])[0];
  let category: string | null = null;
  let address: string | null = null;
  for (const line of text.split('\n')) {
    if (!line.includes('·')) continue;
    if (/\(\d{3}\)/.test(line)) continue; // the hours + phone line
    const parts = line.split('·').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) continue;
    if (!category) category = parts[0];
    if (parts.length > 1) address = parts[parts.length - 1];
    break;
  }
  return {
    phone,
    category,
    address,
    closed: /permanently closed|temporarily closed/i.test(text),
    open24: /open 24 hours/i.test(text),
  };
}

export async function openBrowser(headed = false): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: !headed });
  const ctx = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1400, height: 1000 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  return { browser, page };
}

async function runQuery(page: Page, q: string): Promise<RawCard[]> {
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(q)}?hl=en&gl=us`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(3200);

  const consent = await page.$('button[aria-label*="Accept" i], button:has-text("Accept all")');
  if (consent) {
    await consent.click().catch(() => {});
    await page.waitForTimeout(2200);
  }
  if (!(await page.$('div[role="feed"]'))) return [];

  // Scroll until the count stops growing. Maps caps a search near 120 places, so
  // three stable rounds means we are genuinely at the end of the list.
  let last = 0;
  let stable = 0;
  for (let i = 0; i < 16 && stable < 3; i++) {
    await page.evaluate(() => {
      const f = document.querySelector('div[role="feed"]');
      if (f) f.scrollTop = f.scrollHeight;
    });
    await page.waitForTimeout(1600);
    const n = await page.evaluate(() => document.querySelectorAll('div[role="feed"] a[href*="/maps/place/"]').length);
    if (n === last) stable++;
    else {
      stable = 0;
      last = n;
    }
  }

  return (await page.evaluate(EXTRACT)) as RawCard[];
}

/** Discover one trade in one market. Returns candidates in the shared shape. */
export async function discoverMaps(page: Page, market: Market, trade: Trade, maxQueries = 2): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const seen = new Set<string>();

  for (const phrase of QUERIES[trade].slice(0, maxQueries)) {
    let cards: RawCard[] = [];
    try {
      cards = await runQuery(page, `${phrase} in ${market.city}, ${market.state}`);
    } catch {
      continue;
    }
    for (const c of cards) {
      const name = (c.name || '').trim();
      if (!name) continue;
      const { phone, category, address, closed, open24 } = parseCard(c.text || '');
      if (closed) continue;
      const key = `${name.toLowerCase()}|${(c.website ?? phone ?? '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { rating, reviews } = parseRating(c.ratingLabel || '', c.text || '');
      out.push({
        business_name: name,
        phone,
        website: c.website,
        email: null,
        city: cityFrom(address) ?? market.city,
        state: market.state,
        address: address ?? null,
        postal_code: null,
        trade,
        hours: open24 ? open24Hours() : null,
        source: 'google-maps',
        source_url: c.mapsUrl,
        rating,
        review_count: reviews,
        category,
      } as Candidate & { rating: number | null; review_count: number | null; category: string | null });
    }
    await sleep(1400 + Math.floor(Math.random() * 900));
  }

  return out;
}

function cityFrom(address: string | null): string | null {
  if (!address) return null;
  // Feed addresses are usually just "6205 Rucker Rd" with no city, so this is
  // deliberately conservative: only accept a trailing ", City" shape.
  const m = /,\s*([A-Z][A-Za-z .'-]{2,40})$/.exec(address.trim());
  return m ? m[1] : null;
}

function open24Hours(): Record<string, string> {
  return {
    monday: '24 hours', tuesday: '24 hours', wednesday: '24 hours', thursday: '24 hours',
    friday: '24 hours', saturday: '24 hours', sunday: '24 hours',
  };
}
