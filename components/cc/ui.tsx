'use client';

import type { ReactNode } from 'react';

/**
 * THE COMMAND CENTER'S DESIGN SYSTEM, in one file.
 *
 * House rules for this app, different on purpose from the portal's sticker
 * grammar: a near white canvas, white cards on a hairline, one accent that
 * belongs to the client, serif module titles, sans everywhere else, mono only
 * for the small capitals that label things. Numbers are tabular so a column
 * of them lines up. Every ink colour is set explicitly, because the site body
 * is white on black and an unstyled word here would vanish.
 */

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/* ── surfaces ─────────────────────────────────────────────── */

export function Card({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <section className={cx('rounded-xl border border-[var(--cc-line)] bg-[var(--cc-card)] shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-16px_rgba(16,24,40,.18)]', pad && 'p-5', className)}>{children}</section>;
}

export function CardHead({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h3 className="font-display text-[19px] leading-tight text-[var(--cc-ink)]">{title}</h3>
        {hint && <p className="mt-1 text-[13px] leading-snug text-[var(--cc-muted)]">{hint}</p>}
      </div>
      {right && <div className="flex-none flex items-center gap-2">{right}</div>}
    </header>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--cc-muted)]">{children}</span>;
}

/* ── numbers ──────────────────────────────────────────────── */

export function Stat({ value, label, tone = 'plain', hint, onClick }: { value: number | string; label: string; tone?: 'plain' | 'live' | 'warn'; hint?: string; onClick?: () => void }) {
  const dot = tone === 'live' ? 'bg-[var(--cc-accent)]' : tone === 'warn' ? 'bg-[#B54708]' : 'bg-[var(--cc-line)]';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'text-left rounded-xl border border-[var(--cc-line)] bg-[var(--cc-card)] p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]',
        onClick && 'transition hover:border-[var(--cc-accent)] hover:shadow-[0_1px_2px_rgba(16,24,40,.06),0_10px_24px_-18px_rgba(16,24,40,.35)] cursor-pointer',
      )}
    >
      <span className="flex items-center gap-2">
        <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />
        <Label>{label}</Label>
      </span>
      <span className="mt-2 block text-[30px] leading-none font-semibold tabular-nums text-[var(--cc-ink)]">{value}</span>
      {hint && <span className="mt-1.5 block text-[12px] text-[var(--cc-muted)]">{hint}</span>}
    </Tag>
  );
}

export function Bars({ data, label }: { data: Array<{ day: string; count: number }>; label?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex items-end gap-[3px] h-16" role="img" aria-label={label ?? 'Leads by day'}>
        {data.map((d) => (
          <div key={d.day} className="flex-1 min-w-0 flex flex-col justify-end h-full" title={`${d.day}: ${d.count}`}>
            <div
              className={cx('rounded-[3px]', d.count ? 'bg-[var(--cc-accent)]' : 'bg-[var(--cc-line)]')}
              style={{ height: d.count ? `${Math.max(8, (d.count / max) * 100)}%` : '4px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between"><Label>14 days ago</Label><Label>Today</Label></div>
    </div>
  );
}

/* ── controls ─────────────────────────────────────────────── */

export function Button({ children, onClick, kind = 'quiet', type = 'button', disabled, href, title, full }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'quiet' | 'ghost'; type?: 'button' | 'submit'; disabled?: boolean; href?: string; title?: string; full?: boolean }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed';
  const look =
    kind === 'primary'
      ? 'bg-[var(--cc-accent)] text-white hover:brightness-95'
      : kind === 'ghost'
        ? 'text-[var(--cc-muted)] hover:text-[var(--cc-ink)]'
        : 'border border-[var(--cc-line)] bg-white text-[var(--cc-ink)] hover:border-[var(--cc-ink)]';
  const cls = cx(base, look, full && 'w-full');
  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className={cls} title={title}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} title={title}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block mb-1.5"><Label>{label}</Label></span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-[var(--cc-muted)]">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-[var(--cc-line)] bg-white px-3 py-2 text-[14px] text-[var(--cc-ink)] placeholder:text-[#98a2b3] outline-none focus:border-[var(--cc-accent)] focus:ring-2 focus:ring-[var(--cc-accent)]/15';

export function Badge({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'live' | 'warn' | 'good' }) {
  const look =
    tone === 'live'
      ? 'bg-[var(--cc-accent)]/10 text-[var(--cc-accent)] border-[var(--cc-accent)]/25'
      : tone === 'warn'
        ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
        : tone === 'good'
          ? 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]'
          : 'bg-[#F7F8FA] text-[var(--cc-muted)] border-[var(--cc-line)]';
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]', look)}>{children}</span>;
}

/* ── states ───────────────────────────────────────────────── */

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 rounded-lg bg-[#F1F3F6] animate-pulse" />
      ))}
    </div>
  );
}

export function Empty({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--cc-line)] bg-[#FAFBFC] px-5 py-8 text-center">
      <p className="text-[14px] font-semibold text-[var(--cc-ink)]">{title}</p>
      {note && <p className="mt-1 text-[13px] text-[var(--cc-muted)] max-w-md mx-auto">{note}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-[#FDA29B] bg-[#FFFBFA] px-4 py-3 text-[13px] text-[#B42318] flex items-center justify-between gap-3">
      <span>{children}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-mono text-[10px] uppercase tracking-[0.14em] underline">
          Try again
        </button>
      )}
    </div>
  );
}

/* ── drawer ───────────────────────────────────────────────── */

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-[#0c111d]/40 backdrop-blur-[1px]" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-[520px] h-full bg-white border-l border-[var(--cc-line)] flex flex-col shadow-[-24px_0_60px_-30px_rgba(16,24,40,.45)]">
        <header className="flex-none flex items-center justify-between gap-4 px-5 py-4 border-b border-[var(--cc-line)]">
          <h3 className="font-display text-[19px] text-[var(--cc-ink)] truncate">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--cc-muted)] hover:bg-[#F1F3F6] hover:text-[var(--cc-ink)]" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex-none border-t border-[var(--cc-line)] px-5 py-3 bg-[#FAFBFC]">{footer}</footer>}
      </div>
    </div>
  );
}

/* ── time ─────────────────────────────────────────────────── */

export function when(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Denver' });
}

export function dayLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Denver' });
}
