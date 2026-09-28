'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isRivieraPage } from '@/lib/riviera-scope';

export { isRivieraPage };

/**
 * Marks a page as part of the one Riviera site. app/riviera-type.css letters
 * every public page's headings, kickers and emphasis in the house hands
 * (Unbounded display, Figtree labels and reading), but only while <html>
 * carries the `riv` class, so the app shells (admin, portal, the client desk,
 * the office), program HQs, built demos, the booths of other houses, private
 * documents and the few pages that carry their own world keep their own type.
 *
 * The class is set by rivieraHeadScript() (lib/riviera-scope) before the first paint, so there is
 * no flash, and this component keeps it right across client navigations. A
 * plain class replaced html:has([data-riviera-page]) on 2026-09-28: every
 * :has() rule made the browser re-check the whole page on each DOM change,
 * about a second of style work on a phone.
 */
export default function RivieraScope() {
  const path = usePathname() || '/';
  useEffect(() => {
    document.documentElement.classList.toggle('riv', isRivieraPage(path));
  }, [path]);
  return null;
}
