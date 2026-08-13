'use client';

import type { ReactNode } from 'react';

/**
 * Shared primitives for the Client Factory screens.
 *
 * One place for the card, the stat, the badge and the band colours, so four
 * screens read as one product rather than four. Matches the admin shell: 2px
 * ink borders, hard offset shadows, mustard for the live state, mono for
 * labels.
 */

export const INK = '#161616';
export const MUSTARD = '#F5B700';
export const RED = '#E0301E';

export function Card({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border-2 border-[#161616] bg-white rounded-xl shadow-[3px_3px_0_0_#161616] ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b-2 border-[#161616] px-4 py-2.5">
          {title && <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-[#161616]">{title}</h2>}
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone = 'ink' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ink' | 'good' | 'warn' | 'bad' | 'muted' }) {
  const color =
    tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-[#E0301E]' : tone === 'muted' ? 'text-[#161616]/45' : 'text-[#161616]';
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50">{label}</div>
      <div className={`font-sans text-2xl font-bold tracking-tight tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-xs text-[#161616]/55 mt-0.5">{sub}</div>}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-900 border-emerald-800',
  testing: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  test: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  draft: 'bg-[#161616]/[0.06] text-[#161616]/70 border-[#161616]/40',
  forging: 'bg-[#161616]/[0.06] text-[#161616]/70 border-[#161616]/40',
  review: 'bg-sky-100 text-sky-900 border-sky-800',
  paused: 'bg-[#E0301E]/10 text-[#E0301E] border-[#E0301E]',
  archived: 'bg-[#161616]/[0.06] text-[#161616]/45 border-[#161616]/25',
  critical: 'bg-[#E0301E] text-white border-[#161616]',
  attention: 'bg-amber-200 text-amber-950 border-amber-800',
  healthy: 'bg-emerald-100 text-emerald-900 border-emerald-800',
  growth: 'bg-emerald-600 text-white border-[#161616]',
  new: 'bg-sky-100 text-sky-900 border-sky-800',
  pass: 'bg-emerald-100 text-emerald-900 border-emerald-800',
  warn: 'bg-amber-200 text-amber-950 border-amber-800',
  fail: 'bg-[#E0301E] text-white border-[#161616]',
  stable: 'bg-emerald-100 text-emerald-900 border-emerald-800',
  beta: 'bg-sky-100 text-sky-900 border-sky-800',
  internal: 'bg-[#161616]/[0.06] text-[#161616]/70 border-[#161616]/40',
  deprecated: 'bg-[#161616]/[0.06] text-[#161616]/45 border-[#161616]/25',
  proposed: 'bg-violet-100 text-violet-900 border-violet-800',
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const cls = BADGE_TONES[tone ?? ''] ?? 'bg-[#161616]/[0.06] text-[#161616]/70 border-[#161616]/40';
  return (
    <span className={`inline-block font-mono text-[9px] uppercase tracking-[0.16em] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {children}
    </span>
  );
}

export function Bar({ pct, tone = 'ink' }: { pct: number; tone?: 'ink' | 'good' | 'warn' | 'bad' }) {
  const bg = tone === 'good' ? 'bg-emerald-600' : tone === 'warn' ? 'bg-amber-500' : tone === 'bad' ? 'bg-[#E0301E]' : 'bg-[#161616]';
  return (
    <div className="h-2 w-full rounded-full bg-[#161616]/10 overflow-hidden">
      <div className={`h-full ${bg} transition-[width]`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  tone = 'default',
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'ghost';
  type?: 'button' | 'submit';
  className?: string;
}) {
  const base =
    'font-mono text-[10px] uppercase tracking-[0.16em] font-bold px-3 py-2 rounded-lg border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const tones: Record<string, string> = {
    primary: 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] enabled:active:shadow-none enabled:active:translate-x-[2px] enabled:active:translate-y-[2px]',
    danger: 'bg-[#E0301E] text-white border-[#161616] shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616]',
    ghost: 'bg-transparent text-[#161616]/60 border-transparent hover:text-[#161616] hover:bg-[#161616]/[0.05]',
    default: 'bg-white text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616]',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/55 block mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[#161616]/45 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border-2 border-[#161616]/25 bg-white px-3 py-2 text-sm text-[#161616] outline-none focus:border-[#161616] transition-colors';

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[#161616]/45 py-6 text-center">{children}</p>;
}

/** Cents to dollars. Renders an em-dash-free placeholder when the number is genuinely unknown. */
export function money(cents: number | null | undefined, digits = 0): string {
  if (cents === null || cents === undefined) return 'not set';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function pct(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined ? 'not measurable' : `${value.toFixed(digits)}%`;
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}
