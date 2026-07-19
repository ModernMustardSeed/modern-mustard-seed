'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The Growing Vine: the homepage signature moment, and the headline made
 * literal. "You bring the seed. We build the tree." A gold vine draws itself
 * down the page as you scroll, sprouting from a planted seed under the hero,
 * unfurling a pair of leaves each time it crosses a section boundary marked
 * `data-vine-stop`, and ending beside the closing section as a small branch
 * with two birds perched on it (Matthew 13:32, "the birds come and perch in
 * its branches", the same verse stamped in the footer).
 *
 * Same engineering contract as the Switchboard's patch cable: pure decoration
 * at z-[1] above section backgrounds, crossings land inside section padding so
 * it never runs over copy, pointer-events none, aria-hidden, desktop only
 * (>= 1280px), fully drawn under reduced motion, absent entirely without JS.
 */

type Leaf = { x: number; y: number; frac: number; flip: boolean };

export default function HomeVine() {
  const [path, setPath] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [seed, setSeed] = useState<{ x: number; y: number } | null>(null);
  const [birds, setBirds] = useState<{ x: number; y: number; onDark: boolean } | null>(null);
  const [progress, setProgress] = useState(0);
  const [birdsIn, setBirdsIn] = useState(false);
  const reduced = useRef(false);
  const raf = useRef(0);
  const perchPageY = useRef(0);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const build = () => {
      const host = document.getElementById('mm-vine-host');
      if (!host) return;
      const vw = window.innerWidth;
      if (vw < 1280) {
        setPath(null);
        return;
      }
      const hostRect = host.getBoundingClientRect();
      const top = hostRect.top + window.scrollY;
      const stops = Array.from(document.querySelectorAll<HTMLElement>('[data-vine-stop]'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return r.top + window.scrollY - top;
        })
        .sort((a, b) => a - b);
      if (stops.length < 2) {
        setPath(null);
        return;
      }

      const gutter = Math.max(28, (vw - 1120) / 2 - 34);
      const xL = gutter;
      const xR = vw - gutter;
      const h = host.offsetHeight;

      // Build the serpentine and track approximate cumulative length so each
      // leaf knows the scroll fraction at which the vine reaches it. The seed
      // plants just below the first stop's boundary (the ticker line), and
      // crossings begin at the SECOND stop: the first sits at the host's very
      // top, where a crossing would arc off the canvas.
      const y0 = stops[0] + 46;
      let d = `M ${xL} ${y0}`;
      let side: 'L' | 'R' = 'L';
      let cx = xL;
      let cy = y0;
      let cum = 0;
      const leafPts: Omit<Leaf, 'frac'>[] = [];
      const leafCum: number[] = [];

      for (let i = 1; i < stops.length - 1; i++) {
        const y = stops[i];
        const from = side === 'L' ? xL : xR;
        const to = side === 'L' ? xR : xL;
        // vertical run down the gutter
        const runLen = Math.max(0, y - 90 - cy);
        if (runLen > 260) {
          // a leaf mid-run, hugging the vine's side
          leafPts.push({ x: from, y: cy + runLen * 0.55, flip: side === 'R' });
          leafCum.push(cum + runLen * 0.55);
        }
        d += ` L ${from} ${y - 90}`;
        cum += runLen;
        // lazy S-curve across the page on the section boundary
        const curveLen = Math.hypot(xR - xL, 140) * 1.15;
        d += ` C ${from} ${y - 20}, ${to} ${y - 20}, ${to} ${y + 50}`;
        // a leaf pair at the crossing's midpoint, in the boundary padding
        leafPts.push({ x: (xL + xR) / 2, y: y - 12, flip: side === 'R' });
        leafCum.push(cum + curveLen * 0.5);
        cum += curveLen;
        cx = to;
        cy = y + 50;
        side = side === 'L' ? 'R' : 'L';
      }

      // Final run: down the gutter beside the last section, hook inward, perch.
      const lastY = stops[stops.length - 1];
      const fromX = side === 'L' ? xL : xR;
      const hook = side === 'L' ? fromX + 46 : fromX - 46;
      const perchY = Math.min(h - 80, lastY + 340);
      const tailLen = Math.max(0, lastY + 10 - cy) + 340;
      d += ` L ${fromX} ${lastY + 10} C ${fromX} ${perchY - 40}, ${hook} ${perchY - 80}, ${hook} ${perchY - 30}`;
      cum += tailLen;

      const total = cum || 1;
      setLeaves(leafPts.map((p, i) => ({ ...p, frac: Math.min(0.95, leafCum[i] / total) })));
      setSeed({ x: xL, y: y0 });
      setBirds({ x: hook, y: perchY - 30, onDark: true });
      perchPageY.current = top + perchY;
      setSize({ w: vw, h });
      setPath(d);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        if (reduced.current) {
          setProgress(1);
          setBirdsIn(true);
          return;
        }
        const host = document.getElementById('mm-vine-host');
        if (!host) return;
        const r = host.getBoundingClientRect();
        const total = r.height - window.innerHeight * 0.4;
        const seen = Math.min(Math.max(-r.top + window.innerHeight * 1.05, 0), total);
        setProgress(total > 0 ? seen / total : 1);
        setBirdsIn(window.scrollY + window.innerHeight * 0.92 > perchPageY.current);
      });
    };

    build();
    onScroll();
    const settle = window.setTimeout(build, 1500);
    window.addEventListener('load', build);
    window.addEventListener('resize', build);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('load', build);
      window.removeEventListener('resize', build);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  if (!path) return null;
  const off = 1 - Math.min(1, Math.max(0, progress));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden xl:block" style={{ overflow: 'hidden' }}>
      <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} className="absolute inset-0">
        {/* the planted seed the vine grows from */}
        {seed && (
          <g transform={`translate(${seed.x}, ${seed.y})`}>
            <path d="M -16 6 Q 0 -6 16 6 L 12 14 Q 0 20 -12 14 Z" fill="#161616" stroke="#FBF6EA" strokeWidth="2" />
            <ellipse cx="0" cy="0" rx="7" ry="9" fill="#F5B700" stroke="#161616" strokeWidth="2.5" />
            <path d="M 0 -8 Q 3 -14 8 -15" fill="none" stroke="#161616" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
        {/* the vine: ink casing, gold core, bright highlight (family with the cable) */}
        <path d={path} pathLength={1} fill="none" stroke="#161616" strokeWidth="10" strokeLinecap="round"
          strokeDasharray="1" strokeDashoffset={off} />
        <path d={path} pathLength={1} fill="none" stroke="#F5B700" strokeWidth="6" strokeLinecap="round"
          strokeDasharray="1" strokeDashoffset={off} />
        <path d={path} pathLength={1} fill="none" stroke="#FFDD55" strokeWidth="1.8" strokeLinecap="round"
          strokeDasharray="1" strokeDashoffset={off} opacity=".8" />
        {/* leaf pairs unfurl as the vine reaches them */}
        {leaves.map((l, i) => (
          <g key={i} transform={`translate(${l.x}, ${l.y})${l.flip ? ' scale(-1,1)' : ''}`}>
            <g
              style={{
                opacity: progress >= l.frac ? 1 : 0,
                transform: `scale(${progress >= l.frac ? 1 : 0})`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
                transition: 'opacity .35s ease, transform .45s cubic-bezier(.2,.8,.3,1.4)',
              }}
            >
              <path d="M 2 -2 Q 10 -22 30 -22 Q 26 -4 8 0 Z" fill="#F5B700" stroke="#161616" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M 2 2 Q 14 16 32 12 Q 22 26 6 8 Z" fill="#FFDD55" stroke="#161616" strokeWidth="2.5" strokeLinejoin="round" />
            </g>
          </g>
        ))}
        {/* the payoff: two birds perch on the branch (Matthew 13:32) */}
        {birds && birdsIn && (
          <g transform={`translate(${birds.x}, ${birds.y})`}>
            {/* branch stub */}
            <path d="M -26 0 L 26 0" stroke="#161616" strokeWidth="7" strokeLinecap="round" />
            <path d="M -26 0 L 26 0" stroke="#F5B700" strokeWidth="3.5" strokeLinecap="round" />
            {/* left bird, facing right */}
            <g transform="translate(-12, -12)">
              <ellipse cx="0" cy="0" rx="9" ry="7.5" fill="#F5B700" stroke="#FBF6EA" strokeWidth="2" />
              <circle cx="8" cy="-6" r="5" fill="#F5B700" stroke="#FBF6EA" strokeWidth="2" />
              <path d="M 12.5 -6.5 L 18 -5 L 12.5 -3.5 Z" fill="#E0301E" />
              <circle cx="9" cy="-7" r="1.3" fill="#161616" />
              <path d="M -3 7 L -3 11 M 3 7 L 3 11" stroke="#FBF6EA" strokeWidth="1.8" strokeLinecap="round" />
            </g>
            {/* right bird, facing left, a little smaller */}
            <g transform="translate(14, -10) scale(-0.85, 0.85)">
              <ellipse cx="0" cy="0" rx="9" ry="7.5" fill="#FFDD55" stroke="#FBF6EA" strokeWidth="2" />
              <circle cx="8" cy="-6" r="5" fill="#FFDD55" stroke="#FBF6EA" strokeWidth="2" />
              <path d="M 12.5 -6.5 L 18 -5 L 12.5 -3.5 Z" fill="#E0301E" />
              <circle cx="9" cy="-7" r="1.3" fill="#161616" />
              <path d="M -3 7 L -3 10.5 M 3 7 L 3 10.5" stroke="#FBF6EA" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
