/**
 * Keep lib/films.ts honest, and prove the pages actually render players.
 *
 *   npx tsx scripts/verify-films.mts                 # repo checks only
 *   npx tsx scripts/verify-films.mts --live          # also hit production
 *
 * ⚠️ WHY THE LIVE CHECK LOOKS THE WAY IT DOES. The first time these films
 * shipped I "verified" them with `curl <page> | grep -c hundredfold-film.mp4`,
 * got 1, and reported both films live. The 1 was a match inside the RSC
 * payload, not a `<video>` tag: the hero was rendering its no-film fallback
 * card and had been the whole time. A check that can pass for the wrong reason
 * is worse than no check, so this one asserts BOTH that the player is present
 * AND that the fallback sentence is absent.
 */
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const { FILMS } = await import('../lib/films');

let fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!cond) fail++;
};

console.log('--- 1. every film declared shipped is actually in the repo ---');
for (const [name, film] of Object.entries(FILMS)) {
  if (!film.shipped) {
    console.log(`SKIP  ${name} is not marked shipped`);
    continue;
  }
  for (const rel of [film.mp4, film.poster]) {
    const abs = path.join(process.cwd(), 'public', rel.replace(/^\//, ''));
    const there = existsSync(abs);
    ok(`${name}: ${rel}`, there, there ? `${(statSync(abs).size / 1e6).toFixed(1)} MB` : 'MISSING');
  }
}

console.log('\n--- 1b. every cut in the marketing video library is in the repo ---');
// Same rule as above, applied to the /admin/videos catalogue. The page itself
// HEADs the CDN at runtime; this is the build-time half, so a missing file is
// caught before it ships rather than turning into a dead card in the admin.
const { MARKETING_VIDEOS } = await import('../data/marketing-videos');
for (const v of MARKETING_VIDEOS) {
  const rels = [...v.formats.map((f) => f.file), ...(v.poster ? [v.poster] : [])];
  for (const rel of rels) {
    const abs = path.join(process.cwd(), 'public', rel.slice(1));
    const there = existsSync(abs);
    ok(v.id + ': ' + rel, there, there ? (statSync(abs).size / 1e6).toFixed(1) + ' MB' : 'MISSING');
  }
}
// A film nothing plays is worth knowing about, but it is not a failure.
const unusedFilms = MARKETING_VIDEOS.filter((v) => v.runsAt.length === 0);
if (unusedFilms.length)
  console.log('NOTE  ' + unusedFilms.length + ' film(s) referenced nowhere: ' + unusedFilms.map((v) => v.id).join(', '));

console.log('\n--- 2. no page probes the filesystem for a film ---');
// The bug this whole file exists for. `existsSync` on public/ is false on any
// render that happens at request time, and the failure is silent.
const { readFileSync, readdirSync } = await import('node:fs');
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
    return /\.(tsx?|jsx?)$/.test(e.name) ? [p] : [];
  });
/** Strip comments first: the files that FIXED this bug explain it in prose, and
 *  a scanner that reads its own warning as a violation cries wolf forever. */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const offenders = [...walk('app'), ...walk('components')].filter((f) => {
  const src = codeOnly(readFileSync(f, 'utf8'));
  return /existsSync\s*\(/.test(src) && /(video|film|mp4)/i.test(src);
});
ok('no component checks public/video on disk', offenders.length === 0, offenders.join(', '));

if (process.argv.includes('--live')) {
  console.log('\n--- 3. production actually renders the players ---');
  const BASE = 'https://modernmustardseed.com';
  const pages: [string, string, string][] = [
    ['/hundredfold', FILMS.hero.mp4, 'The fastest way to understand this is to be interviewed by it'],
    ['/hundredfold/webinar', FILMS.webinar.mp4, 'The film is in the edit'],
  ];
  for (const [route, mp4, fallbackLine] of pages) {
    const res = await fetch(`${BASE}${route}`);
    const html = await res.text();
    ok(`${route}: 200`, res.ok, String(res.status));
    // A <video> element with our source, not merely the string appearing somewhere.
    const hasPlayer = /<video[\s\S]{0,400}?<source[^>]+src="[^"]*hundredfold-[^"]*\.mp4"/i.test(html);
    ok(`${route}: renders a <video> with the cut`, hasPlayer);
    ok(`${route}: the no-film fallback is NOT on the page`, !html.includes(fallbackLine));

    const media = await fetch(`${BASE}${mp4}`, { method: 'HEAD' });
    ok(`${mp4}: serves`, media.ok, `${media.status}, ${((Number(media.headers.get('content-length')) || 0) / 1e6).toFixed(1)} MB`);
  }
}

console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : `${fail} CHECK(S) FAILED`}`);
process.exitCode = fail === 0 ? 0 : 1;
