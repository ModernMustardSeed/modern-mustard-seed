'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';

/*
 * The free front door of The Launch Film: send the product, get the treatment.
 * Posts to the studio contact route with source "launch-film", which files the
 * lead, mails Sarah the brief and sends the visitor the standard reply. The
 * product URL and the launch notes travel in the message body so nothing new
 * has to exist on the server side for a treatment request to land.
 */
export default function TreatmentForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!name.trim() || !email.trim() || !product.trim()) {
      setError('Your name, an email that reaches you, and the product. That is all it takes.');
      return;
    }
    setBusy(true);
    trackEvent('launch_film_treatment_submit');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          source: 'launch-film',
          message: `Product: ${product.trim()}\n\nWhat is launching: ${notes.trim() || '(not said yet)'}`,
        }),
      });
      if (!res.ok) throw new Error('bad status');
      setDone(true);
    } catch {
      setError('That did not send. Email sarah@modernmustardseed.com with the product link and it lands the same place.');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">[ RECEIVED ]</p>
        <h3 className="font-display text-2xl font-black tracking-tight text-[#161616] mt-2">The product is in the queue.</h3>
        <p className="font-body text-sm leading-relaxed text-[#161616]/75 mt-3">
          We run it, write the treatment, and send it back within two business days: the shot list, the length, the cut points and which tier fits. No charge, and the treatment is yours either way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-7 shadow-[6px_6px_0_0_#161616]">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#161616]/60">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="mt-1.5 w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-sm text-[#161616] outline-none focus:bg-white focus:shadow-[3px_3px_0_0_#F5B700]"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#161616]/60">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1.5 w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-sm text-[#161616] outline-none focus:bg-white focus:shadow-[3px_3px_0_0_#F5B700]"
          />
        </label>
      </div>
      <label className="block mt-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#161616]/60">The product (a link, or a TestFlight, or a name)</span>
        <input
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="https://"
          className="mt-1.5 w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-sm text-[#161616] outline-none placeholder:text-[#161616]/35 focus:bg-white focus:shadow-[3px_3px_0_0_#F5B700]"
        />
      </label>
      <label className="block mt-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#161616]/60">What is launching, and when</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1.5 w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-sm text-[#161616] outline-none focus:bg-white focus:shadow-[3px_3px_0_0_#F5B700]"
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 font-body text-xs leading-relaxed text-[#C4160B]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-full border-2 border-[#161616] bg-[#F5B700] px-6 py-3.5 font-sans text-xs font-extrabold uppercase tracking-[0.18em] text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait"
      >
        {busy ? 'Sending' : 'Send the product, get the treatment'}
      </button>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50">Free · No card · The treatment is yours to keep</p>
    </form>
  );
}
