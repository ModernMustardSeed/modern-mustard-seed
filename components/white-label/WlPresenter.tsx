'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

export type Slide = { kicker: string; title: string; body?: string; content: ReactNode; /** Give the live piece more of the width. */ wide?: boolean };

/**
 * PRESENTER MODE. The demo as a five-beat walkthrough for a screen-share:
 * full screen, one idea per slide, arrow keys or the buttons to move, Esc to
 * leave. Every slide holds the live piece (the real call, the real text),
 * not a picture of it.
 */
export default function WlPresenter({
  slides,
  color,
  ink,
  brand,
  onClose,
}: {
  slides: Slide[];
  color: string;
  ink: string;
  brand: ReactNode;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const go = useCallback((d: number) => setI((n) => Math.max(0, Math.min(slides.length - 1, n + d))), [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === 'Escape') onClose();
      if (typing) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  const s = slides[i];
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0c0c0c] text-white" role="dialog" aria-modal="true" aria-label="Presenter mode">
      <div className="h-1 w-full bg-white/10">
        <div className="h-full transition-all duration-500" style={{ width: `${((i + 1) / slides.length) * 100}%`, background: color }} />
      </div>
      <div className="flex shrink-0 items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">{brand}</div>
        <div className="flex items-center gap-3 text-sm text-white/50">
          <span>
            {i + 1} / {slides.length}
          </span>
          <button onClick={onClose} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10">
            Exit <span className="hidden sm:inline">· Esc</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div key={i} className={`mx-auto grid min-h-full max-w-6xl items-center gap-10 py-6 [animation:wlIn_.45s_ease-out] ${s.wide ? 'lg:grid-cols-[0.6fr_1.4fr]' : 'lg:grid-cols-[0.85fr_1.15fr]'}`}>
          <div>
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white/70">
              <span className="h-1 w-8 rounded-full" style={{ background: color }} />
              {s.kicker}
            </p>
            <h2 className="mt-4 text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">{s.title}</h2>
            {s.body && <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">{s.body}</p>}
          </div>
          <div className="text-neutral-900">{s.content}</div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
        <button onClick={() => go(-1)} disabled={i === 0} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold disabled:opacity-30">
          ← Back
        </button>
        <div className="hidden gap-2 sm:flex">
          {slides.map((sl, n) => (
            <button key={sl.kicker} aria-label={`Go to ${sl.kicker}`} onClick={() => setI(n)} className="h-2.5 rounded-full transition-all" style={{ width: n === i ? 28 : 10, background: n === i ? color : 'rgba(255,255,255,0.25)' }} />
          ))}
        </div>
        {i < slides.length - 1 ? (
          <button onClick={() => go(1)} className="rounded-full px-6 py-2.5 text-sm font-bold" style={{ background: color, color: ink }}>
            Next →
          </button>
        ) : (
          <button onClick={onClose} className="rounded-full px-6 py-2.5 text-sm font-bold" style={{ background: color, color: ink }}>
            Done
          </button>
        )}
      </div>
      <style>{`@keyframes wlIn { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }`}</style>
    </div>
  );
}
