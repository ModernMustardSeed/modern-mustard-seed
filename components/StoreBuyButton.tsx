'use client';

import { useState } from 'react';

export default function StoreBuyButton({
  slug,
  configured,
  label = 'Get the Playbook →',
}: {
  slug: string;
  configured: boolean;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="md:text-right">
        <span className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-[12px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#0d0d0d] border-2 border-[#0d0d0d] bg-white">
          Launching shortly
        </span>
        <p className="text-[#0d0d0d]/55 text-[10px] font-mono uppercase tracking-[0.22em] mt-3 md:text-right">
          Notify list opens at launch
        </p>
      </div>
    );
  }

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setError(data.message || data.error || 'Checkout failed.');
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Checkout URL missing.');
        setLoading(false);
      }
    } catch {
      setError('Network error.');
      setLoading(false);
    }
  }

  return (
    <div className="md:text-right">
      <button
        onClick={onClick}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-9 py-4 rounded-full text-[12px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#0d0d0d] border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_rgba(13,13,13,0.3)] hover:-translate-y-0.5 transition-all ${
          loading ? 'opacity-60 cursor-wait' : ''
        }`}
      >
        {loading ? 'Opening checkout…' : label}
      </button>
      {error && (
        <p className="text-[#0d0d0d] text-[11px] font-mono font-bold uppercase tracking-[0.18em] mt-3 md:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
