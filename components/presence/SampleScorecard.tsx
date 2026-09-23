'use client';

import { useEffect, useRef, useState } from 'react';
import { SAMPLE } from '@/data/presence-audit-page';

/**
 * WHAT YOU GET, shown rather than described.
 *
 * A sample of the real report page (/demo/audit/<id>): the overall score, three
 * dials, a slice of the profile checks, and the first fix. The dials count up
 * once when the card scrolls into view. With reduced motion they simply read
 * their final numbers, and before hydration they render final too, so the card
 * is never empty for a crawler, a screenshot or a slow phone.
 *
 * The business is invented and the card says SAMPLE in two places.
 */

const COLOR = (s: number) => (s >= 80 ? '#1E7A3C' : s >= 60 ? '#B87503' : '#C4160B');

type Phase = 'static' | 'armed' | 'run';

function useCountUp(target: number, phase: Phase, ms = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (phase !== 'run') return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, phase, ms]);
  return phase === 'static' ? target : phase === 'armed' ? 0 : v;
}

function Dial({ p, phase, delay }: { p: (typeof SAMPLE.pillars)[number]; phase: Phase; delay: number }) {
  // Each dial starts a beat after the last, so the three land in sequence.
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (phase !== 'run') return;
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [phase, delay]);
  const mine: Phase = phase === 'run' && !started ? 'armed' : phase;
  const v = useCountUp(p.score, mine);
  const color = COLOR(p.score);
  return (
    <div className="min-w-0 rounded-2xl border-2 border-[#161616] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#161616]/55">{p.label}</span>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-[#161616]/40">{p.weight}%</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl font-black leading-none tabular-nums" style={{ color }}>
          {v}
        </span>
        <span className="rounded-md border-2 border-[#161616] px-1.5 py-0.5 font-mono text-[11px] font-bold text-white" style={{ background: color }}>
          {p.letter}
        </span>
      </div>
      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full border-2 border-[#161616] bg-[#FBF6EA]">
        <div
          className="h-full rounded-full transition-[width] duration-[1300ms] ease-out motion-reduce:transition-none"
          style={{ width: `${mine === 'armed' ? 0 : p.score}%`, background: color }}
        />
      </div>
      <p className="mt-2.5 font-body text-[12px] leading-snug text-[#3A3733]">{p.note}</p>
    </div>
  );
}

export default function SampleScorecard() {
  const ref = useRef<HTMLDivElement>(null);
  // 'static' until hydrated, so server HTML carries the real numbers. Armed
  // (zeroed) only when the card is still below the fold, so nobody watches a
  // visible 64 drop to zero. Then it runs once, on sight.
  const [phase, setPhase] = useState<Phase>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.8) return;
    setPhase('armed');
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase('run');
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const overall = useCountUp(SAMPLE.overall, phase, 1600);

  return (
    <div ref={ref} className="relative">
      <span className="absolute -top-4 left-6 z-10 rotate-[-4deg] rounded-full border-2 border-[#161616] bg-[#161616] px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-white shadow-[3px_3px_0_0_#161616]">
        Sample report
      </span>
      <div className="rounded-3xl border-2 border-[#161616] bg-[#FFFDF6] p-5 shadow-[8px_8px_0_0_#161616] md:p-7">
        {/* the headline number */}
        <div className="rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-5 md:p-6">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-[#161616]/70">
            Online Presence Audit · {SAMPLE.business}
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
            <span className="font-display text-7xl font-black leading-[0.85] tabular-nums text-[#161616] md:text-8xl">{overall}</span>
            <span className="mb-1.5 font-mono text-sm font-bold text-[#161616]/60">/ 100</span>
            <span className="mb-1 rounded-lg border-2 border-[#161616] bg-[#161616] px-3 py-1 font-display text-2xl font-black italic text-[#F5B700]">
              {SAMPLE.letter}
            </span>
          </div>
          <p className="mt-3 font-display text-xl font-bold italic leading-snug text-[#161616] md:text-2xl">&ldquo;{SAMPLE.headline}&rdquo;</p>
        </div>

        {/* three dials */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {SAMPLE.pillars.map((p, i) => (
            <Dial key={p.label} p={p} phase={phase} delay={250 + i * 220} />
          ))}
        </div>

        {/* a slice of the checks, and the first fix */}
        <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_1fr]">
          <ul className="rounded-2xl border-2 border-[#161616] bg-white p-4">
            <li className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#E0301E]">Google profile · 4 of 8 checks</li>
            {SAMPLE.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2.5 border-b border-[#161616]/10 py-1.5 last:border-0">
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-[#161616] font-mono text-[10px] font-bold text-white"
                  style={{ background: c.passed ? '#1E7A3C' : '#C4160B' }}
                  aria-label={c.passed ? 'Pass' : 'Missing'}
                >
                  {c.passed ? '✓' : '✕'}
                </span>
                <span className="min-w-0 flex-1 font-body text-[12.5px] leading-snug text-[#161616]">{c.label}</span>
                <span className="shrink-0 font-mono text-[10px] font-bold tabular-nums text-[#161616]/45">{c.pts}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col rounded-2xl border-2 border-[#161616] bg-[#161616] p-4 text-[#FBF6EA]">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#F5B700]">Fix number one</span>
            <p className="mt-2 font-display text-lg font-bold leading-snug">{SAMPLE.fix.title}</p>
            <p className="mt-1.5 flex-1 font-body text-[12.5px] leading-relaxed text-[#FBF6EA]/70">{SAMPLE.fix.why}</p>
            <span className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[#FBF6EA]/40">Free fixes rank first</span>
          </div>
        </div>
      </div>
    </div>
  );
}
