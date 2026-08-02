/**
 * INLINE EVERY LOCAL ASSET, OR THE LEAD GETS A PAGE OF ALT TEXT.
 *
 * A forged demo site ships as ONE row of html in `outbound_demo_sites`, served at
 * /demo/site/<id>/raw. Nothing else in the build directory ever leaves the laptop.
 * So a build that writes `<img src="hero.jpg">` beside its index.html looks perfect
 * on the builder's disk and reaches the prospect as fifteen 404s, with the browser
 * rendering the long descriptive alt text in place of every photograph. That is
 * exactly how Miller Construction (0cda2857) went out on 2026-08-02: alt strings
 * colliding with the overlay copy, no imagery at all.
 *
 * The design law now forbids relative asset references, but law alone is not a
 * guarantee. This module is the enforcement: the worker runs it before storing, so
 * a build that ignored the law gets repaired from the files sitting right there,
 * and a build referencing a file that does not exist fails loudly instead of
 * quietly reaching a real lead.
 *
 * Budget matters: the law caps the file at 900KB and base64 inflates bytes by ~37%,
 * so images are recompressed together against a byte budget rather than embedded
 * as-is.
 */
import path from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { localAssetRefs } from '../lib/site-asset-refs.mjs';

const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const TEXTUAL = new Map([
  ['.svg', 'image/svg+xml'],
  ['.css', 'text/css'],
]);
const PASSTHROUGH = new Map([
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'],
  ['.ico', 'image/x-icon'],
]);

/** Strip any ?query#hash and decode, so "ch1.jpg?v=2" still finds ch1.jpg. */
function refToFile(dir, ref) {
  const clean = decodeURIComponent(ref.split('#')[0].split('?')[0]).replace(/^\.\//, '');
  if (path.isAbsolute(clean)) return clean;
  return path.join(dir, clean);
}

/**
 * The declared render width is the honest encode width: a 1200px-wide card has no
 * use for a 2400px file inside a 900KB budget.
 */
function declaredWidth(html, ref) {
  const esc = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = new RegExp(`<(?:img|source)\\b[^>]*?["']${esc}["'][^>]*>`, 'i').exec(html);
  const w = tag && /\bwidth\s*=\s*["']?(\d+)/i.exec(tag[0]);
  return w ? Number(w[1]) : null;
}

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch {
    return null;
  }
}

/**
 * Recompress one raster to a target width/quality. Falls back to the raw bytes
 * when sharp is unavailable, which keeps the repair working (just heavier) on a
 * machine without native deps.
 */
async function encodeRaster(sharp, file, width, quality, keepAlpha) {
  const raw = readFileSync(file);
  if (!sharp) return { buf: raw, mime: mimeOf(file) };
  let img = sharp(raw, { animated: path.extname(file).toLowerCase() === '.gif' });
  const meta = await img.metadata();
  if (width && meta.width && meta.width > width) img = img.resize({ width, withoutEnlargement: true });

  // WebP, not JPEG. A page carrying a dozen photographs inside a 900KB cap has about
  // 55KB per image to spend, and at that budget JPEG forces the whole set down to
  // roughly two-thirds resolution before it fits. WebP buys back those pixels for
  // free: same visual quality, ~30% fewer bytes, and universal browser support since
  // 2020. It also carries alpha, so masks and cutouts survive without a second path.
  if (!keepAlpha || !meta.hasAlpha) img = img.flatten({ background: '#ffffff' });
  return { buf: await img.webp({ quality, effort: 5 }).toBuffer(), mime: 'image/webp' };
}

function mimeOf(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.avif') return 'image/avif';
  if (ext === '.gif') return 'image/gif';
  return TEXTUAL.get(ext) || PASSTHROUGH.get(ext) || 'application/octet-stream';
}

function replaceRef(html, ref, replacement) {
  const esc = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(esc, 'g'), replacement);
}

/**
 * @param {string} html    the built index.html
 * @param {string} dir     the build directory the html lives in
 * @param {object} [opts]
 * @param {number} [opts.maxBytes]  hard ceiling for the finished html (default 900KB)
 * @returns {Promise<{html:string, inlined:string[], missing:string[], bytes:number, skipped:string[]}>}
 */
export async function inlineSiteAssets(html, dir, opts = {}) {
  const maxBytes = opts.maxBytes || 900 * 1024;
  const refs = localAssetRefs(html);
  if (!refs.length) return { html, inlined: [], missing: [], skipped: [], bytes: Buffer.byteLength(html) };

  const sharp = await loadSharp();
  const missing = [];
  const skipped = [];
  const jobs = [];

  for (const ref of refs) {
    const file = refToFile(dir, ref);
    if (!existsSync(file) || !statSync(file).isFile()) {
      missing.push(ref);
      continue;
    }
    const ext = path.extname(file).toLowerCase();
    if (RASTER.has(ext)) {
      jobs.push({ ref, file, ext, width: declaredWidth(html, ref), raster: true });
    } else if (TEXTUAL.has(ext) || PASSTHROUGH.has(ext)) {
      jobs.push({ ref, file, ext, raster: false });
    } else {
      skipped.push(ref);
    }
  }
  if (missing.length) return { html, inlined: [], missing, skipped, bytes: Buffer.byteLength(html) };

  // Non-raster assets are embedded as-is; they are the fixed cost the rasters
  // then have to fit around.
  let working = html;
  const inlined = [];
  for (const j of jobs.filter((j) => !j.raster)) {
    const buf = readFileSync(j.file);
    working = replaceRef(working, j.ref, `data:${mimeOf(j.file)};base64,${buf.toString('base64')}`);
    inlined.push(j.ref);
  }

  const rasters = jobs.filter((j) => j.raster);
  if (!rasters.length) return { html: working, inlined, missing, skipped, bytes: Buffer.byteLength(working) };

  // Read each source's real dimensions once, so the encode cap can follow the file
  // instead of a guess (see the cap comment in the ladder below).
  if (sharp) {
    for (const j of rasters) {
      try {
        j.intrinsic = (await sharp(readFileSync(j.file)).metadata()).width || null;
      } catch {
        j.intrinsic = null;
      }
    }
  }

  // Shrink the whole set together until it fits.
  //
  // ORDER MATTERS: give up pixels before giving up quality. These photographs are
  // displayed at their declared CSS width anyway, so a 0.7-scale image at q68 reads
  // clean while a full-size one at q38 reads as visible JPEG blocking in the sky and
  // along every roof line, which is precisely where a roofing demo cannot afford it.
  // Quality only falls below the floor once the smallest scale still will not fit.
  const FLOOR = 62;
  const LADDER = [];
  for (const scale of [1, 0.88, 0.78, 0.68, 0.58, 0.5]) {
    for (const quality of [82, 76, 70, 66, FLOOR]) LADDER.push({ scale, quality });
  }
  for (const quality of [56, 50, 44, 38]) LADDER.push({ scale: 0.5, quality });

  const baseline = Buffer.byteLength(working);
  let best = null;

  for (const { scale, quality } of LADDER) {
    const encoded = [];
    let total = 0;
    for (const j of rasters) {
      // WHEN NO WIDTH IS DECLARED, TRUST THE FILE, NOT A GUESS.
      //
      // A fixed default is wrong in both directions. Guess high (1400) and Miller's
      // harvested gallery, whose files are only 540-720px to begin with, eats the
      // budget for pixels that do not exist. Guess low (900) and Glacier's 2000px
      // hero gets crushed to 900 and renders soft across a 1453px slot. The source's
      // own dimensions already encode the intent: a build that generated 2000px meant
      // that image to be big, and one that harvested a 540px thumb did not. Cap at
      // the intrinsic width, bounded, and never upscale.
      const cap = j.width || Math.min(j.intrinsic || 900, 1600);
      // The hero carries the first impression, so it keeps more of its pixels than
      // the cards do as the whole set comes down.
      const eased = cap >= 1400 ? scale + (1 - scale) * 0.5 : scale;
      const width = Math.max(320, Math.round(cap * eased));
      const keepAlpha = j.ext === '.png' || j.ext === '.webp' || j.ext === '.gif';
      const { buf, mime } = await encodeRaster(sharp, j.file, width, quality, keepAlpha);
      const uri = `data:${mime};base64,${buf.toString('base64')}`;
      encoded.push({ ref: j.ref, uri });
      total += uri.length;
    }
    // baseline still carries the short relative refs; close enough for the check.
    const projected = baseline + total;
    best = { encoded, projected, quality, scale };
    if (projected <= maxBytes) break;
  }

  for (const e of best.encoded) {
    working = replaceRef(working, e.ref, e.uri);
    inlined.push(e.ref);
  }

  return {
    html: working,
    inlined,
    missing,
    skipped,
    bytes: Buffer.byteLength(working),
    quality: best.quality,
    scale: best.scale,
  };
}

/**
 * The assert the worker trusts: after inlining, NOTHING local may remain. Returns
 * the offending references so the failure message can name them.
 */
export function remainingLocalRefs(html) {
  return localAssetRefs(html);
}

// CLI: node scripts/inline-site-assets.mjs <dir> [outFile]
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('inline-site-assets.mjs')) {
  const dir = process.argv[2];
  if (dir) {
    const src = path.join(dir, 'index.html');
    const html = readFileSync(src, 'utf8');
    const r = await inlineSiteAssets(html, dir);
    if (r.missing.length) {
      console.error('MISSING assets, refusing to inline:', r.missing.join(', '));
      process.exit(1);
    }
    const out = process.argv[3] || src;
    const { writeFileSync } = await import('node:fs');
    writeFileSync(out, r.html);
    console.log(
      JSON.stringify(
        { out, inlined: r.inlined.length, kb: Math.round(r.bytes / 1024), quality: r.quality, scale: r.scale, skipped: r.skipped },
        null,
        2
      )
    );
  }
}
