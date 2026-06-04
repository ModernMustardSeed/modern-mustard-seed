'use client';

import { useEffect, useState } from 'react';

export default function ProposalSignPay({
  token,
  signedName,
  depositStatus,
  depositDue,
}: {
  token: string;
  signedName: string | null;
  depositStatus: string;
  depositDue: number;
}) {
  const [signed, setSigned] = useState<string | null>(signedName);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('paid') === '1') setJustPaid(true);
  }, []);

  const paid = depositStatus === 'paid' || justPaid;
  const money = (n: number) => `$${n.toLocaleString('en-US')}`;

  const sign = async () => {
    if (!name.trim() || !agree || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/proposal/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) setError((j && j.error) || 'Could not sign. Try again.');
      else setSigned(name.trim());
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/proposal/${token}/pay`, { method: 'POST' });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.url) setError((j && j.error) || 'Could not start checkout. Try again.');
      else window.location.href = j.url;
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (paid) {
    return (
      <div className="mt-6 pop-card-yellow p-8 text-center">
        <div className="text-4xl mb-3">🌱</div>
        <h2 className="font-display text-2xl font-black text-[#161616] mb-2">It is official</h2>
        <p className="text-[#161616]/75 font-body font-medium max-w-md mx-auto">
          Signed and deposit received. Your project space is live and Sarah is on it. Check your email for
          your portal link.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 pop-card p-7 md:p-8">
      {!signed ? (
        <>
          <h2 className="font-display text-xl font-black text-[#161616] mb-1">Sign to accept</h2>
          <p className="text-[#3a3733] text-sm font-body mb-5">
            Type your full name to sign. This is your acceptance of the scope and price above.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-base font-display italic text-[#161616] placeholder:text-[#161616]/35 placeholder:not-italic focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow mb-4"
          />
          <label className="flex items-start gap-3 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-[#F5B700] flex-shrink-0"
            />
            <span className="text-[13px] text-[#3a3733] font-body leading-relaxed">
              I have authority to accept this proposal and I agree to the scope, price, and terms.
            </span>
          </label>
          {error && <p className="text-[#E0301E] text-sm font-body font-bold mb-3">{error}</p>}
          <button
            onClick={sign}
            disabled={busy || !name.trim() || !agree}
            className="w-full py-4 text-[12px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-lg border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-40"
          >
            {busy ? 'Signing…' : 'Sign and accept'}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#1E50C8] text-lg">✓</span>
            <h2 className="font-display text-xl font-black text-[#161616]">Signed by {signed}</h2>
          </div>
          <p className="text-[#3a3733] text-sm font-body mb-5">
            One step left. Pay the 50% deposit to put your build on the calendar. Secure checkout by Stripe.
          </p>
          {error && <p className="text-[#E0301E] text-sm font-body font-bold mb-3">{error}</p>}
          <button
            onClick={pay}
            disabled={busy}
            className="w-full py-4 text-[12px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-lg border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-40"
          >
            {busy ? 'Opening checkout…' : `Pay ${money(depositDue)} deposit to begin`}
          </button>
        </>
      )}
    </div>
  );
}
