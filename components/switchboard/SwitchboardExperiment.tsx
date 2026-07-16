'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * A/B THE HERO, without hurting SEO.
 *
 * Hypothesis: does leading with the LIVING Command Board convert better than leading
 * with the cinematic image hero? We test it by VISUAL order only. The DOM order never
 * changes (hero + its H1 stay first for crawlers and screen readers); an inline script
 * sets data-sbv on <html> before first paint, and CSS `order` floats the board above
 * the hero for variant B. So Google always reads hero-first, sighted users in B see
 * board-first, and there is no flash of the wrong order.
 *
 * Assignment is a sticky 50/50 cookie (90 days). Conversion is attributable: the
 * variant rides the Command Board lead, and an exposure event fires to GA4.
 */
export default function SwitchboardExperiment() {
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)sb_variant=([AB])/);
    trackEvent('sb_variant_view', { variant: m ? m[1] : 'A' });
  }, []);

  return (
    <>
      <script
        // Runs during HTML parse, before the sections below paint: no reorder flash.
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{var m=document.cookie.match(/(?:^|; )sb_variant=([AB])/);var v=m&&m[1];if(!v){v=Math.random()<0.5?'A':'B';document.cookie='sb_variant='+v+';path=/;max-age=7776000;samesite=lax';}document.documentElement.setAttribute('data-sbv',v);}catch(e){document.documentElement.setAttribute('data-sbv','A');}})();",
        }}
      />
      <style>{`
        :root[data-sbv="B"] .sb-slot-board{order:-1}
      `}</style>
    </>
  );
}
