/**
 * Render the hostess tour for modernmustardseed.com itself.
 *
 *   node scripts/site-tour/build-mms.mjs
 *
 * Unlike a client tour, this one ships as STATIC FILES in public/tour/mms/ and
 * is committed. Our own marketing site should not need a database round trip
 * and a signed URL to say hello: the CDN serves the clips, the manifest is a
 * plain JSON file, and the whole thing costs nothing per visitor and cannot
 * break because Supabase had a bad minute.
 *
 * Script lives in data/mms-tour.ts (hand-written, Sarah's voice). Same NARRATOR
 * as the suite film, which is the point: one voice everywhere.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { speak, NARRATOR } from '../suite-film/tts.mjs';

const OUT = path.join(process.cwd(), 'public', 'tour', 'mms');
mkdirSync(OUT, { recursive: true });

// data/mms-tour.ts is TypeScript, so read the literal out rather than dragging
// a transpiler into a script that runs four times a year.
const src = readFileSync(path.join(process.cwd(), 'data', 'mms-tour.ts'), 'utf8');
const body = src.slice(src.indexOf('export const MMS_TOUR'));
const beats = [];
for (const m of body.matchAll(/\{\s*id:\s*'([^']+)',\s*anchor:\s*'([^']+)',\s*text:\s*([\s\S]*?),?\n\s*\},/g)) {
  // The text is a run of single-quoted chunks joined with +.
  const text = [...m[3].matchAll(/'((?:[^'\\]|\\.)*)'/g)]
    .map((q) => q[1].replace(/\\'/g, "'"))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (text) beats.push({ id: m[1], anchor: m[2], text });
}
if (!beats.length) {
  console.error('could not parse MMS_TOUR out of data/mms-tour.ts');
  process.exit(1);
}

const out = [];
let totalMs = 0;
for (const [i, b] of beats.entries()) {
  const file = path.join(OUT, `${String(i).padStart(2, '0')}-${b.id}.mp3`);
  const r = await speak(b.text, NARRATOR, file);
  out.push({ id: b.id, anchor: b.anchor, text: b.text, ms: r.durationMs, src: `/tour/mms/${path.basename(file)}` });
  totalMs += r.durationMs;
  console.log(`  ${b.id}: ${(r.durationMs / 1000).toFixed(1)}s (${r.engine})`);
}

const manifest = {
  business: 'Modern Mustard Seed',
  // The site's own tokens, so the card reads as part of the page and not as a
  // widget bolted on: cream ground, the gold that means "act" everywhere else.
  palette: { bg: '#161616', accent: '#F5B700' },
  beats: out,
  totalMs,
};
writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`READY ${out.length} beats, ${(totalMs / 1000).toFixed(0)}s -> public/tour/mms/`);
