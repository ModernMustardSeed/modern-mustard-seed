'use client';

import { useState } from 'react';

/** Starts Stripe Checkout for a Launch tier. Mirrors the store buy buttons. */
export default function LaunchBuyButton({
  slug,
  label,
  variant = 'primary',
}: {
  slug: string;
  label: string;
  variant?: 'primary' | 'ghost';
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function buy() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/mustard-launch/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setErr(data?.message || 'Checkout is warming up. Try again in a moment or email sarah@modernmustardseed.com.');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setErr('Network hiccup. Try again.');
      setLoading(false);
    }
  }

  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#161616] px-6 py-3 font-sans font-bold transition-transform hover:translate-y-[2px] disabled:opacity-60';
  const styles =
    variant === 'primary'
      ? 'bg-[#F5B700] text-[#161616] shadow-[4px_4px_0_0_#161616] hover:shadow-[2px_2px_0_0_#161616]'
      : 'bg-white text-[#161616] shadow-[4px_4px_0_0_#161616] hover:shadow-[2px_2px_0_0_#161616]';

  return (
    <div>
      <button onClick={buy} disabled={loading} className={`${base} ${styles}`}>
        {loading ? 'Opening checkout…' : label}
      </button>
      {err && <p className="mt-2 font-mono text-xs text-[#E0301E]">{err}</p>}
    </div>
  );
}
