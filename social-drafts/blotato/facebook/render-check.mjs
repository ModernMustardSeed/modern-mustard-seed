// Verify fb-content-bank items render through the shared cardHTML renderer, and that the
// non-CTA URL strip works. Throwaway verification helper, safe to delete.
//   node render-check.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cardHTML } from '../main-street-ai/msa-30day.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'cards');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const bank = JSON.parse(readFileSync(path.join(__dirname, 'fb-content-bank.json'), 'utf8'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });

// fb-01 statement/no-cta (URL must be stripped), fb-19 stat/no-cta, fb-20 statement/CTA (URL kept)
for (const id of ['fb-01', 'fb-19', 'fb-20']) {
  const b = bank.find(x => x.id === id);
  let html = cardHTML(b);
  const hadUrl = /<span class="url">/.test(html);
  if (!b.cta) html = html.replace(/<span class="url">[^<]*<\/span>/, '<span class="brand">MODERN MUSTARD SEED</span>');
  const stillHasUrl = /<span class="url">/.test(html);
  console.log(`${id}  variant=${String(b.variant).padEnd(10)} cta=${String(b.cta).padEnd(5)} renderer-emitted-url=${hadUrl}  final-has-url=${stillHasUrl}`);
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, `check-${id}.png`), clip: { x: 0, y: 0, width: 1200, height: 1200 } });
}
await browser.close();
console.log('\nRendered 3 cards to cards/.');
