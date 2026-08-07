'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import RoadmapDocument from '@/components/RoadmapDocument';
import type { RoadmapContext, RoadmapReport } from '@/lib/roadmap-shape';

/**
 * The public tool at /scaling-roadmap.
 *
 * URL in, roadmap out. The optional context panel is collapsed by default
 * because friction kills the funnel, but it is offered loudly enough that the
 * owners who care (the ones worth having) open it, and their roadmaps are twice
 * as good for it.
 */

const LOAD_STEPS = [
  'Reading your homepage',
  'Finding your pricing and services',
  'Working out what you actually sell',
  'Scoring the five dimensions',
  'Finding the one thing capping you',
  'Rebuilding your offer',
  'Pricing the stack',
  'Designing your lead engine',
  'Sequencing the next twelve months',
  'Setting your gates',
];

const CONTEXT_FIELDS: {
  key: keyof RoadmapContext;
  label: string;
  placeholder: string;
  wide?: boolean;
}[] = [
  { key: 'revenue', label: 'Roughly what you make a year', placeholder: 'about $400K' },
  { key: 'team_size', label: 'How many of you there are', placeholder: 'me plus 3' },
  { key: 'main_offer', label: 'What you mainly sell', placeholder: 'kitchen remodels, $30K to $80K' },
  { key: 'price_point', label: 'What you charge for it', placeholder: '$12K average job' },
  {
    key: 'biggest_headache',
    label: 'What is stuck right now',
    placeholder: 'we quote plenty and close maybe one in five',
    wide: true,
  },
  {
    key: 'goal',
    label: 'Where you want to be in twelve months',
    placeholder: 'double revenue without working more Saturdays',
    wide: true,
  },
];

type GenerateResponse = {
  ok: true;
  url: string;
  host: string;
  slug: string | null;
  report: RoadmapReport;
};

export default function ScalingRoadmapEngine() {
  const [url, setUrl] = useState('');
  // ⚠️ Collected BEFORE anything is generated (Sarah, 2026-08-07). The roadmap
  // costs real tokens and is the top of the funnel; it is not handed to
  // anonymous traffic. The full report still renders the moment it is ready.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [context, setContext] = useState<RoadmapContext>({});
  const [showContext, setShowContext] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [report, setReport] = useState<RoadmapReport | null>(null);
  const [meta, setMeta] = useState<{ url: string; host: string; slug: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  // The steps are a promise, not a progress bar. Ten of them over a 60 to 120
  // second call, so the last one lands about when the report does.
  useEffect(() => {
    if (!loading) {
      setLoadStep(0);
      return;
    }
    const t = setInterval(() => setLoadStep((s) => Math.min(s + 1, LOAD_STEPS.length - 1)), 9000);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    if (report && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [report]);

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch('/api/scaling-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), name: name.trim(), email: email.trim(), context }),
      });
      const data = (await res.json()) as GenerateResponse | { error: string };
      if (!res.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : 'The roadmap failed to build.');
      }
      setReport(data.report);
      setMeta({ url: data.url, host: data.host, slug: data.slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The roadmap failed to build.');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = meta?.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://modernmustardseed.com'}/scaling-roadmap/r/${meta.slug}`
    : null;

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setSaveError('Could not copy. Select the link and copy it by hand.');
    }
  };

  /* ── Input ──────────────────────────────────────────────────────── */
  if (!report) {
    return (
      <div className="max-w-3xl mx-auto">
        <form onSubmit={generate}>
          <div className="pop-card p-5 md:p-6 mb-3 grid sm:grid-cols-2 gap-3">
            <label>
              <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5">
                Your name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dana Whitaker"
                disabled={loading}
                aria-label="Your name"
                className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-[#161616] placeholder:text-[#161616]/35 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow disabled:opacity-50"
              />
            </label>
            <label>
              <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5">
                Where we send it
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                disabled={loading}
                required
                aria-label="Your email"
                className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-[#161616] placeholder:text-[#161616]/35 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow disabled:opacity-50"
              />
            </label>
          </div>
          <div className="pop-card p-2 md:p-3 flex flex-col md:flex-row gap-2 md:gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourbusiness.com"
              disabled={loading}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Your website address"
              className="flex-1 bg-transparent text-[#161616] placeholder:text-[#161616]/35 px-4 md:px-5 py-4 font-body text-base md:text-lg focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !url.trim() || !email.includes('@') || name.trim().length < 2}
              className="px-7 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-xl border-2 border-[#161616] hover:-translate-y-0.5 disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {loading ? 'Building…' : 'Build my roadmap →'}
            </button>
          </div>

          {!loading && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowContext((v) => !v)}
                className="text-[10px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 hover:text-[#161616] transition-colors"
              >
                {showContext ? '− Hide the extra questions' : '+ Answer six questions and it gets much better'}
              </button>

              {showContext && (
                <div className="mt-4 pop-card p-6 md:p-7 grid sm:grid-cols-2 gap-4">
                  {CONTEXT_FIELDS.map((field) => (
                    <label key={field.key} className={field.wide ? 'sm:col-span-2' : ''}>
                      <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5">
                        {field.label}
                      </span>
                      <input
                        type="text"
                        value={context[field.key] ?? ''}
                        onChange={(e) => setContext((c) => ({ ...c, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-2.5 text-[#161616] placeholder:text-[#161616]/35 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
                      />
                    </label>
                  ))}
                  <p className="sm:col-span-2 text-[#161616]/60 text-xs font-body">
                    All optional. Nothing here is shared, and none of it is required to get the roadmap.
                  </p>
                </div>
              )}
            </div>
          )}

          {!loading && (
            <p className="text-center text-[#161616]/55 text-xs font-body mt-5">
              Free, no card. It takes about ninety seconds because it is actually reading your site, and the
              whole thing appears right here the moment it is done. We email you a copy too.
            </p>
          )}
        </form>

        {loading && (
          <div className="mt-12 max-w-xl mx-auto" aria-live="polite">
            <div className="space-y-3">
              {LOAD_STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`flex items-center gap-3 text-sm md:text-base font-body font-medium transition-all ${
                    i < loadStep
                      ? 'text-[#1E50C8]'
                      : i === loadStep
                        ? 'text-[#161616] animate-pulse'
                        : 'text-[#161616]/30'
                  }`}
                >
                  <span className="w-5 inline-flex items-center justify-center">
                    {i < loadStep ? '✓' : i === loadStep ? '●' : '○'}
                  </span>
                  <span>
                    {s}
                    {i === loadStep ? '…' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="mt-8 pop-card p-6 border-[#E0301E]">
            <p className="text-[#C4160B] text-sm font-body font-bold leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-3 text-[10px] uppercase tracking-[0.25em] text-[#161616]/65 hover:text-[#161616] font-mono font-bold"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── Result ─────────────────────────────────────────────────────── */
  return (
    <div ref={resultRef} className="max-w-5xl mx-auto scroll-mt-24">
      <RoadmapDocument report={report} host={meta?.host ?? ''} url={meta?.url} />

      {/* Now go do it. The address is already ours, so this space sells the
          implementation instead of asking for an email a second time. */}
      <div className="mt-16 border-2 border-[#161616] rounded-2xl bg-[#161616] shadow-[8px_8px_0_0_#F5B700] p-8 md:p-12">
        <span className="block text-[9px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold mb-4">
          A copy is in your inbox
        </span>
        <h3 className="font-display text-3xl md:text-5xl text-[#FBF6EA] font-black tracking-tight leading-[1.0]">
          Reading it is the easy part
        </h3>
        <p className="mt-5 text-[#FBF6EA]/80 text-base md:text-lg font-body leading-relaxed max-w-2xl">
          You now know your constraint and what clears the first gate. The reason plans like this sit in a
          folder is never that the plan was wrong. It is that nobody built the machines, and nobody was
          checking on Thursday.
        </p>
        <p className="mt-4 text-[#FBF6EA]/80 text-base md:text-lg font-body leading-relaxed max-w-2xl">
          HUNDREDFOLD is the version where it actually happens. Mr. Mustard interviews you properly, we
          forge the offer, we wire the agents that run this plan inside your business, and a coach who has
          read every word of it answers you at any hour.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row gap-3">
          <a
            href="/hundredfold#interview"
            className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-xl border-2 border-[#F5B700] hover:-translate-y-0.5 transition-all text-center"
          >
            Get interviewed, free
          </a>
          <a
            href="/hundredfold"
            className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#FBF6EA] rounded-xl border-2 border-[#FBF6EA]/40 hover:border-[#FBF6EA] transition-all text-center"
          >
            See what HUNDREDFOLD is
          </a>
        </div>
      </div>

      {/* Share, print, run another */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {shareUrl && (
          <button
            type="button"
            onClick={copyShare}
            className="px-5 py-3 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            {copied ? 'Link copied' : 'Copy share link'}
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="px-5 py-3 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
        >
          Print or save as PDF
        </button>
        <button
          type="button"
          onClick={() => {
            setReport(null);
            setMeta(null);
            setUrl('');
            setContext({});
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-5 py-3 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/60 hover:text-[#C4160B] transition-colors"
        >
          ← Run another business
        </button>
      </div>
    </div>
  );
}
