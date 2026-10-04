'use client';

import { useState } from 'react';

/** One button that puts every redirect line on the clipboard, ready to paste into Squarespace URL Mappings. */
export default function CopyMappings({ lines }: { lines: string[] }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold transition-transform active:scale-[0.98] print:hidden"
      style={{ background: '#f5b700', color: '#0b3b44', fontFamily: "var(--font-caps), 'Figtree', system-ui, sans-serif" }}
    >
      {state === 'copied' ? `Copied all ${lines.length} lines` : state === 'failed' ? 'Select the box and copy by hand' : `Copy all ${lines.length} lines`}
    </button>
  );
}
