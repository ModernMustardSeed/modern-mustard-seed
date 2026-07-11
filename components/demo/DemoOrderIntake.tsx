'use client';

import { useState } from 'react';

/**
 * The two-minute post-purchase intake: everything we need to customize their
 * suite and release it within 7 days. Saves once; a thank-you state replaces
 * the form. No login, keyed by the Stripe session.
 */

const FIELDS: { key: string; label: string; hint: string; placeholder: string; area?: boolean; products?: string[] }[] = [
  { key: 'hours', label: 'Your business hours', hint: 'So the receptionist knows when you are open and the site says the truth.', placeholder: 'Mon-Fri 8-5, Sat 9-noon, closed Sunday' },
  { key: 'services', label: 'What you sell or do', hint: 'The 3-6 things customers actually call about.', placeholder: 'Water heater replacement, drain cleaning, emergency calls...' },
  { key: 'greeting', label: 'How should the phone be answered?', hint: 'The exact first line, in your words.', placeholder: 'Thanks for calling Rico Roofing, this is Rosie, how can I help?', products: ['voice', 'bundle'] },
  { key: 'domain', label: 'Your website domain', hint: 'The domain you own (or want). We handle the pointing.', placeholder: 'ricoroofing.com', products: ['site', 'bundle'] },
  { key: 'brand', label: 'Look and feel', hint: 'Colors, vibe, anything you love or hate.', placeholder: 'Our trucks are navy and orange. Keep it bold, no cursive.' },
  { key: 'contact', label: 'Best number and email for you', hint: 'Where we send drafts and the go-live word.', placeholder: '(406) 555-0123, rico@gmail.com' },
  { key: 'notes', label: 'Anything else we should know?', hint: 'Optional, but gold when you fill it.', placeholder: 'We are closed the first week of August...', area: true },
];

export default function DemoOrderIntake({
  hubId,
  sessionId,
  products,
  business,
}: {
  hubId: string;
  sessionId: string;
  products: string[];
  business: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = FIELDS.filter((f) => !f.products || f.products.some((p) => products.includes(p)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/demo-order/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubId, sessionId, answers: values }),
      });
      if (!res.ok) throw new Error('Save hiccuped. Try once more?');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save hiccuped. Try once more?');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mascot.png" alt="" width={72} height={72} className="mx-auto" />
        <h2 className="font-display text-2xl font-bold mt-4">Got it. We are on it.</h2>
        <p className="font-body text-[#161616]/70 mt-2 max-w-md mx-auto">
          Everything lands with Sarah right now. You will hear from her within one business day, and {business} goes
          live within 7. Questions any time: (406) 312-1223.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 sm:p-8 space-y-5">
      {visible.map((f) => (
        <label key={f.key} className="block">
          <span className="font-sans text-[12px] uppercase tracking-[0.14em] font-bold text-[#161616]">{f.label}</span>
          <span className="block font-body text-[12.5px] text-[#161616]/55 mt-0.5">{f.hint}</span>
          {f.area ? (
            <textarea
              rows={3}
              value={values[f.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="mt-2 w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[14px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            />
          ) : (
            <input
              type="text"
              value={values[f.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="mt-2 w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[14px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            />
          )}
        </label>
      ))}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-7 py-3.5 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-transform disabled:opacity-60"
      >
        {busy ? 'Sending…' : 'Send it to Sarah →'}
      </button>
      {error ? <p className="font-body text-[13px] text-[#E0301E] text-center">{error}</p> : null}
      <p className="font-body text-[12px] text-[#161616]/45 text-center">
        Skip anything you are unsure about. Sarah confirms every detail personally before go-live.
      </p>
    </form>
  );
}
