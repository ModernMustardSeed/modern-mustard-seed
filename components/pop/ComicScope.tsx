'use client';

import { usePathname } from 'next/navigation';

/**
 * Marks a page as part of the one comic book. app/comic-type.css letters every
 * public page's headings, kickers and emphasis in the house comic hand, but
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

export function isComicPage(path: string): boolean {
  if (OFF_EXACT.includes(path)) return false;
  if (path.endsWith('/hq')) return false;
  // Entries ending in a slash only close their sub-pages (/audit stays comic, /audit/[id] does not).
  return !OFF_PREFIX.some((p) => path.startsWith(p));
}

export default function ComicScope() {
  const path = usePathname() || '/';
  if (!isComicPage(path)) return null;
  return <span data-comic-page="" hidden />;
}
