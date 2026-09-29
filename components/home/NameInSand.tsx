'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from '@/components/AttributionLink';
import s from './NameInSand.module.css';

/**
 * Write your name in the sand. A visitor types their business name, a wave
 * washes the old words away, and the same invisible finger from the hero
 * writes theirs. The button then carries the name into the inquiry form
 * (/inquire?company=...). The glyphs load only when the section comes near.
 */

type Glyphs = Record<string, { w: number; s: string[] }>;
const START = 'Your business';
const MAX = 32;
const LINE_CHARS = 16;
const CAP = 100;
const PITCH = 150;

/** Break on spaces into at most two lines of about LINE_CHARS each. */
function wrap(text: string): string[] {
  if (text.length <= LINE_CHARS) return [text];
  const words = text.split(' ');
  let best = [text];
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const score = Math.max(a.length, b.length);
    if (score < bestScore) { bestScore = score; best = [a, b]; }
  }
  return best;
}

function layout(text: string, g: Glyphs) {
  const lines = wrap(text);
  const set = lines.map((line) => {
    let x = 0;
    const glyphs: { x: number; s: string[] }[] = [];
    for (const ch of line) {
      const gl = g[ch] ?? g['?'];
      glyphs.push({ x, s: gl.s });
      x += gl.w;
    }
    return { width: x, glyphs };
  });
  const width = Math.max(1, ...set.map((l) => l.width));
  const paths: { d: string; x: number; y: number }[] = [];
  set.forEach((l, li) => {
    const dx = (width - l.width) / 2;
    for (const gl of l.glyphs) for (const d of gl.s) paths.push({ d, x: dx + gl.x, y: li * PITCH });
  });
  const h = (lines.length - 1) * PITCH + CAP + 40;
  return { paths, viewBox: `-20 -20 ${width + 40} ${h}` };
}

export default function NameInSand() {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [glyphs, setGlyphs] = useState<Glyphs | null>(null);
  const [draft, setDraft] = useState('');
  const [shown, setShown] = useState(START);
  const [washing, setWashing] = useState(false);
  const [said, setSaid] = useState('');
  const still = useRef(false);
  const writeFrame = useRef(0);

  // Load the glyphs when the section is within a screen of view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    still.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        import('./sandGlyphs').then((m) => setGlyphs(m.SAND_GLYPHS));
      }
    }, { rootMargin: '100% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const drawn = useMemo(() => (glyphs ? layout(shown, glyphs) : null), [glyphs, shown]);

  // Measure every stroke, give it its share of the line, then write it.
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el || !drawn) return;
    const paths = Array.from(el.querySelectorAll<SVGPathElement>('path'));
    const lens = paths.map((p) => p.getTotalLength());
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    paths.forEach((p, i) => {
      p.style.setProperty('--a', String(acc / total));
      acc += lens[i];
      p.style.setProperty('--b', String(acc / total));
    });
    cancelAnimationFrame(writeFrame.current);
    if (still.current) { el.style.setProperty('--w', '1'); return; }
    const ms = Math.min(3600, 900 + shown.length * 110);
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      el.style.setProperty('--w', (1 - (1 - t) * (1 - t)).toFixed(4));
      if (t < 1) writeFrame.current = requestAnimationFrame(tick);
    };
    el.style.setProperty('--w', '0');
    writeFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(writeFrame.current);
  }, [drawn, shown]);

  // A wave takes the old words; they are swapped while the water covers them.
  const commit = useCallback((next: string) => {
    const text = next.replace(/\s+/g, ' ').trim().slice(0, MAX) || START;
    if (text === shown) return;
    setSaid(text === START ? '' : `Written in the sand: ${text}`);
    if (still.current) { setShown(text); return; }
    setWashing(true);
    window.setTimeout(() => setShown(text), 650);
    window.setTimeout(() => setWashing(false), 1300);
  }, [shown]);

  useEffect(() => {
    const t = window.setTimeout(() => commit(draft), 700);
    return () => window.clearTimeout(t);
  }, [draft, commit]);

  const name = draft.replace(/\s+/g, ' ').trim().slice(0, MAX);
  const href = name ? `/inquire?company=${encodeURIComponent(name)}` : '/inquire';

  return (
    <section ref={root} className={s.section} data-washing={washing ? '1' : '0'} aria-labelledby="sand-name-heading">
      <picture className={s.plate} aria-hidden="true">
        <source type="image/avif" srcSet="/art/sand/day-960.avif 960w, /art/sand/day-1600.avif 1600w" sizes="100vw" />
        <img src="/art/sand/day-1600.webp" alt="" width={1600} height={1067} loading="lazy" decoding="async" />
      </picture>

      <div className={s.head}>
        <p className={s.eyebrow}>Try it</p>
        <h2 id="sand-name-heading">Write your name <em>in the sand.</em></h2>
      </div>

      <div className={s.floor} aria-hidden="true">
        <div className={s.plane}>
          {drawn && (
            <svg ref={svg} className={s.words} viewBox={drawn.viewBox} preserveAspectRatio="xMidYMid meet" focusable="false">
              <g className={s.ink} filter="url(#name-groove)">
                {drawn.paths.map((p, i) => <path key={`${shown}-${i}`} d={p.d} pathLength={1} transform={`translate(${p.x} ${p.y})`} />)}
              </g>
            </svg>
          )}
          <div className={s.wave}><div className={s.water} /><div className={s.foam} /></div>
        </div>
      </div>

      <form className={s.card} onSubmit={(e) => { e.preventDefault(); commit(draft); }}>
        <label htmlFor="sand-name" className={s.label}>Your business name</label>
        <div className={s.row}>
          <input id="sand-name" name="sand-name" className={s.input} type="text" value={draft} maxLength={MAX} autoComplete="organization" placeholder="Flathead Roofing" onChange={(e) => setDraft(e.target.value)} />
          <Link href={href} className={s.cta}><span className={s.ctaText}>{name ? <>Build it for <b>{name}</b></> : 'Build yours'}</span> <span aria-hidden="true">↗</span></Link>
        </div>
        <p className={s.srOnly} aria-live="polite">{said}</p>
      </form>

      <svg className={s.defs} aria-hidden="true" focusable="false">
        <defs>
          <filter id="name-groove" x="-5%" y="-20%" width="110%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3" result="rough" />
            <feOffset in="rough" dy="-1.6" result="up" />
            <feFlood floodColor="#fff4dc" floodOpacity=".75" />
            <feComposite in2="up" operator="in" result="lit" />
            <feOffset in="rough" dy="1.4" result="down" />
            <feFlood floodColor="#0b3b44" floodOpacity=".4" />
            <feComposite in2="down" operator="in" result="shade" />
            <feMerge><feMergeNode in="lit" /><feMergeNode in="shade" /><feMergeNode in="rough" /></feMerge>
          </filter>
        </defs>
      </svg>
    </section>
  );
}
