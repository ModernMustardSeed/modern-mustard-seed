'use client';

import { useState } from 'react';

/** Copies a string to the clipboard and says so for two seconds. Falls back to selecting the text when the clipboard is blocked. */
export default function CopyButton({ text, label = 'Copy', className = '' }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'fail'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('done');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState('idle'), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center justify-center rounded-full border-2 border-[#0b3b44] bg-white px-4 py-2 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0b3b44] shadow-[2px_2px_0_0_#0b3b44] transition-all hover:-translate-y-0.5 ${className}`}
      aria-live="polite"
    >
      {state === 'done' ? 'Copied' : state === 'fail' ? 'Select and copy' : label}
    </button>
  );
}
