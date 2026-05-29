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
        <span className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-[12px] uppercase tracking-[0.22em] font-sans font-bold text-cream-100/70 border border-cream-100/30 bg-midnight-700/40">
          Launching shortly
        </span>
        <p className="text-cream-100/40 text-[10px] font-mono uppercase tracking-[0.22em] mt-3 md:text-right">
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
        className={`inline-flex items-center gap-2 px-9 py-4 rounded-full text-[12px] uppercase tracking-[0.22em] font-sans font-bold text-cream-50 bg-brass campfire-glow hover:shadow-[0_0_40px_rgba(255,107,53,0.5)] transition-all ${
          loading ? 'opacity-60 cursor-wait' : ''
        }`}
      >
        {loading ? 'Opening checkout…' : label}
      </button>
      {error && (
        <p className="text-rust text-[11px] font-mono uppercase tracking-[0.18em] mt-3 md:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
