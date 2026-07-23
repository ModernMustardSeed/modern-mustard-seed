// Visual verification of fb-deck.html at phone + desktop, light + dark.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(__dirname, 'fb-deck.html').replace(/\\/g, '/');
const browser = await chromium.launch();

for (const [name, w, h, scheme] of [['phone-light', 390, 844, 'light'], ['phone-dark', 390, 844, 'dark'], ['desktop-light', 1280, 900, 'light']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
  await page.goto(url);
  await page.waitForTimeout(300);
  // horizontal overflow check
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(`${name.padEnd(14)} h-overflow=${overflow}`);
  await page.screenshot({ path: path.join(__dirname, `verify-${name}.png`), fullPage: false });
  await page.close();
}

// teleprompter state
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
await page.goto(url);
await page.click('[data-prompt="1"]');
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(__dirname, 'verify-prompter.png') });
const promptText = await page.textContent('.prompter-hook');
console.log('prompter hook:', JSON.stringify(promptText.slice(0, 60)));
await page.click('#pClose');

// posts tab
await page.click('[data-tab="posts"]');
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(__dirname, 'verify-posts.png') });

// group tab
await page.click('[data-tab="group"]');
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(__dirname, 'verify-group.png') });
const groupName = await page.textContent('#group .card .copy-body p');
console.log('group name parsed:', JSON.stringify(groupName));

await browser.close();
console.log('\nScreenshots written.');
