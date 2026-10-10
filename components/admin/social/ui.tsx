import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import { CELL_META, PLATFORM_META, longDate, type CellState, type Platform } from '@/lib/social-calendar';

/**
 * Shared studio-edition tokens for the social desk. The admin shell is an ink
 * ground with white type, so every surface here names its ink color.
 */

export const INK = '#141210';
export const SANS: CSSProperties = { fontFamily: 'var(--font-body), system-ui, sans-serif', fontVariationSettings: "'opsz' 14" };
export const SHRIKHAND: CSSProperties = { fontFamily: 'var(--font-shrikhand), Georgia, serif' };
export const ACCENT: CSSProperties = {
  ...SHRIKHAND,
  fontStyle: 'normal',
  fontWeight: 400,
  letterSpacing: '0',
  background: 'linear-gradient(transparent 80%, #f5b700 80%, #f5b700 95%, transparent 95%)',
};
export const MONO = 'font-mono text-[11px] uppercase tracking-[0.14em]';
export const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141210]';

/** Short labels for the narrow grid headers. */
export const SHORT_LABEL: Record<Platform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  'linkedin-mms': 'LinkedIn',
  pinterest: 'Pinterest',
  'linkedin-sarah': 'LinkedIn, Sarah',
  'instagram-sarah': 'IG, Sarah',
  'x-sarah': 'X, Sarah',
};

export function shortDate(iso: string): string {
  const d = longDate(iso);
  return `${d.weekday.slice(0, 3)} ${d.month.slice(0, 3)} ${d.day}`;
}

export function Pill({ bg, fg, border = INK, children }: { bg: string; fg: string; border?: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-[3px] border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
      style={{ background: bg, color: fg, borderColor: border }}
    >
      {children}
    </span>
  );
}

export function PlatformPill({ platform }: { platform: Platform }) {
  const m = PLATFORM_META[platform];
  return (
    <Pill bg={m.bg} fg={m.fg}>
      {m.label}
    </Pill>
  );
}

export function StatePill({ state }: { state: CellState }) {
  const m = CELL_META[state];
  return (
    <Pill bg={m.bg} fg={m.fg} border={m.ring}>
      <span aria-hidden="true" className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: m.ring }} />
      {m.label}
    </Pill>
  );
}

/** The three-color key, read the same way on every view. */
export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Color key">
      {(['green', 'amber', 'red'] as const).map((s) => (
        <li key={s} className="flex items-center gap-1.5 text-[12px] text-[#141210]">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-[2px] border"
            style={{ background: CELL_META[s].bg, borderColor: CELL_META[s].ring }}
          />
          {s === 'green' ? 'Queued on the platform' : s === 'amber' ? 'Planned, not queued yet' : 'Empty, nothing goes out'}
        </li>
      ))}
    </ul>
  );
}

/**
 * A post cover as a thumbnail. Covers live full size in the public
 * social-covers bucket (often over a megabyte); next/image serves a small
 * webp or avif so a month of cells stays light.
 */
export function Cover({ src, width, height, className = '', eager }: { src: string; width: number; height: number; className?: string; eager?: boolean }) {
  return (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      className={`object-cover object-top ${className}`}
    />
  );
}
