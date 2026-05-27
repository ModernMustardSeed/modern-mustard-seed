'use client';

import { useState } from 'react';

type Props = {
  variant?: 'card' | 'inline';
  headline?: string;
  subhead?: string;
};

export default function NewsletterSignup({
  variant = 'card',
  headline = 'Playbooks. In your inbox.',
  subhead = 'One short email a week. Real plays we use to ship products, run businesses, and make tech feel human. No fluff, no spam.',
}: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message ?? 'You are in. Welcome.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Try again.');
    }
  };

  if (variant === 'inline') {
    return (
      <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30 transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-lg hover:shadow-[0_0_30px_rgba(255,179,71,0.2)] transition-all disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending...' : 'Subscribe'}
        </button>
        {message && (
          <p className={`text-sm font-body ${status === 'success' ? 'text-mustard-300' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="glass-card p-8 md:p-10 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500 font-mono font-bold block mb-3">
          Newsletter
        </span>
        <h3 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight mb-3">
          {headline}
        </h3>
        <p className="text-white/50 text-sm font-body font-light leading-relaxed">{subhead}</p>
      </div>
      <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30 transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-lg hover:shadow-[0_0_30px_rgba(255,179,71,0.2)] transition-all disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending...' : 'Subscribe'}
        </button>
      </form>
      {message && (
        <p
          className={`text-sm font-body text-center mt-4 ${
            status === 'success' ? 'text-mustard-300' : 'text-red-400'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
