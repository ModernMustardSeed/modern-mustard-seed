'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * Small personality for the poster hero. Everything here is decoration, so all
 * of it stands still under prefers-reduced-motion and none of it holds content.
 */

const CONFETTI = ['#F5B700', '#E0301E', '#FBF6EA', '#080c16'];

/**
 * Mr. Mustard leans and turns a few degrees toward the cursor. Tap him five
 * times in a row and he dances in a burst of confetti (the one easter egg).
 */
export function MascotLean({ className, danceClass, confettiClass, children }: { className: string; danceClass: string; confettiClass: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const taps = useRef<number[]>([]);
  const [party, setParty] = useState(0);

  const tap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    if (taps.current.length < 5 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    taps.current = [];
    trackEvent('mustard_dance', { location: 'home-hero' });
    setParty((p) => p + 1);
  };

  useEffect(() => {
    if (!party) return;
    const el = ref.current;
    el?.classList.add(danceClass);
    const t = window.setTimeout(() => el?.classList.remove(danceClass), 2400);
    return () => window.clearTimeout(t);
  }, [party, danceClass]);

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
  return (
    <div ref={ref} className={className} onClick={tap}>
      {children}
      {party > 0 && (
        <span key={party} className={confettiClass} aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => {
            const angle = (i / 28) * Math.PI * 2;
            const dist = 140 + ((i * 53) % 120);
            return <i key={i} style={{ background: CONFETTI[i % 4], ['--dx' as string]: `${Math.cos(angle) * dist}px`, ['--dy' as string]: `${Math.sin(angle) * dist - 60}px`, ['--rot' as string]: `${(i * 67) % 360}deg`, animationDelay: `${(i % 5) * 30}ms` }} />;
          })}
        </span>
      )}
    </div>
  );
}

/** A branch across the reviews; three birds fly in and perch on it when it is seen. */
export function BirdBranch({ className, landedClass }: { className: string; landedClass: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add(landedClass); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [landedClass]);
  const bird = (
    <svg viewBox="0 0 48 34"><path data-body d="M6 22 C 10 12, 22 8, 30 12 C 36 6, 44 6, 46 10 C 42 11, 40 13, 39 16 C 38 24, 30 30, 18 29 C 12 29, 8 26, 6 22 Z" /><path data-wing d="M16 18 C 20 12, 28 12, 31 17 C 26 20, 21 21, 16 18 Z" /><circle data-eye cx="40" cy="11" r="1.6" /><path data-beak d="M46 10 L 48 11.5 L 45.5 12.5 Z" /><path data-legs d="M22 29 L 21 33 M 27 29 L 27 33" /></svg>
  );
  return (
    <div ref={ref} className={className} aria-hidden="true">
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none" data-branch>
        <path pathLength={1} d="M0 40 C 200 30, 380 48, 600 38 S 1000 30, 1200 36" />
      </svg>
      {['16%', '50%', '84%'].map((left, i) => <span key={left} data-bird style={{ left, transitionDelay: `${0.5 + i * 0.25}s` }}>{bird}</span>)}
      {['4%', '30%', '66%', '96%'].map((left) => <span key={left} data-leaf style={{ left }} />)}
    </div>
  );
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
