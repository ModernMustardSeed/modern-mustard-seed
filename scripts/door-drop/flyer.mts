/**
 * THE HALF PAGE. One business, two sides, 8.5 by 5.5 inches.
 *
 * Why landscape and not the tall half. Two portrait halves sit side by side on a
 * letter sheet and cut down the middle, which looks tidy until it is printed on
 * both sides: a long-edge duplex flip mirrors the sheet left to right, so the
 * back of the left flyer lands on the right. Two LANDSCAPE halves stack instead,
 * and a long-edge flip leaves top on top. One horizontal cut, no mirroring, no
 * short-edge setting for the shop to get wrong. The shape also suits the piece,
 * because the seven category bars want a row and not a column.
 *
 * What is on it, and why each thing earned its space:
 *
 *   FRONT is the diagnosis. The owner's own name in the largest type on the
 *   page, his own domain under it, and one honest sentence about what the audit
 *   found. Then the grade, and the seven bars that add up to it. A grade with no
 *   working shown is an insult; a grade with the bars beside it is a report.
 *
 *   BACK is the prescription. The three highest-leverage fixes in his own case,
 *   in words he can act on without us, then one line saying we will do all of it
 *   and take the whole thing to an A plus. The offer is one sentence, after the
 *   receipts, never instead of them.
 *
 * Every number, letter and sentence here comes off `audit_json`, which the
 * engine produced by reading his live site. Nothing on this page is composed,
 * inferred or rounded, which is what lets the flyer say "nothing here is a
 * guess" in print.
 */
import QRCode from 'qrcode';
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_SHORT,
  host,
  type AuditCategory,
  type AuditReport,
  type Lead,
} from './select.mts';

export const INK = '#161616';
export const CREAM = '#FBF6EA';
export const PAPER = '#FFFDF6';
export const MUSTARD = '#F5B700';
export const RED = '#E0301E';
export const GREEN = '#1E7A3C';
export const AMBER = '#B87503';
export const CRIMSON = '#C4160B';

/** Trim size in inches. */
export const TRIM_W = 8.5;
export const TRIM_H = 5.5;
/** Press bleed on every edge. Vistaprint and most local shops want 0.125. */
export const BLEED = 0.125;

export type FlyerOptions = {
  /** What the QR resolves to. Live today at modernmustardseed.com/audit/<lead id>. */
  reportUrl: string;
  /** Printed under the headline so the reader can check how fresh the reading is. */
  auditedOn: Date;
  /** Drawn as a bleed box with crop marks, for the press file. Off for the office 2-up. */
  bleed: boolean;
};

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** No em dashes, anywhere, ever. Also kills the en dash and the stray double space. */
export const clean = (s: string) =>
  String(s ?? '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/’/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Words that cannot be the last word on the page.
 *
 * The naive trim (cut at the last space, add a period) produced this on the
 * first Whitefish proof: "...but has_chat_widget_hint is false, meaning." A
 * sentence that ends on a conjunction reads as a bug, and on paper it cannot be
 * corrected afterwards. So the tail is walked back past anything that was
 * plainly introducing a clause that got cut off.
 */
const DANGLING = new Set([
  'and', 'but', 'so', 'or', 'nor', 'yet', 'which', 'that', 'who', 'whose', 'meaning', 'because',
  'since', 'while', 'with', 'without', 'though', 'although', 'however', 'plus', 'including',
  'like', 'such', 'as', 'if', 'when', 'where', 'whether', 'than', 'then', 'to', 'for', 'from',
  'of', 'in', 'on', 'at', 'by', 'is', 'are', 'was', 'were', 'the', 'a', 'an',
]);

/**
 * Cut to the most text that still fits and still reads as a finished thought.
 *
 * Preference order: whole sentences, then a clause boundary, then a word
 * boundary with the dangling tail walked off. A flyer that ends mid word with an
 * ellipsis reads as a mail merge, which is the one thing this piece cannot
 * afford to look like.
 */
export function firstSentences(text: string, max: number): string {
  const t = clean(text);
  if (t.length <= max) return t;

  // Whole sentences first.
  const parts = t.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const p of parts) {
    if (!out) { out = p; continue; }
    if ((out + ' ' + p).length > max) break;
    out += ' ' + p;
  }
  if (out.length <= max) return out;

  // The first sentence alone is too long. Fall back to a clause boundary.
  const window = t.slice(0, max);
  const comma = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '), window.lastIndexOf(': '));
  let cut = comma > max * 0.55 ? window.slice(0, comma) : window.slice(0, window.lastIndexOf(' '));

  // Walk the tail back off anything that was introducing a clause we just cut.
  let words = cut.split(' ');
  while (words.length > 4 && DANGLING.has(words[words.length - 1].toLowerCase().replace(/[^a-z]/g, ''))) {
    words.pop();
  }
  cut = words.join(' ').replace(/[,;:]+$/, '');
  return /[.!?]$/.test(cut) ? cut : `${cut}.`;
}

const gradeColor = (score: number) => (score >= 80 ? GREEN : score >= 60 ? AMBER : CRIMSON);

/** Title Case a town name that arrived shouting from a scrape. */
const town = (c: string | null) =>
  (c ?? '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).trim();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

export async function qrSvg(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: INK, light: '#0000' },
  });
  return svg.replace(/<\?xml[^>]*\?>/, '').replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ');
}

/** The seed mark, lifted verbatim from app/icon.svg so the paper and the site
 *  carry the same logo, and inlined as vector so it stays crisp at any size. */
const SEED = `<svg viewBox="0 0 64 64" class="seed" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="seedGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFE16A"/><stop offset="45%" stop-color="#F4C518"/><stop offset="100%" stop-color="#D69A0E"/>
    </linearGradient>
    <linearGradient id="leafGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFD83A"/><stop offset="100%" stop-color="#E2A60C"/>
    </linearGradient>
  </defs>
  <g stroke="#1c1205" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M32 17 C 22 21, 16 31, 16 41 C 16 52, 24 58, 32 58 C 40 58, 48 52, 48 41 C 48 31, 42 21, 32 17 Z" fill="url(#seedGold)"/>
    <path d="M32 18 L 32 11" fill="none"/>
    <path d="M32 12 C 27 6, 20 4, 14 6 C 18 12, 26 14, 32 12 Z" fill="url(#leafGold)"/>
    <path d="M32 12 C 37 5, 45 3, 51 6 C 47 12, 38 15, 32 12 Z" fill="url(#leafGold)"/>
  </g>
  <ellipse cx="26" cy="31" rx="4.2" ry="6.8" fill="#FFFFFF" opacity="0.32" transform="rotate(-20 26 31)"/>
</svg>`;

/**
 * The stylesheet. Written against inches, because this is paper: a layout tuned
 * in pixels drifts by a few points between the screen proof and the press file
 * and the drift always lands on the one line that had no room.
 */
export function css(opts: { bleed: boolean }): string {
  const pw = opts.bleed ? TRIM_W + BLEED * 2 : TRIM_W;
  const ph = opts.bleed ? TRIM_H + BLEED * 2 : TRIM_H;
  return `
@page { size: ${pw}in ${ph}in; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: 'DM Sans', system-ui, sans-serif; font-feature-settings: 'liga' 0, 'clig' 0; color: ${INK}; }

.page {
  position: relative; width: ${pw}in; height: ${ph}in; overflow: hidden;
  page-break-after: always; break-after: page; background: ${CREAM};
}
.page:last-child { page-break-after: auto; break-after: auto; }
.trim { position: absolute; inset: ${opts.bleed ? BLEED + 'in' : '0'}; width: ${TRIM_W}in; height: ${TRIM_H}in; }
.bleedfill { position: absolute; inset: 0; background: ${CREAM}; }

/* Crop marks sit in the bleed, 1/16in off the trim, so a guillotine has a target. */
.crop { position: absolute; background: ${INK}; }
.crop.h { width: 0.09in; height: 0.006in; }
.crop.v { width: 0.006in; height: 0.09in; }

.pad { position: absolute; inset: 0; padding: 0.34in 0.38in 0.3in; display: flex; flex-direction: column; }

/* The house grammar: ink outline, hard offset shadow, no gradients on paper. */
.card { border: 0.022in solid ${INK}; border-radius: 0.1in; background: ${PAPER}; box-shadow: 0.045in 0.045in 0 0 ${INK}; }
.card.yellow { background: ${MUSTARD}; }
.card.ink { background: ${INK}; color: ${PAPER}; }

.eyebrow { font-family: 'JetBrains Mono', monospace; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.2em; font-size: 6.8pt; color: ${CRIMSON}; }
.eyebrow.muted { color: rgba(22,22,22,0.5); }
.rule { height: 0.018in; background: ${INK}; }

.name { font-family: 'Playfair Display', Georgia, serif; font-weight: 900; line-height: 0.95;
  letter-spacing: -0.015em; color: ${INK}; }
.domain { font-family: 'JetBrains Mono', monospace; font-weight: 500; font-size: 8pt;
  letter-spacing: 0.02em; color: rgba(22,22,22,0.62); }
.headline { font-size: 11.4pt; line-height: 1.34; color: #2E2B27; letter-spacing: -0.004em; }
.note { font-size: 7.3pt; line-height: 1.38; color: rgba(22,22,22,0.55); }

.gradeletter { font-family: 'Playfair Display', Georgia, serif; font-weight: 900; line-height: 0.8;
  letter-spacing: -0.03em; }
.tabular { font-variant-numeric: tabular-nums; }

.bars { display: grid; grid-template-columns: 1fr; row-gap: 0.052in; }
.bar-row { display: grid; grid-template-columns: 0.86in 0.2in 1fr; align-items: center; column-gap: 0.06in; }
.bar-label { font-family: 'JetBrains Mono', monospace; font-size: 6.2pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em; color: rgba(22,22,22,0.72); }
.bar-letter { font-family: 'JetBrains Mono', monospace; font-size: 6.6pt; font-weight: 700; text-align: right; }
.bar-track { height: 0.075in; border: 0.013in solid ${INK}; border-radius: 0.04in; background: #fff; overflow: hidden; }
.bar-fill { height: 100%; }

/* The findings list. Three checkable facts about his own site, which is what
   separates a report from a grade. */
.findings { list-style: none; margin: 0; padding: 0; display: grid; row-gap: 0.085in; }
.finding { display: grid; grid-template-columns: 0.155in 1fr; column-gap: 0.085in; align-items: start; }
.xmark { display: grid; place-items: center; width: 0.155in; height: 0.155in; margin-top: 0.012in;
  border: 0.014in solid ${INK}; border-radius: 0.032in; background: ${CRIMSON}; color: ${PAPER};
  font-size: 6.2pt; line-height: 1; font-weight: 700; }
.finding-cat { display: block; font-family: 'JetBrains Mono', monospace; font-size: 6.4pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.13em; color: rgba(22,22,22,0.72); }
.finding-grade { font-size: 6.4pt; margin-left: 0.055in; letter-spacing: 0.06em; }
.finding-note { display: block; font-size: 8.4pt; line-height: 1.34; color: #3A3733; margin-top: 0.022in; }

.fixnum { font-family: 'Playfair Display', Georgia, serif; font-weight: 900; font-size: 17pt; line-height: 1; }
.fixwhy { font-size: 8pt; line-height: 1.34; color: #4A463F; font-style: italic; }
.fixtitle { font-size: 9.4pt; font-weight: 700; line-height: 1.2; letter-spacing: -0.005em; }
.fixbody { font-size: 7.9pt; line-height: 1.36; color: #3A3733; }

.qr { width: 100%; height: 100%; display: block; }
.seed { width: 0.3in; height: 0.3in; display: block; }

.foot { font-family: 'JetBrains Mono', monospace; font-size: 6.4pt; font-weight: 500;
  letter-spacing: 0.08em; text-transform: uppercase; color: rgba(22,22,22,0.55); }
.credit { color: ${MUSTARD}; font-weight: 700; }
`;
}

function cropMarks(): string {
  const b = BLEED;
  const o = 0.035; // gap between the mark and the trim line
  const m: string[] = [];
  const xs = [
    { left: `${b - o - 0.09}in`, x: 'left' },
    { left: `${b + TRIM_W + o}in`, x: 'right' },
  ];
  const ys = [
    { top: `${b - o - 0.09}in`, y: 'top' },
    { top: `${b + TRIM_H + o}in`, y: 'bottom' },
  ];
  for (const yy of [`${b}in`, `${b + TRIM_H}in`]) {
    for (const xx of xs) m.push(`<div class="crop h" style="left:${xx.left};top:${yy}"></div>`);
  }
  for (const xx of [`${b}in`, `${b + TRIM_W}in`]) {
    for (const yy of ys) m.push(`<div class="crop v" style="left:${xx};top:${yy.top}"></div>`);
  }
  return m.join('');
}

function shell(inner: string, opts: FlyerOptions): string {
  return `<div class="page">
  <div class="bleedfill"></div>
  ${opts.bleed ? cropMarks() : ''}
  <div class="trim">${inner}</div>
</div>`;
}

/** FRONT: the diagnosis. Returns the trim contents only, so the same markup can
 *  be dropped into a single-flyer press page or into a 2-up letter sheet. */
export function frontInner(lead: Lead, qr: string, opts: FlyerOptions): string {
  const r = lead.audit_json as AuditReport;
  const score = Math.round(r.overall_score ?? lead.audit_score ?? 0);
  const domain = host(lead.audit_url || lead.website) ?? '';
  const place = town(lead.city) || 'The Flathead';

  const bars = CATEGORY_ORDER.map((k) => {
    const c = r.categories?.[k];
    const s = Math.max(0, Math.min(100, Math.round(c?.score ?? 0)));
    return `<div class="bar-row">
      <span class="bar-label">${esc(CATEGORY_SHORT[k])}</span>
      <span class="bar-letter" style="color:${gradeColor(s)}">${esc(c?.letter ?? '')}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${s}%;background:${gradeColor(s)}"></div></div>
    </div>`;
  }).join('');

  /**
   * The three weakest categories, in the engine's own words.
   *
   * This is the part that turns a grade into a report. A letter on its own is an
   * opinion and gets thrown away; three specific findings about his own site,
   * each one checkable in thirty seconds on his phone, is the reason he keeps
   * the paper. They are chosen by score rather than by category, so a business
   * that is genuinely good at trust never gets told otherwise.
   */
  const weakest: { k: string; c: AuditCategory }[] = CATEGORY_ORDER
    .flatMap((k) => {
      const c = r.categories?.[k];
      return c?.notes ? [{ k: k as string, c }] : [];
    })
    .sort((a, b) => (a.c.score ?? 0) - (b.c.score ?? 0))
    .slice(0, 3);

  const findings = weakest
    .map((x) => `<li class="finding">
      <span class="xmark">&#10007;</span>
      <span style="min-width:0">
        <span class="finding-cat">${esc(CATEGORY_LABELS[x.k] ?? x.k)}<span class="finding-grade" style="color:${gradeColor(x.c.score)}">${esc(x.c.letter)}</span></span>
        <span class="finding-note" data-clamp="3">${esc(firstSentences(x.c.notes, 165))}</span>
      </span>
    </li>`)
    .join('');

  const inner = `<div class="pad">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.2in">
    <span class="eyebrow">Free Website Audit</span>
    <span class="eyebrow muted">${esc(place)}, Montana</span>
  </div>
  <div class="rule" style="margin:0.075in 0 0.15in"></div>

  <div style="display:grid;grid-template-columns:1fr 2.42in;column-gap:0.26in;flex:1;min-height:0">

    <div style="display:flex;flex-direction:column;min-width:0">
      <h1 class="name" data-fit data-max="29" data-min="14" style="margin:0;font-size:29pt">${esc(lead.business_name)}</h1>
      <div class="domain" style="margin-top:0.07in">${esc(domain)}</div>

      <p class="headline" style="margin:0.12in 0 0" data-clamp="3">${esc(firstSentences(r.headline, 200))}</p>

      <div class="eyebrow" style="margin:0.17in 0 0.08in">What We Found</div>
      <ul class="findings">${findings}</ul>

      <div style="flex:1;min-height:0.1in"></div>

      <div class="card yellow" style="padding:0.11in 0.14in">
        <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:12.5pt;line-height:1.15;color:${INK}">
          Every one of these is fixable, and none of it needs a new business.
        </p>
        <p style="margin:0.055in 0 0;font-size:7.9pt;line-height:1.33;color:rgba(22,22,22,0.78)">
          Turn this over for the three we would do first.
        </p>
      </div>

      <p class="note" style="margin:0.105in 0 0">
        We opened ${esc(domain || 'your website')} on ${esc(longDate(opts.auditedOn))} and graded it the way a first
        time customer and an AI search engine each see it. Nothing here is a guess and nothing was written before
        we read the site.
      </p>
    </div>

    <div style="display:flex;flex-direction:column;min-width:0">
      <div class="card yellow" style="padding:0.13in 0.15in;display:flex;align-items:center;gap:0.16in">
        <div class="gradeletter tabular" style="font-size:44pt;color:${INK}">${esc(r.letter_grade)}</div>
        <div style="min-width:0">
          <div class="eyebrow" style="color:rgba(22,22,22,0.72)">Your Grade</div>
          <div class="tabular" style="font-size:15pt;font-weight:700;line-height:1.1;margin-top:0.02in">${score}<span style="font-size:9pt;font-weight:500;opacity:0.65"> / 100</span></div>
        </div>
      </div>

      <div class="bars" style="margin-top:0.15in">${bars}</div>

      <div style="flex:1"></div>

      <div class="card" style="margin-top:0.13in;padding:0.1in;display:grid;grid-template-columns:0.92in 1fr;column-gap:0.11in;align-items:center">
        <div style="width:0.92in;height:0.92in">${qr}</div>
        <div style="min-width:0">
          <div class="eyebrow" style="color:${CRIMSON}">Your Full Report</div>
          <p style="margin:0.04in 0 0;font-size:7.8pt;line-height:1.32;color:#3A3733">
            All seven categories, every finding, and the whole fix list. Free, and it is yours whether you
            call us or not.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>`;
  return inner;
}

/** BACK: the prescription, then one sentence of offer. Trim contents only. */
export function backInner(lead: Lead, qr: string, opts: FlyerOptions): string {
  const r = lead.audit_json as AuditReport;
  const fixes = (r.top_three_fixes ?? []).slice(0, 3);

  const cards = fixes
    .map((f, i) => `<div class="card" style="padding:0.13in 0.14in;display:flex;flex-direction:column;min-width:0">
      <div style="display:flex;align-items:flex-start;gap:0.09in">
        <span class="fixnum" style="color:${MUSTARD};-webkit-text-stroke:0.012in ${INK};flex:none">${i + 1}</span>
        <span class="fixtitle" data-clamp="3">${esc(clean(f.title))}</span>
      </div>
      <p class="fixwhy" style="margin:0.085in 0 0" data-clamp="4">${esc(firstSentences(f.why, 165))}</p>
      <div style="height:0.014in;background:rgba(22,22,22,0.16);margin:0.085in 0"></div>
      <p class="fixbody" style="margin:0" data-clamp="6">${esc(firstSentences(f.how, 200))}</p>
    </div>`)
    .join('');

  const inner = `<div class="pad">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.2in">
    <span class="eyebrow">The Three To Fix First</span>
    <span class="eyebrow muted">${esc(lead.business_name)}</span>
  </div>
  <div class="rule" style="margin:0.075in 0 0.15in"></div>

  <div style="flex:0.5;min-height:0"></div>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);column-gap:0.15in;align-items:stretch">${cards}</div>

  <div style="flex:1;min-height:0.08in"></div>

  <div class="card ink" style="margin-top:0.15in;padding:0.15in 0.17in;display:grid;grid-template-columns:1fr 0.82in;column-gap:0.16in;align-items:center;box-shadow:0.045in 0.045in 0 0 ${MUSTARD}">
    <div style="min-width:0">
      <h2 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:14.5pt;line-height:1.12;color:${PAPER}">
        We will do all three, then take the whole site to an <span style="color:${MUSTARD}">A+</span>.
      </h2>
      <p style="margin:0.07in 0 0;font-size:8pt;line-height:1.38;color:rgba(255,253,246,0.82)">
        Modern Mustard Seed is a one person product studio here in Kalispell. Websites, AI systems, and phone
        agents that answer, at a set package price. You own the code, the domain, and the accounts. Call the
        ranch line and Mr. Mustard, our own AI, will pick up and book you.
      </p>
      <p style="margin:0.09in 0 0;font-family:'JetBrains Mono',monospace;font-size:8.4pt;font-weight:700;letter-spacing:0.04em;color:${MUSTARD}">
        (406) 312-1223 &nbsp;&middot;&nbsp; sarah@modernmustardseed.com
      </p>
    </div>
    <div style="background:${PAPER};border-radius:0.06in;padding:0.055in;width:0.82in;height:0.82in">${qr}</div>
  </div>

  <div style="display:flex;align-items:center;gap:0.1in;margin-top:0.13in">
    ${SEED}
    <span class="foot">Modern Mustard Seed &middot; Kalispell, MT &middot; Apps, Sites, and Specialty AI Tools</span>
    <span style="flex:1"></span>
    <span class="foot credit">modernmustardseed.com</span>
  </div>
</div>`;
  return inner;
}

export const front = (lead: Lead, qr: string, opts: FlyerOptions) => shell(frontInner(lead, qr, opts), opts);
export const back = (lead: Lead, qr: string, opts: FlyerOptions) => shell(backInner(lead, qr, opts), opts);

/**
 * The auto-fit and clamp pass, run inside the page after fonts settle.
 *
 * A 41 character business name and a 6 character one cannot share a font size,
 * and a headline that runs one line long pushes the card below it off the trim
 * where nobody notices until the box arrives from the printer. So the browser
 * measures and shrinks, and anything that still will not fit is reported rather
 * than clipped.
 */
export const FIT_SCRIPT = `
(function () {
  function fitAll() {
    document.querySelectorAll('[data-fit]').forEach(function (el) {
      var max = parseFloat(el.dataset.max), min = parseFloat(el.dataset.min);
      var size = max;
      el.style.fontSize = size + 'pt';
      var box = el.parentElement;
      // Two lines of the display face is the ceiling for a business name.
      var limit = parseFloat(getComputedStyle(el).lineHeight) * 2 + 1;
      while (size > min && (el.scrollWidth > box.clientWidth || el.scrollHeight > limit)) {
        size -= 0.5;
        el.style.fontSize = size + 'pt';
        limit = parseFloat(getComputedStyle(el).lineHeight) * 2 + 1;
      }
    });
    document.querySelectorAll('[data-clamp]').forEach(function (el) {
      el.style.display = '-webkit-box';
      el.style.webkitBoxOrient = 'vertical';
      el.style.webkitLineClamp = el.dataset.clamp;
      el.style.overflow = 'hidden';
    });
    var overflow = [];
    document.querySelectorAll('.trim').forEach(function (t, i) {
      var pad = t.querySelector('.pad');
      if (pad && pad.scrollHeight > pad.clientHeight + 2) overflow.push(i);
    });
    window.__overflow = overflow;
    window.__fitted = true;
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  else fitAll();
})();
`;

/**
 * `extraCss` rather than an import, because the no-site piece brings its own
 * rules and importing them here would make flyer.mts and flyer-nosite.mts
 * depend on each other. The caller owns which pieces are in the document, so
 * the caller owns which rules go with them.
 */
export function documentHtml(pages: string[], opts: { bleed: boolean; extraCss?: string }): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;900&family=JetBrains+Mono:wght@400;500;700&display=block" rel="stylesheet">
<style>${css(opts)}
${opts.extraCss ?? ''}</style>
</head><body>${pages.join('\n')}<script>${FIT_SCRIPT}</script></body></html>`;
}

export async function renderFlyer(lead: Lead, opts: FlyerOptions) {
  const qr = await qrSvg(opts.reportUrl);
  return { front: front(lead, qr, opts), back: back(lead, qr, opts) };
}
