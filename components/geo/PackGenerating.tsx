'use client';

/**
 * Shown while a freshly-paid pack generates (about a minute of real work:
 * the audit, the platform sniff, the writing). Calls /api/geo/generate then
 * reloads into the PackViewer.
 */

import { useEffect, useState } from 'react';

const STAGES = [
  'Pulling your live site through the full audit...',
  'Detecting your platform...',
  'Writing your llms.txt from what your site actually says...',
  'Structuring your business data (the part AI engines read)...',
  'Setting the meta rewrites and your citable FAQ...',
  'Matching the install guide to your platform...',
];

export default function PackGenerating({ sessionId }: { sessionId: string }) {
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ticker = window.setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 11000);
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/geo/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && data?.ready) {
          window.location.reload();
        } else {
          setError(data?.message || 'The scan sputtered. Refresh this page to retry free; your purchase is safe.');
        }
      } catch {
        if (alive) setError('Connection hiccup. Refresh this page to retry free; your purchase is safe.');
      }
    })();
    return () => { alive = false; window.clearInterval(ticker); };
  }, [sessionId]);

  return (
    <div className="max-w-xl mx-auto px-5 py-24 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3">[ THE DESK IS WORKING ]</p>
      <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight leading-[1.05]">
        Your Fix Pack is being written.
      </h1>
      <p className="font-body text-[#161616]/65 mt-3">Personalized from your live site. Takes about a minute; this page opens it automatically.</p>
      <div className="mt-8 rounded-2xl border-2 border-[#161616] bg-[#161616] p-6 text-left shadow-[6px_6px_0_0_#F5B700]">
        <p className="font-mono text-[13px] leading-7 text-[#FBF6EA]/90">
          {STAGES.slice(0, stage + 1).map((s, i) => (
            <span key={i} className="block">&gt; {s}</span>
          ))}
          <span className="inline-block w-2.5 h-4 bg-[#F5B700] align-middle ml-0.5 animate-pulse" />
        </p>
      </div>
      {error && <p className="mt-5 text-[#E0301E] font-body text-sm font-semibold">{error}</p>}
    </div>
  );
}
