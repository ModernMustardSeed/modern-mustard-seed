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
  const [context, setContext] = useState<RoadmapContext>({});
  const [showContext, setShowContext] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [report, setReport] = useState<RoadmapReport | null>(null);
  const [meta, setMeta] = useState<{ url: string; host: string; slug: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [saveEmail, setSaveEmail] = useState('');
  const [saveName, setSaveName] = useState('');
  const [savePhone, setSavePhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
    setSaved(false);

    try {
      const res = await fetch('/api/scaling-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), context }),
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

  const emailMe = async (e: FormEvent) => {
    e.preventDefault();
    if (!saveEmail.trim() || !meta?.slug) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/scaling-roadmap/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: meta.slug,
          email: saveEmail.trim(),
          name: saveName.trim(),
          phone: savePhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not send it.');
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not send it.');
    } finally {
      setSaving(false);
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
              disabled={loading || !url.trim()}
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
              Free. No card, no signup. It takes about ninety seconds because it is actually reading your site.
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

      {/* Keep it */}
      <div className="mt-16 pop-card-yellow p-8 md:p-12">
        {!saved ? (
          <>
            <span className="block text-[9px] uppercase tracking-[0.4em] text-[#161616] font-mono font-bold mb-3">
              Keep it
            </span>
            <h3 className="font-display text-3xl md:text-4xl text-[#161616] font-black tracking-tight mb-3 leading-tight">
              Want this in your inbox?
            </h3>
            <p className="text-[#161616]/80 text-base font-body font-medium leading-relaxed mb-7 max-w-2xl">
              We will send you the verdict, your constraint, and this week&rsquo;s three moves, with a
              permanent link to the full roadmap. Reply to it and you are talking to Sarah, not a bot.
            </p>
            <form onSubmit={emailMe} className="grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Your name"
                disabled={saving}
                aria-label="Your name"
                className="bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-[#161616] placeholder:text-[#161616]/40 font-body text-sm focus:outline-none disabled:opacity-50"
              />
              <input
                type="email"
                value={saveEmail}
                onChange={(e) => setSaveEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                disabled={saving}
                required
                aria-label="Your email"
                className="bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-[#161616] placeholder:text-[#161616]/40 font-body text-sm focus:outline-none disabled:opacity-50"
              />
              <input
                type="tel"
                value={savePhone}
                onChange={(e) => setSavePhone(e.target.value)}
                placeholder="Phone (optional)"
                disabled={saving}
                aria-label="Your phone number, optional"
                className="bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-[#161616] placeholder:text-[#161616]/40 font-body text-sm focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={saving || !saveEmail.trim() || !meta?.slug}
                className="sm:col-span-3 px-6 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-lg border-2 border-[#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-all"
              >
                {saving ? 'Sending…' : 'Email me the roadmap'}
              </button>
            </form>
            {saveError && <p className="text-[#161616] font-bold text-xs font-mono mt-3">{saveError}</p>}
          </>
        ) : (
          <div className="py-4">
            <p className="font-display italic text-2xl md:text-3xl text-[#161616] font-black mb-3">
              Sent. Check your inbox.
            </p>
            <p className="text-[#161616]/80 text-base font-body font-medium leading-relaxed max-w-2xl">
              Sarah saw it too. If you want the fastest version of phase one, reply to that email and
              say which part you are starting with.
            </p>
          </div>
        )}
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
            setSaved(false);
            setSaveEmail('');
            setSaveName('');
            setSavePhone('');
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
