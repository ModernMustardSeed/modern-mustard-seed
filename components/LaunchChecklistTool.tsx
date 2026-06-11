'use client';

import { useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';
import {
  VERTICALS,
  checklistForVertical,
  itemIdsForVertical,
  type VerticalId,
} from '@/data/launch-checklist';
import { trackLead } from '@/lib/analytics';

/**
 * Public interactive lead magnet. Pick your industry, see a live tailored
 * checklist, and unlock the branded PDF one-pager with your email. Captures the
 * lead, then reveals the download and a soft "have us do it" CTA.
 */
export default function LaunchChecklistTool() {
  const [vertical, setVertical] = useState<VerticalId>('general');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const phases = useMemo(() => checklistForVertical(vertical), [vertical]);
  const total = itemIdsForVertical(vertical).length;
  const active = VERTICALS.find((v) => v.id === vertical)!;
  const pdfUrl = `/api/launch-checklist/pdf?vertical=${vertical}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim(), vertical, company }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        trackLead({ source: 'launch-checklist' });
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
      {/* Industry selector */}
      <div className="mb-10">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-4 block text-center">
          Step 1. Pick your field
        </span>
        <div className="flex flex-wrap justify-center gap-3">
          {VERTICALS.map((v) => {
            const isActive = v.id === vertical;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVertical(v.id)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-sans font-bold transition-all ${
                  isActive
                    ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[3px_3px_0_0_#161616]'
                    : 'bg-white text-[#161616]/70 border-[#161616]/25 hover:border-[#161616] hover:text-[#161616]'
                }`}
              >
                <span aria-hidden className="text-base">{v.emoji}</span>
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-center text-[#3A3733] font-body text-sm mt-5 max-w-xl mx-auto">
          {active.blurb} <span className="text-[#161616]/45">({active.examples})</span>
        </p>
      </div>

      {/* Live checklist */}
      <div className="text-center mb-6">
        <span className="inline-block pop-card-yellow px-5 py-2 text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]">
          {total} steps tailored to {active.label}
        </span>
      </div>

      <div className="space-y-5">
        {phases.map((phase) => (
          <div key={phase.id} className="pop-card p-6 md:p-7">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold shrink-0">
                {phase.eyebrow}
              </span>
              <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight">
                {phase.title}
              </h3>
            </div>
            <p className="text-[#3A3733] font-body text-sm leading-relaxed mb-4">{phase.blurb}</p>

            <ul className="divide-y divide-[#161616]/10">
              {phase.items.map((item) => {
                const isExp = !!expanded[item.id];
                const isTicked = !!ticked[item.id];
                return (
                  <li key={item.id} className="py-3.5">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isTicked}
                        aria-label={`Mark ${item.title}`}
                        onClick={() => setTicked((t) => ({ ...t, [item.id]: !isTicked }))}
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 border-[#161616] flex items-center justify-center shrink-0 transition-colors ${
                          isTicked ? 'bg-emerald-500' : 'bg-white hover:bg-[#FFF8E6]'
                        }`}
                      >
                        {isTicked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setExpanded((x) => ({ ...x, [item.id]: !isExp }))}
                            aria-expanded={isExp}
                            className="text-left min-w-0"
                          >
                            <span className={`font-sans font-bold text-[15px] tracking-tight ${isTicked ? 'text-[#161616]/40 line-through' : 'text-[#161616]'}`}>
                              {item.title}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpanded((x) => ({ ...x, [item.id]: !isExp }))}
                            aria-label={isExp ? 'Hide details' : 'Show how-to'}
                            className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#1E50C8] hover:text-[#161616] shrink-0 mt-0.5"
                          >
                            {isExp ? 'Hide' : 'How to'}
                          </button>
                        </div>

                        <p className="text-[#3A3733] font-body text-[13px] leading-5 mt-1">{item.why}</p>

                        {(item.time || item.cost) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.time && (
                              <span className="text-[10px] font-mono text-[#161616]/55 bg-[#161616]/[0.05] px-2 py-0.5 rounded-full">{item.time}</span>
                            )}
                            {item.cost && (
                              <span className="text-[10px] font-mono text-[#161616]/55 bg-[#161616]/[0.05] px-2 py-0.5 rounded-full">{item.cost}</span>
                            )}
                          </div>
                        )}

                        {isExp && (
                          <div className="mt-3 space-y-3">
                            {item.steps?.length > 0 && (
                              <ul className="space-y-1.5">
                                {item.steps.map((s, i) => (
                                  <li key={i} className="flex gap-2 text-[13px] text-[#3A3733] font-body leading-5">
                                    <span className="text-[#F5B700] font-bold shrink-0" aria-hidden>•</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {item.note && (
                              <div className="bg-[#FFF8E6] border border-[#161616]/15 rounded-lg px-3 py-2">
                                <span className="text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-0.5">
                                  For {active.label}
                                </span>
                                <p className="text-[13px] text-[#161616]/80 font-body leading-5">{item.note}</p>
                              </div>
                            )}
                            {item.links && item.links.length > 0 && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                {item.links.map((l) => (
                                  <a
                                    key={l.url}
                                    href={l.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[12px] font-sans font-semibold text-[#1E50C8] hover:text-[#161616] underline decoration-[#1E50C8]/30 underline-offset-2"
                                  >
                                    {l.label} ↗
                                  </a>
                                ))}
                              </div>
                            )}
                            {item.mms && (
                              <Link
                                href={item.mms.href}
                                className="inline-flex items-center gap-1.5 text-[12px] font-sans font-extrabold text-[#161616] hover:text-[#E0301E]"
                              >
                                {item.mms.label} →
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Email gate / download */}
      <div id="get-it" className="mt-10 scroll-mt-28">
        {done ? (
          <div className="pop-card-yellow p-8 md:p-10 text-center">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#161616] font-mono font-bold block mb-3">
              Your checklist is ready
            </span>
            <h3 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-3">
              Check your email, and grab the PDF
            </h3>
            <p className="text-[#161616]/75 font-body mb-7 max-w-lg mx-auto">
              We sent your tailored checklist to {email}. Download the printable one-pager below, then keep it handy as you build.
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
                Have us set it all up
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="pop-card p-8 md:p-10">
            <div className="text-center mb-6">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-3 block">
                Step 2. Get the printable one-pager
              </span>
              <h3 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight">
                Send me the{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  full checklist
                </span>
              </h3>
              <p className="text-[#3A3733] font-body text-sm mt-3 max-w-md mx-auto">
                A branded PDF tailored to {active.label}, plus the occasional play we use in real client builds. No spam.
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
                placeholder="Phone (optional, for a quick fit-check)"
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
                {sending ? 'Sending...' : 'Email me the checklist'}
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
