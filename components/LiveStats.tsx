'use client';

import { useEffect, useRef, useState } from 'react';

type Stat = {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  decimals?: number;
};

const STATS: Stat[] = [
  { value: 40, suffix: '+', label: 'Products shipped' },
  { value: 30, label: 'Day build cycle' },
  { value: 100, suffix: '%', label: 'You own it' },
  { value: 65, suffix: '+', label: 'Industries served' },
];

function useCountUp(target: number, durationMs: number, start: boolean, decimals = 0): string {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);
  return value.toFixed(decimals);
}

function StatCard({ stat, active }: { stat: Stat; active: boolean }) {
  const displayed = useCountUp(stat.value, 1600, active, stat.decimals ?? 0);
  return (
    <div className="text-center">
      <div className="font-display text-4xl md:text-6xl font-black text-[#FFD23F] tracking-tight tabular-nums">
        {stat.prefix}{displayed}{stat.suffix}
      </div>
      <div className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-white/85 font-mono font-bold mt-3">
        {stat.label}
      </div>
    </div>
  );
}

export default function LiveStats() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-16 bg-[#1E50C8] border-y-[3px] border-[#161616]">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 max-w-6xl mx-auto">
        {STATS.map((s) => (
          <StatCard key={s.label} stat={s} active={active} />
        ))}
      </div>
    </section>
  );
}
