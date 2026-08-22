/**
 * IS THIS DEMO WORTH SENDING?
 *
 * Sarah reviewed the fleet on 2026-08-22 and split it cleanly by eye. Profiling
 * both sets afterwards, the split was reproducible from the html alone, with no
 * exceptions either way:
 *
 *   the ones she approved   9 images / 2, 3 and 8 distinct, ~650KB, 3 type
 *                           families, a proof section
 *   the ones she rejected   N images / ONE distinct, up to 12,535KB, one font,
 *                           no proof section, one with no webfont at all
 *
 * So the verdict is computable, and it belongs next to the link in the cockpit
 * rather than in a script only I run. "Open twenty two demos and judge them" is
 * not a workflow; "the badge says one photo, 12.5MB" is.
 *
 * DISTINCT PHOTOGRAPHS IS THE SIGNAL. Not size, which is a symptom, and not the
 * engine, which is only a proxy. A page with one photograph repeated nine times
 * is the thing an owner spots instantly, and it was true of every rejected build.
 */
import { weighSite } from './site-weight.mjs';

/** Below this the photography is not worth carrying into a rebuild. */
export const MIN_DISTINCT_PHOTOS = 3;

/**
 * @param {string} html
 * @param {string|null} worker
 * @returns {{
 *   verdict:'good'|'weak'|'slop', label:string, reasons:string[],
 *   images:number, distinct:number, kb:number, fonts:number,
 *   hasProof:boolean, keepPhotos:boolean
 * }}
 */
export function judgeDemo(html, worker = null) {
  const h = String(html || '');
  const w = weighSite(h);
  const fonts = new Set([...h.matchAll(/family=([A-Za-z+0-9]+)/g)].map((m) => m[1])).size;
  // The approved builds all carry one; the rejected ones carried none.
  // No trailing word boundary. The first cut used one, so "reviews" failed to
  // match "review" and Hungry Horse Motel, which has a whole customer-quote
  // section, was reported as having no proof at all.
  const hasProof =
    /\b(review|rating|testimonial|proof)/i.test(h) ||
    /[★☆]/.test(h) ||
    /<blockquote/i.test(h) ||
    /id="(word|proof|reviews?|say|praise)"/i.test(h);

  // ART CARRIES SOME PAGES INSTEAD OF PHOTOGRAPHY.
  //
  // Huck Yeah is one of the builds Sarah named as right and it ships ONE
  // photograph, because it is carried by 2 canvases, 15 inline SVGs, 10
  // gradients and 6 keyframe animations. Judging it on distinct photo count
  // alone called it slop, which is plainly wrong. A page that did this much
  // drawing has not skipped its imagery, it chose a different medium.
  const artRich =
    (h.match(/<canvas/gi) || []).length >= 1 &&
    (h.match(/<svg/gi) || []).length >= 8 &&
    (h.match(/@keyframes/gi) || []).length >= 4;

  const reasons = [];
  if (w.distinct <= 1 && w.assets > 1) reasons.push(`one photograph repeated across ${w.assets} slots`);
  else if (w.distinct < MIN_DISTINCT_PHOTOS && !artRich) reasons.push(`only ${w.distinct} distinct photograph(s)`);
  if (w.overCeiling) reasons.push(`${w.totalKb}KB, over the ceiling`);
  else if (w.overTarget) reasons.push(`${w.totalKb}KB, over the 900KB target`);
  if (fonts === 0) reasons.push('no webfont at all');
  else if (fonts < 2) reasons.push('a single type family');
  if (!hasProof) reasons.push('no proof section');

  // Slop is the combination that produced every rejected build: the photography
  // is not real AND something else is wrong with it too.
  // One photograph is thin whether it was pasted into nine slots or was simply the
  // only one on the page. Woods Bay Marine shipped a single image, no webfont, and
  // over the size target, and a rule that required repetition let it read as merely
  // weak when Sarah's own verdict was slop.
  const thin = w.distinct <= 1 && !artRich;
  const verdict = thin && reasons.length > 1 ? 'slop' : reasons.length ? 'weak' : 'good';

  const label =
    verdict === 'good'
      ? `${w.distinct} photos · ${w.totalKb}KB`
      : `${w.distinct === 1 && w.assets > 1 ? '1 photo reused' : `${w.distinct} photos`} · ${w.totalKb}KB`;

  return {
    verdict,
    label,
    reasons,
    images: w.assets,
    distinct: w.distinct,
    kb: w.totalKb,
    fonts,
    hasProof,
    // THE TRAP THIS EXISTS TO CLOSE. refresh-site sets reuse_photos, and the
    // worker then harvests the inlined images out of the OLD page. On a build
    // whose whole defect is one photograph, that carries the defect straight
    // into the rebuild, and Sarah waits forty five minutes for the same site.
    keepPhotos: w.distinct >= MIN_DISTINCT_PHOTOS || artRich,
    worker: worker || null,
  };
}
