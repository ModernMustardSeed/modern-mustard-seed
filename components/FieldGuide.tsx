'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PROMPT_GROUPS } from '@/data/fieldguide';

/**
 * THE FIELD GUIDE, interactive parts.
 *
 * The static prose lives in the server page. Everything here exists because it
 * has a job the page cannot do flat: a rail that tells you where you are in a
 * long document, and copy buttons on every prompt so a reader who has never
 * opened a terminal can get a working prompt into it in one tap.
 *
 * Design note: the copy button is the whole product on the prompt library. It
 * is why someone bookmarks this page instead of reading it once. Keep it fast,
 * keep it obvious, and never make it depend on a hover state.
 */

/* ------------------------------------------------------------------ */
/* Reading progress. One hairline of mustard across the top.          */
/* ------------------------------------------------------------------ */

export function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        setPct(max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent print:hidden pointer-events-none"
    >
      <div
        className="h-full bg-[#F5B700] border-b border-[#161616]/20 transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The rail. Knows where you are in a very long page.                 */
/* ------------------------------------------------------------------ */

export type RailItem = { id: string; label: string };

export function SectionRail({ items }: { items: RailItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const seen = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.intersectionRatio));
        // The winner is the highest section on the page that is meaningfully
        // visible. Ratio alone flickers on tall sections, so document order
        // breaks the tie.
        let winner = '';
        for (const item of items) {
          if ((seen.get(item.id) ?? 0) > 0.01) {
            winner = item.id;
            break;
          }
        }
        if (winner) setActive(winner);
      },
      { rootMargin: '-140px 0px -55% 0px', threshold: [0, 0.02, 0.25, 0.5] },
    );

    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Field guide sections" className="hidden xl:block print:hidden">
      <div className="sticky top-32">
        <span className="block text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-[#E0301E] mb-4">
          The Guide
        </span>
        <ol className="space-y-0.5 border-l-2 border-[#161616]/15">
          {items.map((item, i) => {
            const on = active === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={on ? 'true' : undefined}
                  className={[
                    'group flex items-baseline gap-2.5 -ml-[2px] border-l-2 pl-3 py-[7px] text-[12px] leading-tight font-sans transition-all duration-200',
                    on
                      ? 'border-[#F5B700] text-[#161616] font-extrabold'
                      : 'border-transparent text-[#161616]/45 hover:text-[#161616] hover:border-[#161616]/30 font-medium',
                  ].join(' ')}
                >
                  <span className="font-mono text-[9px] tabular-nums pt-[2px] opacity-60">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Copy. Used by every code block and every prompt card.              */
/* ------------------------------------------------------------------ */

function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers, and any page served without a secure context.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* nothing else to try */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }, []);

  return { copied, copy };
}

export function CopyButton({
  text,
  label = 'Copy',
  tone = 'light',
}: {
  text: string;
  label?: string;
  tone?: 'light' | 'dark';
}) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      aria-live="polite"
      className={[
        'shrink-0 inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] font-mono font-bold transition-all duration-200 print:hidden',
        copied
          ? 'bg-[#F5B700] border-[#161616] text-[#161616] shadow-[2px_2px_0_0_#161616]'
          : tone === 'dark'
            ? 'bg-transparent border-white/25 text-white/70 hover:text-[#161616] hover:bg-[#F5B700] hover:border-[#F5B700]'
            : 'bg-white border-[#161616] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5',
      ].join(' ')}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

/** A terminal-looking block with a copy button in the chrome. */
export function CodeBlock({ code, caption }: { code: string; caption?: string }) {
  return (
    <div className="rounded-xl border-2 border-[#161616] bg-[#16161A] shadow-[4px_4px_0_0_#161616] overflow-hidden min-w-0">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/10 bg-white/[0.04]">
        <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold text-white/40">
          {caption ?? 'Terminal'}
        </span>
        <CopyButton text={code} tone="dark" />
      </div>
      <pre className="px-4 py-3.5 overflow-x-auto text-[12.5px] leading-[1.8] font-mono text-[#F3EEE1] whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The prompt library. The reason this page gets bookmarked.          */
/* ------------------------------------------------------------------ */

export function PromptLibrary() {
  const [groupId, setGroupId] = useState(PROMPT_GROUPS[0].id);
  const group = useMemo(
    () => PROMPT_GROUPS.find((g) => g.id === groupId) ?? PROMPT_GROUPS[0],
    [groupId],
  );

  return (
    <div>
      <div role="tablist" aria-label="Prompt categories" className="flex flex-wrap gap-2 mb-6 print:hidden">
        {PROMPT_GROUPS.map((g) => {
          const on = g.id === group.id;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setGroupId(g.id)}
              className={[
                'rounded-full border-2 px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-mono font-bold transition-all duration-200',
                on
                  ? 'bg-[#161616] border-[#161616] text-white shadow-[3px_3px_0_0_#F5B700]'
                  : 'bg-white border-[#161616]/25 text-[#161616]/60 hover:border-[#161616] hover:text-[#161616]',
              ].join(' ')}
            >
              {g.label}
              <span className="ml-2 opacity-50 tabular-nums">{g.prompts.length}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-7 max-w-2xl">{group.blurb}</p>

      <div className="grid gap-4">
        {group.prompts.map((p) => (
          <article key={p.id} className="pop-card p-5 md:p-6 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-display text-lg md:text-xl font-black text-[#161616] leading-snug">{p.title}</h3>
                <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#E0301E] font-bold mt-1.5">
                  {p.when}
                </p>
              </div>
              <CopyButton text={p.text} label="Copy prompt" />
            </div>
            <p className="mt-3 rounded-lg border-2 border-[#161616]/12 bg-[#FBF6EA] px-4 py-3.5 font-mono text-[12.5px] leading-[1.85] text-[#161616]/85 whitespace-pre-wrap">
              {p.text}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-body italic text-[#161616]/45">
        Anything in [BRACKETS] is yours to replace. That is the only editing these need.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CLAUDE.md, shown as the file it is, with one tap to take it.       */
/* ------------------------------------------------------------------ */

export function TemplateBlock({ template }: { template: string }) {
  return (
    <div className="rounded-xl border-2 border-[#161616] bg-[#16161A] shadow-[5px_5px_0_0_#161616] overflow-hidden min-w-0">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 bg-white/[0.04]">
        <span className="text-[10px] font-mono font-bold text-[#F5B700] tracking-wide">CLAUDE.md</span>
        <CopyButton text={template} label="Copy the file" tone="dark" />
      </div>
      <pre className="px-4 py-4 overflow-x-auto text-[12px] leading-[1.75] font-mono text-[#F3EEE1] whitespace-pre">
        {template}
      </pre>
    </div>
  );
}
