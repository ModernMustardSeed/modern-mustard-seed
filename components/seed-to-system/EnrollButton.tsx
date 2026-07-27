'use client';

import { useState } from 'react';

export default function EnrollButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      let ref: string | undefined;
      const match = document.cookie.match(/(?:^|;\s*)mms_ref=([^;]+)/);
      if (match) ref = decodeURIComponent(match[1]);

      const response = await fetch('/api/seed-to-system/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref }),
      });
      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      setError(data.message || 'Checkout is not available yet. Join the free class and Sarah will keep you posted.');
    } catch {
      setError('The checkout connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-[#161616] bg-[#F5B700] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[4px_4px_0_0_#161616] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65"
      >
        {loading ? 'Opening secure checkout...' : 'Take a founding seat · $997'}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-center font-body text-xs leading-relaxed text-[#B62618]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
