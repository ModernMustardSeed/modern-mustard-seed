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
 * THE FIRST PERSON LAW (Sarah, 2026-09-03).
 *
 * D&D Landscaping's property sheet was headed "Tell him what he is walking
 * into." Sarah: "make it more personal, like Let US know what WE are walking
 * into. Anywhere it's not personal like that, make it so." Then: "make that a
 * law that it makes all of our websites, demo or otherwise, personal and not
 * third person."
 *
 * The site speaks as the business. A page that says "he", "him", "his", "she",
 * "her", or "{Owner} will call you" in its own voice is describing its owner
 * from the outside, and the owner reads that as a brochure about a stranger.
 *
 * What is deliberately NOT read: anything a customer said (blockquote, q, and
 * any section, figure, article, list or div whose class or id names reviews,
 * testimonials, proof, praise, quotes or "what people say"), because a customer
 * writing "he showed up on time" is the one third person the page is allowed.
 * Also skipped: "his or her" and "he or she", which are about the visitor.
 *
 * A BARE PRONOUN IS NOT ENOUGH. Run over thirty finished demos before this
 * went live, a pronoun-only scan flagged a boat ("how long is she"), a pet
 * ("bring her in with an empty stomach") and a roofer's "nail gun in his
 * hand". A wrong flag costs a forty-five minute rebuild, and a gate that does
 * that gets switched off. So a pronoun counts only when the owner is in view:
 * the owner's first name, or the word owner/founder, in the same sentence or
 * the one before it; or the sentence is the owner promising the customer
 * something ("she will find you a chair", "expect a call back from him").
 *
 * With the owner's first name, "Greg will call you" and "Greg's crew" are read
 * too: no pronoun, same distance. "Call Greg" and a signature are not, because
 * a name on a button or under a letter is the personal form.
 *
 * Returns the offending sentences, trimmed, deduplicated, at most 12.
 *
 * @param {string} html
 * @param {string|null} owner the owner's first name when the brief has it
 * @returns {string[]}
 */
export function thirdPersonLines(html, owner = null) {
  let h = String(html || '');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');
  h = h.replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ');
  h = h.replace(/<blockquote\b[\s\S]*?<\/blockquote>/gi, ' ');
  h = h.replace(/<q\b[\s\S]*?<\/q>/gi, ' ');
  const proof = '(review|reviews|testimonial|testimonials|proof|praise|quote|quotes|say|said|word)';
  const idcls = new RegExp(
    '<(section|figure|article|ul|ol|li|aside|div)\\b[^>]*\\b(class|id)="[^"]*\\b' + proof + '\\b[^"]*"[^>]*>[\\s\\S]*?<\\/\\1>',
    'gi',
  );
  h = h.replace(idcls, ' ');
  // Tags become breaks so a heading and the paragraph under it never fuse into one sentence.
  const text = h
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&#8217;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[ \t]+/g, ' ');
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 12);
  const pronoun = /\b(he|him|his|himself|she|her|hers|herself)\b/i;
  const visitor = /\b(his or her|her or his|he or she|she or he|him or her|her or him)\b/i;
  const first = String(owner || '').trim().split(/\s+/)[0] || '';
  const escaped = first.replace(/[.*+?^{}$()|[\]\\]/g, '\\$&');
  const named =
    first.length >= 2
      ? new RegExp(
          '\\b' +
            escaped +
            "(?:'s (crew|team|guys|shop|truck|word|promise|number|phone|calendar)|(?: himself| herself)? (will|is|does|has|can|walks|shows|answers|calls|comes|handles|prices|texts|brings|quotes|builds|runs|takes|gets|knows|makes|installs|cuts|stands|puts|picks|delivers|works|started|founded|opened|owns|and (his|her) (crew|team|guys)))\\b",
          'i',
        )
      : null;
  const nameWord = first.length >= 2 ? new RegExp('\\b' + escaped + '\\b', 'i') : null;
  const ownerWord = /\b(owner|owners|founder|founders|proprietor)\b/i;
  // The owner talking to the customer about what the owner will do: the shape
  // a boat, a pet or a passer-by never takes.
  const promise =
    /\b(he|she)\s+(will|can|does|is the one who|handles|answers|calls|texts|prices|walks|shows up|comes out|gets back)\b[^.!?]*\byou\b/i;
  const callback = /\b(call|text|hear|word|answer|number|quote|price)\w*\s+(back\s+)?from\s+(him|her)\b/i;
  const inView = (i) => {
    const here = sentences[i];
    const prev = i > 0 ? sentences[i - 1] : '';
    if (nameWord && (nameWord.test(here) || nameWord.test(prev))) return true;
    return ownerWord.test(here) || ownerWord.test(prev);
  };
  const out = [];
  const seen = new Set();
  for (let i = 0; i < sentences.length; i++) {
    const sent = sentences[i];
    if (visitor.test(sent)) continue;
    const byName = named ? named.test(sent) : false;
    const byPronoun = pronoun.test(sent) && (inView(i) || promise.test(sent) || callback.test(sent));
    if (!byName && !byPronoun) continue;
    const key = sent.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sent.length > 140 ? sent.slice(0, 137) + '...' : sent);
    if (out.length >= 12) break;
  }
  return out;
}

/**
 * @param {string} html
 * @param {string|null} worker
 * @param {string|null} owner the owner's first name, for the "Greg will call you" shape
 * @returns {{
 *   verdict:'good'|'weak'|'slop', label:string, reasons:string[],
 *   images:number, distinct:number, kb:number, fonts:number,
 *   hasProof:boolean, thirdPerson:string[], keepPhotos:boolean
 * }}
 */
export function judgeDemo(html, worker = null, owner = null) {
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
  const thirdPerson = thirdPersonLines(h, owner);
  if (thirdPerson.length) reasons.push(`speaks about the owner in the third person (${thirdPerson.length} line${thirdPerson.length === 1 ? '' : 's'})`);

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
    thirdPerson,
    // THE TRAP THIS EXISTS TO CLOSE. refresh-site sets reuse_photos, and the
    // worker then harvests the inlined images out of the OLD page. On a build
    // whose whole defect is one photograph, that carries the defect straight
    // into the rebuild, and Sarah waits forty five minutes for the same site.
    keepPhotos: w.distinct >= MIN_DISTINCT_PHOTOS || artRich,
    worker: worker || null,
  };
}
