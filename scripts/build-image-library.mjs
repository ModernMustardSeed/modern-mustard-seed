#!/usr/bin/env node
/**
 * Index every image we have ever generated, so a build can REUSE one instead of
 * falling back to drawn SVG.
 *
 * Sarah, 2026-07-29: "always generate new images OR look through our gen image
 * files to find ones that match, dont ever replace with lame computer svg type
 * things."
 *
 * 503 generated frames were sitting in 50-odd build directories with no index, so
 * every build that could not paint fell through to inline SVG scene art, which is
 * exactly the look she is banning. This writes ~/mms-demo-sites/_library/index.json
 * with one row per image: where it came from, which business and trade it was made
 * for, and its dimensions, so a later build can search it by trade and reuse a real
 * photograph.
 *
 *   node scripts/build-image-library.mjs
 */
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.join(os.homedir(), 'mms-demo-sites');
const LIB = path.join(ROOT, '_library');
if (!existsSync(LIB)) mkdirSync(LIB, { recursive: true });

const IMG = /\.(jpe?g|png|webp)$/i;
/** Below this a file is an icon or a texture, not a usable hero or gallery plate. */
const MIN_BYTES = 60 * 1024;

function walk(dir, depth = 0, out = []) {
  if (depth > 3) return out;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '_library' || e.name === 'node_modules') continue;
      walk(full, depth + 1, out);
    } else if (IMG.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Read the lead facts the build was given, to tag the image with a real trade. */
function briefFor(buildDir) {
  for (const name of ['BRIEF.md', 'brief.md']) {
    const p = path.join(buildDir, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    const grab = (label) => text.match(new RegExp(`${label}\\s*[:=]\\s*(.+)`, 'i'))?.[1]?.trim().slice(0, 80);
    return {
      business: grab('business(?: name)?') || grab('name') || null,
      trade: grab('trade') || grab('category') || grab('industry') || null,
      city: grab('city') || grab('location') || null,
    };
  }
  return { business: null, trade: null, city: null };
}

/** PNG/JPEG dimensions without pulling in an image library. */
function dimensions(file) {
  try {
    const b = readFileSync(file);
    if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length - 9) {
        if (b[i] !== 0xff) { i++; continue; }
        const marker = b[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch { /* unreadable */ }
  return { w: 0, h: 0 };
}

const builds = readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== '_library');
const rows = [];
let copied = 0;

for (const b of builds) {
  const dir = path.join(ROOT, b.name);
  const meta = briefFor(dir);
  for (const file of walk(dir)) {
    let size;
    try { size = statSync(file).size; } catch { continue; }
    if (size < MIN_BYTES) continue;
    const { w, h } = dimensions(file);
    if (w < 800) continue; // not a hero or a gallery plate

    const flat = `${b.name.slice(0, 8)}-${path.basename(file)}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = path.join(LIB, flat);
    if (!existsSync(dest)) { try { copyFileSync(file, dest); copied += 1; } catch { continue; } }

    rows.push({
      file: flat,
      business: meta.business,
      trade: meta.trade,
      city: meta.city,
      w, h,
      orientation: w >= h * 1.2 ? 'landscape' : h >= w * 1.2 ? 'portrait' : 'square',
      kb: Math.round(size / 1024),
      fromBuild: b.name,
    });
  }
}

rows.sort((a, b) => b.w * b.h - a.w * a.h);
writeFileSync(path.join(LIB, 'index.json'), JSON.stringify({ builtAt: new Date().toISOString(), count: rows.length, images: rows }, null, 2));

const trades = {};
for (const r of rows) if (r.trade) trades[r.trade] = (trades[r.trade] ?? 0) + 1;

console.log(`indexed ${rows.length} usable image(s) from ${builds.length} build(s), ${copied} newly copied`);
console.log(`library: ${LIB}`);
console.log(`landscape ${rows.filter((r) => r.orientation === 'landscape').length}, portrait ${rows.filter((r) => r.orientation === 'portrait').length}, square ${rows.filter((r) => r.orientation === 'square').length}`);
const top = Object.entries(trades).sort((a, b) => b[1] - a[1]).slice(0, 8);
if (top.length) console.log('trades:', top.map(([t, n]) => `${t} (${n})`).join(', '));
