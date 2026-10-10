#!/usr/bin/env node
/**
 * Crawls every URL in a live sitemap and reports any price on a public page.
 * The proof behind "no prices on the site": run it after every deploy that
 * touches copy, offers or checkout.
 *
 *   node scripts/price-crawl.mjs                                  production
 *   node scripts/price-crawl.mjs https://<preview>.vercel.app     a preview
 *   options: --json   --concurrency 8
 *
 * Exits 1 when a page outside ALLOWED_ROUTES shows a price.
 */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pricesIn, allowedReason } from '../lib/price-scan.mjs';

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith('http')) ?? 'https://modernmustardseed.com').replace(/\/$/, '');
const ci = args.indexOf('--concurrency');
const concurrency = ci >= 0 ? Number(args[ci + 1]) : 8;

// A protected Vercel preview needs the bypass secret: set VERCEL_BYPASS in the env
// (memory preview-shot-bypass.md shows how to read it). Never pass it as an argument.
const bypass = process.env.VERCEL_BYPASS;

async function get(url) {
  const headers = { 'user-agent': 'mms-price-crawl/1.0', ...(bypass ? { 'x-vercel-protection-bypass': bypass } : {}) };
  const res = await fetch(url, { headers, redirect: 'follow' });
  return { status: res.status, body: await res.text(), finalUrl: res.url };
}

async function sitemapUrls() {
  const seen = new Set();
  const queue = [`${base}/sitemap.xml`];
  const pages = [];
  while (queue.length) {
    const sm = queue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm);
    const { body } = await get(sm);
    for (const m of body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      const loc = m[1].replace(/^https?:\/\/[^/]+/, base);
      if (/sitemap[^/]*\.xml$/.test(loc)) queue.push(loc);
      else pages.push(loc);
    }
  }
  return [...new Set(pages)];
}

// --app-routes adds every static page route under app/ (no admin, api or [dynamic]
// segment), so a page that is live but missing from the sitemap is still read.
function appRoutes() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
  const out = [];
  const walk = (dir, segs) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const name = e.name;
      if (name.startsWith('_') || name.startsWith('[') || name.startsWith('@') || name === 'api' || name === 'admin') continue;
      const next = name.startsWith('(') ? segs : [...segs, name];
      const full = join(dir, name);
      if (existsSync(join(full, 'page.tsx')) || existsSync(join(full, 'page.ts'))) out.push('/' + next.join('/'));
      walk(full, next);
    }
  };
  walk(root, []);
  return out.map((p) => base + p);
}

const urls = [...new Set([...(await sitemapUrls()), ...(args.includes('--app-routes') ? appRoutes() : [])])];
const results = [];
let i = 0;
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (i < urls.length) {
      const url = urls[i++];
      try {
        const { status, body } = await get(url);
        const path = new URL(url).pathname;
        const hits = status === 200 ? pricesIn(body) : [];
        results.push({ url, path, status, hits, allowed: hits.length ? allowedReason(path) : null });
      } catch (e) {
        results.push({ url, path: new URL(url).pathname, status: 0, hits: [], error: e.message });
      }
    }
  }),
);

results.sort((a, b) => a.path.localeCompare(b.path));
const bad = results.filter((r) => r.hits.length && !r.allowed);
const allowed = results.filter((r) => r.hits.length && r.allowed);
const errors = results.filter((r) => r.status !== 200);

if (args.includes('--json')) {
  console.log(JSON.stringify({ base, pages: results.length, bad, allowed, errors }, null, 2));
} else {
  for (const r of bad) {
    console.log(`PRICE  ${r.path}  (${r.hits.length})`);
    for (const h of r.hits.slice(0, 6)) console.log(`    ${h.kind}: "${h.match}"  ... ${h.context}`);
  }
  for (const r of allowed) console.log(`allowed ${r.path}  (${r.hits.length}): ${r.allowed}`);
  for (const r of errors) console.log(`status ${r.status} ${r.path}${r.error ? ' ' + r.error : ''}`);
  console.log(`\n${base}: ${results.length} pages, ${bad.length} with a price, ${allowed.length} allowed, ${errors.length} not 200`);
}
process.exitCode = bad.length ? 1 : 0;
