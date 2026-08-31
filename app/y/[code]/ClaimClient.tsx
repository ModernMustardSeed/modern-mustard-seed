'use client';

import { useState } from 'react';

/**
 * The button the postage was spent on.
 *
 * It asks for one thing before it charges: an email, because the address we
 * scraped is wrong often enough that a fulfilment email would land nowhere, and
 * a $994 first invoice with no receipt address is a chargeback waiting to
 * happen. Everything else Stripe collects.
 */
export default function ClaimClient({
  code,
  knownEmail,
  studioPhone,
}: {
  code: string;
  knownEmail: string | null;
  studioPhone: string;
}) {
  const [email, setEmail] = useState(knownEmail || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    if (busy) return;
    if (!/.+@.+\..+/.test(email.trim())) {
      setError('We need an email to send the receipt and the handover to.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/mailer/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, email: email.trim() }),
      });
      const data = (await res.json()) as { url?: string; message?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.message || `Something went wrong. Call ${studioPhone} and we will finish it by hand.`);
    } catch {
      setError(`Something went wrong. Call ${studioPhone} and we will finish it by hand.`);
    }
    setBusy(false);
  }

  return (
    <div>
      <label htmlFor="claim-email" className="block text-[11px] uppercase tracking-[0.22em] font-bold text-[#161616]/55 mb-2">
        Where should the receipt go
      </label>
      <input
        id="claim-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(null);
        }}
        placeholder="you@yourbusiness.com"
        className="w-full bg-white border-2 border-[#161616] px-4 py-3.5 text-[#161616] text-base placeholder:text-[#161616]/35 focus:outline-none focus:ring-4 focus:ring-[#F5B700]/45 mb-3"
      />

      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="w-full bg-[#F5B700] text-[#161616] border-2 border-[#161616] px-6 py-4 font-extrabold text-base uppercase tracking-[0.14em] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
        style={{ boxShadow: '5px 5px 0 0 #161616' }}
      >
        {busy ? 'Opening checkout…' : 'Make it mine'}
      </button>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-[#B91C1C] font-semibold leading-snug">
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-[13px] text-[#161616]/60 leading-relaxed">
        $497 today, then $497 a month. Month to month, cancel anytime. We customize it with you and put it
        live on your own domain within 7 days. Unlimited changes, always, at no extra charge.
      </p>
    </div>
  );
}
