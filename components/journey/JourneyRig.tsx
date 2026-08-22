'use client';

/**
 * THE RIG. Fixed-position machinery for the Flathead Journey landing page:
 *
 *   1. The letterbox: cinema bars that breathe in over full-bleed footage
 *      chapters (any section with data-letterbox) and out over paper.
 *   2. The mile rail: the lake road as a vertical track pinned left, one stop
 *      per chapter, a tiny corvette riding your scroll position. Clicking a
 *      stop drives you there. Desktop only.
 *   3. The flock: after the tree chapter first enters, a small flock of canvas
 *      birds follows the visitor for the rest of the visit (Matthew 13:32,
 *      the birds come and perch). 2D canvas, transform-free draws, capped at
 *      ten birds, pointer-events none.
 *
 * It renders overlays only and reads chapters straight off the DOM
 * ([data-journey-chapter]), so the page itself can stay server-rendered.
 * Everything stands down under prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from 'react';

type Stop = { id: string; label: string; name: string; el: HTMLElement };

const REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function JourneyRig() {
  const railRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  // Bottom bar only. The top cinema bar slid OVER the fixed navbar and brand
  // (Sarah 2026-08-07: "take the top one out that overlaps regular one"), so
  // the letterbox breathes from the bottom edge alone.
  const botBar = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-journey-chapter]'));
    setStops(
      els.map((el) => ({
        id: el.id,
        label: el.dataset.mile || '',
        name: el.dataset.journeyChapter || '',
        el,
      })),
    );
  }, []);

  /* Scroll choreography: rail fill, car position, letterbox breathing. */
  useEffect(() => {
    if (!stops.length || REDUCED()) return;
    let raf = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p})`;
      if (carRef.current && railRef.current) {
        const h = railRef.current.clientHeight - 18;
        carRef.current.style.transform = `translateY(${p * h}px)`;
      }

      // Letterbox: engaged when the viewport center sits inside a footage chapter.
      const mid = window.innerHeight / 2;
      let cinema = false;
      for (const s of stops) {
        if (s.el.dataset.letterbox === undefined) continue;
        const r = s.el.getBoundingClientRect();
        if (r.top < mid && r.bottom > mid) { cinema = true; break; }
      }
      const barH = cinema ? Math.round(window.innerHeight * 0.055) : 0;
      if (botBar.current) botBar.current.style.height = `${barH}px`;

      // Active stop for the rail dots.
      let active = 0;
      stops.forEach((s, i) => {
        if (s.el.getBoundingClientRect().top < mid) active = i;
      });
      railRef.current?.querySelectorAll('[data-stop]').forEach((d, i) => {
        (d as HTMLElement).dataset.active = i <= active ? '1' : '0';
      });
    };

    const onScroll = () => {
      if (!ticking) { ticking = true; raf = requestAnimationFrame(update); }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [stops]);

  /* The flock. Armed when the tree chapter first crosses the viewport. */
  useEffect(() => {
    if (REDUCED()) return;
    const tree = document.getElementById('tour-tree');
    const canvas = canvasRef.current;
    if (!tree || !canvas) return;

    let running = false;
    let raf = 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type Bird = { x: number; y: number; vx: number; vy: number; ph: number; s: number };
    const birds: Bird[] = [];
    const mouse = { x: -1e4, y: -1e4 };

    const size = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const start = () => {
      if (running) return;
      running = true;
      size();
      for (let i = 0; i < 10; i++) {
        birds.push({
          x: canvas.width * (0.3 + Math.random() * 0.4),
          y: canvas.height + 40 + Math.random() * 200,
          vx: 0, vy: 0,
          ph: Math.random() * Math.PI * 2,
          s: 0.7 + Math.random() * 0.6,
        });
      }
      loop();
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // The flock loosely orbits an anchor in the upper right, drifts with
      // scroll velocity, and politely avoids the cursor.
      const ax = canvas.width * 0.82;
      const ay = canvas.height * 0.16;
      for (const b of birds) {
        b.ph += 0.11 * b.s;
        const wx = Math.sin(b.ph * 0.37 + b.s * 9) * 60;
        const wy = Math.cos(b.ph * 0.29 + b.s * 7) * 34;
        const dx = ax + wx - b.x;
        const dy = ay + wy - b.y;
        b.vx += dx * 0.0016;
        b.vy += dy * 0.0016;
        const mdx = b.x - mouse.x, mdy = b.y - mouse.y;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < 22500) { b.vx += (mdx / Math.sqrt(md2 + 1)) * 0.55; b.vy += (mdy / Math.sqrt(md2 + 1)) * 0.55; }
        b.vx *= 0.96; b.vy *= 0.96;
        b.x += b.vx; b.y += b.vy;

        // Silhouette: body dash + two flapping wing arcs.
        const flap = Math.sin(b.ph) * 6 * b.s;
        ctx.strokeStyle = 'rgba(22,22,22,0.78)';
        ctx.lineWidth = 1.6 * b.s;
        ctx.beginPath();
        ctx.moveTo(b.x - 7 * b.s, b.y - flap);
        ctx.quadraticCurveTo(b.x - 3 * b.s, b.y + 3 * b.s, b.x, b.y);
        ctx.quadraticCurveTo(b.x + 3 * b.s, b.y + 3 * b.s, b.x + 7 * b.s, b.y - flap);
        ctx.stroke();
      }
    };

    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { start(); io.disconnect(); } },
      { threshold: 0.25 },
    );
    io.observe(tree);
    const onMouse = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('resize', size);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', size);
    };
  }, []);

  const go = (s: Stop) => {
    const head = s.el.querySelector('h1, h2') || s.el;
    head.scrollIntoView({ behavior: REDUCED() ? 'auto' : 'smooth', block: 'center' });
  };

  return (
    <>
      {/* Cinema bar, bottom only (the top one covered the navbar) */}
      <div ref={botBar} aria-hidden className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0B0B0B] transition-[height] duration-700 ease-[cubic-bezier(.22,1,.36,1)] pointer-events-none motion-reduce:hidden" style={{ height: 0 }} />

      {/* The flock */}
      <canvas ref={canvasRef} aria-hidden className="fixed inset-0 z-[55] pointer-events-none motion-reduce:hidden" />

      {/* The mile rail */}
      <nav aria-label="Journey chapters" className="fixed left-5 top-1/2 -translate-y-1/2 z-[70] hidden lg:block motion-reduce:hidden">
        <div ref={railRef} className="relative h-[46vh] w-[2px] bg-[#161616]/20">
          <div ref={fillRef} className="absolute inset-x-0 top-0 h-full origin-top bg-[#F5B700]" style={{ transform: 'scaleY(0)' }} />
          <div ref={carRef} className="absolute -left-[7px] top-0 h-[10px] w-[16px] rounded-[3px] bg-[#E0301E] border border-[#161616] shadow-[1px_1px_0_0_#161616]" style={{ transform: 'translateY(0)' }} />
          <div className="absolute inset-0 flex flex-col justify-between">
            {stops.map((s) => (
              <button
                key={s.id}
                data-stop
                onClick={() => go(s)}
                className="group relative -left-[3px] h-2 w-2 rounded-full border border-[#161616] bg-[#FBF6EA] data-[active='1']:bg-[#F5B700] transition-colors"
                aria-label={`${s.label} ${s.name}`}
              >
                <span className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] tracking-[0.18em] uppercase text-[#161616]/0 group-hover:text-[#161616]/80 bg-[#FBF6EA]/0 group-hover:bg-[#FBF6EA]/90 px-1.5 py-0.5 rounded transition-colors">
                  {s.label} · {s.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
