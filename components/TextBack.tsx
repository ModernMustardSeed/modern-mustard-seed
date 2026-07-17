'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';

/**
 * TEXT-BACK: the visitor drops their number, we text them within seconds and
 * the conversation moves to their pocket. Client half only; TextBackGate
 * (server) decides whether this renders at all, so the site never shows a
 * text button that cannot text.
 */
export default function TextBack() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === 'sending' || phase === 'sent') return;
    setPhase('sending');
    setError('');
    track('textback_submit');
    try {
      const res = await fetch('/api/textback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || 'The text did not go through. Call (406) 312-1223 instead.');
      track('textback_sent');
      setPhase('sent');
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'The text did not go through. Call (406) 312-1223 instead.');
    }
  }

  if (phase === 'sent') {
    return (
      <div className="bg-[#161616] border-[3px] border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 text-center">
        <span className="inline-block text-4xl animate-[tbBuzz_.5s_ease-in-out_3]" aria-hidden>
          📱
        </span>
        <style>{`@keyframes tbBuzz{0%,100%{transform:rotate(0)}25%{transform:rotate(-9deg)}75%{transform:rotate(9deg)}}`}</style>
        <p className="font-display font-extrabold text-2xl text-[#FBF6EA] mt-3">Check your phone.</p>
        <p className="font-body text-[14.5px] text-[#FBF6EA]/70 mt-2 max-w-sm mx-auto">
          The first text is on its way. Reply to it and a human picks up the thread.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border-[3px] border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#1E50C8] p-6 sm:p-7">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-[#E0301E]">📱 Allergic to forms?</p>
      <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-[#161616] mt-2 leading-tight">
        Text me <em className="italic text-[#B48600]">back</em>.
      </h3>
      <p className="font-body text-[14px] text-[#3d382e] mt-2">
        Drop your number and our first text lands in seconds. Reply whenever; a human answers.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <input
          type="tel"
          required
          value={values.phone || ''}
          onChange={set('phone')}
          placeholder="(406) 555-0123"
          aria-label="Your mobile number"
          className="w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
        />
        <input
          type="text"
          value={values.name || ''}
          onChange={set('name')}
          placeholder="First name (optional)"
          aria-label="First name"
          className="w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
        />
      </div>
      <input
        type="text"
        value={values.need || ''}
        onChange={set('need')}
        maxLength={200}
        placeholder="What do you need? (optional, it makes our first text smarter)"
        aria-label="What do you need"
        className="mt-3 w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[14px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
      />

      {/* Honeypot: humans never see it. */}
      <input type="text" tabIndex={-1} autoComplete="off" value={values.company_url || ''} onChange={set('company_url')} className="hidden" aria-hidden />

      <button
        type="submit"
        disabled={phase === 'sending'}
        className="mt-4 w-full bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-6 py-3.5 font-sans font-bold uppercase tracking-[0.1em] text-[14px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-transform disabled:opacity-60"
      >
        {phase === 'sending' ? 'Texting you now…' : 'Text me back →'}
      </button>
      {phase === 'error' && error ? <p className="font-body text-[13px] text-[#E0301E] text-center mt-2.5">{error}</p> : null}
      <p className="font-body text-[11.5px] text-[#161616]/50 mt-3 leading-relaxed">
        By tapping, you agree to receive a text from Modern Mustard Seed at this number. Reply STOP any time to opt out. Message and data rates may apply.
      </p>
    </form>
  );
}
