/**
 * THE WEIGHT GATE.
 *
 * The design law has said "total file under 900KB" for months. On the night of
 * 2026-08-21 the failsafe drained a 37-job queue and shipped, among the builds
 * that SUCCEEDED:
 *
 *   Wild Wave Water Craft   12,535 KB
 *   Somers Bay Cafe          6,867 KB
 *   Wildflowers Salon        6,349 KB
 *   Spotted Bear Spirits     5,695 KB
 *   The Parlor Salon         5,508 KB
 *
 * Twelve and a half megabytes for one demo, against a 900KB law. The law was
 * never the problem. Nothing measured it, so nothing enforced it, and the same
 * sentence in the prompt got ignored a hundred times in a row.
 *
 * Sappari's first build made the reason obvious: seven <img> tags carrying SEVEN
 * BYTE-IDENTICAL COPIES of one photograph, 4.3MB of a 5.8MB page. The model
 * satisfied "every visual slot carries photography" by pasting the hero in seven
 * times.
 *
 * So this measures, and the callers refuse. It reports three things a retry can
 * actually act on: how far over the ceiling it is, which single image is
 * heaviest, and how many bytes are pure duplication. Handing those numbers back
 * to the builder is the difference between "make it smaller", which it ignores,
 * and "you spent 4.3MB inlining the same photo seven times", which it fixes.
 *
 * The proven method is in docs/flagship/TEMPLATE.md: encode WebP against a
 * per-image byte budget, and define each photograph ONCE as a CSS custom
 * property that every place referencing it shares. Two reference builds land
 * eight photographs in 807KB and seven in 830KB.
 */

/** The law's number. A build at or under this is fine. */
export const WEIGHT_TARGET_KB = 900;

/**
 * The refusal line, deliberately well above the target. The gate is here to stop
 * the 5MB and 12MB disasters, not to bounce a careful build that landed at
 * 1.1MB, because a demo that never reaches the prospect is worse than a demo
 * that loads a second slower.
 */
export const WEIGHT_CEILING_KB = 1800;

const DATA_URI = /data:(image|video|font)\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]+)/gi;

/**
 * Measure a finished document.
 *
 * @param {string} html
 * @returns {{
 *   totalKb: number, assetKb: number, markupKb: number,
 *   assets: number, distinct: number, duplicateKb: number,
 *   largestKb: number, overTarget: boolean, overCeiling: boolean
 * }}
 */
export function weighSite(html) {
  const totalKb = Math.round((html?.length || 0) / 1024);
  const seen = new Map();
  let assetBytes = 0;
  let largest = 0;

  for (const m of String(html || '').matchAll(DATA_URI)) {
    // base64 inflates by 4/3; the decoded size is what actually crosses the wire
    // after transfer encoding, and it is the number worth reporting.
    const bytes = Math.floor((m[2].length * 3) / 4);
    assetBytes += bytes;
    if (bytes > largest) largest = bytes;
    const key = m[2].slice(0, 128) + ':' + m[2].length;
    seen.set(key, (seen.get(key) || 0) + 1);
  }

  let assets = 0;
  let duplicateBytes = 0;
  for (const [key, count] of seen) {
    assets += count;
    if (count > 1) {
      const len = Number(key.slice(key.lastIndexOf(':') + 1));
      duplicateBytes += Math.floor((len * 3) / 4) * (count - 1);
    }
  }

  const kb = (b) => Math.round(b / 1024);
  return {
    totalKb,
    assetKb: kb(assetBytes),
    markupKb: Math.max(0, totalKb - kb(assetBytes)),
    assets,
    distinct: seen.size,
    duplicateKb: kb(duplicateBytes),
    largestKb: kb(largest),
    overTarget: totalKb > WEIGHT_TARGET_KB,
    overCeiling: totalKb > WEIGHT_CEILING_KB,
  };
}

/** One line for a log or a health row. */
export function weightLine(w) {
  return (
    `${w.totalKb}KB total (${w.assetKb}KB in ${w.assets} inlined asset(s), ` +
    `${w.distinct} distinct, heaviest ${w.largestKb}KB` +
    (w.duplicateKb > 0 ? `, ${w.duplicateKb}KB wasted on duplicates` : '') +
    `), target ${WEIGHT_TARGET_KB}KB`
  );
}

/**
 * The refusal, written for the builder that has to fix it rather than for a log.
 * It names the number, the cause, and the technique, because "make it smaller"
 * is the instruction that has been ignored all along.
 */
export function weightRefusal(w) {
  const parts = [
    `page is ${w.totalKb}KB, over the ${WEIGHT_CEILING_KB}KB ceiling (the law's target is ${WEIGHT_TARGET_KB}KB).`,
  ];
  if (w.duplicateKb > 0) {
    parts.push(
      `${w.duplicateKb}KB of that is the SAME image inlined more than once: ` +
        `${w.assets} inlined assets but only ${w.distinct} distinct. Every visual slot needs its OWN photograph, ` +
        `and any image used twice must be encoded ONCE as a CSS custom property that both places reference.`,
    );
  }
  if (w.largestKb > 300) {
    parts.push(
      `the single heaviest asset is ${w.largestKb}KB. Encode WebP and size each image to the box it actually ` +
        `occupies: a full-bleed hero at ~1600px wide fits in about 120KB, a card at ~900px in about 60KB.`,
    );
  }
  parts.push('Give every image a byte budget before generating it, not after.');
  return parts.join(' ');
}
