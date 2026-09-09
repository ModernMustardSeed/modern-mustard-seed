import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3108';
const output = process.env.AI_QA_OUT || 'C:/Users/SMSca/artifacts/mms-ai-discoverability';
await fs.mkdir(output, { recursive: true });
const report = { base, checkedAt: new Date().toISOString(), pages: [], crawlers: [], browser: [], issues: [] };
const xmlResponse = await fetch(`${base}/sitemap.xml`);
assert.equal(xmlResponse.status, 200);
const xml = await xmlResponse.text();
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
assert.equal(urls.length, new Set(urls).size);
const queue = [...urls];
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) {
    const canonical = queue.shift();
    const route = new URL(canonical).pathname;
    try {
      const response = await fetch(`${base}${route}`, { redirect: 'manual' });
      const html = await response.text();
      const doc = parse(html);
      const schemas = doc.querySelectorAll('script[type="application/ld+json"]').map((script) => JSON.parse(script.textContent));
      const item = { route, status: response.status, title: doc.querySelector('title')?.textContent,
        canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        h1: doc.querySelectorAll('h1').length, schemaBlocks: schemas.length,
        noindex: /noindex/i.test(`${doc.querySelector('meta[name="robots"]')?.getAttribute('content') || ''} ${response.headers.get('x-robots-tag') || ''}`) };
      report.pages.push(item);
      if (item.status !== 200 || item.noindex || item.canonical !== canonical || !item.title) report.issues.push(item);
    } catch (error) { report.issues.push({ route, error: String(error) }); }
  }
}));
for (const agent of ['OAI-SearchBot', 'Googlebot', 'Bingbot', 'Applebot', 'PerplexityBot']) {
  const response = await fetch(`${base}/ai-websites`, { headers: { 'user-agent': agent } });
  const body = await response.text();
  report.crawlers.push({ agent, status: response.status, readable: body.includes('AI-native product studio in Kalispell') });
}
for (const route of ['/ai-websites/?utm_source=chatgpt', '/ai-websites?utm_source=chatgpt', '/case-studies', '/does-not-exist-ai-qa']) {
  const response = await fetch(`${base}${route}`, { redirect: 'manual' });
  report.pages.push({ route, status: response.status, redirect: response.headers.get('location') });
}
await fs.writeFile(path.join(output, 'http-report.json'), JSON.stringify(report, null, 2));

const browser = await chromium.launch({ headless: true });
const axePackage = (await fs.readdir('node_modules/.pnpm')).find((name) => name.startsWith('axe-core@'));
const axe = path.resolve(`node_modules/.pnpm/${axePackage}/node_modules/axe-core/axe.min.js`);
const routes = ['/ai-websites', '/resources', '/blog/ai-readable-website-checklist', '/montana/kalispell', '/about', '/', '/websites', '/talking-website', '/voice-agents', '/contact', '/book', '/demos', '/website-audit'];
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 } });
    // Local UI tests never send enquiries, create demos, book calls or start voice sessions.
    if (new URL(base).hostname === 'localhost') await context.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slots: [] }) }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of routes) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      const essential = page.getByRole('button', { name: 'Essential only', exact: true });
      if (await essential.isVisible()) await essential.click();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async () => { await Promise.all(document.getAnimations().filter((animation) => Number.isFinite(animation.effect?.getTiming().iterations)).map((animation) => animation.finished.catch(() => {}))); });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const mainCount = await page.locator('main').count();
      const h1Count = await page.locator('h1').count();
      await page.addScriptTag({ path: axe });
      const a11y = await page.evaluate(async () => {
        const result = await window.axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return result.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, examples: v.nodes.slice(0, 2).map((n) => n.html) }));
      });
      const item = { route, width, overflow, mainCount, h1Count, a11y, errors: errors.splice(0) };
      report.browser.push(item);
      if (overflow || mainCount !== 1 || h1Count !== 1 || item.errors.length) report.issues.push(item);
      if (['/ai-websites', '/resources', '/blog/ai-readable-website-checklist'].includes(route) && (overflow || mainCount !== 1 || h1Count !== 1 || a11y.length || item.errors.length)) report.issues.push(item);
      if (['/ai-websites', '/resources', '/montana/kalispell', '/'].includes(route)) await page.screenshot({ path: path.join(output, `${route.replace(/\//g, '-') || 'home'}-${width}.png`), fullPage: route !== '/' });
    }
    await context.close();
  }
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const page = await noJS.newPage();
  for (const route of ['/', '/ai-websites', '/resources', '/montana/kalispell', '/blog/ai-readable-website-checklist']) {
    await page.goto(`${base}${route}`);
    assert.ok((await page.locator('main').innerText()).length > 500, `No-JS content: ${route}`);
    assert.ok(await page.getByRole('heading', { level: 1 }).isVisible(), `No-JS H1: ${route}`);
  }
  await noJS.close();
  report.noJavaScript = 'Five public pages retain visible main content and headings';
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ sitemapURLs: urls.length, browserChecks: report.browser.length, issues: report.issues, output }, null, 2));
if (report.issues.length) process.exitCode = 1;
