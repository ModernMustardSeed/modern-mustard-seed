/**
 * THE FULL PAGE. One business, one side, 8.5 by 11.
 *
 * WHY THIS EXISTS AND WHY IT IS NOW THE DEFAULT.
 *
 * The half page put the diagnosis on the front and the close on the back, which
 * is a clean piece of design and one bad assumption: that the paper gets turned
 * over. It is handed across a counter to a man who is mid-shift, or left beside
 * a till. He reads his own name, he reads the F, and if the paper never flips he
 * has been told his website is failing and never told what to do about it. That
 * is not a soft loss, it is the worst possible outcome for this campaign. The
 * three fixes and the offer are the only reason the grade is on there.
 *
 * One side removes that failure completely. It also removes the three ways a
 * print shop can ruin the job: no duplex setting, no long-edge flip to get
 * backwards, no cut. And a full sheet reads like an inspection notice, which is
 * exactly what it is. A half page reads like a coupon.
 *
 * The cost argument goes the same way, which was the surprise. The half page
 * needs 406 duplex letter sheets plus a guillotine pass to make 609 pieces.
 * The full page needs 609 simplex letter sheets and no finishing at all. Colour
 * duplex is close to double colour simplex at any shop, so the sheet count
 * roughly cancels and the cutting charge does not.
 *
 * The half page is kept behind `--format half`. It is the right piece for a
 * counter display or a windshield, where the size is the point.
 *
 * WHAT MOVED. Nothing was cut. The full page carries the name, the domain, the
 * honest headline, the grade, all seven bars, the three findings, the three
 * fixes with their why and their how, the offer, the QR and the contact line.
 * Eleven inches is enough for all of it without crowding, which is why this is a
 * re-layout rather than a rewrite: every string comes from the same audit and
 * the same two files.
 */
import {
  INK, PAPER, MUSTARD, CRIMSON, GREEN, AMBER,
  clean, firstSentences, type FlyerOptions,
} from './flyer.mts';
import {
  CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_SHORT, host, REGIONS,
  type AuditCategory, type AuditReport, type Lead, type Region,
} from './select.mts';
import { presenceOf, prettyPhone } from './flyer-nosite.mts';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Sarah's signature, embedded.
 *
 * A door drop that ends in a logo is from a company. A door drop that ends in a
 * signature is from a person, and on a piece that has just graded somebody's
 * life's work an F, a person is what it needs to be from. It sits beside the
 * receipts line rather than inside the offer block on purpose: the offer is the
 * business talking, and this is the last thing on the page before the footer.
 *
 * Inlined as a data URI because the renderer calls setContent with no base URL,
 * so a src path would resolve against nothing and print a broken image box. It
 * is read once at module load; a missing file degrades to no signature rather
 * than to a broken page.
 */
const SIGNATURE = (() => {
  const f = path.join(process.cwd(), 'public', 'brand', 'sig-name.png');
  if (!existsSync(f)) return null;
  return `data:image/png;base64,${readFileSync(f).toString('base64')}`;
})();

/** The receipts line, signed where the signature belongs to whoever hands it over. */
function signedNote(note: string, region: Region): string {
  if (!SIGNATURE || !region.signature) return `<p class="pnote" style="margin:0.1in 0 0">${note}</p>`;
  return `<div style="display:grid;grid-template-columns:1.65in 1fr;column-gap:0.24in;align-items:center;margin-top:0.1in">
    <img src="${SIGNATURE}" alt="Sarah Scarano" style="width:1.65in;display:block" />
    <p class="pnote" style="margin:0">${note}</p>
  </div>`;
}

/**
 * WHERE THEY STAND, measured across the run itself.
 *
 * The single most valuable thing this campaign owns is not any one audit, it is
 * all of them. 188 Flathead websites graded in one month is a dataset nobody
 * else in the valley has, and the numbers in it reframe the whole pitch:
 *
 *   177 of 188 have no AI tools at all. 168 of 188 cannot be quoted by an AI
 *   search engine.
 *
 * A grade on its own is an accusation, and a man reading an F about his own
 * business gets defensive before he gets curious. The same F beside an
 * explanation is an opportunity: search changed underneath everybody, most of
 * these sites were built for the old rules, and almost nobody has made the move
 * yet. That is why the scores are low, it is true, and it hands the reader a
 * reason rather than a verdict.
 *
 * WHAT IS DELIBERATELY NOT ON THE PAPER. The run also knows that not one
 * business reached a B and the valley's best is a C+ (bestGrade, atB below, and
 * the build prints them to the console). Sarah cut that line on 2026-09-11: a
 * flyer that announces the whole town is failing reads as a sneer, and it makes
 * the reader's own grade feel less like something worth fixing. The fields stay
 * because they are worth knowing internally. They do not go on the page.
 *
 * Every figure is computed from the run that produced the PDF, so the paper can
 * never quote a number that was true last month. The copy says "we graded",
 * never "the Flathead", because the cohort is the businesses we read and not
 * every website in the county.
 */
/**
 * Below this many graded sites the band prints no counts.
 *
 * A twelve-business proof run computed a cohort of twelve and the page read "of
 * the 2 we graded this month, 2 have no AI on them at all", which is true,
 * useless, and makes the studio look like it audited two websites. A statistic
 * has to be big enough to mean something before it earns ink. Under the floor
 * the sentence still runs, just without the numbers, and the scale beside it is
 * about this business alone so it is unaffected either way.
 */
const COHORT_FLOOR = 30;

export type Cohort = {
  /** How many websites were graded in this run. */
  graded: number;
  /** The highest score and its letter. */
  bestScore: number;
  bestGrade: string;
  /** How many reached a B. Zero on 2026-09-11, which is the whole point. */
  atB: number;
  /** Failing AI search, and failing AI tools. */
  geoF: number;
  aiF: number;
};

/** Letter, portrait. Trim and bleed in inches. */
export const PAGE_W = 8.5;
export const PAGE_H = 11;
export const PAGE_BLEED = 0.125;

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const gradeColor = (score: number) => (score >= 80 ? GREEN : score >= 60 ? AMBER : CRIMSON);

const town = (c: string | null) =>
  (c ?? '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).trim();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

/**
 * The stylesheet for the full page.
 *
 * Shares the house grammar with the half page, at a slightly larger scale
 * because the reading distance is a desk rather than a hand. Written in inches
 * for the same reason as the other one: a layout tuned in pixels drifts between
 * the screen proof and the press file, and the drift lands on the line that had
 * no room.
 */
export function pageCss(opts: { bleed: boolean }): string {
  const pw = opts.bleed ? PAGE_W + PAGE_BLEED * 2 : PAGE_W;
  const ph = opts.bleed ? PAGE_H + PAGE_BLEED * 2 : PAGE_H;
  return `
@page { size: ${pw}in ${ph}in; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: 'DM Sans', system-ui, sans-serif; font-feature-settings: 'liga' 0, 'clig' 0; color: ${INK}; }

.sheet { position: relative; width: ${pw}in; height: ${ph}in; overflow: hidden;
  page-break-after: always; break-after: page; background: #FBF6EA; }
.sheet:last-child { page-break-after: auto; break-after: auto; }
.sheetfill { position: absolute; inset: 0; background: #FBF6EA; }
.sheettrim { position: absolute; inset: ${opts.bleed ? PAGE_BLEED + 'in' : '0'}; width: ${PAGE_W}in; height: ${PAGE_H}in; }
.sheetpad { position: absolute; inset: 0; padding: 0.42in 0.54in 0.34in; display: flex; flex-direction: column; }

.pcrop { position: absolute; background: ${INK}; }
.pcrop.h { width: 0.11in; height: 0.006in; }
.pcrop.v { width: 0.006in; height: 0.11in; }

.pcard { border: 0.024in solid ${INK}; border-radius: 0.11in; background: ${PAPER};
  box-shadow: 0.05in 0.05in 0 0 ${INK}; }
.pcard.yellow { background: ${MUSTARD}; }
.pcard.ink { background: ${INK}; color: ${PAPER}; box-shadow: 0.05in 0.05in 0 0 ${MUSTARD}; }

.peyebrow { font-family: 'JetBrains Mono', monospace; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.2em; font-size: 7.6pt; color: ${CRIMSON}; }
.peyebrow.muted { color: rgba(22,22,22,0.5); }
.prule { height: 0.02in; background: ${INK}; }
.phair { height: 0.014in; background: rgba(22,22,22,0.18); }

.pname { font-family: 'Playfair Display', Georgia, serif; font-weight: 900; line-height: 0.94;
  letter-spacing: -0.018em; color: ${INK}; }
.pdomain { font-family: 'JetBrains Mono', monospace; font-weight: 500; font-size: 9pt;
  letter-spacing: 0.02em; color: rgba(22,22,22,0.62); }
.phead { font-size: 13pt; line-height: 1.32; color: #2E2B27; letter-spacing: -0.006em; }
.pnote { font-size: 8.2pt; line-height: 1.4; color: rgba(22,22,22,0.55); }
.tabular { font-variant-numeric: tabular-nums; }

/* The seven bars run as a single row across the page, one column each. */
.pbars { display: grid; grid-template-columns: repeat(7, 1fr); column-gap: 0.1in; }
.pbar { display: flex; flex-direction: column; align-items: stretch; }
.pbar-label { font-family: 'JetBrains Mono', monospace; font-size: 6.6pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em; color: rgba(22,22,22,0.72); white-space: nowrap; }
.pbar-letter { font-family: 'Playfair Display', Georgia, serif; font-weight: 900; font-size: 13.5pt;
  line-height: 1; margin-top: 0.035in; }
.pbar-track { height: 0.085in; border: 0.014in solid ${INK}; border-radius: 0.045in; background: #fff;
  overflow: hidden; margin-top: 0.05in; }
.pbar-fill { height: 100%; }

.pfindings { list-style: none; margin: 0; padding: 0; display: grid; row-gap: 0.085in; }
.pfinding { display: grid; grid-template-columns: 0.185in 1fr; column-gap: 0.1in; align-items: start; }
.px { display: grid; place-items: center; width: 0.185in; height: 0.185in; margin-top: 0.015in;
  border: 0.015in solid ${INK}; border-radius: 0.038in; background: ${CRIMSON}; color: ${PAPER};
  font-size: 7pt; line-height: 1; font-weight: 700; }
.pfinding-cat { display: block; font-family: 'JetBrains Mono', monospace; font-size: 7pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.13em; color: rgba(22,22,22,0.72); }
.pfinding-grade { font-size: 7pt; margin-left: 0.06in; letter-spacing: 0.06em; }
.pfinding-note { display: block; font-size: 9.1pt; line-height: 1.35; color: #3A3733; margin-top: 0.025in; }

.pfixnum { font-family: 'Playfair Display', Georgia, serif; font-weight: 900; font-size: 20pt; line-height: 1; }
.pfixtitle { font-size: 10.6pt; font-weight: 700; line-height: 1.2; letter-spacing: -0.005em; }
.pfixwhy { font-size: 8.8pt; line-height: 1.36; color: #4A463F; font-style: italic; }
.pfixhow { font-size: 8.8pt; line-height: 1.38; color: #3A3733; }

.plisting { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr);
  column-gap: 0.18in; }
.plisting li { display: grid; grid-template-columns: 0.185in 1fr; column-gap: 0.1in; align-items: start; }
.ptick { display: grid; place-items: center; width: 0.185in; height: 0.185in; margin-top: 0.015in;
  border: 0.015in solid ${INK}; border-radius: 0.038in; color: ${PAPER};
  font-size: 7pt; line-height: 1; font-weight: 700; }
.ptick.yes { background: ${GREEN}; } .ptick.no { background: ${CRIMSON}; }

.pfoot { font-family: 'JetBrains Mono', monospace; font-size: 7pt; font-weight: 500;
  letter-spacing: 0.08em; text-transform: uppercase; color: rgba(22,22,22,0.55); }
.pcredit { color: ${MUSTARD}; font-weight: 700; }
.pseed { width: 0.34in; height: 0.34in; display: block; }
`;
}

export function pageCropMarks(): string {
  const b = PAGE_BLEED, gap = 0.035, len = 0.11;
  const out: string[] = [];
  for (const y of [b, b + PAGE_H]) {
    out.push(`<div class="pcrop h" style="left:${b - gap - len}in;top:${y}in"></div>`);
    out.push(`<div class="pcrop h" style="left:${b + PAGE_W + gap}in;top:${y}in"></div>`);
  }
  for (const x of [b, b + PAGE_W]) {
    out.push(`<div class="pcrop v" style="left:${x}in;top:${b - gap - len}in"></div>`);
    out.push(`<div class="pcrop v" style="left:${x}in;top:${b + PAGE_H + gap}in"></div>`);
  }
  return out.join('');
}

/** The same mark the half page carries, from app/icon.svg. */
const SEED = `<svg viewBox="0 0 64 64" class="pseed" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pgSeed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFE16A"/><stop offset="45%" stop-color="#F4C518"/><stop offset="100%" stop-color="#D69A0E"/>
    </linearGradient>
    <linearGradient id="pgLeaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFD83A"/><stop offset="100%" stop-color="#E2A60C"/>
    </linearGradient>
  </defs>
  <g stroke="#1c1205" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M32 17 C 22 21, 16 31, 16 41 C 16 52, 24 58, 32 58 C 40 58, 48 52, 48 41 C 48 31, 42 21, 32 17 Z" fill="url(#pgSeed)"/>
    <path d="M32 18 L 32 11" fill="none"/>
    <path d="M32 12 C 27 6, 20 4, 14 6 C 18 12, 26 14, 32 12 Z" fill="url(#pgLeaf)"/>
    <path d="M32 12 C 37 5, 45 3, 51 6 C 47 12, 38 15, 32 12 Z" fill="url(#pgLeaf)"/>
  </g>
  <ellipse cx="26" cy="31" rx="4.2" ry="6.8" fill="#FFFFFF" opacity="0.32" transform="rotate(-20 26 31)"/>
</svg>`;

/** The offer, identical on both pieces. One sentence, after the receipts. */
function offerBlock(qr: string, line: string, region: Region): string {
  return `<div class="pcard ink" style="padding:0.17in 0.2in;display:grid;grid-template-columns:1fr 1.05in;column-gap:0.22in;align-items:center">
    <div style="min-width:0">
      <h2 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:18pt;line-height:1.12;color:${PAPER}">${line}</h2>
      <p style="margin:0.1in 0 0;font-size:9pt;line-height:1.4;color:rgba(255,253,246,0.82)">
        This is the moment it is cheapest to catch up, and it will not read as early for long. ${region.studio}
      </p>
      <p style="margin:0.12in 0 0;font-family:'JetBrains Mono',monospace;font-size:9.6pt;font-weight:700;letter-spacing:0.04em;color:${MUSTARD}">
        ${region.phone} &nbsp;&middot;&nbsp; sarah@modernmustardseed.com
      </p>
    </div>
    <div style="background:${PAPER};border-radius:0.07in;padding:0.06in;width:1.05in;height:1.05in">${qr}</div>
  </div>`;
}

function footer(region: Region): string {
  /**
   * The company's town is in the footer on Sarah's own run and off Easton's. A
   * flyer handed over in Crawfordville that name-checks Kalispell in its own
   * small print is a flyer from somewhere else, which is the one thing a local
   * door drop cannot be. The name and the tagline stay: the studio is real, its
   * address is simply not what this piece is about.
   */
  return `<div style="display:flex;align-items:center;gap:0.12in;margin-top:0.11in">
    ${SEED}
    <span class="pfoot">Modern Mustard Seed${region.key === 'montana' ? ' &middot; Kalispell, MT' : ''} &middot; Apps, Sites, and Specialty AI Tools</span>
    <span style="flex:1"></span>
    <span class="pfoot pcredit">modernmustardseed.com</span>
  </div>`;
}

/**
 * The standing band. One scale, their mark on it, and three numbers.
 *
 * The scale runs 0 to 100 with the grade bands shaded behind it, so the reader
 * sees at a glance that the whole valley is sitting in the red and the amber.
 * Their own mark is the only thing labelled. There is no leaderboard and no
 * ranking against a named neighbour: the point is the shape of the field, not
 * a fight with the shop across the street, and a rank would make the piece feel
 * like a shaming rather than a survey.
 */
function standingBand(score: number, c: Cohort): string {
  const pct = Math.max(0, Math.min(100, score));
  return `<div style="display:grid;grid-template-columns:2.95in 1fr;column-gap:0.26in;align-items:end;margin-top:0.2in">
    <div style="min-width:0">
      <div class="peyebrow">Where You Stand</div>
      <div style="position:relative;height:0.3in;margin-top:0.09in">
        <div style="position:absolute;left:0;right:0;top:0.14in;height:0.095in;border:0.014in solid ${INK};border-radius:0.05in;overflow:hidden;display:flex">
          <div style="width:60%;background:${CRIMSON}"></div>
          <div style="width:10%;background:${AMBER}"></div>
          <div style="width:10%;background:#C79A2E"></div>
          <div style="width:20%;background:${GREEN}"></div>
        </div>
        <div style="position:absolute;left:${pct}%;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center">
          <span class="tabular" style="font-family:'JetBrains Mono',monospace;font-size:7pt;font-weight:700;color:${INK};white-space:nowrap">YOU ${score}</span>
          <span style="width:0.034in;height:0.175in;background:${INK};margin-top:0.01in"></span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span class="pfinding-cat" style="letter-spacing:0.1em">F</span>
        <span class="pfinding-cat" style="letter-spacing:0.1em">D</span>
        <span class="pfinding-cat" style="letter-spacing:0.1em">C</span>
        <span class="pfinding-cat" style="letter-spacing:0.1em">B &nbsp;&nbsp; A</span>
      </div>
    </div>
    <p class="pnote" style="margin:0 0 0.03in;color:rgba(22,22,22,0.72);font-size:8.6pt;line-height:1.4">
      <b style="color:${INK}">Search changed underneath everybody.</b> Most sites here were built for how Google
      worked five years ago, not for how it and the AI assistants work now.${c.graded >= COHORT_FLOOR
        ? ` Of the <b style="color:${INK}">${c.graded}</b> we graded across these towns this month,
           <b style="color:${INK}">${c.aiF}</b> have no AI on them at all.`
        : ''} Very few businesses anywhere have made the move yet, which is what makes right now the cheap moment.
    </p>
  </div>`;
}

/** THE AUDIT FULL PAGE: diagnosis and prescription on one surface. */
export function auditPageInner(lead: Lead, qr: string, opts: FlyerOptions, cohort?: Cohort, region: Region = REGIONS.montana): string {
  const r = lead.audit_json as AuditReport;
  const score = Math.round(r.overall_score ?? lead.audit_score ?? 0);
  const domain = host(lead.audit_url || lead.website) ?? '';
  const place = town(lead.city) || region.state;

  const bars = CATEGORY_ORDER.map((k) => {
    const c = r.categories?.[k];
    const s = Math.max(0, Math.min(100, Math.round(c?.score ?? 0)));
    return `<div class="pbar">
      <span class="pbar-label">${esc(CATEGORY_SHORT[k])}</span>
      <span class="pbar-letter" style="color:${gradeColor(s)}">${esc(c?.letter ?? '')}</span>
      <div class="pbar-track"><div class="pbar-fill" style="width:${s}%;background:${gradeColor(s)}"></div></div>
    </div>`;
  }).join('');

  const weakest: { k: string; c: AuditCategory }[] = CATEGORY_ORDER
    .flatMap((k) => {
      const c = r.categories?.[k];
      return c?.notes ? [{ k: k as string, c }] : [];
    })
    .sort((a, b) => (a.c.score ?? 0) - (b.c.score ?? 0))
    .slice(0, 3);

  const findings = weakest.map((x) => `<li class="pfinding">
    <span class="px">&#10007;</span>
    <span style="min-width:0">
      <span class="pfinding-cat">${esc(CATEGORY_LABELS[x.k] ?? x.k)}<span class="pfinding-grade" style="color:${gradeColor(x.c.score)}">${esc(x.c.letter)}</span></span>
      <span class="pfinding-note" data-clamp="4">${esc(firstSentences(x.c.notes, 150))}</span>
    </span>
  </li>`).join('');

  /**
   * Title and how, no why.
   *
   * The half page had room for the italic "why" and it earned its place there,
   * because the back of that piece carried nothing else. Here the three findings
   * sit directly above these cards and say the same thing in the engine's own
   * words. Printing both put the page 0.74in past the trim and read as
   * repetition to anyone who got that far. The findings are the diagnosis, these
   * are the remedy, and nothing says both.
   *
   * The no-site page lost its why for the same reason. "What That Costs You"
   * sits above those cards and makes the argument; the card only has to say
   * what gets built.
   */
  const fixes = (r.top_three_fixes ?? []).slice(0, 3).map((f, i) => `<div class="pcard" style="padding:0.15in 0.16in;display:flex;flex-direction:column;min-width:0">
    <div style="display:flex;align-items:flex-start;gap:0.1in">
      <span class="pfixnum" style="color:${MUSTARD};-webkit-text-stroke:0.013in ${INK};flex:none">${i + 1}</span>
      <span class="pfixtitle" data-clamp="3">${esc(clean(f.title))}</span>
    </div>
    <p class="pfixhow" style="margin:0.11in 0 0" data-clamp="14">${esc(firstSentences(f.how, 230))}</p>
  </div>`).join('');

  return `<div class="sheetpad">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.2in">
    <span class="peyebrow">Free Website Audit</span>
    <span class="peyebrow muted">${esc(place)}, ${esc(region.state)} &middot; ${esc(longDate(opts.auditedOn))}</span>
  </div>
  <div class="prule" style="margin:0.085in 0 0.18in"></div>

  <div style="display:grid;grid-template-columns:1fr 2.5in;column-gap:0.3in;align-items:start">
    <div style="min-width:0">
      <h1 class="pname" data-fit data-max="35" data-min="18" style="margin:0;font-size:35pt">${esc(lead.business_name)}</h1>
      <div class="pdomain" style="margin-top:0.1in">${esc(domain)}</div>
      <p class="phead" style="margin:0.16in 0 0" data-clamp="3">${esc(firstSentences(r.headline, 215))}</p>
    </div>
    <div class="pcard yellow" style="padding:0.17in 0.19in;display:flex;align-items:center;gap:0.18in">
      <div class="tabular" style="font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:54pt;line-height:0.8;letter-spacing:-0.03em;color:${INK}">${esc(r.letter_grade)}</div>
      <div style="min-width:0">
        <div class="peyebrow" style="color:rgba(22,22,22,0.72)">Your Grade</div>
        <div class="tabular" style="font-size:18pt;font-weight:700;line-height:1.1;margin-top:0.03in">${score}<span style="font-size:11pt;font-weight:500;opacity:0.65"> / 100</span></div>
      </div>
    </div>
  </div>

  <div class="pbars" style="margin-top:0.22in">${bars}</div>

  ${cohort ? standingBand(score, cohort) : ''}

  <div class="prule" style="margin:0.19in 0 0.15in;height:0.014in;background:rgba(22,22,22,0.2)"></div>

  <div class="peyebrow">What We Found</div>
  <ul class="pfindings" style="margin-top:0.13in">${findings}</ul>

  <div class="peyebrow" style="margin:0.2in 0 0.11in">The Three To Fix First</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);column-gap:0.18in;align-items:stretch">${fixes}</div>

  <div style="flex:1;min-height:0.14in"></div>

  ${offerBlock(qr, `Every one of these is fixable. We do all three, then take the whole site to an <span style="color:${MUSTARD}">A+</span>.`, region)}

  ${signedNote(`We opened ${esc(domain || 'your website')} on ${esc(longDate(opts.auditedOn))} and read it the way a
    first time customer and an AI search engine each do. Nothing here is a guess, and the code above opens the whole
    report free.`, region)}

  ${footer(region)}
</div>`;
}

/** The three moves, when there is no website to grade. Same copy as the half page. */
const MOVES = [
  {
    title: 'A website that is yours',
    why: 'Everything else on this page depends on there being somewhere that belongs to you.',
    how: 'Your name, your phone, your hours, your work in photographs, and a page for each thing you do. '
      + 'On your own domain, in your own account, so it cannot be taken away from you.',
  },
  {
    title: 'Put it where the machines read',
    why: 'Google and the AI assistants answer out of pages they can parse, and most sites here give them nothing.',
    how: 'Structured data, a real FAQ, and an llms.txt file, so they can quote you instead of guessing. '
      + 'Almost nobody in this valley has any of it.',
  },
  {
    title: 'Make the phone the point',
    why: 'A website that does not turn a visit into a call is a brochure nobody asked for.',
    how: 'One button, one number, and something that answers it while you are on a job. Ours is an AI that '
      + 'picks up, answers questions, and books the work.',
  },
];

/** THE NO-WEBSITE FULL PAGE. */
export function noSitePageInner(lead: Lead, qr: string, opts: FlyerOptions, region: Region = REGIONS.montana): string {
  const place = town(lead.city) || region.state;
  const phone = prettyPhone(lead.phone);
  const address = lead.address ? clean(lead.address) : null;
  const checked = longDate(opts.auditedOn);
  const presence = presenceOf(lead);

  const costs = [
    {
      cat: presence ? 'You Are Renting Your Front Door' : 'Every Search Ends Somewhere Else',
      note: presence
        ? `Someone who looks you up lands on ${presence.what}. You do not own it, you cannot change how it works, and it can be taken down without asking you.`
        : 'Someone who looks you up lands on a page Google owns, beside competitors who each have one of their own. You do not choose what that page says.',
    },
    {
      cat: 'The AI Assistants Cannot Quote You',
      note: `When a customer asks an assistant who to call in ${place}, it answers out of pages businesses wrote about themselves${presence ? ', and it does not read social posts' : ''}. You have not written one.`,
    },
    {
      cat: 'Nothing Works While You Do',
      note: 'Hours, prices, photos of your work, a way to book you at nine at night. All of it needs somewhere to live.',
    },
  ].map((c) => `<li class="pfinding">
    <span class="px">&#10007;</span>
    <span style="min-width:0">
      <span class="pfinding-cat">${esc(c.cat)}</span>
      <span class="pfinding-note" data-clamp="4">${esc(firstSentences(c.note, 150))}</span>
    </span>
  </li>`).join('');

  const moves = MOVES.map((m, i) => `<div class="pcard" style="padding:0.15in 0.16in;display:flex;flex-direction:column;min-width:0">
    <div style="display:flex;align-items:flex-start;gap:0.1in">
      <span class="pfixnum" style="color:${MUSTARD};-webkit-text-stroke:0.013in ${INK};flex:none">${i + 1}</span>
      <span class="pfixtitle" data-clamp="3">${esc(m.title)}</span>
    </div>
    <p class="pfixhow" style="margin:0.11in 0 0" data-clamp="14">${esc(m.how)}</p>
  </div>`).join('');

  return `<div class="sheetpad">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.2in">
    <span class="peyebrow">Free Listing Check</span>
    <span class="peyebrow muted">${esc(place)}, ${esc(region.state)} &middot; ${esc(checked)}</span>
  </div>
  <div class="prule" style="margin:0.085in 0 0.18in"></div>

  <div style="display:grid;grid-template-columns:1fr 2.5in;column-gap:0.3in;align-items:start">
    <div style="min-width:0">
      <h1 class="pname" data-fit data-max="35" data-min="18" style="margin:0;font-size:35pt">${esc(lead.business_name)}</h1>
      <div class="pdomain" style="margin-top:0.1in">${presence ? `your Google listing points at ${esc(presence.what)}` : 'no website on your Google listing'}</div>
      <p class="phead" style="margin:0.16in 0 0" data-clamp="3">${presence
        ? `We came to audit your website and found ${esc(presence.what)} instead. That is the finding, and it is the most expensive one on this street.`
        : 'We came to audit your website and there is not one to audit. That is the finding, and it is the most expensive one on this street.'}</p>
    </div>
    <div class="pcard yellow" style="padding:0.19in;display:flex;align-items:center;gap:0.18in">
      <div style="font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:38pt;line-height:0.82;letter-spacing:-0.035em;color:${INK}">None</div>
      <div class="peyebrow" style="color:rgba(22,22,22,0.72)">Websites<br>You Own</div>
    </div>
  </div>

  <div class="peyebrow" style="margin:0.2in 0 0.11in">Your Listing Today</div>
  <ul class="plisting">
    <li>
      <span class="ptick ${phone ? 'yes' : 'no'}">${phone ? '&#10003;' : '&#10007;'}</span>
      <span style="min-width:0">
        <span class="pfinding-cat">Phone</span>
        <span class="pfinding-note">${phone ? esc(phone) : 'None shown'}</span>
      </span>
    </li>
    <li>
      <span class="ptick ${address ? 'yes' : 'no'}">${address ? '&#10003;' : '&#10007;'}</span>
      <span style="min-width:0">
        <span class="pfinding-cat">Address</span>
        <span class="pfinding-note" data-clamp="2">${address ? esc(address) : 'None shown'}</span>
      </span>
    </li>
    <li>
      <span class="ptick no">&#10007;</span>
      <span style="min-width:0">
        <span class="pfinding-cat">Website</span>
        <span class="pfinding-note" style="color:${CRIMSON};font-weight:700" data-clamp="2">${presence ? esc(presence.what) : 'None shown'}</span>
      </span>
    </li>
  </ul>

  <div class="prule" style="margin:0.24in 0 0.17in;height:0.014in;background:rgba(22,22,22,0.2)"></div>

  <div class="peyebrow">What That Costs You</div>
  <ul class="pfindings" style="margin-top:0.13in">${costs}</ul>

  <div class="peyebrow" style="margin:0.2in 0 0.11in">What We Would Build, In Order</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);column-gap:0.18in;align-items:stretch">${moves}</div>

  <div style="flex:1;min-height:0.14in"></div>

  ${offerBlock(qr, `This is the cheapest problem you have. We build it, then grade it in front of you and take it to an <span style="color:${MUSTARD}">A+</span>.`, region)}

  <p class="pnote" style="margin:0.12in 0 0">
    We opened your Google listing on ${esc(checked)} and read what it shows${presence ? `: ${esc(presence.url).slice(0, 84)}` : ''}.
    Check it yourself in ten seconds. The code above builds you a real one, free, before you decide anything.
  </p>

  ${footer(region)}
</div>`;
}
