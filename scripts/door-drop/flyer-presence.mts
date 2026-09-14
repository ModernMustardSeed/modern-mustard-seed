/**
 * THE FULL PAGE, DRIVEN BY THE PRESENCE SCORE.
 *
 * The printed flyer used to show the website grade while the page behind its QR
 * code showed the presence score. Basler Family Chiropractic read an F on paper
 * and a 78 on screen, which is not two opinions, it is a flyer that contradicts
 * itself in the owner's hand. This is the page that makes them agree.
 *
 * It is also the change Anthony asked for. Three pillars instead of seven
 * categories, and the middle of the page is where the good news finally fits: a
 * business with 742 reviews now reads "this is the best asset you own" before it
 * reads anything about its website.
 *
 * WHAT IS DIFFERENT FROM THE WEBSITE PAGE, and why:
 *
 *   THREE BARS, NOT SEVEN, and each one prints the weight it carries. Seven
 *   category letters is a diagnosis for somebody who builds websites. Three
 *   pillars with their weights printed is a scoreboard an owner can argue with,
 *   which is the point.
 *
 *   A PILLAR THAT COULD NOT BE GRADED SAYS SO. `unknown` prints as a dash and a
 *   plain sentence rather than a zero. A withheld score is not a bad score and
 *   must never be drawn as one.
 *
 *   "WHAT WE FOUND" IS THE THREE VERDICTS, in pillar order, not the three worst
 *   things. That is what lets praise onto the page: the reviews verdict for a
 *   well-reviewed business is genuinely good news, and it earns the top of the
 *   list rather than being sorted out of view.
 *
 * The offer block, the standing band, the signature and the footer are shared
 * with the website page, so the two pieces stay one design.
 */
import {
  INK, PAPER, MUSTARD, CRIMSON, GREEN, AMBER,
  clean, firstSentences, type FlyerOptions,
} from './flyer.mts';
import { REGIONS, host, type Lead, type Region } from './select.mts';
import { signedNote, footer, mascotColumn, qrColumn, dateline, OFFER_COLUMNS } from './flyer-page.mts';

export type PresencePillar = {
  key: string;
  label: string;
  score: number;
  letter: string;
  verdict: string;
  unknown: boolean;
  weight: number;
};

export type PresenceReport = {
  overall_score: number;
  letter_grade: string;
  headline: string;
  summary: string;
  generated_at?: string;
  pillars: PresencePillar[];
  top_fixes: { title: string; why: string; how: string }[];
};

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const gradeColor = (score: number) => (score >= 80 ? GREEN : score >= 60 ? AMBER : CRIMSON);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

/** Plain words for the three pillars. "GEO" and "profile" are not owner language. */
const PILLAR_LABEL: Record<string, string> = {
  website: 'Your Website',
  reviews: 'Your Reviews',
  profile: 'Your Google Listing',
};

/** Extra rules this piece needs on top of the full-page stylesheet. */
export const PRESENCE_CSS = `
.pillars { display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 0.26in; }
.pillar-label { font-family: 'JetBrains Mono', monospace; font-size: 7.2pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.13em; color: rgba(22,22,22,0.72); }
.pillar-letter { font-family: 'Playfair Display', Georgia, serif; font-weight: 900; font-size: 26pt;
  line-height: 1; margin-top: 0.05in; letter-spacing: -0.02em; }
.pillar-weight { font-family: 'JetBrains Mono', monospace; font-size: 6.4pt; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: rgba(22,22,22,0.45); margin-left: 0.07in; }
.pillar-track { height: 0.1in; border: 0.015in solid ${INK}; border-radius: 0.05in; background: #fff;
  overflow: hidden; margin-top: 0.07in; }
.pillar-fill { height: 100%; }
.pillar-verdict { display: block; font-size: 8.6pt; line-height: 1.36; color: #3A3733; margin-top: 0.07in; }
.tick-good { background: ${GREEN}; }
.tick-mid { background: ${AMBER}; }
.tick-bad { background: ${CRIMSON}; }
`;

/**
 * The mark beside a verdict follows the pillar, so praise never sits under a
 * cross and a withheld score never looks like a failure.
 */
function mark(p: PresencePillar): string {
  if (p.unknown) return `<span class="px" style="background:rgba(22,22,22,0.35)">?</span>`;
  if (p.score >= 80) return `<span class="px tick-good">&#10003;</span>`;
  if (p.score >= 60) return `<span class="px tick-mid">!</span>`;
  return `<span class="px tick-bad">&#10007;</span>`;
}

export function presencePageInner(
  lead: Lead,
  report: PresenceReport,
  qr: string,
  opts: FlyerOptions,
  region: Region = REGIONS.montana,
): string {
  const score = Math.round(report.overall_score);
  /**
   * The date the PRESENCE audit ran, not the date the website was graded. The
   * website grade is reused for up to a fortnight, so printing its date puts a
   * stale day on a page whose reviews and profile were read this morning.
   */
  const readOn = report.generated_at ? new Date(report.generated_at) : opts.auditedOn;
  const domain = host(lead.website) ?? '';
  const where = dateline(lead, region);

  const order = ['website', 'reviews', 'profile'];
  const pillars = order
    .map((k) => report.pillars.find((p) => p.key === k))
    .filter((p): p is PresencePillar => Boolean(p));

  const bars = pillars.map((p) => {
    const pct = p.unknown ? 0 : Math.max(0, Math.min(100, Math.round(p.score)));
    const colour = p.unknown ? 'rgba(22,22,22,0.25)' : gradeColor(p.score);
    return `<div style="min-width:0">
      <span class="pillar-label">${esc(PILLAR_LABEL[p.key] ?? p.label)}<span class="pillar-weight">${Math.round(p.weight * 100)}%</span></span>
      <div class="pillar-letter" style="color:${p.unknown ? 'rgba(22,22,22,0.35)' : gradeColor(p.score)}">${p.unknown ? '&mdash;' : esc(p.letter)}</div>
      <div class="pillar-track"><div class="pillar-fill" style="width:${pct}%;background:${colour}"></div></div>
    </div>`;
  }).join('');

  const findings = pillars.map((p) => `<li class="pfinding">
    ${mark(p)}
    <span style="min-width:0">
      <span class="pfinding-cat">${esc(PILLAR_LABEL[p.key] ?? p.label)}${p.unknown ? '' : `<span class="pfinding-grade" style="color:${gradeColor(p.score)}">${esc(p.letter)}</span>`}</span>
      <span class="pfinding-note" data-clamp="4">${esc(firstSentences(p.verdict, 210))}</span>
    </span>
  </li>`).join('');

  /**
   * MERGE FIXES THAT SHARE A BODY.
   *
   * `fixesFor` emits one fix per missing profile field, and every one of them
   * carries the same instruction: open your Google Business Profile, edit the
   * matching field, it is free and takes five minutes. Printed as written that
   * is two cards side by side with identical text, which makes the page look
   * generated rather than written. Same instruction, one card, both titles.
   */
  const merged: { title: string; why: string; how: string }[] = [];
  for (const f of report.top_fixes ?? []) {
    const same = merged.find((m) => m.how.trim() === f.how.trim());
    if (same) same.title = `${same.title}, and ${f.title.charAt(0).toLowerCase()}${f.title.slice(1)}`;
    else merged.push({ ...f });
  }

  const fixes = merged.slice(0, 3).map((f, i) => `<div class="pcard" style="padding:0.15in 0.16in;display:flex;flex-direction:column;min-width:0">
    <div style="display:flex;align-items:flex-start;gap:0.1in">
      <span class="pfixnum" style="color:${MUSTARD};-webkit-text-stroke:0.013in ${INK};flex:none">${i + 1}</span>
      <span class="pfixtitle" data-clamp="3">${esc(clean(f.title))}</span>
    </div>
    <p class="pfixhow" style="margin:0.11in 0 0" data-clamp="14">${esc(firstSentences(f.how, 230))}</p>
  </div>`).join('');

  return `<div class="sheetpad">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.2in">
    <span class="peyebrow">Free Online Presence Check</span>
    <span class="peyebrow muted">${esc(where)} &middot; ${esc(longDate(readOn))}</span>
  </div>
  <div class="prule" style="margin:0.085in 0 0.18in"></div>

  <div style="display:grid;grid-template-columns:1fr 2.5in;column-gap:0.3in;align-items:start">
    <div style="min-width:0">
      <h1 class="pname" data-fit data-max="35" data-min="18" style="margin:0;font-size:35pt">${esc(lead.business_name)}</h1>
      <div class="pdomain" style="margin-top:0.1in">${esc(domain)}</div>
      <p class="phead" style="margin:0.16in 0 0" data-clamp="3">${esc(firstSentences(report.headline, 215))}</p>
    </div>
    <div class="pcard yellow" style="padding:0.17in 0.19in;display:flex;align-items:center;gap:0.18in">
      <div class="tabular" style="font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:54pt;line-height:0.8;letter-spacing:-0.03em;color:${INK}">${esc(report.letter_grade)}</div>
      <div style="min-width:0">
        <div class="peyebrow" style="color:rgba(22,22,22,0.72)">Your Score</div>
        <div class="tabular" style="font-size:18pt;font-weight:700;line-height:1.1;margin-top:0.03in">${score}<span style="font-size:11pt;font-weight:500;opacity:0.65"> / 100</span></div>
      </div>
    </div>
  </div>

  <div class="pillars" style="margin-top:0.26in">${bars}</div>

  <div class="prule" style="margin:0.22in 0 0.16in;height:0.014in;background:rgba(22,22,22,0.2)"></div>

  <div class="peyebrow">What We Found</div>
  <ul class="pfindings" style="margin-top:0.13in">${findings}</ul>

  <div class="peyebrow" style="margin:0.2in 0 0.11in">The Three To Fix First</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);column-gap:0.18in;align-items:stretch">${fixes}</div>

  <div style="flex:1;min-height:0.14in"></div>

  <div class="pcard ink" style="padding:0.17in 0.2in;display:grid;grid-template-columns:${OFFER_COLUMNS};column-gap:0.17in;align-items:center">
    <div style="min-width:0">
      <h2 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:18pt;line-height:1.12;color:${PAPER}">
        We can take this to an <span style="color:${MUSTARD}">A+</span>.
      </h2>
      <p style="margin:0.1in 0 0;font-size:9pt;line-height:1.4;color:rgba(255,253,246,0.82)">
        Scan the code and you get the whole thing: every check behind these three scores, and a list of what
        we build. Pick anything you would like made for ${esc(lead.business_name)} and we will build it, then
        walk you through it on a call. ${region.studio}
      </p>
      <p style="margin:0.12in 0 0;font-family:'JetBrains Mono',monospace;font-size:9.6pt;font-weight:700;letter-spacing:0.04em;color:${MUSTARD}">
        ${region.phone} &nbsp;&middot;&nbsp; sarah@modernmustardseed.com
      </p>
    </div>
    ${mascotColumn()}
    ${qrColumn(qr)}
  </div>

  ${signedNote(`We read ${esc(domain || 'your website')}, your Google listing and your reviews on
    ${esc(longDate(readOn))}. Nothing here is a guess, and the code above shows every check behind
    these three scores.`, region)}

  ${footer(region)}
</div>`;
}
