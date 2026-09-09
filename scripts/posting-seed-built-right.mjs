#!/usr/bin/env node
// Daily Posting for Built Right in Montana: the brief, the brand photo pool, and
// the first four days planned. Idempotent: run it again and it updates the
// brief, skips brand photos it already added, and leaves planned days alone.
//
//   node scripts/posting-seed-built-right.mjs            # seed the brief and the pool, plan from today
//   node scripts/posting-seed-built-right.mjs --no-plan  # brief and pool only
//
// The brand pool: his real project photos from the demo site, re-encoded to JPEG
// (Instagram takes JPEG only, and the demo serves WebP) through headless Chromium,
// then dropped in the public client-intake bucket under posting/<client>/brand/.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const CLIENT = 'builtbyshan@gmail.com';
const DEMO = 'https://built-right-montana-demo.vercel.app';
const SITE_URL = 'https://builtrightinmontana.com';
const BUCKET = 'client-intake';
const FOLDER = `posting/${CLIENT.replace(/[^a-z0-9]+/gi, '-')}/brand`;

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const noPlan = process.argv.includes('--no-plan');

// ── The brief. Every line traces to the onboarding answers of 2026-09-09 or the live site. ──
const settings = {
  client_email: CLIENT,
  business_name: 'Built Right in Montana',
  site_url: SITE_URL,
  phone: '(406) 471-5613',
  towns: ['Kalispell', 'Whitefish', 'Bigfork', 'Columbia Falls', 'Eureka', 'Lakeside', 'Polson'],
  services: ['Custom homes', 'Remodels and renovations', 'Land and plans: matching a plan to a lot', 'Lakefront and mountain homes'],
  facts: [
    'Built Right in Montana has built luxury custom homes in the Flathead Valley since 1997.',
    'A family business: Shan Davis founded it; his son Zayne is the site supervisor and is on site every day; Carmen runs the office and answers every call.',
    'Registered contractor in Montana, registration number 249460.',
    'Based in Eureka, Montana, and building across the Flathead Valley: Kalispell and Whitefish first, then Bigfork, Columbia Falls, Eureka, Lakeside and Polson.',
    'Projects we are proud of: the Rangers lakefront cabin, the Crystal Lake spec house, and the Emde mountain home.',
    'Most of our work comes by referral from people who built with us.',
    'The real numbers and schedule come after a pre-construction agreement, never before.',
    'The first step with any idea is a site visit to see whether the lot suits it.',
    'Buyers come to us three ways: with land and plans, with land and no plans, and with plans and no land.',
  ].join(' '),
  tone: 'Plain, confident, warm, specific. High end and simple, never busy. We speak as the business: we, us, our. Short sentences. It should never look like we are begging for work.',
  hard_nos: 'Never a price, a price per square foot, a timeline, a completion date, or anything about financing (we direct people to secure financing before deciding what to build). Nothing cartoonish. Never invent a project, a client, a review or an award. Never claim our name is on a building, truck or sign. Never mention Web Express or any past vendor.',
  platforms: ['facebook', 'instagram', 'linkedin', 'x', 'gbp', 'houzz'],
  post_hour_mt: 9,
  auto_publish: true,
  weekly_summary: true,
  notify_emails: [CLIENT],
  active: true,
  updated_at: new Date().toISOString(),
};

const { error: sErr } = await sb.from('posting_settings').upsert(settings, { onConflict: 'client_email' });
if (sErr) { console.error('settings:', sErr.message); process.exit(1); }
console.log('brief saved for', settings.business_name);

// ── The brand pool: the 1600px project photos on the demo, re-encoded to JPEG. ──
const dir = '../../products/built-right/site/images';
const candidates = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^media-\d+-1600\.webp$/.test(f)).sort() : [];
if (!candidates.length) console.log('no 1600px project photos found at', dir, '(skipping the pool)');

const { data: have } = await sb.from('posting_materials').select('url').eq('client_email', CLIENT).eq('kind', 'brand');
const haveSet = new Set((have ?? []).map((r) => r.url));

let added = 0;
if (candidates.length) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const f of candidates.slice(0, 24)) {
    const stem = f.replace(/\.webp$/, '');
    const path = `${FOLDER}/${stem}.jpg`;
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    if (haveSet.has(pub.publicUrl)) { console.log('have   ', stem); continue; }
    const src = `${DEMO}/images/${f}`;
    const dataUrl = await page.evaluate(async (url) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      return c.toDataURL('image/jpeg', 0.88);
    }, src).catch(() => null);
    if (!dataUrl) { console.log('skip   ', stem, '(could not decode)'); continue; }
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (upErr) { console.log('upload failed', stem, upErr.message); continue; }
    const { error: mErr } = await sb.from('posting_materials').insert({ client_email: CLIENT, url: pub.publicUrl, kind: 'brand', note: 'Project photo from builtrightinmontana.com', uploaded_by: 'seed', status: 'fresh' });
    if (mErr) { console.log('row failed', stem, mErr.message); continue; }
    added++;
    console.log('added  ', stem, `${Math.round(bytes.length / 1024)} KB`);
  }
  await browser.close();
}
console.log(`brand pool: ${haveSet.size + added} photos (${added} new)`);

// ── Plan from today, so the first post does not wait for the evening cron. ──
if (!noPlan) {
  const res = await fetch('https://modernmustardseed.com/api/admin/posting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'plan', client: CLIENT, fromToday: true }) });
  if (res.status === 401) {
    console.log('plan: the admin API needs a signed-in session. Open /admin/posting and press "Plan from today", or wait for the hourly net (it plans tomorrow on its own).');
  } else {
    const j = await res.json().catch(() => ({}));
    console.log('plan:', JSON.stringify(j).slice(0, 400));
  }
}
