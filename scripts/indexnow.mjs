#!/usr/bin/env node
// IndexNow submitter. Pings Bing/Yandex/etc. with URLs to re-crawl.
//
// Usage:
//   node scripts/indexnow.mjs https://modernmustardseed.com/some/new/page
//   node scripts/indexnow.mjs --from-sitemap
//   node scripts/indexnow.mjs https://modernmustardseed.com/audit --from-sitemap
//
// Spec: https://www.indexnow.org/documentation
// Bulk endpoint accepts up to 10,000 URLs per request. We chunk just in case.

const KEY = '22a95730607db9d7a903536823feb53d';
const HOST = 'modernmustardseed.com';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const CHUNK = 1000;

async function submit(urls) {
  const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls });
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  });
  const text = await res.text();
  return { status: res.status, statusText: res.statusText, body: text.slice(0, 400) };
}

async function urlsFromSitemap() {
  const res = await fetch(`https://${HOST}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  const args = process.argv.slice(2);
  const fromSitemap = args.includes('--from-sitemap');
  const cliUrls = args.filter((a) => a.startsWith('http'));

  let urls = [...cliUrls];
  if (fromSitemap) urls = [...urls, ...(await urlsFromSitemap())];
  urls = [...new Set(urls)].filter(Boolean);

  if (urls.length === 0) {
    console.error('No URLs provided. Pass URLs as args or --from-sitemap.');
    process.exit(1);
  }

  console.log(`Submitting ${urls.length} URL(s) to IndexNow...`);

  for (let i = 0; i < urls.length; i += CHUNK) {
    const batch = urls.slice(i, i + CHUNK);
    const r = await submit(batch);
    console.log(`  batch ${i / CHUNK + 1}: ${r.status} ${r.statusText}${r.body ? ' | ' + r.body : ''}`);
  }

  console.log('Done. 200 = success. 202 = accepted (key validating). 422 = bad URLs. 429 = throttled.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
