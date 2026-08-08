/**
 * Render Ava's Flathead Journey narration to static files.
 *
 *   node scripts/site-tour/build-journey.mjs
 *
 * Mirror of build-mms.mjs pointed at data/journey-tour.ts; ships committed
 * static clips in public/tour/journey/ served by the CDN. Same NARRATOR
 * constant as the suite film so the one-voice law holds.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { speak, NARRATOR } from '../suite-film/tts.mjs';

const OUT = path.join(process.cwd(), 'public', 'tour', 'journey');
mkdirSync(OUT, { recursive: true });

const src = readFileSync(path.join(process.cwd(), 'data', 'journey-tour.ts'), 'utf8');
const body = src.slice(src.indexOf('export const JOURNEY_TOUR'));
const beats = [];
for (const m of body.matchAll(/\{\s*id:\s*'([^']+)',\s*anchor:\s*'([^']+)',\s*text:\s*([\s\S]*?),?\n\s*\},/g)) {
  const text = [...m[3].matchAll(/'((?:[^'\\]|\\.)*)'/g)]
    .map((q) => q[1].replace(/\\'/g, "'"))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (text) beats.push({ id: m[1], anchor: m[2], text });
}
if (!beats.length) {
  console.error('could not parse JOURNEY_TOUR out of data/journey-tour.ts');
  process.exit(1);
}

/**
 * ⚠️ FAIL LOUD ON A DROPPED BEAT. The matcher above wants id, anchor, and text
 * separated by whitespace only, so anything else between them (a comment line,
 * a new field) silently drops that stop and the script still prints READY. On
 * 2026-08-08 a commented beat rendered eight of nine and nothing complained.
 * Counting declared ids is cheap and turns a silent hole into a build failure.
 */
const declared = (body.match(/^\s*id:\s*'/gm) || []).length;
if (declared !== beats.length) {
  console.error(
    `parsed ${beats.length} beats but data/journey-tour.ts declares ${declared}.\n` +
      `A beat object with anything between id, anchor, and text (a comment, an extra field) is skipped.\n` +
      `Parsed: ${beats.map((b) => b.id).join(', ')}`,
  );
  process.exit(1);
}

const out = [];
let totalMs = 0;
for (const [i, b] of beats.entries()) {
  const file = path.join(OUT, `${String(i).padStart(2, '0')}-${b.id}.mp3`);
  const r = await speak(b.text, NARRATOR, file);
  out.push({ id: b.id, anchor: b.anchor, text: b.text, ms: r.durationMs, src: `/tour/journey/${path.basename(file)}` });
  totalMs += r.durationMs;
  console.log(`  ${b.id}: ${(r.durationMs / 1000).toFixed(1)}s (${r.engine})`);
}

const manifest = {
  business: 'Modern Mustard Seed',
  palette: { bg: '#161616', accent: '#F5B700' },
  beats: out,
  totalMs,
};
writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

/**
 * Sweep clips the manifest no longer references. Filenames carry the beat's
 * INDEX, so inserting a stop midway renames everything after it and strands the
 * old files. They are committed and CDN-served, so left alone they pile up as
 * dead audio nobody can tell from live audio. Inserting the town square stop on
 * 2026-08-08 stranded four clips on the first run.
 */
const keep = new Set([...out.map((b) => path.basename(b.src)), 'manifest.json']);
for (const f of readdirSync(OUT)) {
  if (keep.has(f)) continue;
  unlinkSync(path.join(OUT, f));
  console.log(`  pruned stale clip ${f}`);
}

console.log(`READY ${out.length} beats, ${(totalMs / 1000).toFixed(0)}s -> public/tour/journey/`);
