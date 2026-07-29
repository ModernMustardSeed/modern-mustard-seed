'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MUSTARD_TREE } from '@/data/mustard-tree';

type Result = { number: number | null; code: string | null; already?: boolean };

/**
 * The Founding Grove signup. Captures email + an optional one-sentence seed,
 * carries a ?ref= code so referrals credit the planter who shared the link,
 * and answers with the visitor's planting number plus their own share link.
 * Rendered inside <Suspense> (useSearchParams).
 */
export default function WaitlistForm() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || '';

  const [email, setEmail] = useState('');
  const [idea, setIdea] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = result?.code ? `https://modernmustardseed.com/mustard-tree?ref=${result.code}` : '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch('/api/mustard-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, idea, ref, company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Something went wrong');
      setResult({ number: data.number ?? null, code: data.code ?? null, already: data.already });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard denied: the link is visible to select manually */
    }
  }

  if (status === 'done' && result) {
    return (
      <div aria-live="polite" className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C4160B] font-bold">
          {result.already ? '[ Already In The Grove ]' : '[ Your Seed Is In The Ground ]'}
        </p>
        <p className="font-display text-5xl md:text-6xl font-black tracking-tight mt-3">
          Planting No. {result.number != null ? String(result.number).padStart(3, '0') : '···'}
        </p>
        <p className="font-body text-[#161616]/70 mt-3 max-w-md mx-auto">
          {MUSTARD_TREE.grove.referralNote} Share your planting link:
        </p>
        {shareUrl ? (
          <div className="mt-5 flex flex-col sm:flex-row items-stretch gap-3 max-w-xl mx-auto">
            <code className="flex-1 font-mono text-[12px] md:text-[13px] bg-white border-2 border-[#161616] px-4 py-3.5 overflow-x-auto whitespace-nowrap text-left">
              {shareUrl}
            </code>
            <button
              type="button"
              onClick={copyLink}
              className="bg-[#F5B700] text-[#161616] font-bold text-sm rounded-full px-7 py-3.5 border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#161616] transition"
            >
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        ) : (
          <p className="font-body text-[#161616]/70 mt-4">You are in. Watch your inbox for your planting number.</p>
        )}
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/70 mt-6">
          Confirmation sent to {email}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto">
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] font-bold">Your Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="mt-2 w-full bg-white border-2 border-[#161616] px-4 py-3.5 font-body text-base placeholder:text-[#161616]/40 focus:outline-none focus:shadow-[4px_4px_0_0_#F5B700]"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] font-bold">
            Your Seed <span className="text-[#161616]/50 normal-case tracking-normal font-normal">(one sentence, optional)</span>
          </span>
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            maxLength={200}
            placeholder={`e.g. ${MUSTARD_TREE.seedExample}`}
            className="mt-2 w-full bg-white border-2 border-[#161616] px-4 py-3.5 font-body text-base placeholder:text-[#161616]/40 focus:outline-none focus:shadow-[4px_4px_0_0_#F5B700]"
          />
        </label>
        {/* Honeypot: humans never see or fill this. */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-[#F5B700] text-[#161616] font-bold text-base rounded-full px-8 py-4 border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#161616] transition disabled:opacity-60 disabled:cursor-wait"
        >
          {status === 'loading' ? 'Planting…' : MUSTARD_TREE.grove.button}
        </button>
      </div>
      <p aria-live="polite" className="mt-3 min-h-[1.25rem]">
        {status === 'error' && (
          <span className="font-body text-sm text-[#C4160B] font-bold">
            That didn&apos;t take. Check your email address and try again.
          </span>
        )}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#161616]/70 mt-2">
        No spam. Grove updates only, and your number is yours.
      </p>
    </form>
  );
}
