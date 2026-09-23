'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Small personality for the poster hero. Everything here is decoration, so all
 * of it stands still under prefers-reduced-motion and none of it holds content.
 */

/** Mr. Mustard leans and turns a few degrees toward the cursor. */
export function MascotLean({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.4)) / (window.innerHeight / 2)));
        el.style.setProperty('--lean-x', (dx * 14).toFixed(1) + 'px');
        el.style.setProperty('--lean-y', (dy * 8).toFixed(1) + 'px');
        el.style.setProperty('--lean-r', (dx * 5).toFixed(2) + 'deg');
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(frame); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

/** The services strip eases down to a stroll while a pointer rests on it. */
export function Marquee({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const ease = (rate: number) => {
    ref.current?.querySelector('div')?.getAnimations().forEach((a) => a.updatePlaybackRate(rate));
  };
  return <div ref={ref} className={className} aria-hidden="true" onPointerEnter={() => ease(0.18)} onPointerLeave={() => ease(1)}>{children}</div>;
}

/** The seed over the verse sprouts the first time it scrolls into view. */
export function SproutSeed({ className, grownClass }: { className: string; grownClass: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add(grownClass); io.disconnect(); }
    }, { threshold: 0.9 });
    io.observe(el);
    return () => io.disconnect();
  }, [grownClass]);
  return (
    <span ref={ref} className={className} aria-hidden="true">
      <svg viewBox="0 0 40 46" width="40" height="46">
        <path data-stem d="M20 30 C20 24 20 20 20 15" />
        <path data-leaf-l d="M20 18 C14 18 9 14 8 8 C14 8 19 11 20 18 Z" />
        <path data-leaf-r d="M20 15 C25 14 30 10 32 4 C26 4 21 8 20 15 Z" />
        <ellipse data-seed cx="20" cy="36" rx="7" ry="8.5" />
      </svg>
    </span>
  );
}
