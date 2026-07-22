'use client';

/**
 * Starts Stripe Checkout for a Chief tier. Posts the tier slug to
 * /api/chief/checkout and redirects to the hosted session. Prices are built
 * server-side from data/chief.ts, so this button never names a dollar amount.
 */

import { useState } from 'react';

export default function ChiefCheckoutButton({
  tier,
  className,
  children,
}: {
  tier: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chief/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.message || 'Checkout hiccuped. Try again, or email sarah@modernmustardseed.com.');
      setLoading(false);
    } catch {
      setError('Checkout hiccuped. Try again, or email sarah@modernmustardseed.com.');
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={go} disabled={loading} className={className} aria-busy={loading}>
        {loading ? 'One moment…' : children}
      </button>
      {error && <span className="mt-2 block font-body text-[12px] text-[#C4160B]">{error}</span>}
    </>
  );
}
