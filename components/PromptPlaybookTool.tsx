'use client';

import { useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';
import {
  NICHES,
  playbookForNiche,
  totalPrompts,
  PROMPT_FORMULA,
  type NicheId,
  type ResolvedPrompt,
} from '@/data/prompt-playbook';
import { trackLead } from '@/lib/analytics';

/**
 * Public interactive lead magnet. Pick your niche, watch every prompt rewrite
 * itself for your exact business, copy the ones you want with one tap, and
 * unlock the branded PDF with your email. Built for people who have never
 * used AI and want to start today.
 */
export default function PromptPlaybookTool() {
  const [niche, setNiche] = useState<NicheId>('general');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const categories = useMemo(() => playbookForNiche(niche), [niche]);
  const active = NICHES.find((n) => n.id === niche)!;
  const total = totalPrompts();
  const pdfUrl = `/api/prompt-playbook/pdf?niche=${niche}`;

  const copy = async (p: ResolvedPrompt) => {
    try {
      await navigator.clipboard.writeText(p.text);
      setCopiedId(p.id);
      window.setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1800);
    } catch {
      /* clipboard blocked, the text is still visible to select manually */
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/prompt-playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim(), niche, company }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        trackLead({ source: 'prompt-playbook' });
        setDone(true);
      } else {
        setError(data?.error ?? 'Something went wrong. Try again.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-8">
      {/* Niche selector */}
      <div className="mb-10">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-4 block text-center">
          Step 1. Pick your niche
        </span>
        <div className="flex flex-wrap justify-center gap-3">
          {NICHES.map((n) => {
            const isActive = n.id === niche;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setNiche(n.id)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-sans font-bold transition-all ${
                  isActive
                    ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[3px_3px_0_0_#161616]'
                    : 'bg-white text-[#161616]/70 border-[#161616]/25 hover:border-[#161616] hover:text-[#161616]'
                }`}
              >
                <span aria-hidden className="text-base">{n.emoji}</span>
                <span>{n.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-center text-[#3A3733] font-body text-sm mt-5 max-w-xl mx-auto">
          {active.blurb} <span className="text-[#161616]/45">({active.examples})</span>
        </p>
      </div>

      {/* Never used AI? Two-minute primer */}
      <div className="pop-card-yellow p-6 md:p-8 mb-8">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616] font-mono font-bold block mb-3">
          Never used AI before? Read this first
        </span>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-display text-xl font-black text-[#161616] tracking-tight mb-2">
              It is just a chat box. And it is free.
            </h3>
            <p className="text-[#161616]/80 font-body text-sm leading-relaxed">
              Open{' '}
              <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="font-bold underline decoration-[#161616]/30 underline-offset-2 hover:text-[#E0301E]">
                claude.ai
              </a>{' '}
              or{' '}
              <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="font-bold underline decoration-[#161616]/30 underline-offset-2 hover:text-[#E0301E]">
                chatgpt.com
              </a>
              . Both have a free version, no credit card needed. Paste one of the prompts below into the message box, press enter, and read what comes back. That is the whole thing. You genuinely cannot break it.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl font-black text-[#161616] tracking-tight mb-2">
              Every great prompt has 4 parts
            </h3>
            <ul className="space-y-1.5">
              {PROMPT_FORMULA.map((f) => (
                <li key={f.part} className="text-sm font-body leading-snug">
                  <span className="font-mono font-bold text-[#161616] text-[11px] uppercase tracking-wide">{f.part}.</span>{' '}
                  <span className="text-[#161616]/80">{f.tell}</span>{' '}
                  <span className="text-[#161616]/50 italic">{f.example}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-[#161616]/70 font-body text-xs mt-5 leading-relaxed">
          The prompts below already do all four for you. If an answer is not quite right, just tell it: &ldquo;make it
          shorter,&rdquo; &ldquo;more casual,&rdquo; &ldquo;try again.&rdquo; It never gets tired and it never judges you.
        </p>
      </div>

      {/* Live prompt count */}
      <div className="text-center mb-6">
        <span className="inline-block pop-card-yellow px-5 py-2 text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]">
          {total} prompts written for {active.label}
        </span>
      </div>

      {/* The prompts, by category */}
      <div className="space-y-5">
        {categories.map((cat) => (
          <div key={cat.id} className="pop-card p-6 md:p-7">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold shrink-0">
                {cat.eyebrow}
              </span>
              <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight">{cat.title}</h3>
            </div>
            <p className="text-[#3A3733] font-body text-sm leading-relaxed mb-5">{cat.blurb}</p>

            <div className="space-y-4">
              {cat.prompts.map((p) => {
                const isCopied = copiedId === p.id;
                return (
                  <div key={p.id} className="border-2 border-[#161616]/12 rounded-xl overflow-hidden bg-[#FFFDF6]">
                    <div className="flex items-start justify-between gap-3 px-4 pt-4">
                      <div className="min-w-0">
                        <h4 className="font-sans font-extrabold text-[15px] tracking-tight text-[#161616]">{p.title}</h4>
                        <p className="text-[#3A3733] font-body text-[13px] leading-5 mt-0.5">{p.what}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copy(p)}
                        aria-label={`Copy the ${p.title} prompt`}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 border-[#161616] text-[10px] uppercase tracking-[0.15em] font-mono font-bold transition-all ${
                          isCopied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Copied
                          </>
                        ) : (
                          'Copy'
                        )}
                      </button>
                    </div>
                    <pre className="mt-3 px-4 pb-4 whitespace-pre-wrap font-mono text-[12.5px] leading-[1.6] text-[#161616]/85 select-all">
                      {p.text}
                    </pre>
                    {p.tip && (
                      <div className="bg-[#FFF8E6] border-t border-[#161616]/12 px-4 py-2.5">
                        <span className="text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold mr-2">Tip</span>
                        <span className="text-[12.5px] text-[#161616]/75 font-body leading-5">{p.tip}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Email gate / download */}
      <div id="get-it" className="mt-10 scroll-mt-28">
        {done ? (
          <div className="pop-card-yellow p-8 md:p-10 text-center">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#161616] font-mono font-bold block mb-3">
              Your playbook is ready
            </span>
            <h3 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-3">
              Check your email, and grab the PDF
            </h3>
            <p className="text-[#161616]/75 font-body mb-7 max-w-lg mx-auto">
              We sent your AI Prompt Playbook to {email}, tailored for {active.label}. Download the PDF below, keep it next
              to your keyboard, and start pasting.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Download the PDF
              </a>
              <Link
                href="/work-with-us"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.35)] hover:-translate-y-0.5 transition-all"
              >
                Have us build AI into your business
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="pop-card p-8 md:p-10">
            <div className="text-center mb-6">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-3 block">
                Step 2. Email yourself the whole playbook
              </span>
              <h3 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight">
                Send me the{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  full playbook
                </span>
              </h3>
              <p className="text-[#3A3733] font-body text-sm mt-3 max-w-md mx-auto">
                A branded PDF with all {total} prompts tailored to {active.label}, so you have them forever. Plus the
                occasional AI play we use in real client builds. No spam.
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                aria-label="Email"
                className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-[#161616] font-body placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional, if you want a hand getting started)"
                aria-label="Phone (optional)"
                className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-[#161616] font-body placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              />
              {/* honeypot */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="hidden"
                aria-hidden
              />
              {error && <p className="text-[#E0301E] text-sm font-body text-center">{error}</p>}
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {sending ? 'Sending...' : 'Email me the playbook'}
              </button>
              <p className="text-[#161616]/45 font-body text-[11px] text-center">
                Free. Unsubscribe any time. We never sell your info.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
