/**
 * STARS AND HOW MANY. The data the presence score cannot run without.
 *
 * The website audit grades one thing: the site. Anthony's point is that a
 * business handed nothing but a website grade gets no credit for the part it is
 * often genuinely good at, and a page that is all bad news gets put down. The
 * presence audit already solves that, blending the website with reviews and the
 * Google profile, and it is full of sentences an owner actually wants to read:
 * *"This is real proof, and it is worth more than any ad you could buy."*
 *
 * It cannot say any of that here, because it has nothing to say it about. Two of
 * 179 Flathead leads carry a rating. `listingSeen` in lib/presence-audit.ts then
 * withholds BOTH the profile and reviews pillars, on purpose and correctly: "no
 * address on the profile" about a profile nobody opened is not a finding, it is
 * a lie with a score attached.
 *
 * So this fills them in, off the place page, and getting there took two wrong
 * turns worth writing down.
 *
 * THE FEED IS THE WRONG SOURCE FOR A NAMED BUSINESS. `runQuery` reads cards out
 * of `div[role="feed"]`, and a search specific enough to name one business does
 * not produce a feed at all: Maps opens that place directly. All 108 Kalispell
 * lookups came back with zero cards, twice, once with the street address in the
 * query and once without.
 *
 * THE PLACE PAGE DOES CARRY THE REVIEW COUNT. maps-detail.mts says it does not,
 * and that note is stale: `div.F7nice` reads "4.7 | (157)" on a live panel, both
 * numbers in one string. Probed on two Kalispell businesses before anything was
 * built on it, because the note was specific enough to be worth disbelieving
 * only with evidence.
 *
 * Identity is the phone, the same proof every other Maps job here uses. Where a
 * lead has no phone the h1 must still be recognisably the business, because a
 * neighbour's four hundred reviews printed under this name is the worst single
 * error this campaign could make.
 *
 * It also records the place URL in `source_urls`, the other half of what
 * `listingSeen` looks for, so a business whose profile genuinely has no rating
 * is scored as a profile we opened rather than one we never checked.
 *
 *   npx tsx scripts/door-drop/reviews.mts --out artifacts/door-drop/kalispell
 *   npx tsx scripts/door-drop/reviews.mts --out artifacts/door-drop/fl-final --apply
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { openBrowser } from '../acq-maps.mts';
import { loadEnv, supabase, REGIONS, type Region } from './select.mts';

const argv = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? d);
};
const OUT = path.resolve(flag('out', path.join('artifacts', 'door-drop', 'kalispell')));
const REGION: Region = REGIONS[(flag('region', 'montana') || 'montana').toLowerCase()] ?? REGIONS.montana;
const APPLY = argv.includes('--apply');
const HEADED = argv.includes('--headed');

loadEnv(process.cwd());
const sb = supabase();

const BUNDLE = path.join(process.cwd(), '.door-drop-reviews.mjs');
execFileSync(
  'npx',
  ['--no-install', 'esbuild', 'lib/enrich.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${BUNDLE}`],
  { stdio: 'pipe', shell: process.platform === 'win32' },
);
const { isSameBusiness } = (await import(pathToFileURL(BUNDLE).href)) as {
  isSameBusiness: (a: string, b: string, where?: string) => boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const phoneKey = (p: string | null) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};

type Stop = { id?: string; business_name: string; city: string; address: string | null };
const manifest = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8')) as { printed: Stop[] };

// Only the ones that still need it. A re-run is cheap and skips everything done.
const { data: rows } = await sb
  .from('outbound_leads')
  .select('id, business_name, city, address, phone, rating, review_count, source_urls')
  .in('id', manifest.printed.map((p) => p.id).filter(Boolean) as string[]);

const todo = (rows ?? []).filter((r) => r.rating == null || r.review_count == null);
console.log(`${rows?.length ?? 0} printed, ${todo.length} without a rating or a count${APPLY ? '' : '   (DRY RUN)'}\n`);
if (!todo.length) { try { rmSync(BUNDLE); } catch { /* nothing */ } process.exit(0); }

const { browser, page } = await openBrowser(HEADED);
let wrote = 0;
let noMatch = 0;
let noStars = 0;

for (let i = 0; i < todo.length; i++) {
  const lead = todo[i];
  const where = `${lead.city}, ${REGION.state}`;
  /**
   * NAME AND TOWN, NOT THE STREET ADDRESS.
   *
   * Searching with the full address is precise enough that Maps skips the
   * results feed and opens the single place page, and `runQuery` reads cards out
   * of `div[role="feed"]`. Every one of 108 Kalispell lookups came back with
   * zero cards for exactly that reason. The looser query keeps a feed, and the
   * feed is the only place in this environment that carries the review COUNT:
   * the place panel renders it empty, which maps-detail.mts already documents.
   */
  const q = `${lead.business_name} ${where}`;
  const label = `[${i + 1}/${todo.length}] ${String(lead.business_name).slice(0, 32).padEnd(33)}`;

  type Panel = { h1: string | null; f7: string | null; phoneItem: string | null; href: string };
  let got: Panel | null = null;
  try {
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(q)}?hl=en&gl=us`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await sleep(4500);
    // No named function inside evaluate: tsx's keepNames injects a __name helper
    // that does not exist in a browser. It reads as an empty panel every time.
    got = (await page.evaluate(`(() => ({
      h1: document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : null,
      f7: document.querySelector('div.F7nice') ? document.querySelector('div.F7nice').innerText.split('\\n').join(' ') : null,
      phoneItem: document.querySelector('button[data-item-id^="phone"]') ? document.querySelector('button[data-item-id^="phone"]').getAttribute('data-item-id') : null,
      href: location.href,
    }))()`)) as Panel;
  } catch {
    console.log(`${label} search failed`);
    await sleep(6000);
    continue;
  }

  if (!got?.h1 || /^results$/i.test(got.h1)) {
    noMatch += 1;
    console.log(`${label} no single place`);
    await sleep(2500);
    continue;
  }

  // The phone proves it when there is one. Otherwise the name has to.
  const mapsPhone = phoneKey((got.phoneItem ?? '').replace(/^phone:tel:/, ''));
  const leadPhone = phoneKey(lead.phone as string | null);
  const provenByPhone = leadPhone.length >= 10 && mapsPhone.length >= 10 && mapsPhone === leadPhone;
  const phoneDisagrees = leadPhone.length >= 10 && mapsPhone.length >= 10 && mapsPhone !== leadPhone;
  if (phoneDisagrees) {
    noMatch += 1;
    console.log(`${label} SKIP, phone disagrees (${got.h1})`);
    await sleep(2500);
    continue;
  }
  if (!provenByPhone && !isSameBusiness(String(lead.business_name), got.h1, where)) {
    noMatch += 1;
    console.log(`${label} SKIP, landed on ${JSON.stringify(got.h1)}`);
    await sleep(2500);
    continue;
  }

  // "4.7 (157)" or "4.7 | (157)". Both numbers or neither.
  const stars = /(\d(?:\.\d)?)/.exec(got.f7 ?? '');
  const count = /\(([\d,]+)\)/.exec(got.f7 ?? '');
  const rating = stars ? Number(stars[1]) : null;
  const reviews = count ? Number(count[1].replace(/,/g, '')) : null;

  /**
   * BOTH, OR NEITHER.
   *
   * `scoreReviews` reads a null count as zero, so a rating written without a
   * count makes the flyer tell a business with two hundred reviews that "nobody
   * has reviewed you yet". That is the most insulting thing this campaign could
   * print, and it would land on the businesses doing best. A half-known profile
   * stays unknown and the pillar is withheld honestly.
   */
  if (rating === null || reviews === null) {
    noStars += 1;
    console.log(`${label} found, no stars on the profile yet`);
    await sleep(2500);
    continue;
  }

  const patch: Record<string, unknown> = {};
  if (rating !== null) patch.rating = rating;
  if (reviews !== null) patch.review_count = reviews;
  // The maps URL is what tells the presence audit we actually opened the profile.
  const urls = new Set([...(((lead.source_urls as string[] | null) ?? [])), got.href.split('?')[0]].filter(Boolean));
  patch.source_urls = [...urls];

  if (APPLY) {
    const { error } = await sb.from('outbound_leads').update(patch).eq('id', lead.id);
    if (error) { console.log(`${label} ! ${error.message}`); await sleep(2500); continue; }
  }
  if (rating !== null || reviews !== null) {
    wrote += 1;
    console.log(`${label} ${rating ?? '?'} stars, ${reviews ?? '?'} reviews${APPLY ? '' : '   (dry)'}`);
  }
  await sleep(2600);
}

await browser.close();
try { rmSync(BUNDLE); } catch { /* nothing to clean */ }
console.log(`\nratings ${APPLY ? 'written' : 'found'}: ${wrote}`);
console.log(`not clearly them:             ${noMatch}`);
console.log(`found but no stars yet:       ${noStars}`);
if (!APPLY) console.log('\nDRY RUN. Nothing written. Re-run with --apply.');
