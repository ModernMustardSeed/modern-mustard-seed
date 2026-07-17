'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { OsDemoConfig } from '@/lib/outbound-demo';
import type { OsTradePreset } from '@/data/demo-os-trades';
import type { OsTheme } from '@/lib/site-palette';

/**
 * Shared kit for the BUSINESS OS demo modules. The app is one template
 * personalized per lead, so every module reads the same frozen config, trade
 * preset, and derived theme through this context instead of prop-drilling.
 * Hydration law of the whole demo: derived data is DETERMINISTIC (hash, never
 * Math.random), so the server and client always agree.
 */

export type OsTone = 'hot' | 'won' | 'wait';

export type OsKit = {
  osId: string;
  config: OsDemoConfig;
  preset: OsTradePreset;
  theme: OsTheme;
  TONE: Record<OsTone, [string, string]>;
  say: (t: string) => void;
  fireBurst: (x: number, y: number) => void;
};

const Ctx = createContext<OsKit | null>(null);
export const OsProvider = Ctx.Provider;

export function useOs(): OsKit {
  const kit = useContext(Ctx);
  if (!kit) throw new Error('useOs outside OsProvider');
  return kit;
}

/** Stable string hash. Everything derived must be identical on server and
 *  client or React tears the tree down on hydration. Never Math.random. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Count-up that animates FROM its previous value, so a mid-session bump
 *  reads as an odometer tick, not a reset to zero. */
export function useCountUp(target: number, ms = 1600): number {
  const [v, setV] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const val = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      setV(val);
      fromRef.current = val;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function Icon({ d, size = 18, color }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color ?? 'currentColor'} aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** The business's mark: their REAL logo when the forge captured one, the
 *  monogram otherwise. The white chip keeps transparent favicons readable on
 *  a dark deck; onError falls back so a dead URL can never leave a hole. */
export function BizMark({ size = 32, radius = 10 }: { size?: number; radius?: number }) {
  const { config, theme } = useOs();
  const [broken, setBroken] = useState(false);
  if (config.logoUrl && !broken) {
    return (
      <span
        className="shrink-0 flex items-center justify-center border"
        style={{ width: size, height: size, borderRadius: radius, background: '#ffffff', borderColor: theme.line, padding: Math.max(2, Math.round(size * 0.08)) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={config.logoUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </span>
    );
  }
  return (
    <span
      className="shrink-0 flex items-center justify-center font-bold"
      style={{ width: size, height: size, borderRadius: radius, background: theme.accent, color: theme.accentInk, fontSize: size * 0.45 }}
    >
      {config.business.charAt(0)}
    </span>
  );
}

export function SectionTitle({ title, sub }: { title: string; sub: string }) {
  const { theme } = useOs();
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold tracking-tight" style={{ color: theme.text }}>{title}</h2>
      <p className="text-[13px] mt-0.5" style={{ color: theme.dim }}>{sub}</p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  i,
  pulse = false,
  extra,
}: {
  label: string;
  value: string;
  sub: string;
  i: number;
  pulse?: boolean;
  extra?: ReactNode;
}) {
  const { theme } = useOs();
  return (
    <div
      className="rounded-2xl p-4 border animate-[osIn_.5s_ease-out_both] transition-transform hover:-translate-y-0.5"
      style={{ background: theme.panel, borderColor: theme.line, animationDelay: `${i * 90}ms` }}
    >
      <div className="flex items-center gap-2">
        {pulse && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: theme.accent }} />}
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: theme.dim }}>{label}</p>
      </div>
      <p className="font-mono text-2xl sm:text-3xl font-bold mt-1.5" style={{ color: theme.text }}>{value}</p>
      {extra}
      <p className="text-[12px] mt-1" style={{ color: theme.dim }}>{sub}</p>
    </div>
  );
}

/** Fill {biz} / {city} / {job} style tokens the presets use. */
export function interpolate(s: string, config: OsDemoConfig, jobWord: string): string {
  return s
    .replace(/\{biz\}/g, config.business)
    .replace(/\{city\}/g, config.city || 'your town')
    .replace(/\{job\}/g, jobWord)
    .replace(/\{firstName\}/g, 'Dana')
    .replace(/\{street\}/g, 'Maple St');
}
