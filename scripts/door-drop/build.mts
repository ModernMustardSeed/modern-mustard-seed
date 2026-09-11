/**
 * THE DOOR DROP RUN. Turns audited Flathead leads into paper.
 *
 * One command produces everything a print run needs and nothing it does not:
 *
 *   press/flyers-press.pdf     8.75 x 5.75 with 0.125in bleed and crop marks,
 *                              front then back for each business, in route
 *                              order. This is the file the printer gets.
 *   office/flyers-2up.pdf      Letter portrait, two landscape halves stacked,
 *                              duplex on the LONG edge, one horizontal cut.
 *                              Each sheet carries the same business twice so
 *                              the two stacks after the cut are identical.
 *   route/route-sheet.pdf      Town by town, in driving order, with a box to
 *                              tick, the grade, the phone and the address.
 *   route/route-sheet.csv      The same, for a phone.
 *   proof/<n>-<slug>-front.png Screen proofs, so the run is looked at before
 *   proof/<n>-<slug>-back.png  a box of paper exists.
 *   manifest.json              Every business printed, its grade, its QR target.
 *   skipped.csv                Every business NOT printed and the gate it hit.
 *
 * Usage, from the repo root:
 *   npx tsx scripts/door-drop/build.mts                       proof run, 12 businesses
 *   npx tsx scripts/door-drop/build.mts --all                 every business that passes
 *   npx tsx scripts/door-drop/build.mts --cities Whitefish,Bigfork
 *   npx tsx scripts/door-drop/build.mts --all --refresh       re-audit stale sites first
 *   npx tsx scripts/door-drop/build.mts --all --copies 4      two sheets each
 *
 * The --refresh pass is free. Every model call in this repo runs on the Max
 * subscription through lib/llm, never a metered API, so re-reading a hundred
 * sites costs time and nothing else. Run it. A flyer quoting a June audit of a
 * site rebuilt in August is the one way this campaign embarrasses her.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import {
  REGIONS, loadEnv, supabase, fetchTownLeads, gate, requireAddress, host,
  CATEGORY_ORDER, type Lead, type Region,
} from './select.mts';
import {
  documentHtml, frontInner, backInner, qrSvg, css, clean,
  TRIM_W, TRIM_H, BLEED, INK, CREAM, MUSTARD, CRIMSON,
} from './flyer.mts';
import { noSiteFrontInner, noSiteBackInner, NOSITE_CSS } from './flyer-nosite.mts';
import {
  auditPageInner, noSitePageInner, pageCss, pageCropMarks,
  PAGE_W, PAGE_H, PAGE_BLEED, type Cohort,
} from './flyer-page.mts';

/**
 * The run measuring itself.
 *
 * Every number in the standing band comes from the pieces actually being
 * printed, not from a figure typed into the copy. That is the only way paper can
 * carry a statistic honestly: re-run it in October against different sites and
 * the sentence changes with them, or it does not print at all.
 *
 * Computed over the graded pieces only. A business with no website has no score
 * and would drag the cohort down while telling you nothing about websites.
 */
function cohortOf(pieces: Piece[]): Cohort {
  const graded = pieces.filter((p) => p.kind === 'audit' && typeof p.lead.audit_score === 'number');
  const scores = graded.map((p) => p.lead.audit_score as number);
  const best = graded.reduce(
    (acc, p) => ((p.lead.audit_score as number) > acc.score
      ? { score: p.lead.audit_score as number, grade: p.lead.audit_json?.letter_grade ?? '' }
      : acc),
    { score: -1, grade: '' },
  );
  const catF = (k: 'geo' | 'ai_features') =>
    graded.filter((p) => p.lead.audit_json?.categories?.[k]?.letter === 'F').length;
  return {
    graded: graded.length,
    bestScore: best.score,
    bestGrade: best.grade,
    atB: scores.filter((n) => n >= 80).length,
    geoF: catF('geo'),
    aiF: catF('ai_features'),
  };
}

/**
 * Two pieces, one run. A graded business gets the audit half page; a business
 * whose listing was opened and found to carry no website gets the second one.
 * They travel together in the same press file, the same 2-up file and the same
 * route sheet, because she is driving one route and carrying one box.
 */
type Piece = { lead: Lead; kind: 'audit' | 'nosite' };
const frontOf = (p: Piece, qr: string, o: FlyerOpts) =>
  p.kind === 'nosite' ? noSiteFrontInner(p.lead, qr, o) : frontInner(p.lead, qr, o);
const backOf = (p: Piece, qr: string, o: FlyerOpts) =>
  p.kind === 'nosite' ? noSiteBackInner(p.lead, qr, o) : backInner(p.lead, qr, o);
/** The full page carries everything on one surface, so there is no second side. */
const pageOf = (p: Piece, qr: string, o: FlyerOpts, c?: Cohort) =>
  p.kind === 'nosite' ? noSitePageInner(p.lead, qr, o, REGION) : auditPageInner(p.lead, qr, o, c, REGION);
type FlyerOpts = { reportUrl: string; auditedOn: Date; bleed: boolean };

/**
 * When the piece was read off the live source it quotes. The audit flyer prints
 * the day the engine read the website; the no-site flyer prints the day the
 * Google listing was opened, which is stamped into the notes beside the marker.
 */
function readOn(p: Piece): Date {
  if (p.kind === 'audit') return new Date(p.lead.audit_at!);
  const m = /NO WEBSITE: confirmed on Google Maps (\d{4}-\d{2}-\d{2})/.exec(p.lead.notes ?? '');
  return m ? new Date(`${m[1]}T12:00:00Z`) : new Date();
}

const ROOT = process.cwd();
loadEnv(ROOT);

const argv = process.argv.slice(2);
const flag = (n: string, d: string | null = null) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? '');
};
const has = (n: string) => argv.includes(`--${n}`);

const ALL = has('all');
const LIMIT = ALL ? Number.MAX_SAFE_INTEGER : Number(flag('limit', '12'));
/**
 * Which run this is. `montana` is Sarah's own: her ranch line, her signature,
 * the studio named where it is. `florida` is Easton's: the Florida line, his
 * partner code on every scan link, no signature, and no Montana anywhere on the
 * page. See REGIONS in select.mts for why each of those is the way it is.
 */
const REGION_KEY = (flag('region', 'montana') || 'montana').toLowerCase();
if (!REGIONS[REGION_KEY]) {
  console.error(`Unknown --region "${REGION_KEY}". Known: ${Object.keys(REGIONS).join(', ')}.`);
  process.exit(1);
}
const REGION: Region = REGIONS[REGION_KEY];
const CITIES = (flag('cities') || '').trim() ? flag('cities')!.split(',').map((s) => s.trim()) : REGION.towns;
const MAX_AGE_DAYS = Number(flag('max-age-days', '21'));
const REFRESH = has('refresh');
const ALLOW_STALE = has('allow-stale');
const COPIES = Math.max(1, Number(flag('copies', '1')));
/** Off only for a proof run: a flyer with no address is a flyer she cannot deliver. */
const ANY_ADDRESS = has('any-address');
const BASE = flag('base', 'https://modernmustardseed.com')!;
const OUT = path.resolve(flag('out', path.join('artifacts', 'door-drop', stamp()))!);
const CONCURRENCY = Number(flag('concurrency', '6'));
const PROOFS = !has('no-proofs');
const AUDIT_ONLY = has('audit-only');
const NOSITE_ONLY = has('nosite-only');

/**
 * THE FORMAT, and why `page` is the default.
 *
 * `page` is one side of letter. `half` is the 8.5 x 5.5 landscape piece printed
 * on both sides, two up, with a cut.
 *
 * The half page put the close on the back, which assumes the paper gets turned
 * over. Handed across a counter to somebody mid-shift, it often does not: he
 * reads his own name, he reads the F, and he never reaches the three fixes or
 * the offer, which are the only reason the grade is on there at all. One side
 * removes that failure, and with it the duplex setting, the long-edge flip and
 * the cut, which are the three things a print shop can get wrong.
 *
 * `--format half` is still the right piece for a counter display or a
 * windshield, where the size is the point.
 */
const FORMAT = (flag('format', 'page') || 'page').toLowerCase();
if (FORMAT !== 'page' && FORMAT !== 'half') {
  console.error(`Unknown --format "${FORMAT}". Use "page" (one side of letter) or "half" (8.5 x 5.5, two sides).`);
  process.exit(1);
}
const IS_PAGE = FORMAT === 'page';

/** Filled in once the pieces are chosen, and read by every page render after. */
let COHORT: Cohort | undefined;

/**
 * What the printed square points at. `/s/<id>` records the scan and then sends
 * the reader to their own report. It is twenty characters shorter than the
 * report URL, which is four fewer rows of modules in the square and a faster
 * lock on a phone in a dim shop.
 */
const scanUrl = (id: string) => `${BASE}/s/${id}${REGION.ref ? `?ref=${REGION.ref}` : ''}`;

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'business';

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

/** North to south, the way the route is actually driven. Per region. */
const TOWN_ORDER = new Map(REGION.towns.map((t: string, i: number) => [t.toLowerCase(), i]));
const townRank = (c: string | null) => TOWN_ORDER.get((c ?? '').toLowerCase()) ?? 99;

async function main() {
  const sb = supabase();

  const skipPath = path.join(ROOT, 'scripts', 'door-drop', 'skip.txt');
  const skipNames = new Set(
    existsSync(skipPath)
      ? readFileSync(skipPath, 'utf8').split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith('#'))
      : [],
  );

  console.log(`Region: ${REGION.key} (${REGION.phone}${REGION.ref ? `, credited to ${REGION.ref}` : ''})`);
  console.log(`Towns: ${CITIES.join(', ')}`);
  const { leads, shared } = await fetchTownLeads(sb, CITIES);
  console.log(`Leads on file in those towns: ${leads.length}`);

  const gatedRaw = gate(leads, shared, { maxAgeDays: MAX_AGE_DAYS, allowStale: ALLOW_STALE, skipNames });
  const gated = ANY_ADDRESS ? gatedRaw : requireAddress(gatedRaw);
  let { keep, nosite, dropped } = gated;
  let { stale } = gated;
  console.log(`Graded and printable: ${keep.length}. No website, confirmed: ${nosite.length}. Stale or never audited: ${stale.length}. Dropped: ${dropped.length}.`);

  /**
   * Two kinds of stale, and only one of them is the audit engine's problem. A
   * lead with a website needs its site re-read; a lead with no website needs its
   * Google listing opened again so the no-site confirmation carries a date. The
   * second is a browser job, not a model job, and it lives in addresses.mjs.
   */
  const needsMaps = stale.filter((l) => !l.website);
  stale = stale.filter((l) => Boolean(l.website));
  if (needsMaps.length) {
    console.log(
      `${needsMaps.length} lead(s) have no website and no dated confirmation. `
      + 'Run: node scripts/door-drop/addresses.mjs --apply',
    );
    for (const l of needsMaps) {
      dropped.push({
        id: l.id, business_name: l.business_name, city: l.city, gate: 'fresh',
        reason: 'no website, and the listing has not been opened recently enough to say so in print',
      });
    }
  }

  if (REFRESH && stale.length) {
    const refreshed = await refreshAudits(sb, stale.slice(0, ALL ? stale.length : LIMIT));
    const re = gate(refreshed, shared, { maxAgeDays: MAX_AGE_DAYS, allowStale: false, skipNames });
    keep = keep.concat(re.keep);
    nosite = nosite.concat(re.nosite);
    dropped = dropped.concat(re.dropped);
    for (const s of re.stale) dropped.push({ id: s.id, business_name: s.business_name, city: s.city, gate: 'fresh', reason: 're-audit did not produce a usable report' });
    console.log(`After the refresh pass: ${keep.length} printable.`);
  } else if (stale.length) {
    for (const s of stale) {
      dropped.push({
        id: s.id, business_name: s.business_name, city: s.city, gate: 'fresh',
        reason: s.audit_at ? `audit is from ${s.audit_at.slice(0, 10)}, older than ${MAX_AGE_DAYS} days` : 'never audited',
      });
    }
  }

  /**
   * One box, one route. The two pieces are merged and sorted together by town so
   * the press file, the 2-up file and the route sheet all run north to south in
   * the same order. Sorting them into separate piles would mean driving
   * Whitefish twice.
   */
  const all: Piece[] = [
    ...(NOSITE_ONLY ? [] : keep.map((lead): Piece => ({ lead, kind: 'audit' }))),
    ...(AUDIT_ONLY ? [] : nosite.map((lead): Piece => ({ lead, kind: 'nosite' }))),
  ].sort(
    (a, b) =>
      townRank(a.lead.city) - townRank(b.lead.city) ||
      a.lead.business_name.localeCompare(b.lead.business_name),
  );
  const chosen = all.slice(0, LIMIT);
  if (!chosen.length) {
    console.error('Nothing passed the gates. Run with --refresh, or widen --max-age-days.');
    writeReports(dropped, []);
    process.exit(1);
  }
  const nAudit = chosen.filter((p) => p.kind === 'audit').length;
  console.log(`Printing ${chosen.length} businesses: ${nAudit} graded, ${chosen.length - nAudit} with no website. Format: ${IS_PAGE ? 'full page, one side' : 'half page, two sides'}.`);

  mkdirSync(path.join(OUT, 'press'), { recursive: true });
  mkdirSync(path.join(OUT, 'office'), { recursive: true });
  mkdirSync(path.join(OUT, 'route'), { recursive: true });
  if (PROOFS) mkdirSync(path.join(OUT, 'proof'), { recursive: true });

  COHORT = cohortOf(chosen);
  console.log(
    `The field: ${COHORT.graded} graded, best is ${COHORT.bestGrade} (${COHORT.bestScore}), `
    + `${COHORT.atB} reached a B, ${COHORT.aiF} have no AI at all.`,
  );

  const qrs = new Map<string, string>();
  for (const p of chosen) qrs.set(p.lead.id, await qrSvg(scanUrl(p.lead.id)));

  const browser = await chromium.launch();
  try {
    await renderPress(browser, chosen, qrs);
    await renderOffice(browser, chosen, qrs);
    await renderRoute(browser, chosen);
    if (PROOFS) await renderProofs(browser, chosen, qrs);
  } finally {
    await browser.close();
  }

  writeReports(dropped, chosen);

  console.log('');
  console.log(`Done. ${OUT}`);
  if (IS_PAGE) {
    console.log(`  press/flyers-press.pdf   ${chosen.length} pages, 8.75 x 11.25 with bleed and crop marks, ONE SIDE each`);
    console.log(`  office/flyers-letter.pdf ${chosen.length * COPIES} letter sides, single sided, no cut`);
  } else {
    console.log(`  press/flyers-press.pdf   ${chosen.length * 2} pages, 8.75 x 5.75 with bleed and crop marks`);
    console.log(`  office/flyers-2up.pdf    ${chosen.length * 2 * Math.ceil(COPIES / 2)} letter sides, duplex long edge, one cut`);
  }
  console.log(`  route/route-sheet.pdf    ${chosen.length} stops`);
  console.log(`  skipped.csv              ${dropped.length} businesses and why each one is not in the box`);
}

/** Re-read the live site for anything whose audit has aged out. Free, on the subscription. */
async function refreshAudits(sb: ReturnType<typeof supabase>, targets: Lead[]): Promise<Lead[]> {
  const { runWebsiteAudit } = await import('../../lib/website-audit.ts');
  console.log(`Re-auditing ${targets.length} sites at ${CONCURRENCY} at a time. This is the slow part.`);
  const out: Lead[] = [];
  let done = 0;
  const queue = [...targets];

  const worker = async () => {
    for (;;) {
      const lead = queue.shift();
      if (!lead) return;
      try {
        const r = await runWebsiteAudit(lead.website!);
        done += 1;
        if (!r.ok) {
          console.log(`  [${done}/${targets.length}] ${lead.business_name}: ${r.error}`);
          continue;
        }
        const at = new Date().toISOString();
        await sb.from('outbound_leads').update({
          audit_url: r.url,
          audit_score: Math.round(r.report.overall_score),
          audit_json: r.report,
          audit_at: at,
        }).eq('id', lead.id);
        out.push({ ...lead, audit_url: r.url, audit_score: Math.round(r.report.overall_score), audit_json: r.report, audit_at: at });
        console.log(`  [${done}/${targets.length}] ${lead.business_name}: ${r.report.letter_grade} ${Math.round(r.report.overall_score)}`);
      } catch (e) {
        done += 1;
        console.log(`  [${done}/${targets.length}] ${lead.business_name}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
  return out;
}

/** Wait for the in-page fit pass, then report anything that still will not fit. */
async function settle(page: Awaited<ReturnType<Browser['newPage']>>, label: string) {
  await page.waitForFunction('window.__fitted === true', null, { timeout: 30_000 });
  const overflow = (await page.evaluate('window.__overflow')) as number[];
  if (overflow?.length) console.warn(`  ! ${label}: ${overflow.length} page(s) overflow the trim: ${overflow.join(', ')}`);
}

async function renderPress(browser: Browser, pieces: Piece[], qrs: Map<string, string>) {
  const sheets: string[] = [];
  for (const p of pieces) {
    const qr = qrs.get(p.lead.id)!;
    const o: FlyerOpts = { reportUrl: scanUrl(p.lead.id), auditedOn: readOn(p), bleed: true };
    if (IS_PAGE) sheets.push(fullSheet(pageOf(p, qr, o, COHORT), true));
    else sheets.push(wrap(frontOf(p, qr, o), true), wrap(backOf(p, qr, o), true));
  }
  const html = IS_PAGE ? pageDocument(sheets, true) : documentHtml(sheets, { bleed: true, extraCss: NOSITE_CSS });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await settle(page, 'press');
  await page.pdf({
    path: path.join(OUT, 'press', 'flyers-press.pdf'),
    width: `${(IS_PAGE ? PAGE_W : TRIM_W) + (IS_PAGE ? PAGE_BLEED : BLEED) * 2}in`,
    height: `${(IS_PAGE ? PAGE_H : TRIM_H) + (IS_PAGE ? PAGE_BLEED : BLEED) * 2}in`,
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
    preferCSSPageSize: true,
  });
  await page.close();
}

/** One full-page sheet, with crop marks when it is the press file. */
const fullSheet = (inner: string, bleed: boolean) =>
  `<div class="sheet"><div class="sheetfill"></div>${bleed ? pageCropMarks() : ''}<div class="sheettrim">${inner}</div></div>`;

function pageDocument(sheets: string[], bleed: boolean): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;900&family=JetBrains+Mono:wght@400;500;700&display=block" rel="stylesheet">
<style>${pageCss({ bleed })}</style>
</head><body>${sheets.join('\n')}<script>${pageFitScript()}</script></body></html>`;
}

/**
 * The fit pass for the full page. Same job as the half page's, against
 * `.sheetpad` rather than `.pad`, and reporting overflow the same way so a
 * layout that runs past the trim is caught here and not in the box.
 */
function pageFitScript() {
  return `
(function(){function fit(){
 document.querySelectorAll('[data-fit]').forEach(function(el){
   var max=parseFloat(el.dataset.max),min=parseFloat(el.dataset.min),size=max;
   el.style.fontSize=size+'pt'; var box=el.parentElement;
   var lim=function(){return parseFloat(getComputedStyle(el).lineHeight)*2+1;};
   while(size>min&&(el.scrollWidth>box.clientWidth||el.scrollHeight>lim())){size-=0.5;el.style.fontSize=size+'pt';}
 });
 document.querySelectorAll('[data-clamp]').forEach(function(el){
   el.style.display='-webkit-box';el.style.webkitBoxOrient='vertical';
   el.style.webkitLineClamp=el.dataset.clamp;el.style.overflow='hidden';
 });
 /**
  * THE LAST INCH. One sheet in two hundred still runs past the trim, because one
  * business got three long fixes at once. Shaving the whole layout for that one
  * makes 202 pages worse to save one, so the page gives itself back the space
  * instead: the longest block on it, the "how" under each fix, loses a line at a
  * time until the sheet fits. It stops at four lines and never cuts mid word,
  * because the clamp lands on a line boundary.
  */
 /**
  * THE LAST INCH, and why it shrinks type instead of cutting words.
  *
  * The first version dropped a line of clamp at a time until the sheet fit.
  * That works, and it put "Link to th..." on the page. An ellipsis mid sentence
  * is the mail merge tell this whole campaign is built to avoid, and on paper it
  * cannot be taken back. So the crowded pages give up a fraction of a point of
  * type instead, down to a floor of 6.7pt, and every word the audit wrote
  * survives. Most sheets never enter this loop at all.
  */
 document.querySelectorAll('.sheettrim').forEach(function(t){
   var pad=t.querySelector('.sheetpad'); if(!pad) return;
   // The receipts line joins the shrink set. It is the least important text on
   // the page and the last one anybody reads, so on the one sheet in two hundred
   // that needs a final hair, it gives it up before the fixes do.
   var els=t.querySelectorAll('.pfixhow, .pfinding-note, .pfixwhy, .pnote');
   for(var n=0;n<40 && pad.scrollHeight>pad.clientHeight+2;n++){
     var shrank=false;
     els.forEach(function(h){
       var cur=parseFloat(h.style.fontSize)||parseFloat(getComputedStyle(h).fontSize)*0.75;
       if(cur>6.7){h.style.fontSize=(cur-0.15).toFixed(2)+'pt';shrank=true;}
     });
     if(!shrank) break;
   }
 });
 var over=[];
 document.querySelectorAll('.sheettrim').forEach(function(t,i){
   var pad=t.querySelector('.sheetpad');
   // Report BY HOW MUCH, in inches. "It overflows" sends you guessing at the
   // padding; "it overflows by 0.31in" sizes the fix on the first try.
   if(pad&&pad.scrollHeight>pad.clientHeight+2)over.push(i+' by '+((pad.scrollHeight-pad.clientHeight)/96).toFixed(2)+'in');
 });
 window.__overflow=over; window.__fitted=true;}
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);else fit();})();`;
}

function wrap(inner: string, bleed: boolean) {
  return `<div class="page"><div class="bleedfill"></div>${bleed ? cropHtml() : ''}<div class="trim">${inner}</div></div>`;
}

function cropHtml() {
  const b = BLEED, gap = 0.035, len = 0.09;
  const out: string[] = [];
  for (const y of [b, b + TRIM_H]) {
    out.push(`<div class="crop h" style="left:${b - gap - len}in;top:${y}in"></div>`);
    out.push(`<div class="crop h" style="left:${b + TRIM_W + gap}in;top:${y}in"></div>`);
  }
  for (const x of [b, b + TRIM_W]) {
    out.push(`<div class="crop v" style="left:${x}in;top:${b - gap - len}in"></div>`);
    out.push(`<div class="crop v" style="left:${x}in;top:${b + TRIM_H + gap}in"></div>`);
  }
  return out.join('');
}

/**
 * The office file. Letter portrait, two landscape halves stacked, the same
 * business on both halves of a sheet.
 *
 * Duplex on the LONG edge. A long-edge flip on a portrait sheet mirrors left to
 * right and leaves top as top, so the top half's back lands on the top half's
 * back. Short-edge flip would turn the backs upside down, which is the classic
 * way a 2-up half page comes out of a copy shop wrong.
 */
async function renderOffice(browser: Browser, pieces: Piece[], qrs: Map<string, string>) {
  /**
   * There is nothing to impose on a full page: it IS letter, one side, no cut.
   * The office file becomes the same artwork without bleed or crop marks, which
   * is what her own printer wants.
   */
  if (IS_PAGE) return renderOfficePages(browser, pieces, qrs);
  const sheetsPerBusiness = Math.ceil(COPIES / 2);
  const sheets: string[] = [];
  for (const p of pieces) {
    const qr = qrs.get(p.lead.id)!;
    const o: FlyerOpts = { reportUrl: scanUrl(p.lead.id), auditedOn: readOn(p), bleed: false };
    const f = frontOf(p, qr, o);
    const b = backOf(p, qr, o);
    for (let i = 0; i < sheetsPerBusiness; i++) {
      sheets.push(sheet(f, f), sheet(b, b));
    }
  }
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;900&family=JetBrains+Mono:wght@400;500;700&display=block" rel="stylesheet">
<style>
${css({ bleed: false })}
${NOSITE_CSS}
@page { size: 8.5in 11in; margin: 0; }
.sheet { position: relative; width: 8.5in; height: 11in; background: #fff; page-break-after: always; break-after: page; }
.sheet:last-child { page-break-after: auto; break-after: auto; }
.slot { position: absolute; left: 0; width: ${TRIM_W}in; height: ${TRIM_H}in; overflow: hidden; background: ${CREAM}; }
.slot.top { top: 0; } .slot.bottom { top: ${TRIM_H}in; }
/* The cut line. A hairline the guillotine follows and the eye forgives. */
.cutline { position: absolute; left: 0; top: ${TRIM_H}in; width: 8.5in; height: 0.004in; background: rgba(22,22,22,0.28); }
.cutmark { position: absolute; background: ${INK}; width: 0.16in; height: 0.006in; top: ${TRIM_H}in; }
</style></head><body>${sheets.join('\n')}<script>${fitScript()}</script></body></html>`;

  const page = await browser.newPage({ viewport: { width: 900, height: 1180 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForFunction('window.__fitted === true', null, { timeout: 30_000 });
  await page.pdf({
    path: path.join(OUT, 'office', 'flyers-2up.pdf'),
    format: 'Letter',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
    preferCSSPageSize: true,
  });
  /**
   * A picture of the first two sides of the imposed sheet. The 2-up file is the
   * one a copy shop can get wrong, and the failure is silent: short-edge duplex
   * prints the backs upside down and nobody sees it until the box is opened. A
   * proof of the sheet itself is how that gets caught here instead of there.
   */
  if (PROOFS) {
    const shots = await page.locator('.sheet').all();
    for (let i = 0; i < Math.min(2, shots.length); i++) {
      await shots[i].screenshot({ path: path.join(OUT, 'proof', `sheet-${i === 0 ? 'front' : 'back'}.png`) });
    }
  }
  await page.close();
}

const sheet = (top: string, bottom: string) => `<div class="sheet">
  <div class="slot top"><div class="trim" style="position:absolute;inset:0">${top}</div></div>
  <div class="slot bottom"><div class="trim" style="position:absolute;inset:0">${bottom}</div></div>
  <div class="cutline"></div>
  <div class="cutmark" style="left:0"></div>
  <div class="cutmark" style="left:8.34in"></div>
</div>`;

function fitScript() {
  // Same pass as the press file, re-stated here because the office document
  // builds its own shell rather than going through documentHtml.
  return `
(function(){function fit(){
 document.querySelectorAll('[data-fit]').forEach(function(el){
   var max=parseFloat(el.dataset.max),min=parseFloat(el.dataset.min),size=max;
   el.style.fontSize=size+'pt'; var box=el.parentElement;
   var lim=function(){return parseFloat(getComputedStyle(el).lineHeight)*2+1;};
   while(size>min&&(el.scrollWidth>box.clientWidth||el.scrollHeight>lim())){size-=0.5;el.style.fontSize=size+'pt';}
 });
 document.querySelectorAll('[data-clamp]').forEach(function(el){
   el.style.display='-webkit-box';el.style.webkitBoxOrient='vertical';
   el.style.webkitLineClamp=el.dataset.clamp;el.style.overflow='hidden';
 });
 window.__fitted=true;}
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);else fit();})();`;
}

/** The full page, trim size, no marks. What comes out of her own printer. */
async function renderOfficePages(browser: Browser, pieces: Piece[], qrs: Map<string, string>) {
  const sheets: string[] = [];
  for (const p of pieces) {
    const qr = qrs.get(p.lead.id)!;
    const o: FlyerOpts = { reportUrl: scanUrl(p.lead.id), auditedOn: readOn(p), bleed: false };
    for (let i = 0; i < COPIES; i++) sheets.push(fullSheet(pageOf(p, qr, o, COHORT), false));
  }
  const page = await browser.newPage({ viewport: { width: 900, height: 1180 }, deviceScaleFactor: 2 });
  await page.setContent(pageDocument(sheets, false), { waitUntil: 'networkidle' });
  await page.waitForFunction('window.__fitted === true', null, { timeout: 60_000 });
  await page.pdf({
    path: path.join(OUT, 'office', 'flyers-letter.pdf'),
    format: 'Letter',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
    preferCSSPageSize: true,
  });
  await page.close();
}

/** The sheet that rides on the passenger seat. */
async function renderRoute(browser: Browser, pieces: Piece[]) {
  const byTown = new Map<string, Piece[]>();
  for (const p of pieces) {
    const t = (p.lead.city ?? 'Unknown').trim();
    if (!byTown.has(t)) byTown.set(t, []);
    byTown.get(t)!.push(p);
  }

  const rows: unknown[][] = [['Town', 'Business', 'Flyer', 'Grade', 'Score', 'Phone', 'Address', 'Website', 'Scan link', 'Status']];
  for (const [t, list] of byTown) {
    for (const { lead: l, kind } of list) {
      rows.push([
        t, l.business_name, kind === 'nosite' ? 'no website' : 'audit',
        l.audit_json?.letter_grade ?? '', l.audit_score ?? '',
        l.phone ?? '', l.address ?? '', host(l.website) ?? '', scanUrl(l.id), l.status ?? '',
      ]);
    }
  }
  writeFileSync(path.join(OUT, 'route', 'route-sheet.csv'), csv(rows), 'utf8');

  const sections = [...byTown.entries()].map(([t, list]) => `
    <section class="town">
      <h2>${t} <span class="count">${list.length} ${list.length === 1 ? 'stop' : 'stops'}</span></h2>
      <table>
        <thead><tr><th class="tick"></th><th>Business</th><th class="g">Grade</th><th>Phone</th><th>Address</th></tr></thead>
        <tbody>${list.map(({ lead: l, kind }) => `<tr>
          <td class="tick"><span class="box"></span></td>
          <td class="biz">${clean(l.business_name)}<span class="dom">${kind === 'nosite' ? 'no website' : host(l.website) ?? ''}</span></td>
          <td class="g">${kind === 'nosite'
            ? '<span class="chip none">No site</span>'
            : `<span class="chip">${l.audit_json?.letter_grade ?? ''}</span>`}</td>
          <td class="mono">${l.phone ?? ''}</td>
          <td class="addr">${l.address ? clean(l.address) : '<span class="need">address not on file</span>'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </section>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;900&family=JetBrains+Mono:wght@400;500;700&display=block" rel="stylesheet">
<style>
@page { size: 8.5in 11in; margin: 0.5in 0.55in; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: 'DM Sans', sans-serif; color: ${INK}; background: ${CREAM};
  font-feature-settings: 'liga' 0, 'clig' 0; }
h1 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 26pt; margin: 0; letter-spacing: -0.02em; }
.sub { font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.2em; color: ${CRIMSON}; margin-bottom: 4pt; }
.lede { font-size: 9.5pt; color: #3A3733; margin: 6pt 0 0; max-width: 5.6in; line-height: 1.4; }
.town { margin-top: 20pt; break-inside: auto; }
.town h2 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 14pt; margin: 0 0 6pt;
  border-bottom: 1.5pt solid ${INK}; padding-bottom: 4pt; }
.count { font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(22,22,22,0.5); margin-left: 8pt; }
table { width: 100%; border-collapse: collapse; }
th { font-family: 'JetBrains Mono', monospace; font-size: 6.5pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.14em; color: rgba(22,22,22,0.5); text-align: left; padding: 4pt 5pt; }
td { padding: 6pt 5pt; border-top: 0.5pt solid rgba(22,22,22,0.16); vertical-align: top; font-size: 9pt; }
tr { break-inside: avoid; }
.tick { width: 22pt; } .box { display: block; width: 12pt; height: 12pt; border: 1.2pt solid ${INK}; border-radius: 2pt; background: #fff; }
.biz { font-weight: 700; }
.dom { display: block; font-family: 'JetBrains Mono', monospace; font-size: 7pt; font-weight: 400;
  color: rgba(22,22,22,0.5); margin-top: 1.5pt; }
.g { width: 56pt; } .chip { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 8pt;
  font-weight: 700; border: 1.2pt solid ${INK}; border-radius: 3pt; padding: 1pt 5pt; background: ${MUSTARD}; }
.chip.none { background: ${CRIMSON}; color: #FFFDF6; font-size: 7pt; }
.mono { font-family: 'JetBrains Mono', monospace; font-size: 8pt; white-space: nowrap; }
.addr { font-size: 8.5pt; color: #3A3733; }
.need { color: ${CRIMSON}; font-family: 'JetBrains Mono', monospace; font-size: 7pt; text-transform: uppercase;
  letter-spacing: 0.1em; }
.foot { margin-top: 22pt; font-family: 'JetBrains Mono', monospace; font-size: 7pt; letter-spacing: 0.1em;
  text-transform: uppercase; color: rgba(22,22,22,0.5); border-top: 1pt solid ${INK}; padding-top: 8pt; }
.foot b { color: ${MUSTARD}; }
</style></head><body>
<div class="sub">Door Drop &middot; ${stamp()}</div>
<h1>Where I am going</h1>
<p class="lede">Every stop below has a flyer in the box with its own name, its own grade and its own three fixes.
Tick the box when the flyer is handed over. The grade is what the audit read on their live site, so if they ask,
open ${BASE}/audit and show them.</p>
${sections}
<div class="foot">Modern Mustard Seed &middot; Kalispell, MT &middot; (406) 312-1223 &middot; <b>modernmustardseed.com</b></div>
</body></html>`;

  const page = await browser.newPage({ viewport: { width: 850, height: 1100 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: path.join(OUT, 'route', 'route-sheet.pdf'),
    format: 'Letter', printBackground: true, preferCSSPageSize: true,
  });
  if (PROOFS) await page.screenshot({ path: path.join(OUT, 'proof', 'route-sheet.png'), fullPage: true });
  await page.close();
}

/** Screen proofs at 200 dpi, so the run gets looked at before it gets printed. */
async function renderProofs(browser: Browser, pieces: Piece[], qrs: Map<string, string>) {
  const page = await browser.newPage({
    viewport: IS_PAGE ? { width: 900, height: 1180 } : { width: 1700, height: 1100 },
    deviceScaleFactor: 2,
  });
  let i = 0;
  for (const p of pieces) {
    i += 1;
    const l = p.lead;
    const qr = qrs.get(l.id)!;
    const o: FlyerOpts = { reportUrl: scanUrl(l.id), auditedOn: readOn(p), bleed: false };
    const n = String(i).padStart(3, '0');
    const tag = p.kind === 'nosite' ? 'nosite-' : '';
    if (IS_PAGE) {
      await page.setContent(pageDocument([fullSheet(pageOf(p, qr, o, COHORT), false)], false), { waitUntil: 'networkidle' });
      await page.waitForFunction('window.__fitted === true', null, { timeout: 30_000 });
      const sheet = page.locator('.sheet').first();
      await sheet.screenshot({ path: path.join(OUT, 'proof', `${n}-${tag}${slug(l.business_name)}.png`) });
      continue;
    }
    const html = documentHtml([wrap(frontOf(p, qr, o), false), wrap(backOf(p, qr, o), false)], { bleed: false, extraCss: NOSITE_CSS });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForFunction('window.__fitted === true', null, { timeout: 30_000 });
    const sides = await page.locator('.page').all();
    await sides[0].screenshot({ path: path.join(OUT, 'proof', `${n}-${tag}${slug(l.business_name)}-front.png`) });
    await sides[1].screenshot({ path: path.join(OUT, 'proof', `${n}-${tag}${slug(l.business_name)}-back.png`) });
  }
  await page.close();
}

function writeReports(
  dropped: { id: string; business_name: string; city: string | null; gate: string; reason: string }[],
  chosen: Piece[],
) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    path.join(OUT, 'skipped.csv'),
    csv([['Business', 'Town', 'Gate', 'Why it is not in the box'], ...dropped.map((d) => [d.business_name, d.city ?? '', d.gate, d.reason])]),
    'utf8',
  );
  writeFileSync(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({
      generated_at: new Date().toISOString(),
      towns: CITIES,
      max_age_days: MAX_AGE_DAYS,
      copies_per_business: COPIES,
      printed: chosen.map(({ lead: l, kind }) => ({
        id: l.id,
        business_name: l.business_name,
        city: l.city,
        flyer: kind,
        website: host(l.website),
        grade: kind === 'nosite' ? null : (l.audit_json?.letter_grade ?? null),
        score: kind === 'nosite' ? null : (l.audit_score ?? null),
        audited_at: kind === 'nosite' ? null : l.audit_at,
        phone: l.phone,
        address: l.address,
        report_url: kind === 'nosite' ? `${BASE}/demos` : `${BASE}/audit/${l.id}`,
        scan_url: scanUrl(l.id),
        categories:
          kind === 'nosite'
            ? null
            : Object.fromEntries(CATEGORY_ORDER.map((k) => [k, l.audit_json?.categories?.[k]?.letter ?? null])),
      })),
      skipped: dropped,
    }, null, 2),
    'utf8',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
