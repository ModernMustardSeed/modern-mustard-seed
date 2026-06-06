'use client';

import { useState } from 'react';

/**
 * "Email this to me" CTA on a free playbook. Sends the reader the full playbook
 * so they keep it permanently. Pop-art styling to match the playbook pages.
 */
export default function EmailPlaybookCTA({ slug, title }: { slug: string; title: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/playbooks/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, slug }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setStatus('success');
        setMessage(data.message ?? 'Sent. Check your inbox.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage((data && data.error) || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Try again.');
    }
  };

  return (
    <div className="pop-card-yellow p-6 md:p-8 max-w-3xl mx-auto my-12">
      <div className="md:flex md:items-center md:justify-between gap-6">
        <div className="mb-4 md:mb-0 md:flex-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-2">
            Keep this playbook
          </span>
          <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight leading-tight">
            Email this to me
          </h3>
          <p className="text-[#3a3733] text-sm font-body mt-1.5">
            Get the whole thing in your inbox so it is yours to keep, forever.
          </p>
        </div>

        {status === 'success' ? (
          <p className="md:flex-1 text-[#1E50C8] font-body font-bold text-sm md:text-right">{message}</p>
        ) : (
          <form onSubmit={send} className="md:flex-1 flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              aria-label={`Email me the playbook: ${title}`}
              className="flex-1 bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/40 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-lg border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {status === 'sending' ? 'Sending...' : 'Email it to me'}
            </button>
          </form>
        )}
      </div>
      {status === 'error' && <p className="text-[#E0301E] font-body font-bold text-sm mt-3">{message}</p>}
    </div>
  );
}
