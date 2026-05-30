'use client';

import { useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PortalLogin() {
  const params = useSearchParams();
  const errorFlag = params.get('error');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(errorFlag === 'expired' ? 'That link expired. Enter your email for a fresh one.' : '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/portal/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) setSent(true);
      else setError(data.error ?? 'Something went wrong.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c16] text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500/70 font-mono font-medium block mb-3">Modern Mustard Seed</span>
          <h1 className="font-display text-4xl font-semibold text-cream-50 tracking-tight">Your portal</h1>
          <p className="text-white/50 font-body text-sm mt-3">Everything Sarah built for you, in one place.</p>
        </div>

        {sent ? (
          <div className="glass-card p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-mustard-500/15 border border-mustard-500/30 flex items-center justify-center mx-auto mb-5">
              <span className="text-mustard-300 text-xl">✉</span>
            </div>
            <h2 className="font-sans text-lg font-semibold text-white mb-2">Check your email</h2>
            <p className="text-white/55 font-body text-sm leading-relaxed">
              If <span className="text-white/80">{email}</span> is on file, a secure sign-in link is on its way. It works for 20 minutes.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="mt-6 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-white/40 hover:text-white/70"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="glass-card p-8">
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              autoFocus
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-mustard-500/40 mb-4"
            />
            {error && <p className="text-red-300/90 text-xs font-body mb-4">{error}</p>}
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full px-5 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_30px_rgba(255,107,53,0.45)] transition-all disabled:opacity-40"
            >
              {sending ? 'Sending...' : 'Email me a sign-in link'}
            </button>
            <p className="text-white/30 font-body text-[11px] text-center mt-5 leading-relaxed">
              No password needed. We email you a one-tap link. Bought a playbook? Use the email you purchased with.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
