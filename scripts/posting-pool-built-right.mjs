#!/usr/bin/env node
// Second pass on the Built Right brand pool: his real, named projects from the
// Dropbox transfer replace the generic site photos. Reads the p-<key>-<nn>-1600
// webps from products/built-right/site/images, re-encodes to JPEG in headless
// Chromium (Instagram takes JPEG only), uploads under posting/<client>/brand/,
// and archives the old media-* pool rows. Idempotent: photos already in the pool
// are skipped, and the t2t key (the Reese family's Tunnel to Towers home) is
// never evergreen material.
//
//   node scripts/posting-pool-built-right.mjs            # up to 4 photos per project
//   node scripts/posting-pool-built-right.mjs --per=6
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const CLIENT = 'builtbyshan@gmail.com';
const BUCKET = 'client-intake';
const FOLDER = `posting/${CLIENT.replace(/[^a-z0-9]+/gi, '-')}/brand`;
const IMAGES = path.resolve('../../products/built-right/site/images');
const PER = Number((process.argv.find((a) => a.startsWith('--per=')) ?? '--per=4').split('=')[1]);

// Project key -> the name the writer may use. t2t is deliberately absent.
const PROJECTS = {
  kalispell: 'the Kalispell mountain-views home',
  mmodern: 'the mountain modern home in the Flathead',
  lakefront: 'the Montana lakefront retreat',
  secluded: 'the secluded Flathead luxury home',
  barndo: 'the Flathead barndominium',
  river: 'the river-frontage Montana home',
  logcabin: 'the Montana luxury log cabin',
  modern: 'the modern living home, Montana built',
  glacier: 'the Glacier Park retreat',
  flathead: 'the Flathead Lake luxury remodel',
};

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const files = fs.readdirSync(IMAGES).filter((f) => /^p-[a-z0-9]+-\d+-1600\.webp$/.test(f)).sort();
const byKey = new Map();
for (const f of files) {
  const key = f.match(/^p-([a-z0-9]+)-/)[1];
  if (!PROJECTS[key]) continue;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push(f);
}
// Spread the picks across each project's set rather than taking the first N.
const picks = [];
for (const [key, list] of byKey) {
  const step = Math.max(1, Math.floor(list.length / PER));
  for (let i = 0, n = 0; i < list.length && n < PER; i += step, n++) picks.push({ key, file: list[i] });
}
console.log(`${picks.length} photos across ${byKey.size} projects`);

const { data: have } = await sb.from('posting_materials').select('id, url, note').eq('client_email', CLIENT).eq('kind', 'brand');
const haveSet = new Set((have ?? []).map((r) => r.url));

const browser = await chromium.launch();
const page = await browser.newPage();
let added = 0;
for (const { key, file } of picks) {
  const stem = file.replace(/\.webp$/, '');
  const dest = `${FOLDER}/${stem}.jpg`;
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(dest);
  if (haveSet.has(pub.publicUrl)) { console.log('have   ', stem); continue; }
  const dataUrl = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.88);
  }, 'data:image/webp;base64,' + fs.readFileSync(path.join(IMAGES, file)).toString('base64')).catch(() => null);
  if (!dataUrl) { console.log('skip   ', stem, '(could not decode)'); continue; }
  const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
  const { error: upErr } = await sb.storage.from(BUCKET).upload(dest, bytes, { contentType: 'image/jpeg', upsert: true });
  if (upErr) { console.log('upload failed', stem, upErr.message); continue; }
  const { error: mErr } = await sb.from('posting_materials').insert({ client_email: CLIENT, url: pub.publicUrl, kind: 'brand', note: `Project photo: ${PROJECTS[key]}.`, uploaded_by: 'seed', status: 'fresh' });
  if (mErr) { console.log('row failed', stem, mErr.message); continue; }
  added++;
  console.log('added  ', stem, `${Math.round(bytes.length / 1024)} KB`);
}
await browser.close();

// The generic first-pass photos step aside for the named projects.
const old = (have ?? []).filter((r) => /\/brand\/media-\d+-1600\.jpg$/.test(r.url));
if (old.length && added) {
  await sb.from('posting_materials').update({ status: 'archived' }).in('id', old.map((r) => r.id));
  console.log(`archived ${old.length} generic photos`);
}
console.log(`brand pool now: ${haveSet.size - (added ? old.length : 0) + added} live photos (${added} new)`);
