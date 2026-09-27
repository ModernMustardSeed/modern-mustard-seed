'use client';

import { usePathname } from 'next/navigation';

/**
 * Marks a page as part of the one Graffiti Couture site. app/graffiti-type.css
 * letters every public page's headings, kickers and emphasis in the house
 * poster and marker hands, but
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

export function isGraffitiPage(path: string): boolean {
  if (OFF_EXACT.includes(path)) return false;
  if (path.endsWith('/hq')) return false;
  // Entries ending in a slash only close their sub-pages (/audit stays graffiti, /audit/[id] does not).
  return !OFF_PREFIX.some((p) => path.startsWith(p));
}

export default function GraffitiScope() {
  const path = usePathname() || '/';
  if (!isGraffitiPage(path)) return null;
  return <span data-graffiti-page="" hidden />;
}
