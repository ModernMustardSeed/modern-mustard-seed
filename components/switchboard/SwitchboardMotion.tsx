'use client';

import { useEffect } from 'react';

/**
 * Reveal-on-scroll for the Switchboard, done as PROGRESSIVE ENHANCEMENT: every
 * section is fully visible in plain HTML. Only after JS mounts do we hide-then-
 * reveal elements tagged `sb-reveal`, and a 2.5s safety reveals everything even if
 * the observer never fires. A crawler, a no-JS reader, or reduced-motion sees the
 * whole page. No dependency, no layout shift.
 */
export default function SwitchboardMotion() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('sb-js');
    const els = Array.from(document.querySelectorAll<HTMLElement>('.sb-reveal'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('sb-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    const safety = window.setTimeout(() => els.forEach((el) => el.classList.add('sb-in')), 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, []);

  return (
    <style>{`
      .sb-js .sb-reveal{opacity:0;transform:translateY(20px)}
      .sb-js .sb-reveal.sb-in{opacity:1;transform:none;transition:opacity .6s ease, transform .7s cubic-bezier(.2,.7,.2,1)}
      @media (prefers-reduced-motion: reduce){.sb-js .sb-reveal{opacity:1 !important;transform:none !important}}
    `}</style>
  );
}
