// Twitter card is identical to the Open Graph card. Re-export to stay in sync.
// Node runtime (matches opengraph-image, which reads the logo from /public).
export const runtime = 'nodejs';
export { default, alt, size, contentType } from './opengraph-image';
