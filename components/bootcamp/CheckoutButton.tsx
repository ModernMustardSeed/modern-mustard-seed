'use client';

import { useState } from 'react';
import type { BootcampPaidSlug } from '@/data/bootcamp';
import { ErrorNote, SUPPORT_EMAIL } from './ui';

/**
 * One button, one tier. POSTs /api/bootcamp/checkout and follows the Stripe
 * URL it returns. The server decides the price; this never carries a number.
 * When enrollment is closed the button says so and does nothing. From the room
 * it also carries the buyer's email (Stripe opens prefilled) and the host who
 * brought their masterclass seat, so that host is credited for the ticket.
 */
export default function CheckoutButton({
  tier,
  label,
  open,
  className,
  closedLabel = 'Enrollment closed',
  email,
  host,
}: {
  tier: BootcampPaidSlug;
  label: string;
  open: boolean;
  className: string;
  closedLabel?: string;
  email?: string;
  host?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function go() {
    if (!open || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/bootcamp/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, ...(email ? { email } : {}), ...(host ? { host } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || 'Checkout did not open. Try once more, or email ' + SUPPORT_EMAIL + ' and we will send you a direct link.');
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError('We could not reach checkout. Check your connection and try again, or email ' + SUPPORT_EMAIL + '.');
      setBusy(false);
    }
  }

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={go}
        disabled={!open || busy}
        aria-busy={busy}
        aria-disabled={!open || busy}
        className={`${className} w-full`}
      >
        {!open ? closedLabel : busy ? 'Opening checkout…' : label}
      </button>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
    </div>
  );
}
