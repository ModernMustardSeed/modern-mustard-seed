'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HelpGuideContent } from '@/lib/help-content';

/**
 * Optional, always-available tutorial. A small "How to use" button opens a modal
 * with the guide. Never auto-opens. Light pop-art theme to match the portals.
 */
export default function HelpGuide({
  guide,
  label = 'How to use',
  nudge,
}: {
  guide: HelpGuideContent;
  label?: string;
  nudge?: { storageKey: string; text: string };
}) {
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // One-time first-visit nudge. Shows once, then never again (localStorage).
  useEffect(() => {
    if (!nudge) return;
    try {
      if (!localStorage.getItem(nudge.storageKey)) setShowNudge(true);
    } catch {
      /* storage blocked */
    }
  }, [nudge]);

  const dismissNudge = () => {
    setShowNudge(false);
    if (nudge) {
      try {
        localStorage.setItem(nudge.storageKey, '1');
      } catch {
        /* ignore */
      }
    }
  };

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
      <span className="relative inline-flex">
        <button
          onClick={() => { dismissNudge(); setOpen(true); }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] uppercase tracking-[0.18em] font-sans font-semibold px-3 py-1.5 rounded-full border-2 border-[#161616] bg-white text-[#161616] hover:bg-[#FFF8E6] transition-colors"
          aria-haspopup="dialog"
        >
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-[#161616]/60 text-[10px] leading-none">?</span>
          {label}
        </button>
        {showNudge && nudge && (
          <span className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 rounded-xl border-2 border-[#161616] bg-[#F5B700] text-[#161616] shadow-[4px_4px_0_0_#161616] px-3.5 py-2.5">
            <span className="absolute -top-1.5 right-7 h-3 w-3 rotate-45 bg-[#F5B700] border-l-2 border-t-2 border-[#161616]" />
            <button onClick={dismissNudge} aria-label="Dismiss" className="absolute top-1.5 right-2 text-[#161616]/50 hover:text-[#161616] text-sm leading-none">×</button>
            <button onClick={() => { dismissNudge(); setOpen(true); }} className="block text-left">
              <span className="block font-sans font-extrabold text-[12px] leading-snug pr-3">{nudge.text}</span>
              <span className="block text-[10px] uppercase tracking-[0.15em] font-mono font-bold mt-1 underline">Open the guide →</span>
            </button>
          </span>
        )}
      </span>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={guide.title}
        >
          <div className="absolute inset-0 bg-[#161616]/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616]">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b-2 border-[#161616] px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">Guide</span>
                <h2 className="font-sans text-xl font-bold text-[#161616] tracking-tight">{guide.title}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[#161616]/45 hover:text-[#161616] text-2xl leading-none w-8 h-8 flex items-center justify-center flex-shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-[#3A3733] font-body text-sm leading-relaxed mb-6">{guide.intro}</p>
              <div className="space-y-6">
                {guide.sections.map((s, i) => (
                  <div key={i}>
                    <h3 className="text-[10px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold mb-2.5">{s.title}</h3>
                    <ul className="space-y-2">
                      {s.items.map((it, j) => (
                        <li key={j} className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#F5B700] flex-shrink-0" />
                          <span className="text-[#3A3733] font-body text-sm leading-relaxed">{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
