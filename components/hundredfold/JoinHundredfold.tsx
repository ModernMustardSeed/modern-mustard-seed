'use client';

import { useState, FormEvent } from 'react';
import { GUARANTEE, HUNDREDFOLD, money } from '@/lib/hundredfold';

/**
 * The join button.
 *
 * Three fields and a card, because there is no cohort to wait for and no
 * application to be approved for. The interview above this is the qualifier,
 * and anyone who has been through it already knows whether this is for them.
 *
 * The member row is written before Stripe opens, so an interview taken on the
 * way to the card still has somewhere to attach.
 */
export default function JoinHundredfold({ interviewId }: { interviewId?: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [business, setBusiness] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !email.includes('@')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/hundredfold/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), business: business.trim(), interviewId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.error || 'Could not open checkout.');
      window.location.href = data.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open checkout.');
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#161616]/60 mb-4">
        Join
      </span>
      <form onSubmit={go} className="grid sm:grid-cols-3 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className="bg-white border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          aria-label="Your email"
          className="bg-white border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none"
        />
        <input
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          placeholder="Business name"
          aria-label="Your business name"
          className="bg-white border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !email.includes('@')}
          className="sm:col-span-3 px-6 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-xl border-2 border-[#161616] disabled:opacity-40 hover:-translate-y-0.5 transition-all"
        >
          {busy ? 'Opening checkout…' : `Start Hundredfold · ${money(HUNDREDFOLD.setupCents)} then ${money(HUNDREDFOLD.monthlyCents)}/mo`}
        </button>
      </form>
      <p className="mt-3 text-[#161616]/65 text-xs font-body leading-relaxed">
        {GUARANTEE.short} Month to month, thirty days notice, no exit fee.
      </p>
      {error && <p className="mt-3 text-[#C4160B] text-sm font-body font-bold">{error}</p>}
    </div>
  );
}
