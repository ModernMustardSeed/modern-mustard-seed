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
      <div className="pop-card-yellow p-10 md:p-14 text-center">
        <div className="text-5xl mb-6">🌱</div>
        <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mb-4">
          You&rsquo;re on the list
        </h2>
        <p className="text-[#161616]/80 text-base md:text-lg font-body font-medium max-w-md mx-auto leading-relaxed">
          Sarah reviews every entry. You&rsquo;ll hear back within 3 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pop-card p-8 md:p-10 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
            Name
          </label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
            Email
          </label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
            placeholder="you@company.com"
          />
        </div>
      </div>

      <div>
        <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
          Business or idea name
        </label>
        <input
          required
          type="text"
          value={form.businessName}
          onChange={(e) => update('businessName', e.target.value)}
          className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
          placeholder="What it&rsquo;s called, or what you&rsquo;d call it"
        />
      </div>

      <div>
        <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
          One-line description of what you want built
        </label>
        <textarea
          required
          rows={3}
          value={form.ideaDescription}
          onChange={(e) => update('ideaDescription', e.target.value)}
          className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow resize-none"
          placeholder="The shortest version of what this thing is and who it&rsquo;s for."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
            Current revenue range
          </label>
          <select
            required
            value={form.revenueRange}
            onChange={(e) => update('revenueRange', e.target.value)}
            className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
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
          <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
            Timeline urgency
          </label>
          <select
            required
            value={form.timeline}
            onChange={(e) => update('timeline', e.target.value)}
            className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
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
        <p className="text-[#E0301E] text-sm font-body font-bold text-center">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-lg border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending...' : 'Join the Build Queue'}
      </button>

      <p className="text-center text-[#161616]/45 text-xs font-body italic">
        Sarah reviews every entry personally. You will hear back within 3 business days.
      </p>
    </form>
  );
}
