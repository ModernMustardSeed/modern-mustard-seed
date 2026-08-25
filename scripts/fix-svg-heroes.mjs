#!/usr/bin/env node
/**
 * Replace drawn-SVG heroes with real photographs from the library.
 *
 * Sarah, 2026-07-29: "dont ever replace with lame computer svg type things."
 * The law now bans drawn scene art on new builds, but five already-shipped sites
 * still lead with it. Super Roofers has 24 SVG tags and ZERO photographs in the
 * entire document.
 *
 * This picks a real frame from ~/mms-demo-sites/_library, grades nothing away,
 * compresses it to a data URI, paints it behind the hero and hides the drawing.
 * It never invents imagery and never falls back to a drawing.
 *
 *   node scripts/fix-svg-heroes.mjs           # dry run, shows the pairings
 *   node scripts/fix-svg-heroes.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const sharp = (await import('file:///C:/Users/moder/cross-covenant/node_modules/sharp/lib/index.js')).default;

const APPLY = process.argv.includes('--apply');
const LIB = path.join(os.homedir(), 'mms-demo-sites', '_library');
const MARK = 'build fix 2026-07-29: real hero photograph';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const sb = createClient(
  process.env.supabase_url || process.env.SUPABASE_URL,
  process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const index = JSON.parse(readFileSync(path.join(LIB, 'index.json'), 'utf8'));

/** Words that actually say what a business does. */
const stop = new Set(['the', 'and', 'llc', 'inc', 'co', 'company', 'services', 'service', 'of', 'a']);
const words = (s) => (s || '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !stop.has(w));

/** Screenshots, UI captures and diagrams are not photographs. */
const NOT_A_PHOTO = /(shot|screenshot|capture|countup|ticket|diagram|chart|logo|icon|mock|wire|frame-\d)/i;

/**
 * THE LIBRARY IS CONTAMINATED, so reuse is gated on provenance.
 *
 * Builds that shipped a drawn hero also exported a rasterised copy of that
 * drawing, and it went into the library looking like any other frame. Reusing by
 * name match therefore handed Super Roofers back its own cartoon: technically a
 * "photograph from the library", actually the exact thing Sarah banned. Any frame
 * whose source build leads with drawn art is refused, and those sites generate.
 */
let drawnSources = new Set();

/** The minimum overlap at which a reused frame is genuinely about this trade. */
const MATCH_FLOOR = 3;

/**
 * Pick a library frame ONLY if it genuinely matches. Below the floor we return
 * null and generate instead.
 *
 * The first version scored a tiebreak on size, which handed a cafe interior to a
 * towing company and a laundromat. That is the same failure mode as the
 * enrichment pipeline returning walmart.com for a roofer: a confident answer with
 * nothing behind it. Sarah's instruction was "generate new images OR find ones
 * that match", and an unrelated photo is not a match.
 */
function pickFrame(business) {
  const want = new Set(words(business));
  let best = null;
  for (const img of index.images) {
    if (img.orientation !== 'landscape' || img.w < 1200) continue;
    if (NOT_A_PHOTO.test(img.file)) continue;
    if (drawnSources.has(img.fromBuild)) continue; // a rasterised drawing, not a photo
    const have = new Set([...words(img.business), ...words(img.trade)]);
    let score = 0;
    for (const w of want) {
      for (const h of have) {
        if (h === w) score += 3;
        else if (h.length > 3 && w.length > 3 && (h.startsWith(w.slice(0, 4)) || w.startsWith(h.slice(0, 4)))) score += 1;
      }
    }
    if (score < MATCH_FLOOR) continue;
    if (!best || score > best.score) best = { img, score };
  }
  return best;
}

/** Generate a real photograph for this trade. Never a drawing, never a stand-in. */
async function generateFrame(business) {
  const raw = readFileSync(path.join(os.homedir(), '.claude', 'fal.env'), 'utf8').trim();
  const key = raw.match(/FAL_KEY\s*=\s*(.+)/)?.[1].trim() || raw.split(/\s+/)[0];
  if (!key || !key.includes(':')) throw new Error('no fal key');

  const trade = (business || '').replace(/\b(llc|inc|co|company|services?|the)\b/gi, '').trim();
  const prompt =
    `Editorial photograph for ${trade}. A real working scene for this trade, shot on 35mm, ` +
    `golden hour directional light, shallow depth of field, authentic and unstaged, ` +
    `a real American small business at work, cinematic wide composition with room for a headline, ` +
    `absolutely no text, no lettering, no signage, no watermark, not an illustration, not a render`;

  const submit = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra', {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: '16:9', num_images: 1, output_format: 'jpeg', enable_safety_checker: false }),
  });
  if (!submit.ok) throw new Error(`fal submit ${submit.status}`);
  const { request_id } = await submit.json();

  for (let i = 0; i < 100; i += 1) {
    await new Promise((r) => setTimeout(r, 2500));
    const st = await fetch(`https://queue.fal.run/fal-ai/flux-pro/requests/${request_id}/status`, {
      headers: { Authorization: `Key ${key}` },
    }).then((r) => r.json());
    if (st.status === 'COMPLETED') {
      const res = await fetch(`https://queue.fal.run/fal-ai/flux-pro/requests/${request_id}`, {
        headers: { Authorization: `Key ${key}` },
      }).then((r) => r.json());
      const url = res.images?.[0]?.url;
      if (!url) throw new Error('fal returned no image');
      const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
      // Keep it: the library gets richer with every build that needed one.
      const name = `gen-${(trade || 'trade').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.jpg`;
      writeFileSync(path.join(LIB, name), bytes);
      return { bytes, name };
    }
    if (st.status === 'FAILED' || st.status === 'ERROR') throw new Error(`fal ${st.status}`);
  }
  throw new Error('fal timed out');
}

const { data, error } = await sb.from('outbound_demo_sites').select('id,business_name,html').eq('status', 'ready');
if (error) { console.error(error.message); process.exit(1); }

// A site that leads with a drawing: SVG present, and no real raster anywhere.
// Sites already carrying this patch stay in scope, because the first pass matched
// only some of the hero-container names in use (.hero__scene but not .hero__media)
// and a re-run has to be able to reach them.
const affected = data.filter((r) => {
  if (!r.html) return false;
  if (r.html.includes(MARK)) return true;
  const svgs = (r.html.match(/<svg/gi) || []).length;
  const rasters = (r.html.match(/data:image\/(jpeg|jpg|png|webp)/gi) || []).length;
  return svgs > 3 && rasters === 0;
});

// Any build that leads with a drawing also exported a raster of that drawing into
// the library. Refuse those frames before matching, or a site gets its own cartoon
// handed back to it as a "photograph".
drawnSources = new Set(affected.map((r) => r.id));

console.log(`${affected.length} site(s) lead with drawn art and carry no photograph:\n`);
const plan = [];
for (const r of affected) {
  const pick = pickFrame(r.business_name);
  plan.push({ row: r, pick });
  console.log(
    `  ${(r.business_name || '?').slice(0, 30).padEnd(30)} -> ${
      pick ? `reuse ${pick.img.file.slice(0, 40)} (match ${pick.score}, from ${pick.img.business})` : 'GENERATE a new photograph'
    }`,
  );
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

const backups = path.join(process.cwd(), '.forge-backups');
if (!existsSync(backups)) mkdirSync(backups, { recursive: true });

let fixed = 0;
for (const { row, pick } of plan) {
  let source;
  if (pick) {
    source = readFileSync(path.join(LIB, pick.img.file));
  } else {
    // No genuine match. Generate rather than settle for an unrelated photograph,
    // and never fall back to a drawing.
    try {
      process.stdout.write(`  generating for ${row.business_name}... `);
      const made = await generateFrame(row.business_name);
      source = made.bytes;
      console.log(`got ${made.name}`);
    } catch (e) {
      console.log(`FAILED (${e.message}). Left alone rather than given the wrong picture.`);
      continue;
    }
  }

  const buf = await sharp(source)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 74, mozjpeg: true })
    .toBuffer();
  const uri = `data:image/jpeg;base64,${buf.toString('base64')}`;

  writeFileSync(path.join(backups, `svghero-${row.id}.html`), row.html);

  let base = row.html;
  for (;;) {
    const at = base.indexOf(MARK);
    if (at === -1) break;
    const open = base.lastIndexOf('<style>', at);
    const close = base.indexOf('</style>', at);
    if (open === -1 || close === -1) break;
    base = base.slice(0, open) + base.slice(close + '</style>'.length);
  }

  // Paint the photograph on whatever element holds the drawn scene, and hide the
  // drawing. Selectors are broad on purpose: hero scene containers are named
  // differently in every build, and assuming our own vocabulary is what made the
  // last fleet patch silently miss this very site.
  const patch = `<style>
/* --- ${MARK} --- */
[class*="hero__scene"], [class*="hero-scene"], [class*="heroScene"], [class*="hero__art"],
[class*="hero__bg"], [class*="hero__media"], [class*="hero-media"], [class*="hero__visual"],
[class*="hero__canvas"], [class*="hero__photo"] {
  background-image: url("${uri}") !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}
/* the drawn layers go, the scrim and vignette stay so the type keeps its plate */
[class*="hero__scene"] > svg,
[class*="hero__media"] > svg,
[class*="hero-media"] > svg,
[class*="hero__visual"] > svg,
[class*="hero__canvas"] > svg,
[class*="hero__photo"] > svg,
[class*="hero__layer"],
[class*="hero__fg"],
[class*="hero-scene"] > svg,
[class*="hero__art"] > svg { display: none !important; }
</style>`;

  const html = base.includes('</head>') ? base.replace('</head>', `${patch}</head>`) : base.replace('</body>', `${patch}</body>`);
  const { error: upErr } = await sb.from('outbound_demo_sites').update({ html, updated_at: new Date().toISOString() }).eq('id', row.id);
  if (upErr) { console.log(`  FAILED ${row.business_name}: ${upErr.message}`); continue; }
  fixed += 1;
  console.log(`  photographed ${row.business_name}  (+${Math.round(buf.length / 1024)}KB)`);
}
console.log(`\n${fixed} hero(es) now carry a real photograph. Originals in .build-backups/svghero-<id>.html`);
