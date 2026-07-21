'use client';

import dynamic from 'next/dynamic';

/**
 * Loads the Mr. Mustard chat widget as its own async client chunk instead of
 * baking its ~750 lines + the Vapi voice SDK into the critical hydration path
 * of every page. The widget is a floating bubble that starts collapsed, so
 * nothing above the fold depends on it; loading it a beat after the main bundle
 * hydrates cuts mobile Total Blocking Time with no visible change.
 *
 * BEHAVIOR IS PRESERVED, not delayed on a timer: the same component mounts, its
 * `mustardseed:open` listener (fired by the hero CTA) and its `?book=1` / `#book`
 * auto-open both still attach on mount. `ssr: false` is safe here because the
 * widget renders nothing into the server HTML that SEO or first paint needs, and
 * a click in the sub-second window before the chunk lands simply no-ops rather
 * than crashing. Added 2026-07-20 as a Lighthouse mobile-perf win.
 */
const MustardSeedChat = dynamic(() => import('@/components/MustardSeedChat'), {
  ssr: false,
});

export default function DeferredChat() {
  return <MustardSeedChat />;
}
