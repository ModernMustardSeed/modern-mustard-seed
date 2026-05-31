'use client';

import { useState } from 'react';

/** Per-partner referral links with one-tap copy. */
export default function AffiliateLinks({ links }: { links: { label: string; url: string }[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="space-y-2">
      {links.map((l) => (
        <div key={l.url} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-white/85 font-body text-sm">{l.label}</p>
            <p className="text-white/40 font-mono text-[11px] truncate">{l.url}</p>
          </div>
          <button
            onClick={() => copy(l.url)}
            className="flex-shrink-0 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-cream-50 bg-brass rounded-full hover:shadow-[0_0_18px_rgba(255,107,53,0.4)] transition-all"
          >
            {copied === l.url ? 'Copied' : 'Copy'}
          </button>
        </div>
      ))}
    </div>
  );
}
