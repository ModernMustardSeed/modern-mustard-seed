import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// This test only operates against a local server and mocks all business APIs.
const base = 'http://localhost:3108';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const calls = [];
let failContact = false;
let failDemo = false;
const slot = { startIso: '2026-09-15T16:00:00Z', display: 'September 15, 10:00 AM Mountain', shortLabel: 'Sep 15', dayLabel: 'Tuesday, September 15', timeLabel: '10:00 AM' };
await context.route('**/api/**', async (route) => {
  const pathname = new URL(route.request().url()).pathname;
  calls.push({ pathname, method: route.request().method() });
  const response = pathname === '/api/book/slots' ? { slots: [slot] }
    : pathname === '/api/book' ? { display: slot.display }
    : pathname === '/api/demo-station' ? (failDemo ? { message: 'Intercepted demo failure' } : { url: '/resources', returning: false })
    : pathname === '/api/contact' && failContact ? { error: 'Test failure' } : { ok: true };
  await route.fulfill({ status: (pathname === '/api/contact' && failContact) || (pathname === '/api/demo-station' && failDemo) ? 500 : 200, contentType: 'application/json', body: JSON.stringify(response) });
});
try {
  await page.goto(`${base}/ai-websites?utm_source=chatgpt&utm_campaign=field-notes`, { referer: 'https://chatgpt.com/', waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => sessionStorage.getItem('mms_acquisition')), null);
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await page.waitForFunction(() => sessionStorage.getItem('mms_acquisition'));
  const source = await page.evaluate(() => JSON.parse(sessionStorage.getItem('mms_acquisition')));
  assert.equal(source.ai_source, 'chatgpt');
  assert.equal(source.ai_source_evidence, 'referrer');
  assert.equal(source.ai_landing_page, '/ai-websites');
  const demoLink = page.getByRole('link', { name: 'Build My Free Demo', exact: true }).first();
  assert.ok((await demoLink.getAttribute('href')).includes('utm_source=chatgpt'));

  await page.goto(`${base}/contact`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__events = []; window.gtag = (...args) => window.__events.push(args); });
  await page.getByLabel('Name', { exact: true }).fill('Local QA');
  await page.getByLabel('Email', { exact: true }).fill('qa@example.test');
  await page.getByLabel('Your note', { exact: true }).fill('Intercepted local conversion test.');
  await page.getByRole('button', { name: 'Mail it', exact: true }).click();
  await page.waitForFunction(() => window.__events.some((e) => e[1] === 'generate_lead'));
  const lead = await page.evaluate(() => window.__events.find((e) => e[1] === 'generate_lead'));
  assert.equal(lead[2].ai_source, 'chatgpt');
  assert.equal(lead[2].ai_landing_page, '/ai-websites');
  assert.equal(lead[2].landing_utm_campaign, 'field-notes');

  failContact = true;
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__events = []; window.gtag = (...args) => window.__events.push(args); });
  await page.getByLabel('Name', { exact: true }).fill('Local QA');
  await page.getByLabel('Email', { exact: true }).fill('qa@example.test');
  await page.getByLabel('Your note', { exact: true }).fill('Intercepted failure test.');
  await page.getByRole('button', { name: 'Mail it', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(() => window.__events.filter((e) => e[1] === 'generate_lead').length), 0);

  await page.goto(`${base}/book`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__events = []; window.gtag = (...args) => window.__events.push(args); });
  await page.getByLabel('Your name', { exact: true }).fill('Local QA');
  await page.getByLabel('Email', { exact: true }).fill('qa@example.test');
  await page.getByLabel('What do you want to work on?', { exact: true }).fill('Intercepted booking test.');
  await page.getByRole('button', { name: '10:00 AM', exact: true }).click();
  await page.locator('button[type="submit"]').click();
  await page.getByRole('heading', { name: 'You are on the book.' }).waitFor();
  const booking = await page.evaluate(() => window.__events.find((e) => e[1] === 'schedule'));
  assert.equal(booking[2].ai_source, 'chatgpt');

  for (const shouldFail of [true, false]) {
    failDemo = shouldFail;
    await page.goto(`${base}/demos`, { waitUntil: 'networkidle' });
    await page.getByLabel('Business name', { exact: false }).fill('Local QA Studio');
    await page.getByLabel('Your name', { exact: false }).fill('Local QA');
    await page.getByLabel('Business phone', { exact: false }).fill('4065550123');
    await page.getByLabel('Email', { exact: false }).fill('qa@example.test');
    await page.getByRole('button', { name: 'Build my demos, free', exact: false }).click();
    if (shouldFail) await page.getByText('Intercepted demo failure', { exact: true }).waitFor();
    else await page.waitForURL(`${base}/resources`);
  }

  await page.getByRole('button', { name: 'Cookie Preferences', exact: false }).click();
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('mms_acquisition')), null);
  assert.ok(!calls.some((call) => call.pathname === '/api/instant-callback'));
  const report = { consent: 'No storage before grant; cleared on withdrawal', utmLinks: 'Preserved', lead: lead[2], booking: booking[2], failedLeadEvents: 0, demo: 'Failure recovery and success redirect passed', businessAPIs: 'All intercepted locally', calls };
  await fs.writeFile('C:/Users/SMSca/artifacts/mms-ai-discoverability/conversions.json', JSON.stringify(report, null, 2));
  console.log('PASS: consent, UTM links, cross-page source, successful lead and booking, failed-lead suppression, consent withdrawal. All business APIs mocked.');
} finally { await browser.close(); }
