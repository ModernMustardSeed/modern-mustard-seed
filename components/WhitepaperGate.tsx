'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * Email gate for the AI voice agent whitepaper. Captures the lead into the CRM
 * (via /api/whitepaper), emails the PDF, and reveals an instant download. Turns
 * the whitepaper into a lead magnet that feeds the speed-to-lead engine.
 */
export default function WhitepaperGate() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [pdfUrl, setPdfUrl] = useState('/downloads/ai-voice-agents-whitepaper.pdf');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    if (!email.includes('@')) { setError('A valid email, please.'); return; }
    setError('');
    setState('sending');
    trackEvent('whitepaper_request', { location: 'whitepaper-gate' });
    try {
      const res = await fetch('/api/whitepaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, company }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        if (json.pdfUrl) setPdfUrl(json.pdfUrl);
        setState('done');
        window.open(json.pdfUrl || pdfUrl, '_blank', 'noopener,noreferrer');
      } else {
        setError(json.error || 'Something went wrong. Try again.');
        setState('error');
      }
    } catch {
      setError('Network hiccup. Try again.');
      setState('error');
    }
  };

  const inp =
    'w-full bg-white border-2 border-[#161616] rounded-lg px-3.5 py-2.5 text-sm text-[#161616] placeholder-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';

  if (state === 'done') {
    return (
      <div className="pop-card p-6 text-center">
        <p className="font-display text-xl font-black text-[#161616] mb-1.5">Check your inbox.</p>
        <p className="text-[#3a3733] text-sm font-body mb-4">It is on its way, and it just opened in a new tab.</p>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
        >
          Open the PDF again
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="pop-card p-6">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1.5">
        Free whitepaper
      </span>
      <p className="font-display text-xl font-black text-[#161616] mb-3 leading-snug">Get the PDF</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inp} autoComplete="name" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Email" className={inp} autoComplete="email" />
      </div>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional, for a quick callback)" className={`${inp} mb-3`} autoComplete="tel" />
      <input value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending...' : 'Send me the whitepaper'}
      </button>
      {error && <p className="text-[#9B3022] text-xs font-mono mt-2">{error}</p>}
      <p className="text-[#161616]/45 text-[11px] font-body mt-2">No spam. The PDF, and the occasional play worth stealing.</p>
    </form>
  );
}
