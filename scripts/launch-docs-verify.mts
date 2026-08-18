/**
 * PROVE THE LAUNCH PDFS FIT ON THE PAGE.
 *
 * A PDF is the one deliverable you cannot review by loading it in the browser
 * automation: Chrome renders it in a plugin surface no script can reach. So
 * instead of eyeballing two pages and hoping page seven is fine, this records
 * every single string the generator draws and checks the two things that
 * actually go wrong:
 *
 *   1. a line wider than the text column, which runs off the right edge and is
 *      silently cut when it prints
 *   2. a line drawn below the footer rule or above the page top, which either
 *      collides with the footer or falls off the page entirely
 *
 * Both are invisible in the first two pages and both have shipped in PDFs
 * before. This walks all of them.
 *
 *   npx tsx scripts/launch-docs-verify.mts data/launch-clients/kylers-lawn-snow.json
 */
import fs from 'node:fs';
import { PDFPage } from 'pdf-lib';
import { standardLaunchGroups, type LaunchFacts } from '../data/launch-standard';
import { ownerManualPdf, adminLaunchPdf, type OfficeTab, type Palette } from '../lib/launch-pdf';

type Config = {
  title: string;
  palette?: Palette;
  officeLogin?: { url: string; user: string; note: string };
  officeTabs?: OfficeTab[];
  open?: { what: string; why: string }[];
  facts: LaunchFacts;
};

const configPath = process.argv[2];
if (!configPath) {
  console.error('usage: launch-docs-verify.mts <config.json>');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Config;
const groups = standardLaunchGroups(cfg.facts);

const M = 54;
const W = 612;
const H = 792;
const CONTENT_W = W - 2 * M;
const FOOT_RULE = M - 4; // the footer hairline sits at about y = 50

type Draw = { doc: string; page: number; x: number; y: number; w: number; text: string };
const draws: Draw[] = [];
let label = '';
const pageIndex = new WeakMap<object, number>();
let counter = 0;

const original = PDFPage.prototype.drawText;
/* Recorded rather than replaced: the real draw still happens, so what is checked
   is exactly what is written to the file. */
PDFPage.prototype.drawText = function (text: string, options: Parameters<typeof original>[1]) {
  if (!pageIndex.has(this)) pageIndex.set(this, ++counter);
  const size = options?.size ?? 10;
  const font = options?.font;
  const w = font ? font.widthOfTextAtSize(String(text), size) : String(text).length * size * 0.5;
  draws.push({
    doc: label,
    page: pageIndex.get(this)!,
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    w,
    text: String(text),
  });
  return original.call(this, text, options);
} as typeof original;

label = 'owner-manual';
counter = 0;
await ownerManualPdf({
  facts: cfg.facts,
  groups,
  palette: cfg.palette ?? { ink: '#161616', accent: '#C4160B', soft: '#5E5B4E', band: '#FFF3CC' },
  officeTabs: cfg.officeTabs,
  officeLogin: cfg.officeLogin,
});
const manualPages = counter;

label = 'launch-runbook';
counter = 0;
await adminLaunchPdf({ facts: cfg.facts, groups, open: cfg.open });
const runbookPages = counter;

let bad = 0;
const seen = new Set<string>();
for (const d of draws) {
  /* The page number letter-spacing draw sits deliberately in the footer band. */
  const isFooter = d.y < M && d.y > 20;
  const right = d.x + d.w;
  if (right > W - M + 0.5) {
    console.error(
      `OVERFLOW  ${d.doc} p${d.page}  ends at ${right.toFixed(1)} of ${W - M}  "${d.text.slice(0, 64)}"`,
    );
    bad++;
  }
  if (!isFooter && d.y < FOOT_RULE) {
    console.error(`BELOW FOOTER  ${d.doc} p${d.page}  y=${d.y.toFixed(1)}  "${d.text.slice(0, 64)}"`);
    bad++;
  }
  if (d.y > H - 20) {
    console.error(`OFF TOP  ${d.doc} p${d.page}  y=${d.y.toFixed(1)}  "${d.text.slice(0, 64)}"`);
    bad++;
  }
  seen.add(d.text);
}

/* Every step in the checklist has to actually appear in a document, or the
   generator is quietly dropping content that the portal still shows. */
/* Punctuation becomes a space on both sides, then whitespace collapses on both
   sides. Without the collapse, ', ' turns into two spaces in the haystack and
   one in the needle, and every step reads as missing. */
const norm = (s: string) => s.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const allText = norm(draws.map((d) => d.text).join(' '));
const missing = groups
  .flatMap((g) => g.items)
  .filter((i) => {
    const head = i.what.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
    return head.length > 6 && !allText.replace(/[^A-Za-z0-9 ]/g, ' ').includes(head);
  });
for (const m of missing) {
  console.error(`NOT IN ANY PDF  [${m.who}] ${m.what}`);
  bad++;
}

console.log(`owner's manual  ${manualPages} pages`);
console.log(`launch runbook  ${runbookPages} pages`);
console.log(`${draws.length} strings drawn, ${CONTENT_W}pt column, ${bad} problem(s)`);
if (bad) process.exit(1);
console.log('every line fits the column and sits on the page');
