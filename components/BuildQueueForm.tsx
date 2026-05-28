'use client';

import { useState } from 'react';

type FormState = {
  name: string;
  email: string;
  businessName: string;
  ideaDescription: string;
  revenueRange: string;
  timeline: string;
};

const REVENUE_OPTIONS = [
  { value: 'pre-revenue', label: 'Just getting started' },
  { value: 'under-100k', label: 'Under $100K' },
  { value: '100k-500k', label: '$100K to $500K' },
  { value: '500k-1m', label: '$500K to $1M' },
  { value: '1m-plus', label: '$1M+' },
];

const TIMELINE_OPTIONS = [
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'next-quarter', label: 'Next quarter' },
  { value: 'exploring', label: 'Exploring' },
];

export default function BuildQueueForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    businessName: '',
    ideaDescription: '',
    revenueRange: '',
    timeline: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/build-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(data.error ?? 'Something went wrong. Try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Try again or email sarah@modernmustardseed.com.');
    }
  };

  if (status === 'success') {
    return (
      <div className="glass-card p-10 md:p-14 text-center">
        <div className="text-5xl mb-6">🌱</div>
        <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
          You&rsquo;re on the list.
        </h2>
        <p className="text-white/60 text-base md:text-lg font-body font-light max-w-md mx-auto leading-relaxed">
          Sarah reviews every entry. You&rsquo;ll hear back within 3 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 md:p-10 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">
            Name
          </label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30 transition-colors"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">
            Email
          </label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30 transition-colors"
            placeholder="you@company.com"
          />
        </div>
      </div>

      <div>
        <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">
          Business or idea name
        </label>
        <input
          required
          type="text"
          value={form.businessName}
          onChange={(e) => update('businessName', e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30 transition-colors"
          placeholder="What it&rsquo;s called, or what you&rsquo;d call it"
        />
      </div>

      <div>
        <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">
          One-line description of what you want built
        </label>
        <textarea
          required
          rows={3}
          value={form.ideaDescription}
          onChange={(e) => update('ideaDescription', e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30 transition-colors resize-none"
          placeholder="The shortest version of what this thing is and who it&rsquo;s for."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">
            Current revenue range
          </label>
          <select
            required
            value={form.revenueRange}
            onChange={(e) => update('revenueRange', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body focus:outline-none focus:border-mustard-500/30 transition-colors"
          >
            <option value="">Select range</option>
            {REVENUE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-neutral-900">
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">
            Timeline urgency
          </label>
          <select
            required
            value={form.timeline}
            onChange={(e) => update('timeline', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body focus:outline-none focus:border-mustard-500/30 transition-colors"
          >
            <option value="">Select urgency</option>
            {TIMELINE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-neutral-900">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <p className="text-red-400 text-sm font-body text-center">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-lg hover:shadow-[0_0_30px_rgba(255,107,53,0.25)] transition-all disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending...' : 'Join the Build Queue'}
      </button>

      <p className="text-center text-white/30 text-xs font-body font-light italic">
        Sarah reviews every entry personally. You will hear back within 3 business days.
      </p>
    </form>
  );
}
