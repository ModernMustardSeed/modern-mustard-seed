'use client';

import { useState } from 'react';
import { ErrorNote, inputCls, isEmail } from '@/components/bootcamp/ui';

/**
 * "Send me my room link." Same answer whether or not the address is
 * registered; the link only ever goes to the address on the registration.
 */
export default function RoomLinkForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) {
      setState('error');
      setError('The email you registered with.');
      return;
    }
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/bootcamp/room/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setState('error');
        setError(data.error || 'That did not go through.');
        return;
      }
      setState('sent');
    } catch {
      setState('error');
      setError('We could not reach the server.');
    }
  }

  if (state === 'sent') {
    return (
      <p role="status" className={`font-body text-[15px] leading-relaxed ${dark ? 'text-[#fbf5ea]' : 'text-[#0b3b44]'}`}>
        If <strong>{email.trim().toLowerCase()}</strong> has a seat, the room link is on its way to that inbox now, from sarah@modernmustardseed.com. Check promotions and spam if it is not there in a minute.
      </p>
    );
  }

  return (
    <form onSubmit={send} noValidate className="space-y-3">
      <label htmlFor="room-link-email" className={`block font-mono text-[10px] font-bold uppercase tracking-[0.26em] ${dark ? 'text-[#81d8d0]' : 'text-[#5c554a]'}`}>
        Send me my room link
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          id="room-link-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="The email you registered with"
          className={`${inputCls} flex-1`}
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="shrink-0 rounded-full border-2 border-[#0b3b44] bg-[#f5b700] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0b3b44] shadow-[3px_3px_0_0_#0b3b44] transition-all hover:-translate-y-0.5 disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Send it'}
        </button>
      </div>
      {state === 'error' && <ErrorNote>{error}</ErrorNote>}
    </form>
  );
}
