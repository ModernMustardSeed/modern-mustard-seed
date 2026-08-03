/**
 * DOES THIS DOCUMENT POINT AT ANYTHING WE ARE NOT GOING TO SEND?
 *
 * A forged site ships as ONE document: a row of html served at /demo/site/<id>/raw,
 * or projects.site_html on a client's domain. The directory it was built in is never
 * published. So any reference to a sibling file is a guaranteed 404 in front of a real
 * prospect, and the browser paints the alt text where the photograph belongs. Miller
 * Construction and Glacier Roofing both went out that way on 2026-08-02.
 *
 * This module is the shared detector, deliberately dependency-free so every path that
 * can put html in front of a customer can import it:
 *   - scripts/inline-site-assets.mjs   repairs a local build from the files beside it
 *   - lib/site-forge-api.ts            fails a cloud build that has no files to inline
 *   - scripts/audit-demo-assets.mjs    sweeps the fleet
 */

/** Every place a build can point at a file. */
const REF_PATTERNS = [
  /(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi,
  /(<source\b[^>]*?\bsrcset\s*=\s*)(["'])([^"',]+)\2/gi,
  /(<video\b[^>]*?\bposter\s*=\s*)(["'])([^"']+)\2/gi,
  /(<source\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi,
  /(<link\b[^>]*?\brel\s*=\s*["'](?:stylesheet|icon|apple-touch-icon)["'][^>]*?\bhref\s*=\s*)(["'])([^"']+)\2/gi,
  /(<script\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi,
  /(\burl\()\s*(["']?)([^"')]+)\2\s*(?=\))/gi,
];

/**
 * References that are already resolved and must never be touched.
 *
 * The `%23` cases are the trap. An inline SVG embedded as a data URI carries its own
 * `url(#n)` filter references, and inside that URI the `#` is percent-encoded, so a
 * naive scan reads `url(%23n)` as a file named "%23n" and condemns a perfectly good
 * page. A first pass of this scanner flagged 58 healthy demo sites that way, and had it
 * been wired to the build gate it would have failed every build on the floor.
 *
 * A local asset also always looks like a file: it has an extension. Anything without
 * one is a fragment, an anchor, or a CSS keyword, never something to fetch.
 */
export function isExternal(ref) {
  if (!ref || ref.trim() === '') return true;
  if (/^(data:|https?:|blob:|about:|#|mailto:|tel:|\/\/)/i.test(ref)) return true;
  if (/^%23|^%2523/i.test(ref)) return true; // encoded fragment: url(#n) inside a data URI
  if (/^(none|inherit|initial|unset|currentcolor|transparent)$/i.test(ref.trim())) return true;
  return !/\.[a-z0-9]{2,5}(?:[?#].*)?$/i.test(ref.split('#')[0]); // no extension, not a file
}

/** Every local file this document depends on. Empty means it is truly self-contained. */
export function localAssetRefs(html) {
  if (!html) return [];
  const refs = new Set();
  for (const re of REF_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(html))) {
      const ref = m[3].trim();
      if (!isExternal(ref)) refs.add(ref);
    }
  }
  return [...refs];
}

/**
 * The one-line gate for any path that is about to publish html. Returns an error
 * string to fail with, or null when the document is safe to ship.
 */
export function selfContainedError(html) {
  const refs = localAssetRefs(html);
  if (!refs.length) return null;
  return (
    `the site references ${refs.length} local file(s) that are never published, so every one ` +
    `would render as a broken image with its alt text showing: ${refs.slice(0, 8).join(', ')}` +
    `${refs.length > 8 ? ', ...' : ''}. Images must be inline data: URIs.`
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SELF-CONTAINED IS NOT THE SAME AS FINISHED.
 *
 * The gate above proves nothing points at a file we will not send. It cannot tell
 * a photograph from a flat rectangle, and on 2026-08-03 that gap shipped Polly
 * Thompson Pest Elimination (f9b0be79) with five of its nine images as solid
 * #c6dad6 swatches. Codex had rendered all nine perfectly; the build inlined its
 * page while the last five were still rendering, substituting its own draft
 * placeholder, and never ran the final pass. Every check passed: no local refs,
 * valid JPEGs, naturalWidth > 0. The page just had blank blocks where the
 * photographs belonged.
 *
 * A placeholder is detectable without decoding a pixel. A JPEG or WebP of a real
 * photograph carries detail, and detail costs bytes; a solid fill compresses to
 * almost nothing. Measured across the fleet (444 inlined images, 96 sites) the
 * lowest legitimate image sits at 0.031 bytes per pixel and the median at 0.104,
 * while all five placeholders sit at 0.0036. The threshold below is 3x above the
 * placeholders and 3x below the healthiest-ever floor, and it flags zero of the
 * 444 real images.
 *
 * Deliberately dependency-free, like the rest of this module, so the serverless
 * failsafe and the delivery editor can run it too. sharp is not available on
 * every path that publishes.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Below this, a raster is a fill and not a photograph. See the note above. */
const MIN_BYTES_PER_PIXEL = 0.01;

/**
 * Ignore anything smaller than roughly 200x200: favicons, spacers, grain tiles and
 * texture swatches are legitimately tiny and legitimately flat.
 */
const MIN_AREA = 40_000;

/** Nothing a demo site ships is this big; a number this large means we misparsed. */
const MAX_DIMENSION = 20_000;

/**
 * Read width and height out of a raster's header.
 *
 * Returns null whenever the format is unsupported or the bytes do not parse, and
 * EVERY caller treats null as "cannot judge, leave it alone". Condemning what we
 * failed to measure is how the first pass of the sibling scanner flagged 58
 * healthy pages.
 */
function rasterSize(mime, buf) {
  try {
    if (/jpeg|jpg/.test(mime)) {
      // Walk the segment chain to the frame header. The dimensions live in the
      // SOFn marker, which is not at a fixed offset.
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
        if (marker === 0xd9 || marker === 0xda) break; // end of image, or start of scan
        const len = buf.readUInt16BE(i + 2);
        // SOF0-SOF15 carry the frame size; C4/C8/CC are tables, not frames.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
        }
        if (len < 2) break;
        i += 2 + len;
      }
      return null;
    }
    if (/png/.test(mime)) {
      if (buf.length < 24) return null;
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (/webp/.test(mime)) {
      if (buf.length < 30) return null;
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8X') return { width: (buf.readUIntLE(24, 3) & 0xffffff) + 1, height: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
      if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (chunk === 'VP8L') {
        const bits = buf.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      return null;
    }
    if (/gif/.test(mime)) {
      if (buf.length < 10) return null;
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Every inlined image that is a blank fill where a photograph belongs.
 *
 * @returns {{index:number, mime:string, width:number, height:number, bytes:number, bytesPerPixel:number}[]}
 */
export function blankImages(html) {
  if (!html) return [];
  const found = [];
  let index = 0;
  for (const m of html.matchAll(/data:image\/([a-z+-]+);base64,([A-Za-z0-9+/=]+)/gi)) {
    index++;
    const mime = m[1].toLowerCase();
    if (mime === 'svg+xml' || mime === 'x-icon') continue; // vector and icons are not photographs
    let buf;
    try {
      buf = Buffer.from(m[2], 'base64');
    } catch {
      continue;
    }
    const size = rasterSize(mime, buf);
    if (!size || !size.width || !size.height) continue; // unmeasurable, so unjudged
    if (size.width > MAX_DIMENSION || size.height > MAX_DIMENSION) continue;
    const area = size.width * size.height;
    if (area < MIN_AREA) continue;
    const bytesPerPixel = buf.length / area;
    if (bytesPerPixel >= MIN_BYTES_PER_PIXEL) continue;
    found.push({ index, mime, width: size.width, height: size.height, bytes: buf.length, bytesPerPixel });
  }
  return found;
}

/**
 * The gate for "self-contained, but the pictures never arrived". Returns an error
 * string, or null when every inlined image carries real detail.
 */
export function blankImageError(html) {
  const blanks = blankImages(html);
  if (!blanks.length) return null;
  const list = blanks
    .slice(0, 6)
    .map((b) => `#${b.index} ${b.width}x${b.height} at ${Math.round(b.bytes / 1024)}KB`)
    .join(', ');
  return (
    `${blanks.length} inlined image(s) are blank fills rather than photographs, so the page ships ` +
    `with empty blocks where the imagery belongs: ${list}${blanks.length > 6 ? ', ...' : ''}. ` +
    `This is what a draft placeholder looks like: re-run the final inline pass once every render ` +
    `has finished, and inline the real files.`
  );
}

/**
 * ONE call for every path that is about to put a page in front of a customer.
 *
 * Note the empty case comes FIRST and is not a formality. Both detectors below
 * answer "nothing wrong here" for null, an empty string, or a fragment, because
 * a document with no images has no broken ones. A caller that hands this an
 * unbuilt row and trusts the null would sail straight through the gate it just
 * asked for.
 */
export function publishBlockerError(html) {
  if (!html || typeof html !== 'string' || html.length < 500) {
    return `there is no page here to publish (${html ? `${html.length} bytes` : 'empty'}).`;
  }
  return selfContainedError(html) || blankImageError(html);
}
