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
  FLATHEAD, loadEnv, supabase, fetchTownLeads, gate, host,
  CATEGORY_ORDER, type Lead,
} from './select.mts';
import {
  documentHtml, frontInner, backInner, qrSvg, css, clean,
  TRIM_W, TRIM_H, BLEED, INK, CREAM, MUSTARD, CRIMSON,
} from './flyer.mts';

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
const CITIES = (flag('cities') || '').trim() ? flag('cities')!.split(',').map((s) => s.trim()) : FLATHEAD;
const MAX_AGE_DAYS = Number(flag('max-age-days', '21'));
const REFRESH = has('refresh');
const ALLOW_STALE = has('allow-stale');
const COPIES = Math.max(1, Number(flag('copies', '2')));
const BASE = flag('base', 'https://modernmustardseed.com')!;
const OUT = path.resolve(flag('out', path.join('artifacts', 'door-drop', stamp()))!);
const CONCURRENCY = Number(flag('concurrency', '6'));
const PROOFS = !has('no-proofs');

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

/** North to south, the way she will actually drive it. */
const TOWN_ORDER = new Map(FLATHEAD.map((t, i) => [t.toLowerCase(), i]));
const townRank = (c: string | null) => TOWN_ORDER.get((c ?? '').toLowerCase()) ?? 99;

async function main() {
  const sb = supabase();

  const skipPath = path.join(ROOT, 'scripts', 'door-drop', 'skip.txt');
  const skipNames = new Set(
    existsSync(skipPath)
      ? readFileSync(skipPath, 'utf8').split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith('#'))
      : [],
  );

  console.log(`Towns: ${CITIES.join(', ')}`);
  const { leads, shared } = await fetchTownLeads(sb, CITIES);
  console.log(`Leads on file in those towns: ${leads.length}`);

  let { keep, stale, dropped } = gate(leads, shared, { maxAgeDays: MAX_AGE_DAYS, allowStale: ALLOW_STALE, skipNames });
  console.log(`Passed every gate: ${keep.length}. Stale or never audited: ${stale.length}. Dropped: ${dropped.length}.`);

  if (REFRESH && stale.length) {
    const refreshed = await refreshAudits(sb, stale.slice(0, ALL ? stale.length : LIMIT));
    const re = gate(refreshed, shared, { maxAgeDays: MAX_AGE_DAYS, allowStale: false, skipNames });
    keep = keep.concat(re.keep);
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

  keep.sort((a, b) => townRank(a.city) - townRank(b.city) || a.business_name.localeCompare(b.business_name));
  const chosen = keep.slice(0, LIMIT);
  if (!chosen.length) {
    console.error('Nothing passed the gates. Run with --refresh, or widen --max-age-days.');
    writeReports(dropped, []);
    process.exit(1);
  }
  console.log(`Printing ${chosen.length} businesses.`);

  mkdirSync(path.join(OUT, 'press'), { recursive: true });
  mkdirSync(path.join(OUT, 'office'), { recursive: true });
  mkdirSync(path.join(OUT, 'route'), { recursive: true });
  if (PROOFS) mkdirSync(path.join(OUT, 'proof'), { recursive: true });

  const qrs = new Map<string, string>();
  for (const l of chosen) qrs.set(l.id, await qrSvg(`${BASE}/audit/${l.id}`));

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
  console.log(`  press/flyers-press.pdf   ${chosen.length * 2} pages, 8.75 x 5.75 with bleed and crop marks`);
  console.log(`  office/flyers-2up.pdf    ${chosen.length * 2 * Math.ceil(COPIES / 2)} letter sides, duplex long edge, one cut`);
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

async function renderPress(browser: Browser, leads: Lead[], qrs: Map<string, string>) {
  const opts = { bleed: true as const };
  const pages: string[] = [];
  for (const l of leads) {
    const qr = qrs.get(l.id)!;
    const o = { reportUrl: `${BASE}/audit/${l.id}`, auditedOn: new Date(l.audit_at!), bleed: true };
    pages.push(wrap(frontInner(l, qr, o), true), wrap(backInner(l, qr, o), true));
  }
  const html = documentHtml(pages, opts);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await settle(page, 'press');
  await page.pdf({
    path: path.join(OUT, 'press', 'flyers-press.pdf'),
    width: `${TRIM_W + BLEED * 2}in`,
    height: `${TRIM_H + BLEED * 2}in`,
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
    preferCSSPageSize: true,
  });
  await page.close();
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
async function renderOffice(browser: Browser, leads: Lead[], qrs: Map<string, string>) {
  const sheetsPerBusiness = Math.ceil(COPIES / 2);
  const sheets: string[] = [];
  for (const l of leads) {
    const qr = qrs.get(l.id)!;
    const o = { reportUrl: `${BASE}/audit/${l.id}`, auditedOn: new Date(l.audit_at!), bleed: false };
    const f = frontInner(l, qr, o);
    const b = backInner(l, qr, o);
    for (let i = 0; i < sheetsPerBusiness; i++) {
      sheets.push(sheet(f, f), sheet(b, b));
    }
  }
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;900&family=JetBrains+Mono:wght@400;500;700&display=block" rel="stylesheet">
<style>
${css({ bleed: false })}
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

/** The sheet that rides on the passenger seat. */
async function renderRoute(browser: Browser, leads: Lead[]) {
  const byTown = new Map<string, Lead[]>();
  for (const l of leads) {
    const t = (l.city ?? 'Unknown').trim();
    if (!byTown.has(t)) byTown.set(t, []);
    byTown.get(t)!.push(l);
  }

  const rows: unknown[][] = [['Town', 'Business', 'Grade', 'Score', 'Phone', 'Address', 'Website', 'Report link', 'Status']];
  for (const [t, list] of byTown) {
    for (const l of list) {
      rows.push([
        t, l.business_name, l.audit_json?.letter_grade ?? '', l.audit_score ?? '',
        l.phone ?? '', l.address ?? '', host(l.website) ?? '', `${BASE}/audit/${l.id}`, l.status ?? '',
      ]);
    }
  }
  writeFileSync(path.join(OUT, 'route', 'route-sheet.csv'), csv(rows), 'utf8');

  const sections = [...byTown.entries()].map(([t, list]) => `
    <section class="town">
      <h2>${t} <span class="count">${list.length} ${list.length === 1 ? 'stop' : 'stops'}</span></h2>
      <table>
        <thead><tr><th class="tick"></th><th>Business</th><th class="g">Grade</th><th>Phone</th><th>Address</th></tr></thead>
        <tbody>${list.map((l) => `<tr>
          <td class="tick"><span class="box"></span></td>
          <td class="biz">${clean(l.business_name)}<span class="dom">${host(l.website) ?? ''}</span></td>
          <td class="g"><span class="chip">${l.audit_json?.letter_grade ?? ''}</span></td>
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
.g { width: 44pt; } .chip { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 8pt;
  font-weight: 700; border: 1.2pt solid ${INK}; border-radius: 3pt; padding: 1pt 5pt; background: ${MUSTARD}; }
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
async function renderProofs(browser: Browser, leads: Lead[], qrs: Map<string, string>) {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1100 }, deviceScaleFactor: 2 });
  let i = 0;
  for (const l of leads) {
    i += 1;
    const qr = qrs.get(l.id)!;
    const o = { reportUrl: `${BASE}/audit/${l.id}`, auditedOn: new Date(l.audit_at!), bleed: false };
    const html = documentHtml([wrap(frontInner(l, qr, o), false), wrap(backInner(l, qr, o), false)], { bleed: false });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForFunction('window.__fitted === true', null, { timeout: 30_000 });
    const sides = await page.locator('.page').all();
    const n = String(i).padStart(3, '0');
    await sides[0].screenshot({ path: path.join(OUT, 'proof', `${n}-${slug(l.business_name)}-front.png`) });
    await sides[1].screenshot({ path: path.join(OUT, 'proof', `${n}-${slug(l.business_name)}-back.png`) });
  }
  await page.close();
}

function writeReports(dropped: { id: string; business_name: string; city: string | null; gate: string; reason: string }[], chosen: Lead[]) {
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
      printed: chosen.map((l) => ({
        id: l.id,
        business_name: l.business_name,
        city: l.city,
        website: host(l.website),
        grade: l.audit_json?.letter_grade,
        score: l.audit_score,
        audited_at: l.audit_at,
        report_url: `${BASE}/audit/${l.id}`,
        categories: Object.fromEntries(CATEGORY_ORDER.map((k) => [k, l.audit_json?.categories?.[k]?.letter ?? null])),
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
