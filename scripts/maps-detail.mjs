/**
 * MAPS DETAIL PASS — stage 1.5. Opens each shortlisted place page and reads the
 * facts the search feed does not carry.
 *
 * What it reliably returns:
 *   - the FULL address, so a lead lands under its real city and ZIP (Carmel,
 *     Fishers, Greenwood) instead of every row being dumped as "Indianapolis"
 *   - the phone in E.164, straight off `data-item-id="phone:tel:+1..."`
 *   - an authoritative confirmation of whether they have a website at all
 *
 * ⚠️ WHAT IT CANNOT RETURN, and why (verified 2026-07-27, do not retry blind):
 * Google serves this environment a REDUCED-DATA variant of Maps. The review
 * count span renders EMPTY and there is no Reviews tab, even for Hope Plumbing
 * which has hundreds of real reviews (its panel offers only "Overview" and
 * "About" tabs and a "Write a review" button). This was reproduced headless AND
 * headed, on a no-website lead and a high-review lead. So review COUNT and
 * review TEXT are not obtainable here, which means the "customers complain they
 * never answer" qualifier cannot be sourced from Google Maps on this machine.
 * Star RATING is available and is what we qualify on. If you want complaint
 * quotes, they have to come from the BBB/Yelp review-mining pipeline
 * (scripts/import-review-leads.mjs), not from here.
 */
import { chromium } from 'playwright';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';

// "Address: 5508 Elmwood Ave #304, Indianapolis, IN 46203"
function parseAddress(label) {
  if (!label) return {};
  const clean = label.replace(/^Address:\s*/i, '').trim();
  const m = /^(.*?),\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5})?/.exec(clean);
  if (!m) return { addressFull: clean };
  return {
    addressFull: clean,
    street: m[1].trim(),
    city: m[2].trim(),
    state: m[3].trim(),
    zip: m[4] || null,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readPlace(page, row) {
  await page.goto(`${row.mapsUrl}${row.mapsUrl.includes('?') ? '&' : '?'}hl=en&gl=us`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  await page.waitForTimeout(4200);

  const got = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      h1: q('h1')?.innerText?.trim() || null,
      website: q('a[data-item-id="authority"]')?.href || null,
      phoneItem: q('button[data-item-id^="phone"]')?.getAttribute('data-item-id') || null,
      addressLabel: q('button[data-item-id="address"]')?.getAttribute('aria-label') || null,
      ratingLabel:
        q('div.F7nice [aria-label*="star" i]')?.getAttribute('aria-label') ||
        q('[role="img"][aria-label*="star" i]')?.getAttribute('aria-label') ||
        null,
    };
  });

  const addr = parseAddress(got.addressLabel);
  const phoneE164 = got.phoneItem ? got.phoneItem.replace(/^phone:tel:/, '') : null;
  const rating = got.ratingLabel ? parseFloat((/([0-9](?:\.[0-9])?)/.exec(got.ratingLabel) || [])[1]) : null;

  return {
    detailOk: !!got.h1,
    detailName: got.h1,
    websiteConfirmed: got.website,
    hasWebsiteConfirmed: !!got.website,
    phoneE164,
    ratingConfirmed: Number.isFinite(rating) ? rating : null,
    ...addr,
  };
}

/**
 * Walk `rows` through their place pages, `concurrency` tabs at a time.
 * Mutates each row with the detail fields. Fail-soft: a row that errors keeps
 * everything the feed already gave it and is marked detailOk:false.
 */
/**
 * ⚠️ PACING IS LOad-BEARING. A first run at concurrency 3 with no delay loaded
 * only 105 of 300 place pages: after roughly the hundredth hit Google started
 * returning a page whose h1 is EMPTY. It throws nothing and looks exactly like a
 * selector bug, which is why the failure is recorded as `blocked` rather than
 * swallowed. Every one of the last 150 rows failed in a block, the signature of
 * rate limiting rather than bad data. Hence: concurrency 2, a delay between
 * loads, and one slow retry before giving up on a row.
 */
export async function detailPass(rows, { concurrency = 2, headless = true, delayMs = 1500, onProgress } = {}) {
  const browser = await chromium.launch({ headless });
  const ctx = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1300, height: 900 },
    userAgent: UA,
  });

  let cursor = 0;
  let done = 0;
  let blocked = 0;
  const pages = await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, () => ctx.newPage()));

  await Promise.all(
    pages.map(async (page) => {
      while (cursor < rows.length) {
        const row = rows[cursor++];
        try {
          let got = await readPlace(page, row);
          if (!got.detailOk) {
            // Back off and try once more before calling it lost.
            await sleep(4000 + Math.floor(Math.random() * 3000));
            got = await readPlace(page, row);
          }
          Object.assign(row, got);
          if (!row.detailOk) { row.blocked = true; blocked++; }
        } catch (e) {
          row.detailOk = false;
          row.detailError = e.message.slice(0, 80);
        }
        done++;
        if (onProgress && done % 25 === 0) onProgress(done, rows.length, blocked);
        await sleep(delayMs + Math.floor(Math.random() * 800));
      }
      await page.close().catch(() => {});
    })
  );

  await browser.close();
  return { rows, blocked };
}
