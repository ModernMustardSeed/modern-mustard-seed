import fs from 'node:fs/promises';
import net from 'node:net';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
const server = net.createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const browser = await chromium.launch({ headless: true, args: [`--remote-debugging-port=${port}`] });
try {
  const result = await lighthouse(process.argv[2] || 'http://localhost:3108/ai-websites', { port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
  const output = process.env.AI_QA_OUT || 'C:/Users/SMSca/artifacts/mms-ai-discoverability';
  await fs.mkdir(output, {recursive:true});
  await fs.writeFile(`${output}/lighthouse-ai-websites-after.json`, result.report);
  console.log(JSON.stringify({scores: Object.fromEntries(Object.entries(result.lhr.categories).map(([key,value]) => [key,Math.round(value.score*100)])), lcp:result.lhr.audits['largest-contentful-paint'].displayValue, cls:result.lhr.audits['cumulative-layout-shift'].displayValue}));
} finally { await browser.close(); }
