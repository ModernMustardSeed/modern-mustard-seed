'use client';

import { useEffect, useState } from 'react';
import type { HelpGuideContent } from '@/lib/help-content';

/**
 * Optional, always-available tutorial. A small "How to use" button opens a modal
 * with the guide. Never auto-opens. Dark console theme to match the portals.
 */
export default function HelpGuide({ guide, label = 'How to use' }: { guide: HelpGuideContent; label?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] uppercase tracking-[0.18em] font-sans font-semibold px-3 py-1.5 rounded-full border border-mustard-500/40 text-mustard-300 hover:bg-mustard-500/10 transition-colors"
        aria-haspopup="dialog"
      >
        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-mustard-400/60 text-[10px] leading-none">?</span>
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={guide.title}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0f1422] border border-white/[0.1] shadow-2xl">
            <div className="sticky top-0 bg-[#0f1422]/95 backdrop-blur-md border-b border-white/[0.08] px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-mustard-400 font-mono font-bold block mb-1">Guide</span>
                <h2 className="font-sans text-xl font-bold text-white tracking-tight">{guide.title}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center flex-shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-white/60 font-body text-sm leading-relaxed mb-6">{guide.intro}</p>
              <div className="space-y-6">
                {guide.sections.map((s, i) => (
                  <div key={i}>
                    <h3 className="text-[10px] uppercase tracking-[0.25em] text-mustard-300 font-mono font-bold mb-2.5">{s.title}</h3>
                    <ul className="space-y-2">
                      {s.items.map((it, j) => (
                        <li key={j} className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-mustard-400 flex-shrink-0" />
                          <span className="text-white/80 font-body text-sm leading-relaxed">{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
