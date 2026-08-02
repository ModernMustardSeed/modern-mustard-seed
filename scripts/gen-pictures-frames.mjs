#!/usr/bin/env node
/**
 * Pre-render the MUSTARD PICTURES hero frames, one per vertical, on the Codex
 * subscription.
 *
 * Why pre-render at all: the screen test's frame is art-directed from the
 * VERTICAL alone (`v.set`), never from the individual business, so there are
 * only eight possible images in the entire product. Generating them live cost
 * money on every visitor, put a 25-second ceiling on the art, and returned null
 * whenever the fal wallet was dry, which is the "darkroom is backed up" path
 * real prospects were hitting.
 *
 * Rendering them once, ahead of time, is free, instant at request time, and
 * cannot fail during a screen test. The per-business personalization was always
 * in the storyboard text, and that is untouched.
 *
 *   node scripts/gen-pictures-frames.mjs            # only what is missing
 *   node scripts/gen-pictures-frames.mjs --force    # redo everything
 *   node scripts/gen-pictures-frames.mjs --only restaurant
 *
 * Roughly 3 to 4 minutes per frame because each one carries the mascot as a
 * reference. Renders are serialized by the engine, so this is a ~30 minute job
 * for the full set. Run it once and commit the PNGs.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage } from './codex-image.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const OUT_DIR = path.join(REPO, 'public', 'pictures', 'frames');

const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const ONLY = (() => {
  const i = argv.indexOf('--only');
  return i > -1 ? argv[i + 1] : null;
})();

/**
 * The verticals and the mascot live in TypeScript that this plain-node script
 * cannot import, so the prompt is rebuilt here from the same pieces. Keep the
 * CHARACTER string and the set descriptions in step with lib/pictures.ts and
 * data/pictures.ts: a drifted mascot is worse than no mascot.
 */
const MASCOT_URL = 'https://modernmustardseed.com/brand/mascot.png';
const CHARACTER =
  'a small cute 3D-rendered mustard seed mascot character, round teardrop-shaped glossy golden-yellow seed body, two small green sprout leaves growing from the top of its head, big friendly dark eyes with eyelashes, warm cheerful smile, white cartoon gloves on its hands, black rounded shoes, Pixar-quality subsurface scattering and soft studio-grade lighting';

const VERTICALS = [
  { id: 'home-services', set: 'a cozy workshop full of tools, a work van glowing at dusk' },
  { id: 'restaurant', set: 'a warm diner counter with steam rising and neon glow' },
  { id: 'beauty', set: 'an elegant salon chair under warm vanity lights' },
  { id: 'fitness', set: 'a sunrise gym floor with chalk dust in the light beams' },
  { id: 'retail', set: 'a charming storefront window glowing at blue hour' },
  { id: 'professional', set: 'a handsome desk with warm lamplight and city bokeh' },
  { id: 'health', set: 'a bright welcoming reception with soft morning light' },
  { id: 'other', set: 'a small-business counter bathed in golden hour light' },
];

const promptFor = (v) =>
  `Transform this flat 2D cartoon mascot into ${CHARACTER}. Cinematic film still, behind the scenes at a film shoot: the tiny seed character stands on a director's chair wearing a tiny black beret, holding a small megaphone, directing a commercial film set styled as ${v.set}, warm movie lights and a cinema camera silhouette in the frame, golden cinematic glow, shallow depth of field, photorealistic environment with the stylized 3D character, joyful and grand, 16:9 widescreen.`;

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const targets = VERTICALS.filter((v) => !ONLY || v.id === ONLY);
  if (!targets.length) {
    console.error(`No vertical matched --only ${ONLY}. Known: ${VERTICALS.map((v) => v.id).join(', ')}`);
    process.exit(2);
  }

  let made = 0;
  let skipped = 0;
  const failed = [];

  for (const v of targets) {
    const out = path.join(OUT_DIR, `${v.id}.jpg`);
    if (existsSync(out) && !FORCE) {
      console.log(`skip   ${v.id} (already rendered, --force to redo)`);
      skipped++;
      continue;
    }

    console.log(`render ${v.id}...`);
    const r = await generateImage({
      prompt: promptFor(v),
      out,
      width: 1600,
      height: 900,
      // JPEG, not PNG. These are photographic frames with no transparency, and
      // the PNG set weighed 22MB against 1.2MB here for no visible difference.
      format: 'jpeg',
      quality: 86,
      // The mascot is a CHARACTER that has to survive intact across all eight
      // frames. This is the whole reason the frames could leave nano-banana.
      refs: [MASCOT_URL],
      refMode: 'character',
      tries: 2,
      log: (...a) => console.log('  ', ...a),
    });

    if (r.ok) {
      console.log(`   ok ${v.id}: ${(r.bytes / 1024).toFixed(0)}KB in ${r.seconds}s`);
      made++;
    } else {
      console.error(`   FAILED ${v.id}: ${r.error}`);
      failed.push(v.id);
    }
  }

  // A manifest rather than a runtime fs check: the route needs to know which
  // frames exist, and `public/` is served by the CDN rather than read off disk
  // in a Vercel function, so asking the filesystem at request time is the wrong
  // question in the one environment that matters.
  const present = VERTICALS.filter((v) => existsSync(path.join(OUT_DIR, `${v.id}.jpg`))).map((v) => v.id);
  writeFileSync(
    path.join(REPO, 'data', 'pictures-frames.ts'),
    [
      '// GENERATED by scripts/gen-pictures-frames.mjs. Do not edit by hand.',
      '// Which MUSTARD PICTURES hero frames have been pre-rendered on Codex.',
      `export const RENDERED_FRAMES: readonly string[] = ${JSON.stringify(present)} as const;`,
      '',
    ].join('\n'),
  );
  console.log(`manifest: data/pictures-frames.ts lists ${present.length}/${VERTICALS.length} frames`);

  console.log(`\ndone. rendered ${made}, skipped ${skipped}, failed ${failed.length}${failed.length ? ` (${failed.join(', ')})` : ''}`);
  console.log('Look at every frame before committing. A mascot that drifted is worse than no frame.');
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(`gen-pictures-frames FAILED: ${e.message || e}`);
  process.exit(1);
});
