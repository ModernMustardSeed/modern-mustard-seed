'use client';

import { usePathname } from 'next/navigation';

/**
 * Marks a page as part of the one Mustard Building site. app/deco-type.css
 * letters every public page's headings, kickers and emphasis in the house
 * Deco hands (Limelight, Josefin Sans capitals, Playfair italic), but
 * only when this marker is in the document, so the app shells (admin, portal,
 * the client desk, the office), program HQs, built demos, the booths of other
 * houses, private documents and the few pages that carry their own world keep
 * their own type. It renders on the server with the path, so there is no flash.
 */
const OFF_PREFIX = [
  '/admin',
  '/portal',
  '/cc',
  '/office',
  '/demo/',
  '/world',
  '/switchboard/live',
  '/sarah',
  '/hatchery/',
  '/voice-agents/build/demo/',
  '/proposal/',
  '/scaling-roadmap/r/',
  '/audit/',
  '/welcome/',
];
const OFF_EXACT = ['/super-nomad', '/partners/playbook'];

export function isDecoPage(path: string): boolean {
  if (OFF_EXACT.includes(path)) return false;
  if (path.endsWith('/hq')) return false;
  // Entries ending in a slash only close their sub-pages (/audit stays in the building, /audit/[id] does not).
  return !OFF_PREFIX.some((p) => path.startsWith(p));
}

export default function DecoScope() {
  const path = usePathname() || '/';
  if (!isDecoPage(path)) return null;
  return <span data-deco-page="" hidden />;
}
