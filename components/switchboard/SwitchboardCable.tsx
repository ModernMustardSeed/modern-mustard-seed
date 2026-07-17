'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The Patch-Cable Connect: the page's signature moment. One gold patch cable
 * draws itself down the page as you scroll, weaving through the side gutters,
 * crossing the page at each section marked `data-cable-stop`, and ending in a
 * plug at the last stop. Pure decoration painted ABOVE the section backgrounds
 * but BELOW every section's content (the cable sits at z-1; each section's
 * inner container is relative z-2), so text always reads even where the cable
 * crosses it: pointer-events none, aria-hidden, desktop only (>= 1180px),
 * fully drawn for reduced-motion, and absent entirely without JS.
 */
export default function SwitchboardCable() {
  const [path, setPath] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [plug, setPlug] = useState<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const reduced = useRef(false);
  const raf = useRef(0);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const build = () => {
      const host = document.getElementById('sb-cable-host');
      if (!host) return;
      const vw = window.innerWidth;
      if (vw < 1180) {
        setPath(null);
        return;
      }
      const hostRect = host.getBoundingClientRect();
      const top = hostRect.top + window.scrollY;
      const stops = Array.from(document.querySelectorAll<HTMLElement>('[data-cable-stop]'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return r.top + window.scrollY - top;
        })
        .sort((a, b) => a - b);
      if (stops.length < 2) {
        setPath(null);
        return;
      }
      // The two gutters between the viewport edge and the content column.
      const gutter = Math.max(28, (vw - 1120) / 2 - 34);
      const xL = gutter;
      const xR = vw - gutter;
      const h = host.offsetHeight;

      // Start under the hero copy in the left gutter, then serpentine: run down a
      // gutter, swing across the page exactly on a section boundary, repeat. The
      // LAST stop never gets a crossing: the cable stays in its gutter the whole
      // way down and plugs in there, so it can never run over the closing copy.
      let d = `M ${xL} ${Math.max(24, stops[0] - 160)}`;
      let side: 'L' | 'R' = 'L';
      for (let i = 0; i < stops.length - 1; i++) {
        const y = stops[i];
        const from = side === 'L' ? xL : xR;
        const to = side === 'L' ? xR : xL;
        d += ` L ${from} ${y - 90}`;
        // ease across the border line with a lazy S-curve
        d += ` C ${from} ${y - 20}, ${to} ${y - 20}, ${to} ${y + 50}`;
        side = side === 'L' ? 'R' : 'L';
      }
      // Final run: straight down the current gutter, hook slightly inward, plug.
      const lastY = stops[stops.length - 1];
      const fromX = side === 'L' ? xL : xR;
      const hook = side === 'L' ? fromX + 46 : fromX - 46;
      const plugY = Math.min(h - 60, lastY + 120);
      d += ` L ${fromX} ${lastY + 10} C ${fromX} ${plugY - 40}, ${hook} ${plugY - 70}, ${hook} ${plugY - 26}`;

      setSize({ w: vw, h });
      setPlug({ x: hook, y: plugY - 26 });
      setPath(d);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        if (reduced.current) {
          setProgress(1);
          return;
        }
        const host = document.getElementById('sb-cable-host');
        if (!host) return;
        const r = host.getBoundingClientRect();
        const total = r.height - window.innerHeight * 0.4;
        const seen = Math.min(Math.max(-r.top + window.innerHeight * 0.85, 0), total);
        setProgress(total > 0 ? seen / total : 1);
      });
    };

    build();
    onScroll();
    window.addEventListener('resize', build);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
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
        {/* jack the cable leaves from */}
        <circle cx={path.split(' ')[1]} cy={path.split(' ')[2]} r="13" fill="#161616" />
        <circle cx={path.split(' ')[1]} cy={path.split(' ')[2]} r="8" fill="#F5B700" stroke="#161616" strokeWidth="2.5" />
        {/* cable: ink casing, gold core, bright highlight */}
        <path d={path} pathLength={1} fill="none" stroke="#161616" strokeWidth="11" strokeLinecap="round"
          strokeDasharray="1" strokeDashoffset={off} />
        <path d={path} pathLength={1} fill="none" stroke="#F5B700" strokeWidth="6.5" strokeLinecap="round"
          strokeDasharray="1" strokeDashoffset={off} />
        <path d={path} pathLength={1} fill="none" stroke="#FFDD55" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="1" strokeDashoffset={off} opacity=".8" />
        {/* the plug at the end, revealed once the cable is nearly drawn */}
        {plug && progress > 0.96 && (
          <g transform={`translate(${plug.x}, ${plug.y})`}>
            <rect x="-13" y="0" width="26" height="20" rx="4" fill="#161616" />
            <rect x="-9" y="4" width="18" height="12" rx="2" fill="#F5B700" stroke="#161616" strokeWidth="2" />
            <rect x="-6" y="20" width="4" height="9" fill="#161616" />
            <rect x="2" y="20" width="4" height="9" fill="#161616" />
          </g>
        )}
      </svg>
    </div>
  );
}
