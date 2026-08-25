'use client';

import { useState } from 'react';

/**
 * "Make it right here." Sarah, 2026-08-20: the outro used to say call Mr.
 * Mustard; now the missing pieces get built from the page itself. Pick what
 * you want, leave an email, and the build queues it on the spot. The suite
 * page renders live off the lead row, so the new piece appears here on its
 * own, and the suite-ready announcement emails them when the build (and its
 * walkthrough film) is done. The phone stays as the human fallback below.
 */
export default function SuiteMoreForm({
  hubId,
  missing,
  hasEmail,
}: {
  hubId: string;
  /** Which buildable pieces this suite does not have yet. */
  missing: ('voice' | 'site')[];
  /** Whether we already hold an email for this business (server-checked). */
  hasEmail: boolean;
}) {
  const [wants, setWants] = useState<Record<'voice' | 'site', boolean>>({
    voice: missing.includes('voice'),
    site: missing.includes('site'),
  });
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const LABEL: Record<'voice' | 'site', string> = {
    voice: 'The voice agent that answers my phone',
    site: 'The website, built the same way',
  };

  const anyWant = missing.some((m) => wants[m]);
  const needEmail = !hasEmail && !email.trim();

  const submit = async () => {
    if (state === 'sending' || !anyWant || needEmail) return;
    setState('sending');
    try {
      const res = await fetch(`/api/demo-hub/${hubId}/request-build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wants: missing.filter((m) => wants[m]),
          email: email.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(j.message || 'Could not queue it just now.');
      setState('done');
      setMsg('On the anvil. The build is building it now: this page updates itself the moment it is ready, and the announcement lands in your inbox.');
    } catch (e) {
      setState('error');
      setMsg(e instanceof Error ? e.message : 'Could not queue it just now.');
    }
  };

  if (state === 'done') {
    return (
      <div className="mt-5 rounded-xl border-2 border-[#161616] bg-[#F5B700] px-5 py-4 text-center">
        <p className="font-display text-lg font-bold text-[#161616]">Building it now.</p>
        <p className="font-body mt-1 text-[13.5px] text-[#161616]/75">{msg}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 mx-auto max-w-md text-left">
      <div className="flex flex-col gap-2">
        {missing.map((m) => (
          <label
            key={m}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
              wants[m] ? 'border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616]' : 'border-[#161616]/30 bg-white hover:border-[#161616]/60'
            }`}
          >
            <input
              type="checkbox"
              checked={wants[m]}
              onChange={(e) => setWants((w) => ({ ...w, [m]: e.target.checked }))}
              className="h-4 w-4 accent-[#161616]"
            />
            <span className="font-display text-[15px] font-bold text-[#161616]">{LABEL[m]}</span>
          </label>
        ))}
      </div>
      {!hasEmail && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com (for the ready announcement)"
          aria-label="Email for the ready announcement"
          className="mt-3 w-full rounded-xl border-2 border-[#161616] bg-[#FFFDF6] px-4 py-3 font-body text-sm text-[#161616] placeholder:text-[#161616]/40 focus:outline-none focus:shadow-[3px_3px_0_0_#161616]"
        />
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything we should know? (optional)"
        aria-label="Anything we should know"
        rows={2}
        className="mt-3 w-full rounded-xl border-2 border-[#161616]/30 bg-white px-4 py-3 font-body text-sm text-[#161616] placeholder:text-[#161616]/40 focus:border-[#161616] focus:outline-none"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={state === 'sending' || !anyWant || needEmail}
        className="mt-3 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-[#161616] bg-[#F5B700] px-5 py-3 font-display text-[17px] font-bold text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#161616] disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <span aria-hidden>🔨</span>
        {state === 'sending' ? 'Queuing…' : 'Build it for me now'}
      </button>
      {state === 'error' && <p className="mt-2 text-center font-mono text-xs text-[#C4160B]">{msg}</p>}
      <p className="mt-2 text-center font-body text-[12px] text-[#161616]/55">
        Still free, still nothing to sign. Prefer a human? <a href="tel:+14063121223" className="underline">(406) 312-1223</a>.
      </p>
    </div>
  );
}
