'use client';

import { useEffect, useRef, useState } from 'react';

type Booked = { name: string | null; phone: string | null; service: string | null; when: string };

/**
 * "Have it call my phone." The receptionist rings a real cell, and afterward
 * the owner's text lands on that same phone. The page watches the run so the
 * phone mock fills in too.
 */
export default function WlRing({
  agency,
  client,
  sample,
  city,
  siteKey,
  bg,
  fg,
  onBooked,
}: {
  agency: string;
  client: string;
  sample: string;
  city: string;
  siteKey: string | null;
  bg: string;
  fg: string;
  onBooked: (b: Booked[]) => void;
}) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'dialing' | 'ringing' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const poll = useRef<number | null>(null);

  useEffect(() => () => {
    if (poll.current) window.clearInterval(poll.current);
  }, []);

  const ring = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('dialing');
    setMsg('');
    try {
      const res = await fetch('/api/white-label/demo-ring', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agency, client, sample, city, siteKey, phone, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'The call could not be placed.');
      setState('ringing');
      setMsg(`Calling you now as ${client}. Answer, play a customer, book something. The owner’s text lands on this phone when you hang up.`);
      const started = Date.now();
      if (poll.current) window.clearInterval(poll.current);
      poll.current = window.setInterval(async () => {
        if (Date.now() - started > 7 * 60 * 1000) {
          if (poll.current) window.clearInterval(poll.current);
          return;
        }
        const r = await fetch(`/api/white-label/demo-call?run=${data.runId}`).catch(() => null);
        const d = r && r.ok ? await r.json() : null;
        if (d?.booked?.length) {
          onBooked(d.booked);
          if (poll.current) window.clearInterval(poll.current);
        }
      }, 5000);
    } catch (err) {
      setState('error');
      setMsg(err instanceof Error ? err.message : 'The call could not be placed.');
    }
  };

  return (
    <form onSubmit={ring} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="Your cell number"
          value={phone}
          onChange={(e) => setPhone(e.target.value.slice(0, 20))}
          className="min-w-0 flex-1 rounded-full border border-white/30 bg-white/95 px-5 py-3.5 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-white/60"
        />
        <button disabled={state === 'dialing' || state === 'ringing'} className="shrink-0 rounded-full px-6 py-3.5 text-base font-bold shadow-lg disabled:opacity-70" style={{ background: bg, color: fg }}>
          {state === 'dialing' ? 'Dialing…' : state === 'ringing' ? 'Ringing…' : 'Call my phone'}
        </button>
      </div>
      <input
        type="email"
        placeholder="Email for the summary too (optional)"
        value={email}
        onChange={(e) => setEmail(e.target.value.slice(0, 120))}
        className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm placeholder:opacity-60 outline-none"
      />
      <p className="text-sm opacity-80">{msg || 'US and Canadian numbers. Five minute calls. We only use your number for this call and its summary.'}</p>
    </form>
  );
}
