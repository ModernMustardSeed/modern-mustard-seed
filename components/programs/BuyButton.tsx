'use client';

import { useState } from 'react';

/** Kicks off Stripe checkout for a program or the bundle. Reads ?ref for
 *  affiliate attribution if present (the affiliate engine consumes it later). */
export default function BuyButton({
  slug,
  label = 'Get it now',
  className,
}: {
  slug: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    setLoading(true);
    setError('');
    try {
      let ref: string | undefined;
      if (typeof document !== 'undefined') {
        const m = document.cookie.match(/(?:^|;\s*)mms_ref=([^;]+)/);
        if (m) ref = decodeURIComponent(m[1]);
      }
      const res = await fetch('/api/programs/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ref }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message || 'Checkout is not available yet. Please try again shortly.');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={go}
        disabled={loading}
        className={
          className ||
          'px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-bold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_45px_rgba(255,107,53,0.5)] transition-all disabled:opacity-50'
        }
      >
        {loading ? 'Opening checkout...' : label}
      </button>
      {error && <p className="text-rust-light text-xs font-body max-w-xs text-center">{error}</p>}
    </div>
  );
}
