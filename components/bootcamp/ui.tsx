import type { ReactNode } from 'react';

/**
 * The bootcamp's shared building blocks. Riviera palette, same bones as
 * /claude: sea ink on sand, white cards with hard ink shadows, pill buttons,
 * tracked kickers that the Riviera type turns into sun-and-wave labels.
 * Server-safe: nothing in here needs a browser.
 */

export const C = {
  sea: '#0b3b44',
  sand: '#fbf5ea',
  tiffany: '#81d8d0',
  lagoon: '#0a7c78',
  mustard: '#f5b700',
  coral: '#ff6f59',
  foam: '#d8f3f0',
} as const;

export const kickerCls = 'font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3';
export const kickerOnDarkCls = 'font-mono text-[11px] uppercase tracking-[0.35em] text-[#81d8d0] font-bold mb-3';
export const h2Cls = 'font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]';
export const h2SmCls = 'font-display text-3xl md:text-4xl font-black tracking-tight leading-[1.06]';
export const leadCls = 'font-body text-[#0b3b44]/75 leading-relaxed mt-4 max-w-2xl text-[17px]';

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a7c78] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';
export const btn = {
  gold: `${btnBase} bg-[#f5b700] text-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44]`,
  dark: `${btnBase} bg-[#0b3b44] text-[#fbf5ea] shadow-[4px_4px_0_0_#f5b700]`,
  white: `${btnBase} bg-white text-[#0b3b44]`,
  /** For a button that sits on the dark sea card. */
  onDark: `${btnBase} bg-[#f5b700] text-[#0b3b44] border-[#0b3b44] shadow-[4px_4px_0_0_#81d8d0]`,
};

export const inputCls =
  'w-full rounded-lg border-2 border-[#0b3b44] bg-[#fbf5ea] px-4 py-3 font-body text-[15px] text-[#0b3b44] placeholder:text-[#0b3b44]/35 outline-none transition-shadow focus:shadow-[3px_3px_0_0_#f5b700] aria-[invalid=true]:border-[#ff6f59]';
export const labelCls = 'mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#5c554a]';

export function Kicker({ children, dark = false, className = '' }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <p className={`${dark ? kickerOnDarkCls : kickerCls} ${className}`}>{children}</p>;
}

/** A mustard check in front of a line in an includes list. */
export function Check({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <li className={`flex gap-2.5 font-body text-[15px] leading-snug ${dark ? 'text-[#fbf5ea]/90' : 'text-[#0b3b44]/85'}`}>
      <span aria-hidden="true" className="text-[#f5b700] font-black shrink-0">✓</span>
      <span>{children}</span>
    </li>
  );
}

/** A labelled field with its own inline error, wired for screen readers. */
export function Field({
  id,
  label,
  error,
  optional = false,
  hint,
  children,
  className = '',
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelCls}>
        {label}
        {optional && <span className="font-body text-[10px] font-normal normal-case tracking-normal"> (optional)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="font-body text-xs text-[#0b3b44]/55 mt-1.5">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="font-body text-[13px] text-[#8a1c10] mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}

/** The inline error box every bootcamp form and button uses. Never alert(). */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border-2 border-[#ff6f59] bg-[#FDECEA] px-4 py-3 font-body text-sm text-[#8a1c10] leading-relaxed">
      {children}
    </p>
  );
}

export const SUPPORT_EMAIL = 'sarah@modernmustardseed.com';

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
