#!/usr/bin/env node
// Fresh capture of the CXC storefront at /shop, cookie banner dismissed.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto('https://crossandcovenant.co/shop', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(3500);
await page.locator('button:has-text("Essential only")').first().click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(HERE, 'shots', 'cross-covenant.png') });
console.log('OK cross-covenant shop');
await browser.close();
