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

  const inputCls =
    'flex-1 bg-white border-2 border-[#0b3b44] rounded-lg px-4 py-3 text-base sm:text-sm text-[#0b3b44] font-body placeholder-[#0b3b44]/40 focus:outline-none focus:shadow-[3px_3px_0_0_#0b3b44] transition-shadow';
  const btnCls =
    'px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0b3b44] bg-[#f5b700] rounded-lg border-2 border-[#0b3b44] shadow-[3px_3px_0_0_#0b3b44] hover:-translate-y-0.5 transition-all disabled:opacity-50';

  if (variant === 'inline') {
    return (
      <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className={inputCls}
        />
        <button type="submit" disabled={status === 'sending'} className={btnCls}>
          {status === 'sending' ? 'Sending...' : 'Subscribe'}
        </button>
        {message && (
          <p className={`text-sm font-body font-bold ${status === 'success' ? 'text-[#0a7c78]' : 'text-[#0a7c78]'}`}>
            {message}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="pop-card p-8 md:p-10 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold block mb-3">
          Newsletter
        </span>
        <h3 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-3">
          {headline}
        </h3>
        <p className="text-[#3a3733] text-sm font-body leading-relaxed">{subhead}</p>
      </div>
      <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className={inputCls}
        />
        <button type="submit" disabled={status === 'sending'} className={btnCls}>
          {status === 'sending' ? 'Sending...' : 'Subscribe'}
        </button>
      </form>
      {message && (
        <p
          className={`text-sm font-body font-bold text-center mt-4 ${
            status === 'success' ? 'text-[#0a7c78]' : 'text-[#0a7c78]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
