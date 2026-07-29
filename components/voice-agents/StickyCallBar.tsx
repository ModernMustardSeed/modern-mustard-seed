'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { DEMO_LINE } from '@/data/trade-pages';

/**
 * The number follows you down the page on phones. Appears once the hero has
 * scrolled past, so it never covers the hero's own call CTA. Desktop keeps the
 * page clean (there is a tel: link in the hero, the nav, and the closer).
 */
export default function StickyCallBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 760);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-3 transition-transform duration-300 ${
        show ? 'translate-y-0' : 'translate-y-[130%]'
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <a
        href={`tel:${DEMO_LINE.tel}`}
        onClick={() => trackEvent('call_the_number', { location: 'sticky-bar' })}
        className="flex items-center justify-center gap-3 rounded-full border-2 border-[#161616] bg-[#F5B700] px-6 py-3.5 shadow-[0_6px_22px_rgba(22,22,22,0.35)]"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E0301E] opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E0301E]" />
        </span>
        <span className="font-sans text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#161616]">
          Call Him · {DEMO_LINE.display}
        </span>
      </a>
    </div>
  );
}
