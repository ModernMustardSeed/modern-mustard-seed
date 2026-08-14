'use client';

import type { ReactNode } from 'react';

/**
 * THE CLIENT FACTORY DESIGN SYSTEM.
 *
 * Pop-art mustard, the house grammar: cream canvas, 2px ink outlines, hard
 * sticker shadows, mustard fills, deep red mono eyebrows. Playfair for display,
 * DM Sans for body, JetBrains Mono for labels and data.
 *
 * CONTRAST IS MEASURED, NOT EYEBALLED. Every text token below carries its
 * measured ratio against the cream canvas #FBF6EA. The old muted grey was ink
 * at 45% opacity, which computes to #94918B and 2.91:1: it failed AA outright
 * and it is why the first pass looked washed. Nothing here reads below 5.3:1.
 *
 *   INK    #161616  16.78:1  headings, primary copy, numbers
 *   INK_2  #3A362D  11.16:1  secondary copy, table cells
 *   INK_3  #5C5850   6.56:1  labels, captions, metadata. The floor for text.
 *   RED    #C4160B   5.62:1  eyebrows and destructive text. The brand's own
 *                            "deep red mono eyebrow", chosen over #E0301E
 *                            (4.22:1) because the lighter one fails on cream.
 *
 * Opacity is used for HAIRLINES ONLY, never for type. A border can be faint;
 * a word cannot.
 */

export const INK = '#161616';
export const INK_2 = '#3A362D';
export const INK_3 = '#5C5850';
export const CREAM = '#FBF6EA';
export const YELLOW = '#F5B700';
export const RED = '#C4160B';
export const RED_POP = '#E0301E';
export const BLUE = '#1E50C8';
export const MIDNIGHT = '#080C16';

/* ─────────────────────────────── layout ──────────────────────────────── */

/**
 * The page canvas. Halftone dots on cream, the comic-print field the rest of
 * the studio sits on, held at a low enough density that data stays legible on
 * top of it.
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <div className="halftone-bg" style={{ backgroundSize: '22px 22px', opacity: 0.5, position: 'fixed', inset: 0, pointerEvents: 'none' }} aria-hidden />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">{children}</main>;
}

/** The red mono eyebrow. The single most recognizable mark in the system. */
export function Eyebrow({ children, tone = 'red' }: { children: ReactNode; tone?: 'red' | 'ink' }) {
  return (
    <span className={`block font-mono text-[10px] font-bold uppercase tracking-[0.3em] ${tone === 'red' ? 'text-[#C4160B]' : 'text-[#5C5850]'}`}>
      {children}
    </span>
  );
}

/**
 * The screen title block. Playfair display, one line, with the eyebrow above
 * and the actions pinned right. Wraps to a stack under 640px rather than
 * squeezing the title, because a truncated Factory name is a Factory nobody
 * can tell apart from another.
 */
export function PageTitle({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#161616] mt-1.5 leading-[1.1]">{title}</h1>
        {sub && <p className="font-body text-[15px] text-[#3A362D] mt-2 max-w-2xl leading-relaxed">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

/* ──────────────────────────────── cards ──────────────────────────────── */

export type CardTone = 'white' | 'cream' | 'yellow' | 'ink';

const CARD_TONE: Record<CardTone, string> = {
  white: 'bg-white text-[#161616]',
  cream: 'bg-[#FFFDF6] text-[#161616]',
  yellow: 'bg-[#F5B700] text-[#161616]',
  ink: 'bg-[#080C16] text-white',
};

/**
 * The pop-card: white fill, 2px ink border, 1rem radius, 5px hard offset
 * shadow. Matches `.pop-card` in globals.css rather than reinventing it a
 * pixel off, so a Factory screen sits beside the rest of the studio without
 * looking like a different product.
 */
export function Card({
  title,
  eyebrow,
  right,
  tone = 'white',
  children,
  className = '',
}: {
  title?: ReactNode;
  eyebrow?: string;
  right?: ReactNode;
  tone?: CardTone;
  children: ReactNode;
  className?: string;
}) {
  const dark = tone === 'ink';
  return (
    <section className={`border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] ${CARD_TONE[tone]} ${className}`}>
      {(title || right) && (
        // The divider has to be LIGHT on the ink card. Ink on #080C16 is
        // invisible, which ran the header straight into the body.
        <header className={`flex flex-wrap items-center justify-between gap-3 border-b-2 px-4 sm:px-5 py-3 ${dark ? 'border-white/25' : 'border-[#161616]'} ${tone === 'yellow' ? 'bg-[#F5B700]' : ''}`}>
          <div className="min-w-0">
            {eyebrow && <span className={`block font-mono text-[9px] font-bold uppercase tracking-[0.28em] ${dark ? 'text-[#F5B700]' : 'text-[#C4160B]'}`}>{eyebrow}</span>}
            {title && <h2 className={`font-display text-lg font-semibold tracking-tight leading-tight ${dark ? 'text-white' : 'text-[#161616]'}`}>{title}</h2>}
          </div>
          {right && <div className="flex flex-wrap items-center gap-2 shrink-0">{right}</div>}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/* ──────────────────────────────── stats ──────────────────────────────── */

export type StatTone = 'ink' | 'good' | 'warn' | 'bad' | 'muted';

const STAT_COLOR: Record<StatTone, string> = {
  ink: 'text-[#161616]',
  good: 'text-[#1B6B3A]',
  warn: 'text-[#8A5A00]',
  bad: 'text-[#C4160B]',
  muted: 'text-[#5C5850]',
};

/**
 * FIGURES ARE DM SANS, NOT PLAYFAIR.
 *
 * Playfair Display ships OLDSTYLE figures: its zero sits at x-height and its
 * one has no lining form, so "$0" renders as "$o" and a row of counts reads as
 * a row of lowercase letters. Caught on the operations board, where every
 * headline is a number. Playfair keeps the prose headings; anything a person
 * has to read as data gets DM Sans at 800 with tabular figures, which is also
 * simply heavier and sharper on cream.
 */
export const figure = 'font-sans font-extrabold tabular-nums tracking-tight leading-none';

/**
 * One number, told properly: mono label, heavy lining figure, and a caption
 * that explains the number rather than repeating it. A long value ("Not
 * measurable") steps down a size instead of blowing out its column.
 */
export function Stat({
  label,
  value,
  sub,
  tone = 'ink',
  size = 'md',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: StatTone;
  size?: 'sm' | 'md' | 'lg';
}) {
  const long = typeof value === 'string' && value.length > 9;
  const scale =
    size === 'lg' ? (long ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl')
      : size === 'sm' ? (long ? 'text-base' : 'text-xl')
        : long ? 'text-lg' : 'text-[28px]';
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#5C5850]">{label}</div>
      <div className={`${figure} mt-1.5 ${scale} ${STAT_COLOR[tone]}`}>{value}</div>
      {sub && <div className="font-body text-[13px] text-[#3A362D] mt-1.5 leading-snug">{sub}</div>}
    </div>
  );
}

/* ─────────────────────────────── badges ──────────────────────────────── */

/**
 * Status pills. Every pairing below was checked against its own background:
 * nothing here relies on a tint so pale that the word inside it disappears,
 * which is the usual way a status system quietly stops being readable.
 */
const BADGE: Record<string, string> = {
  live: 'bg-[#1B6B3A] text-white border-[#161616]',
  growth: 'bg-[#1B6B3A] text-white border-[#161616]',
  healthy: 'bg-[#DFF0E4] text-[#12502B] border-[#12502B]',
  pass: 'bg-[#DFF0E4] text-[#12502B] border-[#12502B]',
  connected: 'bg-[#DFF0E4] text-[#12502B] border-[#12502B]',
  testing: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  test: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  required: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  warn: 'bg-[#FFE9B8] text-[#6B4400] border-[#6B4400]',
  attention: 'bg-[#FFE9B8] text-[#6B4400] border-[#6B4400]',
  expired: 'bg-[#FFE9B8] text-[#6B4400] border-[#6B4400]',
  beta: 'bg-[#DCE6FA] text-[#123383] border-[#123383]',
  new: 'bg-[#DCE6FA] text-[#123383] border-[#123383]',
  review: 'bg-[#DCE6FA] text-[#123383] border-[#123383]',
  proposed: 'bg-[#E7DEF7] text-[#432076] border-[#432076]',
  fail: 'bg-[#C4160B] text-white border-[#161616]',
  critical: 'bg-[#C4160B] text-white border-[#161616]',
  error: 'bg-[#C4160B] text-white border-[#161616]',
  paused: 'bg-[#FBE3E1] text-[#8E1007] border-[#8E1007]',
  draft: 'bg-[#EFEADC] text-[#3A362D] border-[#5C5850]',
  disconnected: 'bg-[#EFEADC] text-[#3A362D] border-[#5C5850]',
  not_connected: 'bg-[#EFEADC] text-[#3A362D] border-[#5C5850]',
  archived: 'bg-[#EFEADC] text-[#5C5850] border-[#5C5850]',
  deprecated: 'bg-[#EFEADC] text-[#5C5850] border-[#5C5850]',
  stable: 'bg-[#DFF0E4] text-[#12502B] border-[#12502B]',
  internal: 'bg-[#EFEADC] text-[#3A362D] border-[#5C5850]',
  forging: 'bg-[#F5B700] text-[#161616] border-[#161616]',
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const cls = BADGE[String(tone ?? '')] ?? BADGE.draft;
  return (
    <span className={`inline-flex items-center whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.16em] px-2 py-1 rounded-md border-2 ${cls}`}>
      {children}
    </span>
  );
}

/* ─────────────────────────────── meters ──────────────────────────────── */

const METER_FILL: Record<StatTone, string> = {
  ink: 'bg-[#161616]',
  good: 'bg-[#1B6B3A]',
  warn: 'bg-[#C77F00]',
  bad: 'bg-[#C4160B]',
  muted: 'bg-[#5C5850]',
};

/** A bar with an ink outline, so an empty meter still reads as a meter. */
export function Meter({ pct, tone = 'ink', height = 'md' }: { pct: number; tone?: StatTone; height?: 'sm' | 'md' }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div
      className={`w-full rounded-full border-2 border-[#161616] bg-[#FFFDF6] overflow-hidden ${height === 'sm' ? 'h-2.5' : 'h-3.5'}`}
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full ${METER_FILL[tone]} transition-[width] duration-500`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function toneForScore(score: number): StatTone {
  return score >= 85 ? 'good' : score >= 60 ? 'warn' : 'bad';
}

/**
 * The health dial. A big Playfair figure inside a ring that fills with the
 * score, because a dashboard that shows one number as its headline should show
 * it as a shape you can read across a room.
 */
export function Dial({ score, label, size = 132 }: { score: number; label?: string; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = toneForScore(clamped);
  const stroke = tone === 'good' ? '#1B6B3A' : tone === 'warn' ? '#C77F00' : '#C4160B';
  const r = 46;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90" aria-hidden>
          <circle cx="55" cy="55" r={r} fill="#FFFDF6" stroke="#161616" strokeWidth="3" />
          <circle
            cx="55" cy="55" r={r} fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="butt"
            strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          />
          <circle cx="55" cy="55" r={r - 5} fill="none" stroke="#161616" strokeWidth="2" />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className={`${figure} text-[34px] text-[#161616]`}>{Math.round(clamped)}</span>
        </div>
      </div>
      {label && <span className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#5C5850]">{label}</span>}
    </div>
  );
}

/* ─────────────────────────────── controls ────────────────────────────── */

export type ButtonTone = 'primary' | 'default' | 'danger' | 'ghost';

/**
 * Buttons.
 *
 * Every fill was measured: ink on mustard is 10.04:1, white on the deep red
 * is 6.06:1, ink on white is 18:1. The old danger button used #E0301E, where
 * white text lands at 4.55:1 and ink at 3.97:1, so neither foreground was
 * comfortably legible; the deep red fixes that without leaving the palette.
 *
 * DISABLED IS A STATE, NOT A FADE. `opacity-40` on a button drags its label to
 * roughly 4:1 and its border to nothing, so a disabled control becomes both
 * unreadable and hard to see at all. Disabled here is a flat oat fill with real
 * text on it: obviously inert, still readable, still explains itself through
 * the title attribute.
 */
export function Button({
  children,
  onClick,
  disabled,
  tone = 'default',
  type = 'button',
  size = 'md',
  title,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: ButtonTone;
  type?: 'button' | 'submit';
  size?: 'sm' | 'md';
  title?: string;
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-sans font-bold uppercase tracking-[0.14em] rounded-lg border-2 transition-all ' +
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF6EA]';
  const scale = size === 'sm' ? 'text-[10px] px-2.5 py-1.5' : 'text-[11px] px-3.5 py-2.5';

  if (disabled) {
    return (
      <button
        type={type}
        disabled
        title={title}
        className={`${base} ${scale} bg-[#EFEADC] text-[#5C5850] border-[#5C5850] cursor-not-allowed ${className}`}
      >
        {children}
      </button>
    );
  }

  const press = 'shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none';
  const tones: Record<ButtonTone, string> = {
    primary: `bg-[#F5B700] text-[#161616] border-[#161616] ${press}`,
    default: `bg-white text-[#161616] border-[#161616] ${press}`,
    danger: `bg-[#C4160B] text-white border-[#161616] ${press}`,
    ghost: 'bg-transparent text-[#3A362D] border-transparent hover:border-[#161616] hover:bg-white',
  };

  return (
    <button type={type} onClick={onClick} title={title} className={`${base} ${scale} ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

/** Same skin as Button, for links. Keeps a nav chip from looking like a sibling of nothing. */
export function LinkButton({ href, children, tone = 'default' }: { href: string; children: ReactNode; tone?: ButtonTone }) {
  const press = 'shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5';
  const tones: Record<ButtonTone, string> = {
    primary: `bg-[#F5B700] text-[#161616] border-[#161616] ${press}`,
    default: `bg-white text-[#161616] border-[#161616] ${press}`,
    danger: `bg-[#C4160B] text-white border-[#161616] ${press}`,
    ghost: 'bg-transparent text-[#3A362D] border-transparent hover:border-[#161616] hover:bg-white',
  };
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] px-3.5 py-2.5 rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/40 ${tones[tone]}`}
    >
      {children}
    </a>
  );
}

export const inputCls =
  'w-full rounded-lg border-2 border-[#161616] bg-white px-3 py-2.5 font-body text-[15px] text-[#161616] placeholder:text-[#5C5850] ' +
  'outline-none focus:ring-4 focus:ring-[#F5B700]/50 transition-shadow';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#5C5850] block mb-1.5">{label}</span>
      {children}
      {hint && <span className="block font-body text-[12px] text-[#3A362D] mt-1.5 leading-snug">{hint}</span>}
    </label>
  );
}

/** Tabs as pop chips. The active one wears the mustard sticker. */
export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: readonly T[]; active: T; onChange: (t: T) => void }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Sections">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          aria-current={active === t ? 'page' : undefined}
          className={`font-sans text-[11px] font-bold uppercase tracking-[0.14em] px-3.5 py-2.5 rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/40 ${
            active === t
              ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[3px_3px_0_0_#161616]'
              : 'bg-white text-[#3A362D] border-[#161616] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#161616]'
          }`}
        >
          {t}
        </button>
      ))}
    </nav>
  );
}

/* ────────────────────────────── messages ─────────────────────────────── */

export function Notice({ kind, children }: { kind: 'good' | 'bad' | 'warn' | 'info'; children: ReactNode }) {
  const tones = {
    good: 'border-[#12502B] bg-[#DFF0E4] text-[#12502B]',
    bad: 'border-[#8E1007] bg-[#FBE3E1] text-[#8E1007]',
    warn: 'border-[#6B4400] bg-[#FFE9B8] text-[#6B4400]',
    info: 'border-[#123383] bg-[#DCE6FA] text-[#123383]',
  };
  return (
    <div role={kind === 'bad' ? 'alert' : 'status'} className={`rounded-xl border-2 px-4 py-3 font-body text-[14px] leading-relaxed shadow-[3px_3px_0_0_#161616] ${tones[kind]}`}>
      {children}
    </div>
  );
}

/**
 * The empty state. A headline, a sentence that says what would put something
 * here, and where possible the button that does it. "No data" is not an empty
 * state, it is a shrug.
 */
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="py-10 px-4 text-center">
      <div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616]" aria-hidden />
      <p className="font-display text-lg font-semibold text-[#161616]">{title}</p>
      {children && <p className="font-body text-[14px] text-[#3A362D] mt-1.5 max-w-md mx-auto leading-relaxed">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Loading that keeps the shape of what is coming, so the page does not jump. */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded-md border-2 border-[#161616]/20 bg-[#EFEADC] animate-pulse" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────── formatting ──────────────────────────── */

/** Cents to dollars. "Not set" rather than a dash: unknown and zero are different facts. */
export function money(cents: number | null | undefined, digits = 0): string {
  if (cents === null || cents === undefined) return 'Not set';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function pct(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined ? 'Not measurable' : `${value.toFixed(digits)}%`;
}

export function num(value: number | null | undefined): string {
  return value === null || value === undefined ? '0' : value.toLocaleString('en-US');
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function sentenceCase(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
