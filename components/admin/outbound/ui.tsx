'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared UI kit for the Outbound Revenue Rescue Cockpit. Its own sub-brand
 * inside the admin: Oswald headings, DM Sans body, ink #1a1815, brass gold
 * #b58a2a, seed green #3f5d34, cream #f7f3e9. Same neo-brutalist structure
 * as the rest of the admin (2px ink borders, hard offset shadows).
 */

export const INK = '#1a1815';
export const GOLD = '#b58a2a';
export const SEED = '#3f5d34';
export const CREAM = '#f7f3e9';
export const PAPER = '#fffdf8';
export const BRICK = '#a03123';

// Static class strings only: Tailwind's scanner reads source as text, so
// interpolated class names would never make it into the CSS build.
export const card = 'bg-[#fffdf8] border-2 border-[#1a1815] rounded-2xl shadow-[5px_5px_0_0_#1a1815]';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 bg-[#b58a2a] text-[#1a1815] border-2 border-[#1a1815] rounded-xl px-4 py-2.5 font-oswald font-semibold uppercase tracking-[0.08em] text-sm shadow-[3px_3px_0_0_#1a1815] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#1a1815] active:translate-y-0 active:shadow-[2px_2px_0_0_#1a1815] transition-all disabled:opacity-40 disabled:pointer-events-none';
export const btnSeed =
  'inline-flex items-center justify-center gap-2 bg-[#3f5d34] text-[#f7f3e9] border-2 border-[#1a1815] rounded-xl px-4 py-2.5 font-oswald font-semibold uppercase tracking-[0.08em] text-sm shadow-[3px_3px_0_0_#1a1815] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#1a1815] active:translate-y-0 transition-all disabled:opacity-40 disabled:pointer-events-none';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 bg-[#fffdf8] text-[#1a1815] border-2 border-[#1a1815] rounded-xl px-4 py-2.5 font-oswald font-medium uppercase tracking-[0.08em] text-sm shadow-[3px_3px_0_0_#1a1815] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#1a1815] active:translate-y-0 transition-all disabled:opacity-40 disabled:pointer-events-none';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 bg-[#fffdf8] text-[#a03123] border-2 border-[#a03123] rounded-xl px-4 py-2.5 font-oswald font-medium uppercase tracking-[0.08em] text-sm shadow-[3px_3px_0_0_#a03123] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none';
export const inputCls =
  'w-full bg-white border-2 border-[#1a1815]/25 focus:border-[#b58a2a] rounded-xl px-3.5 py-2.5 font-sans text-sm text-[#1a1815] outline-none transition-colors placeholder:text-[#1a1815]/35';
export const labelCls = 'block text-[10px] uppercase tracking-[0.22em] font-oswald font-medium text-[#1a1815]/60 mb-1.5';
export const eyebrow = 'text-[10px] uppercase tracking-[0.3em] font-oswald font-semibold text-[#b58a2a]';

/* ---------------------------------- nav ---------------------------------- */

const SUB_TABS = [
  { href: '/admin/outbound', label: 'Dashboard' },
  { href: '/admin/outbound/leads', label: 'Leads' },
  { href: '/admin/outbound/pilots', label: 'Pilots' },
] as const;

export function OutboundNav({ active, right }: { active: 'dashboard' | 'leads' | 'pilots' | 'call'; right?: React.ReactNode }) {
  const key = (href: string) => (href.endsWith('/leads') ? 'leads' : href.endsWith('/pilots') ? 'pilots' : 'dashboard');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-2">
        {SUB_TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 rounded-xl border-2 font-oswald font-semibold uppercase tracking-[0.1em] text-xs transition-all ${
              active === key(t.href)
                ? 'bg-[#1a1815] text-[#f7f3e9] border-[#1a1815] shadow-[3px_3px_0_0_#b58a2a]'
                : 'bg-transparent text-[#1a1815]/60 border-[#1a1815]/20 hover:border-[#1a1815] hover:text-[#1a1815]'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {right}
    </div>
  );
}

/* -------------------------------- goal ring ------------------------------- */

export function GoalRing({
  value,
  goal,
  label,
  size = 120,
}: {
  value: number;
  goal: number;
  label: string;
  size?: number;
}) {
  const met = goal > 0 && value >= goal;
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const stroke = Math.round(size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = met ? SEED : GOLD;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1815" strokeOpacity={0.09} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1), stroke 400ms' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-oswald font-semibold leading-none text-[#1a1815]" style={{ fontSize: size / 3.6 }}>
            {value}
          </span>
          <span className="font-oswald text-[#1a1815]/45 leading-none mt-0.5" style={{ fontSize: size / 8 }}>
            / {goal}
          </span>
        </div>
        {met && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#3f5d34] border-2 border-[#1a1815] text-[#f7f3e9] text-xs flex items-center justify-center font-bold">
            ✓
          </span>
        )}
      </div>
      <span className={`text-[10px] uppercase tracking-[0.22em] font-oswald font-medium ${met ? 'text-[#3f5d34]' : 'text-[#1a1815]/55'}`}>
        {label}
      </span>
    </div>
  );
}

/* --------------------------------- toasts --------------------------------- */

export type Toast = { id: number; text: string; tone: 'ok' | 'error' };
let toastSeq = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = toastSeq++;
    setToasts((t) => [...t, { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 5200 : 2800);
  }, []);
  return { toasts, push };
}

export function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[140] flex flex-col items-center gap-2 px-4 w-full max-w-md pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto w-full text-center px-4 py-3 rounded-xl border-2 border-[#1a1815] font-sans text-sm font-medium shadow-[4px_4px_0_0_#1a1815] animate-pop-in ${
            t.tone === 'error' ? 'bg-[#a03123] text-[#f7f3e9]' : 'bg-[#3f5d34] text-[#f7f3e9]'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- count-up -------------------------------- */

/** Animates toward `target` so big numbers roll like an odometer. */
export function useCountUp(target: number, ms = 500): number {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  const raf = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      setShown(v);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);
  return shown;
}

/* --------------------------------- chips ---------------------------------- */

export function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-[#b58a2a]/15 text-[#7a5c1a] border-[#b58a2a]/50',
    contacted: 'bg-[#1a1815]/[0.06] text-[#1a1815]/70 border-[#1a1815]/25',
    callback: 'bg-[#b58a2a] text-[#1a1815] border-[#1a1815]',
    demo_booked: 'bg-[#3f5d34]/15 text-[#3f5d34] border-[#3f5d34]/50',
    pilot_live: 'bg-[#3f5d34] text-[#f7f3e9] border-[#1a1815]',
    won: 'bg-[#1a1815] text-[#b58a2a] border-[#1a1815]',
    lost: 'bg-transparent text-[#1a1815]/40 border-[#1a1815]/20 line-through',
    dnc: 'bg-[#a03123]/10 text-[#a03123] border-[#a03123]/50',
  };
  const labels: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    callback: 'Callback',
    demo_booked: 'Demo booked',
    pilot_live: 'Pilot live',
    won: 'Won',
    lost: 'Lost',
    dnc: 'DNC',
  };
  return (
    <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-lg border text-[10px] uppercase tracking-[0.14em] font-oswald font-semibold ${styles[status] ?? styles.contacted}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function NicheChip({ niche }: { niche: string }) {
  const labels: Record<string, string> = {
    home_service: 'Home service',
    dental_medspa: 'Dental / medspa',
    real_estate: 'Real estate',
    restaurant: 'Restaurant',
    other: 'Other',
  };
  return (
    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md bg-[#1a1815]/[0.05] border border-[#1a1815]/15 text-[10px] uppercase tracking-[0.12em] font-oswald text-[#1a1815]/60">
      {labels[niche] ?? niche}
    </span>
  );
}

/* ------------------------------ dial session ------------------------------ */

export type DialSession = { startedAt: number; dials: number; demos: number };
const SESSION_KEY = 'mms_outbound_session';

export function getDialSession(): DialSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as DialSession;
    return typeof s.startedAt === 'number' ? s : null;
  } catch {
    return null;
  }
}

export function setDialSession(s: DialSession | null): void {
  if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else window.localStorage.removeItem(SESSION_KEY);
}

export function bumpDialSession(kind: 'dial' | 'demo'): DialSession | null {
  const s = getDialSession();
  if (!s) return null;
  const next = { ...s, dials: s.dials + 1, demos: s.demos + (kind === 'demo' ? 1 : 0) };
  setDialSession(next);
  return next;
}

/* -------------------------------- heat chip -------------------------------- */

export function HeatChip({ reason, lastOpenAt, auditScore }: { reason: string; lastOpenAt?: string | null; auditScore?: number | null }) {
  const base = 'inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-[0.12em] font-oswald font-bold';
  if (reason === 'replied') return <span className={`${base} bg-[#3f5d34] text-[#f7f3e9] border-[#1a1815]`}>Replied</span>;
  if (reason === 'watching_now') return <span className={`${base} bg-[#a03123] text-[#f7f3e9] border-[#1a1815] animate-pulse`}>👀 On their demo NOW</span>;
  if (reason === 'reading_now') return <span className={`${base} bg-[#a03123] text-[#f7f3e9] border-[#1a1815] animate-pulse`}>🔥 Reading your audit NOW</span>;
  if (reason === 'self_serve') return <span className={`${base} bg-[#b58a2a] text-[#1a1815] border-[#1a1815] animate-pulse`}>⚡ Forged their own demos</span>;
  if (reason === 'partner_forge') return <span className={`${base} bg-[#b58a2a] text-[#1a1815] border-[#1a1815] animate-pulse`}>🤝 Partner-minted intro</span>;
  if (reason === 'rep_forge') return <span className={`${base} bg-[#b58a2a]/20 text-[#7a5c1a] border-[#b58a2a]/60`}>⚒ Pre-forged suite</span>;
  if (reason === 'opened_recently') {
    const hrs = lastOpenAt ? Math.max(1, Math.round((Date.now() - new Date(lastOpenAt).getTime()) / 3600000)) : null;
    return <span className={`${base} bg-[#b58a2a]/20 text-[#7a5c1a] border-[#b58a2a]/60`}>Opened {hrs ? `${hrs}h ago` : 'recently'}</span>;
  }
  if (reason === 'callback_due') return <span className={`${base} bg-[#b58a2a] text-[#1a1815] border-[#1a1815]`}>Callback due</span>;
  if (reason === 'retry_due') return <span className={`${base} bg-transparent text-[#7a5c1a] border-[#b58a2a]/60`}>Retry due</span>;
  if (reason === 'worst_audit') return <span className={`${base} bg-[#a03123]/10 text-[#a03123] border-[#a03123]/50`}>Audit {auditScore ?? '?'}/100</span>;
  if (reason === 'review_pain') return <span className={`${base} bg-[#a03123]/10 text-[#a03123] border-[#a03123]/50`}>★ Customers can&apos;t reach them</span>;
  if (reason === 'no_website') return <span className={`${base} bg-[#b58a2a]/20 text-[#7a5c1a] border-[#b58a2a]/60`}>◎ No real website</span>;
  return <span className={`${base} bg-[#1a1815]/[0.05] text-[#1a1815]/50 border-[#1a1815]/20`}>Fresh</span>;
}

/* -------------------------------- seed burst ------------------------------- */

/** One-shot celebration when a demo lands. Render with a changing key. */
export function SeedBurst() {
  const seeds = [0, 1, 2, 3, 4, 5, 6];
  return (
    <div className="pointer-events-none fixed inset-0 z-[160] flex items-center justify-center" aria-hidden>
      <style>{`
        @keyframes mms-seed-pop {
          0% { transform: translate(0, 0) scale(0.4); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1.3); opacity: 0; }
        }
      `}</style>
      {seeds.map((i) => (
        <span
          key={i}
          className="absolute text-4xl"
          style={{
            animation: 'mms-seed-pop 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            animationDelay: `${i * 60}ms`,
            ['--dx' as never]: `${Math.cos((i / seeds.length) * Math.PI * 2) * 160}px`,
            ['--dy' as never]: `${Math.sin((i / seeds.length) * Math.PI * 2) * 120 - 60}px`,
          }}
        >
          {i % 2 === 0 ? '🌱' : '✨'}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------- fetch ---------------------------------- */

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}
