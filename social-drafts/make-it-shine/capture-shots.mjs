#!/usr/bin/env node
// Fresh hero screenshots for the Lit Window set: Wildmere Honey + CXC storefront.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(HERE, 'shots'), { recursive: true });

const TARGETS = [
  { key: 'wildmere', url: 'https://wildmere.vercel.app', wait: 5000 },
  { key: 'cross-covenant', url: 'https://crossandcovenant.co', wait: 4000 },
];

const browser = await chromium.launch();
for (const t of TARGETS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(t.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(t.wait);
  // dismiss any fixed cookie/email overlays that cover the hero
  await page.keyboard.press('Escape').catch(() => {});
  await page.screenshot({ path: path.join(HERE, 'shots', `${t.key}.png`) });
  console.log(`OK ${t.key}`);
  await page.close();
}
await browser.close();
