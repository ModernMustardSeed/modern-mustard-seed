'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Shared kit for the Acquisition machine. Same neo-brutalist grammar as the rest
 * of the admin (2px ink borders, hard offset shadows, Oswald headings) but on
 * the pop palette rather than the outbound cockpit's brass, because this screen
 * is about ONE number moving: 50 clients.
 */

export const INK = '#161616';
export const MUSTARD = '#F5B700';
export const RED = '#E0301E';
export const CREAM = '#FBF6EA';
export const PAPER = '#FFFDF8';
export const SEED = '#3f5d34';

export const card = 'bg-[#FFFDF8] border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616]';
export const cardFlat = 'bg-[#FFFDF8] border-2 border-[#161616] rounded-xl';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-4 py-2.5 font-oswald font-semibold uppercase tracking-[0.08em] text-sm shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#161616] active:translate-y-0 transition-all disabled:opacity-40 disabled:pointer-events-none';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 bg-[#FFFDF8] text-[#161616] border-2 border-[#161616] rounded-xl px-4 py-2.5 font-oswald font-medium uppercase tracking-[0.08em] text-sm shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#161616] active:translate-y-0 transition-all disabled:opacity-40 disabled:pointer-events-none';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 bg-[#FFFDF8] text-[#E0301E] border-2 border-[#E0301E] rounded-xl px-4 py-2.5 font-oswald font-semibold uppercase tracking-[0.08em] text-sm shadow-[3px_3px_0_0_#E0301E] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none';
export const inputCls =
  'w-full bg-white border-2 border-[#161616]/25 focus:border-[#F5B700] rounded-xl px-3.5 py-2.5 font-sans text-sm text-[#161616] outline-none transition-colors placeholder:text-[#161616]/65';
export const labelCls = 'block text-[10px] uppercase tracking-[0.22em] font-oswald font-medium text-[#161616]/60 mb-1.5';
export const eyebrow = 'text-[10px] uppercase tracking-[0.3em] font-oswald font-semibold text-[#E0301E]';

/* ---------------------------------- data ---------------------------------- */

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

export function usd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

export function pct(v: number | null | undefined): string {
  return v == null ? '—' : `${v}%`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

/** Numbers that matter should land, not appear. */
export function useCountUp(target: number, ms = 700): number {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) ** 3;
      setV(Math.round(a + (target - a) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/* ----------------------------------- nav ---------------------------------- */

export type AcqTab = 'factory' | 'command' | 'prospects' | 'finder' | 'campaign' | 'mustard' | 'calls' | 'sender' | 'intelligence' | 'settings';

const TABS: { key: AcqTab; href: string; label: string }[] = [
  { key: 'factory', href: '/admin/acquisition', label: 'Client Factory' },
  { key: 'command', href: '/admin/acquisition/command', label: 'Command Center' },
  { key: 'prospects', href: '/admin/acquisition/prospects', label: 'Prospects' },
  { key: 'finder', href: '/admin/acquisition/lead-finder', label: 'Lead Finder' },
  { key: 'campaign', href: '/admin/acquisition/campaign', label: 'Campaign' },
  { key: 'mustard', href: '/admin/acquisition/mustard', label: '/mustard' },
  { key: 'calls', href: '/admin/acquisition/calls', label: 'Calls' },
  { key: 'sender', href: '/admin/acquisition/sender-health', label: 'Sender Health' },
  { key: 'intelligence', href: '/admin/acquisition/intelligence', label: 'Intelligence' },
  { key: 'settings', href: '/admin/acquisition/settings', label: 'Settings' },
];

export function AcqNav({ active, right, badge }: { active: AcqTab; right?: React.ReactNode; badge?: Partial<Record<AcqTab, number>> }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const n = badge?.[t.key] ?? 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-2 rounded-xl border-2 font-oswald font-semibold uppercase tracking-[0.1em] text-xs transition-all ${
                active === t.key
                  ? 'bg-[#161616] text-[#FBF6EA] border-[#161616] shadow-[3px_3px_0_0_#F5B700]'
                  : 'bg-transparent text-[#161616]/60 border-[#161616]/20 hover:border-[#161616] hover:text-[#161616]'
              }`}
            >
              {t.label}
              {n > 0 && <span className="ml-1.5 tabular-nums text-[#E0301E]">{n}</span>}
            </Link>
          );
        })}
      </div>
      {right}
    </div>
  );
}

/* --------------------------------- pieces --------------------------------- */

export function Stat({
  label,
  value,
  sub,
  tone = 'ink',
  big = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'ink' | 'mustard' | 'red' | 'seed' | 'warn';
  big?: boolean;
}) {
  const color =
    tone === 'mustard' || tone === 'warn'
      ? 'text-[#8a6a1f]'
      : tone === 'red'
        ? 'text-[#E0301E]'
        : tone === 'seed'
          ? 'text-[#3f5d34]'
          : 'text-[#161616]';
  return (
    <div className={`${cardFlat} p-4`}>
      <p className="text-[9px] uppercase tracking-[0.2em] font-oswald font-semibold text-[#161616]/60">{label}</p>
      <p className={`mt-1 font-oswald font-bold tabular-nums leading-none ${big ? 'text-4xl' : 'text-2xl'} ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-[#161616]/65 leading-snug">{sub}</p>}
    </div>
  );
}

export function Section({ title, note, right, children }: { title: string; note?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${card} p-5 md:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-oswald text-lg font-bold uppercase tracking-[0.06em] text-[#161616]">{title}</h2>
          {note && <p className="mt-0.5 text-xs text-[#161616]/65 max-w-2xl leading-snug">{note}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Chip({ label, tone = 'neutral', title }: { label: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'hot'; title?: string }) {
  const cls =
    tone === 'good'
      ? 'bg-[#3f5d34]/15 text-[#2c4225] border-[#3f5d34]/40'
      : tone === 'warn'
        ? 'bg-[#F5B700]/25 text-[#7a5c00] border-[#F5B700]'
        : tone === 'bad'
          ? 'bg-[#E0301E]/12 text-[#a32315] border-[#E0301E]/40'
          : tone === 'hot'
            ? 'bg-[#E0301E] text-white border-[#161616]'
            : 'bg-[#161616]/[0.06] text-[#161616]/70 border-[#161616]/20';
  return (
    <span title={title} className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

/** The 50-client dial. The one number the whole machine exists to move. */
export function GoalDial({ clients, goal, mrrCents, setupCents, goalMrrCents, goalSetupCents }: {
  clients: number;
  goal: number;
  mrrCents: number;
  setupCents: number;
  goalMrrCents: number;
  goalSetupCents: number;
}) {
  const shown = useCountUp(clients);
  const frac = goal > 0 ? Math.min(1, clients / goal) : 0;
  const R = 62;
  const C = 2 * Math.PI * R;
  return (
    <div className={`${card} p-6 flex flex-col sm:flex-row items-center gap-6`}>
      <div className="relative shrink-0">
        <svg width="152" height="152" viewBox="0 0 152 152" aria-hidden="true">
          <circle cx="76" cy="76" r={R} fill="none" stroke="#161616" strokeOpacity="0.12" strokeWidth="14" />
          <circle
            cx="76"
            cy="76"
            r={R}
            fill="none"
            stroke="#F5B700"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            transform="rotate(-90 76 76)"
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-oswald text-4xl font-bold tabular-nums leading-none text-[#161616]">{shown}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/60">of {goal}</span>
        </div>
      </div>
      <div className="min-w-0 text-center sm:text-left">
        <p className={eyebrow}>The 50 client sprint</p>
        <h2 className="mt-1 font-oswald text-2xl font-bold uppercase tracking-tight text-[#161616]">
          {clients} of {goal} clients
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] font-oswald text-[#161616]/60">New MRR</dt>
            <dd className="font-oswald text-lg font-bold tabular-nums">{usd(mrrCents)} <span className="text-[#161616]/60 text-sm font-medium">/ {usd(goalMrrCents)}</span></dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] font-oswald text-[#161616]/60">Setup revenue</dt>
            <dd className="font-oswald text-lg font-bold tabular-nums">{usd(setupCents)} <span className="text-[#161616]/60 text-sm font-medium">/ {usd(goalSetupCents)}</span></dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/** The funnel, drawn as bars so a collapsing stage is visible at a glance. */
export function Funnel({ steps }: { steps: { stage: string; label: string; count: number; fromPrevious: number | null; fromTop: number | null }[] }) {
  const top = steps[0]?.count || 1;
  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => {
        const width = Math.max(2, (s.count / top) * 100);
        const dropping = s.fromPrevious != null && s.fromPrevious < 25 && i > 0 && steps[i - 1].count >= 20;
        return (
          <li key={s.stage} className="relative">
            <div className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-right">
                <span className="font-oswald text-[11px] uppercase tracking-[0.1em] text-[#161616]/70">{s.label}</span>
              </div>
              <div className="flex-1 min-w-0 h-8 bg-[#161616]/[0.05] rounded-md border border-[#161616]/10 overflow-hidden">
                <div
                  className={`h-full flex items-center px-2 ${i === steps.length - 1 ? 'bg-[#3f5d34]' : 'bg-[#F5B700]'}`}
                  style={{ width: `${width}%`, transition: 'width 800ms cubic-bezier(.2,.8,.2,1)' }}
                >
                  <span className={`font-oswald text-xs font-bold tabular-nums ${i === steps.length - 1 ? 'text-white' : 'text-[#161616]'}`}>
                    {s.count.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-24 shrink-0 text-[11px] font-mono tabular-nums text-[#161616]/65">
                {i === 0 ? '—' : (
                  <span className={dropping ? 'text-[#E0301E] font-bold' : ''}>{pct(s.fromPrevious)}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
