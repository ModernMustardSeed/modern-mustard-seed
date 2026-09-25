'use client';

import { useState } from 'react';

/** Kicks off Stripe checkout for a program or the bundle. Reads ?ref for
 *  affiliate attribution if present (the affiliate engine consumes it later). */
export default function BuyButton({
  slug,
  label = 'Get it now',
  className,
  tone = 'cream',
}: {
  slug: string;
  label?: string;
  className?: string;
  /** Default button skin: the mustard pop pill. `cream` sits on a cream ground,
   *  `ink` on an ink band (cream border and shadow), `onMustard` on a mustard
   *  band (ink pill so it does not vanish into the ground). */
  tone?: 'cream' | 'ink' | 'onMustard';
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
          `px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold rounded-full border-2 hover:-translate-y-0.5 transition-all disabled:opacity-50 ${
            tone === 'ink'
              ? 'text-[#161616] bg-[#F5B700] border-[#FBF6EA] shadow-[4px_4px_0_0_#FBF6EA]'
              : tone === 'onMustard'
                ? 'text-[#FBF6EA] bg-[#161616] border-[#161616] shadow-[4px_4px_0_0_#FBF6EA]'
                : 'text-[#161616] bg-[#F5B700] border-[#161616] shadow-[4px_4px_0_0_#161616]'
          }`
        }
      >
        {loading ? 'Opening checkout...' : label}
      </button>
      {error && <p className={`text-xs font-body font-semibold max-w-xs text-center ${tone === 'ink' ? 'text-[#F5B700]' : 'text-[#B92417]'}`}>{error}</p>}
    </div>
  );
}
