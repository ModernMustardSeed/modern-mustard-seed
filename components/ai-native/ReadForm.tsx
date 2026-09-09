'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { AI_NATIVE } from '@/data/ai-native';

/*
 * The free front door of AI NATIVE: send the business, get the AI Read.
 * Posts to the studio contact route with source "ai-native", which files the
 * lead, mails Sarah the brief and sends the visitor the standard reply. The
 * business, the team size and the three things that eat the week travel in
 * the message body so nothing new has to exist on the server side.
 */
const TEAM_SIZES = ['1 to 3', '4 to 10', '11 to 25', '26 to 50', 'More than 50'] as const;

export default function ReadForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [business, setBusiness] = useState('');
  const [team, setTeam] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!name.trim() || !email.trim() || !business.trim()) {
      setError('Your name, an email that reaches you, and the business. That is all it takes.');
      return;
    }
    setBusy(true);
    trackEvent('ai_native_read_submit', { team: team || 'unsaid' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          source: 'ai-native',
          message: `Business: ${business.trim()}\nTeam size: ${team || '(not said yet)'}\n\nWhat eats the week: ${notes.trim() || '(not said yet)'}`,
        }),
      });
      if (!res.ok) throw new Error('bad status');
      setDone(true);
    } catch {
      setError('That did not send. Email sarah@modernmustardseed.com with the business and it lands the same place.');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">[ RECEIVED ]</p>
        <h3 className="font-display text-2xl font-black tracking-tight text-[#161616] mt-2">The business is in the queue.</h3>
        <p className="font-body text-sm leading-relaxed text-[#161616]/75 mt-3">
          We read it and send the AI Read back {AI_NATIVE.readDelivery}: the three AI moves that pay first in your company, what each one costs to run, and which door fits. No charge, and the read is yours either way.
        </p>
      </div>
    );
  }

  const field =
    'mt-1.5 w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-sm text-[#161616] outline-none placeholder:text-[#161616]/35 focus:bg-white focus:shadow-[3px_3px_0_0_#F5B700]';
  const label = 'font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#161616]/60';

  return (
    <form onSubmit={submit} className="rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-7 shadow-[6px_6px_0_0_#161616]">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={label}>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} />
        </label>
        <label className="block">
          <span className={label}>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={field} />
        </label>
      </div>
      <div className="grid sm:grid-cols-[1.4fr_1fr] gap-4 mt-4">
        <label className="block">
          <span className={label}>The business (a website, or a name and a town)</span>
          <input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="https://" className={field} />
        </label>
        <label className="block">
          <span className={label}>People on the team</span>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={field}>
            <option value="">Pick one</option>
            {TEAM_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block mt-4">
        <span className={label}>The three things that eat the week</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Quotes take two days. Nobody answers the phone after four. The Monday numbers take all of Monday."
          className={field}
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
        {busy ? 'Sending' : 'Send the business, get the read'}
      </button>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50">Free · No card · The read is yours to keep</p>
    </form>
  );
}
