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
