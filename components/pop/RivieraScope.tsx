'use client';

import { usePathname } from 'next/navigation';

/**
 * Marks a page as part of the one Riviera site. app/riviera-type.css letters
 * every public page's headings, kickers and emphasis in the house hands
 * (Bodoni Moda display and italic, Instrument Sans for labels and reading), but
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

export function isRivieraPage(path: string): boolean {
  if (OFF_EXACT.includes(path)) return false;
  if (path.endsWith('/hq')) return false;
  // Entries ending in a slash only close their sub-pages (/audit stays on the Riviera, /audit/[id] does not).
  return !OFF_PREFIX.some((p) => path.startsWith(p));
}

export default function RivieraScope() {
  const path = usePathname() || '/';
  if (!isRivieraPage(path)) return null;
  return <span data-riviera-page="" hidden />;
}
