/**
 * THE PRINTER SPEC. One page that goes to the print shop with the press file.
 *
 * It is generated rather than written because the only thing a shop gets wrong
 * on a job like this is the count, and the count is in the manifest. Every
 * number on the page is read back out of the run that produced the PDF, so the
 * spec and the file cannot drift apart.
 *
 * The one instruction the whole job turns on is the second line of the run
 * notes: EVERY FLYER IS DIFFERENT. A shop that sees 400 pages of the same-
 * looking layout will assume it is one design at quantity 200 and will print
 * page one two hundred times. Saying it once, in bold, at the top, is cheaper
 * than a reprint.
 *
 *   npx tsx scripts/door-drop/spec.mts --out artifacts/door-drop/full
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { INK, CREAM, PAPER, MUSTARD, CRIMSON } from './flyer.mts';

const argv = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? d);
};
const OUT = path.resolve(flag('out', path.join('artifacts', 'door-drop', 'full')));
const COPIES_EACH = Number(flag('copies-each', '25'));

type Manifest = {
  generated_at: string;
  towns: string[];
  copies_per_business: number;
  printed: { business_name: string; city: string; grade: string; score: number }[];
};

const m = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8')) as Manifest;
const businesses = m.printed.length;
const byTown = new Map<string, number>();
for (const p of m.printed) byTown.set(p.city, (byTown.get(p.city) ?? 0) + 1);

const sheetsPerBusiness = Math.ceil(COPIES_EACH / 2);
const totalSheets = businesses * sheetsPerBusiness;
const totalFlyers = businesses * COPIES_EACH;

const rows = [...byTown.entries()].map(([t, n]) => `<tr><td>${t}</td><td class="n">${n}</td><td class="n">${n * COPIES_EACH}</td></tr>`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;900&family=JetBrains+Mono:wght@400;500;700&display=block" rel="stylesheet">
<style>
@page { size: 8.5in 11in; margin: 0.55in 0.6in; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: 'DM Sans', sans-serif; color: ${INK}; background: ${CREAM};
  font-feature-settings: 'liga' 0, 'clig' 0; font-size: 10pt; line-height: 1.45; }
.eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.2em; color: ${CRIMSON}; }
h1 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 27pt; margin: 3pt 0 0; letter-spacing: -0.02em; }
h2 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 13pt; margin: 20pt 0 6pt;
  border-bottom: 1.5pt solid ${INK}; padding-bottom: 4pt; }
.warn { border: 2pt solid ${INK}; border-radius: 7pt; background: ${MUSTARD}; padding: 11pt 13pt; margin-top: 13pt;
  box-shadow: 4pt 4pt 0 0 ${INK}; }
.warn b { font-size: 11.5pt; }
dl { display: grid; grid-template-columns: 1.55in 1fr; row-gap: 5pt; column-gap: 10pt; margin: 0; }
dt { font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.11em; color: rgba(22,22,22,0.55); padding-top: 2pt; }
dd { margin: 0; }
table { width: 100%; border-collapse: collapse; margin-top: 4pt; }
th { font-family: 'JetBrains Mono', monospace; font-size: 7pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.12em; color: rgba(22,22,22,0.55); text-align: left; padding: 4pt 6pt; }
td { padding: 5pt 6pt; border-top: 0.5pt solid rgba(22,22,22,0.16); }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', monospace; }
.tot td { border-top: 1.5pt solid ${INK}; font-weight: 700; }
.sw { display: inline-block; width: 11pt; height: 11pt; border: 1pt solid ${INK}; border-radius: 2pt;
  vertical-align: -1.5pt; margin-right: 5pt; }
ol { margin: 4pt 0 0; padding-left: 15pt; } li { margin-bottom: 4pt; }
.foot { margin-top: 22pt; border-top: 1pt solid ${INK}; padding-top: 8pt;
  font-family: 'JetBrains Mono', monospace; font-size: 7pt; letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(22,22,22,0.55); }
.foot b { color: ${MUSTARD}; }
</style></head><body>

<div class="eyebrow">Print Spec &middot; ${m.generated_at.slice(0, 10)}</div>
<h1>Flathead Door Drop, half page</h1>

<div class="warn">
  <b>Every flyer in this file is a different business.</b><br>
  This is not one design at quantity ${totalFlyers}. It is ${businesses} separate two sided flyers, each carrying
  its own company name, its own score and its own text. Pages run front, back, front, back in order. Please do
  not print page one repeatedly.
</div>

<h2>The job</h2>
<dl>
  <dt>File</dt><dd><b>press/flyers-press.pdf</b>, ${businesses * 2} pages</dd>
  <dt>Trim size</dt><dd>8.5 in wide by 5.5 in tall, landscape. Half of a letter sheet.</dd>
  <dt>File size</dt><dd>8.75 in by 5.75 in. That is 0.125 in of bleed on all four sides, with crop marks.</dd>
  <dt>Sides</dt><dd>Two, 4/4 full colour. Page 1 is the front of flyer 1, page 2 is its back, and so on.</dd>
  <dt>Quantity</dt><dd><b>${COPIES_EACH} of each</b> of the ${businesses} businesses, ${totalFlyers} pieces in total.</dd>
  <dt>Stock</dt><dd>100 lb matte cover preferred. 80 lb gloss text is acceptable if it keeps the job same day.</dd>
  <dt>Finishing</dt><dd>Cut to trim. No fold, no score, no round corner, no coating that kills a pen.</dd>
  <dt>Colour</dt><dd>File is RGB. Convert with US Web Coated SWOP. Match the swatches below rather than
      auto-correcting; the cream ground should stay warm and must not print white.</dd>
</dl>

<h2>Colours</h2>
<dl>
  <dt><span class="sw" style="background:${MUSTARD}"></span>Mustard</dt><dd>#F5B700. The brand yellow. It carries the grade panel and must stay saturated.</dd>
  <dt><span class="sw" style="background:${CREAM}"></span>Cream</dt><dd>#FBF6EA. The ground on every piece. Not white.</dd>
  <dt><span class="sw" style="background:${INK}"></span>Ink</dt><dd>#161616. All rules, borders and offset shadows. Rich black is fine, pure K is fine.</dd>
  <dt><span class="sw" style="background:${CRIMSON}"></span>Red</dt><dd>#C4160B. Labels and the failing marks.</dd>
  <dt><span class="sw" style="background:${PAPER};"></span>Card</dt><dd>#FFFDF6. The panels that sit on the cream.</dd>
</dl>

<h2>Counts by town</h2>
<table>
  <thead><tr><th>Town</th><th class="n">Businesses</th><th class="n">Pieces</th></tr></thead>
  <tbody>${rows}
    <tr class="tot"><td>Total</td><td class="n">${businesses}</td><td class="n">${totalFlyers}</td></tr>
  </tbody>
</table>

<h2>If you would rather we ran it in house</h2>
<p style="margin:4pt 0 0">The file <b>office/flyers-2up.pdf</b> is the same artwork imposed two up on letter,
the same business on both halves of a sheet. Print it double sided, <b>flip on the LONG edge</b>, then make one
straight cut across the middle of the stack. Short edge flip turns every back upside down. That file carries
${m.copies_per_business} copies of each business as built; ask for a different number and it will be rebuilt.</p>

<h2>Proofing</h2>
<ol>
  <li>Pull one sheet before the run and check that the company name at the top matches the company name on the back.</li>
  <li>Check the cream reads warm and not grey. If it has gone grey the profile is wrong.</li>
  <li>Scan the QR square on the front with a phone. It must open a web page. If it does not, stop and call.</li>
</ol>

<div class="foot">Modern Mustard Seed &middot; Sarah Scarano &middot; (406) 312-1223 &middot; sarah@modernmustardseed.com &middot; <b>modernmustardseed.com</b></div>
</body></html>`;

mkdirSync(path.join(OUT, 'press'), { recursive: true });
writeFileSync(path.join(OUT, 'press', 'printer-spec.html'), html, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 850, height: 1100 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.pdf({ path: path.join(OUT, 'press', 'printer-spec.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
await page.screenshot({ path: path.join(OUT, 'proof', 'printer-spec.png'), fullPage: true });
await browser.close();

console.log(`printer-spec.pdf written: ${businesses} businesses, ${COPIES_EACH} each, ${totalFlyers} pieces, ${totalSheets} sheets if run 2-up.`);
