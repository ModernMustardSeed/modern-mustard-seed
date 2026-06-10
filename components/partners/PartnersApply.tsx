'use client';

import { useState, FormEvent } from 'react';

export default function PartnersApply() {
  const [form, setForm] = useState({ name: '', email: '', promoteWhere: '', audience: '', why: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  if (sent) {
    return (
      <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-[#F5B700]/20 border border-[#161616]/25 flex items-center justify-center mx-auto mb-5">
          <span className="text-[#161616] text-xl">✓</span>
        </div>
        <h3 className="font-display text-2xl font-semibold text-[#161616] mb-2">You're on the list</h3>
        <p className="text-[#3A3733] font-body text-sm leading-relaxed">
          Thank you for wanting to share this. Sarah reviews every application personally. When you're approved, you'll get a warm welcome with your links, free access to everything, and a passwordless way into your dashboard.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 md:p-8 max-w-lg mx-auto space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Your name"><input required value={form.name} onChange={set('name')} className={inputCls} placeholder="Jane Builder" /></Field>
        <Field label="Email"><input required type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="you@example.com" /></Field>
      </div>
      <Field label="Where will you promote?"><input value={form.promoteWhere} onChange={set('promoteWhere')} className={inputCls} placeholder="YouTube, a newsletter, X, a community..." /></Field>
      <Field label="Your audience (size and shape)"><input value={form.audience} onChange={set('audience')} className={inputCls} placeholder="e.g. 8k builders on X, mostly non-technical founders" /></Field>
      <Field label="Why do you want in?"><textarea value={form.why} onChange={set('why')} rows={3} className={inputCls} placeholder="What draws you to sharing these tools?" /></Field>
      {error && <p className="text-[#E0301E] text-xs font-body">{error}</p>}
      <button type="submit" disabled={sending} className="w-full px-6 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50">
        {sending ? 'Sending...' : 'Apply to partner'}
      </button>
      <p className="text-[#161616]/45 font-body text-[11px] text-center">One structure for everyone. 50% on products, 10% of builds, free access to all of it.</p>
    </form>
  );
}

const inputCls = 'w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-2.5 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
