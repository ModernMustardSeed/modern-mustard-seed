#!/usr/bin/env node
// CXC storefront recapture: dismiss cookies, then grab three scroll positions.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto('https://crossandcovenant.co', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(3000);
await page.locator('button:has-text("Essential only")').first().click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(1200);
for (const [i, y] of [[1, 900], [2, 1800], [3, 2700]]) {
  await page.evaluate((yy) => window.scrollTo({ top: yy }), y);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(HERE, 'shots', `cxc-${i}.png`) });
  console.log(`OK cxc-${i} at y=${y}`);
}
await browser.close();
