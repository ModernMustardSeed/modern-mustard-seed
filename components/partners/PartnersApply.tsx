'use client';

import { useState, FormEvent } from 'react';

export default function PartnersApply() {
  const [form, setForm] = useState({ name: '', email: '', link: '', promoteWhere: '', audience: '', why: '' });
  const [sent, setSent] = useState(false);
  const [already, setAlready] = useState(false);
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
      if (res.ok) {
        setAlready(Boolean(data.alreadyPartner));
        setSent(true);
      } else setError(data.error ?? 'Something went wrong.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent && already) {
    return (
      <div className="bg-white border-2 border-[#0d0d0d] rounded-2xl shadow-[6px_6px_0_0_#0d0d0d] p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-[#ffd400]/20 border border-[#0d0d0d]/25 flex items-center justify-center mx-auto mb-5">
          <span className="text-[#0d0d0d] text-xl">★</span>
        </div>
        <h3 className="font-display text-2xl font-semibold text-[#0d0d0d] mb-2">You're already a partner</h3>
        <p className="text-[#3A3733] font-body text-sm leading-relaxed mb-5">
          Good news, this email is already an approved partner. Nothing to re-apply for. Sign in to grab your link, your free access, and the Outreach Playbook.
        </p>
        <a
          href="/portal/login"
          className="inline-block px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0d0d0d] bg-[#ffd400] border-2 border-[#0d0d0d] rounded-full shadow-[3px_3px_0_0_#0d0d0d] hover:shadow-[4px_4px_0_0_#0d0d0d] hover:-translate-y-0.5 transition-all"
        >
          Sign in to your dashboard
        </a>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="bg-white border-2 border-[#0d0d0d] rounded-2xl shadow-[6px_6px_0_0_#0d0d0d] p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-[#ffd400]/20 border border-[#0d0d0d]/25 flex items-center justify-center mx-auto mb-5">
          <span className="text-[#0d0d0d] text-xl">✓</span>
        </div>
        <h3 className="font-display text-2xl font-semibold text-[#0d0d0d] mb-2">You're on the list</h3>
        <p className="text-[#3A3733] font-body text-sm leading-relaxed">
          Thank you for wanting to share this. Check your inbox for a note from me confirming it arrived. Sarah reviews every application personally, and when you're approved you'll get a warm welcome with your links, free access to everything, and a passwordless way into your dashboard.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border-2 border-[#0d0d0d] rounded-2xl shadow-[6px_6px_0_0_#0d0d0d] p-7 md:p-8 max-w-lg mx-auto space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Your name"><input required value={form.name} onChange={set('name')} className={inputCls} placeholder="Jane Builder" /></Field>
        <Field label="Email"><input required type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="you@example.com" /></Field>
      </div>
      <Field label="Your main link"><input value={form.link} onChange={set('link')} className={inputCls} placeholder="Your channel, profile, newsletter or website" /></Field>
      <Field label="Where will you promote?"><input value={form.promoteWhere} onChange={set('promoteWhere')} className={inputCls} placeholder="YouTube, a newsletter, a chamber, your client list..." /></Field>
      <Field label="Your audience (size and shape)"><input value={form.audience} onChange={set('audience')} className={inputCls} placeholder="e.g. 8k builders on X, mostly non-technical founders" /></Field>
      <Field label="Why do you want in?"><textarea value={form.why} onChange={set('why')} rows={3} className={inputCls} placeholder="What draws you to sharing these tools?" /></Field>
      {error && <p className="text-[#d0241b] text-xs font-body">{error}</p>}
      <button type="submit" disabled={sending} className="w-full px-6 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0d0d0d] bg-[#ffd400] border-2 border-[#0d0d0d] rounded-full shadow-[3px_3px_0_0_#0d0d0d] hover:shadow-[4px_4px_0_0_#0d0d0d] hover:-translate-y-0.5 transition-all disabled:opacity-50">
        {sending ? 'Sending...' : 'Apply to partner'}
      </button>
      <p className="text-[#0d0d0d]/45 font-body text-[11px] text-center">10% of every build and service, 50% on products, plus the full Outreach Playbook and your own booking link.</p>
    </form>
  );
}

const inputCls = 'w-full bg-white border-2 border-[#0d0d0d] rounded-lg px-4 py-2.5 text-sm text-[#0d0d0d] placeholder-[#0d0d0d]/30 focus:outline-none focus:ring-2 focus:ring-[#ffd400]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.3em] text-[#0d0d0d]/50 font-mono font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
