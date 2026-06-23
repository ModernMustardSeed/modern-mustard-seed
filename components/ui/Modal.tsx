'use client';

import { useEffect, useRef } from 'react';

/**
 * The one safe modal primitive for the whole app. Bakes in the rules so a modal
 * can never clip its top on a short screen: the card is a height-capped flex
 * column with a pinned header, a scrolling body, and an optional pinned footer.
 * Also handles Escape-to-close, click-outside, body scroll lock, focus, and
 * accessibility. Use this for every centered modal instead of hand-rolling one.
 */

type Size = 'sm' | 'md' | 'lg' | 'xl';

export default function Modal({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  headerTone = 'light',
  size = 'lg',
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  headerTone?: 'light' | 'dark';
  size?: Size;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === 'sm' ? 'max-w-md' : size === 'md' ? 'max-w-lg' : size === 'xl' ? 'max-w-3xl' : 'max-w-2xl';
  const dark = headerTone === 'dark';
  const hasHeader = Boolean(title || eyebrow);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-[#161616]/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || eyebrow || 'Dialog'}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxW} max-h-[92vh] flex flex-col bg-[#FBF6EA] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#161616] outline-none animate-pop-in`}
      >
        {hasHeader && (
          <div className={`shrink-0 flex items-start justify-between gap-3 px-6 py-4 ${dark ? 'bg-[#161616] rounded-t-2xl' : 'border-b-2 border-[#161616]/10'}`}>
            <div className="min-w-0">
              {eyebrow && <span className={`text-[10px] uppercase tracking-[0.3em] font-mono font-bold block ${dark ? 'text-[#F5B700]' : 'text-[#E0301E]'}`}>{eyebrow}</span>}
              {title && <h2 className={`font-display text-2xl font-semibold mt-1 leading-tight ${dark ? 'text-[#FBF6EA]' : 'text-[#161616]'}`}>{title}</h2>}
              {subtitle && <p className={`font-body text-sm mt-0.5 ${dark ? 'text-[#FBF6EA]/60' : 'text-[#161616]/55'}`}>{subtitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Close" className={`shrink-0 text-2xl leading-none px-1 ${dark ? 'text-[#FBF6EA]/70 hover:text-[#FBF6EA]' : 'text-[#161616]/45 hover:text-[#161616]'} transition-colors`}>×</button>
          </div>
        )}

        <div className="overflow-y-auto grow p-6">{children}</div>

        {footer && <div className="shrink-0 border-t-2 border-[#161616]/10 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
