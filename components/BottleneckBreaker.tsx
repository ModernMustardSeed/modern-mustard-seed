'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { trackLead } from '@/lib/analytics';

/**
 * Bottleneck Breaker. One clean flow: drop your site, the engine finds the one
 * thing quietly costing you the most, and shows exactly how to break it (the
 * services). Reuses the /api/audit engine. Pop-art, on-brand, no dashboard.
 */

const INK = '#161616';
const YELLOW = '#F5B700';
const RED = '#E0301E';
const BLUE = '#1E50C8';

type AuditResult = {
  error?: boolean;
  businessName: string;
  industry: string;
  score: number;
  headlineBottleneck?: string;
  strengths: string[];
  gaps: string[];
  topTools: { name: string; impact: number; reason: string }[];
  monthlyTimeSaved: number;
  estimatedROI: number;
  quickWins: string[];
  competitiveEdge: string;
  riskOfInaction: string;
};

const PHASES = ['Scanning your site', 'Finding the bottleneck', 'Mapping the fix', 'Sizing the win'];

function ScoreRing({ score }: { score: number }) {
  const v = Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative h-24 w-24 flex-shrink-0 rounded-full"
      style={{ background: `conic-gradient(${YELLOW} ${v * 3.6}deg, rgba(22,22,22,0.08) 0deg)` }}
    >
      <div className="absolute inset-[6px] rounded-full bg-white border-2 border-[#161616] flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-black text-[#161616] leading-none">{v}</span>
        <span className="text-[8px] uppercase tracking-[0.2em] font-mono text-[#161616]/50 mt-0.5">leverage</span>
      </div>
    </div>
  );
}

export default function BottleneckBreaker() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);

  const saveLead = useCallback(
    async (source: string, extra?: { industry?: string; company?: string }) => {
      try {
        await fetch('/api/audit/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, auditUrl: url || undefined, source, ...extra }),
        });
      } catch {
        /* best effort */
      }
    },
    [name, email, url]
  );

  const run = useCallback(async () => {
    if (!name.trim() || !email.includes('@') || !url.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    saveLead('bottleneck-start');
    trackLead({ source: 'bottleneck-breaker' });

    for (let i = 0; i < PHASES.length; i++) {
      setPhase(i);
      await new Promise((r) => setTimeout(r, 750));
    }

    try {
      const res = await fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        setError((data && data.message) || 'We could not finish your breakdown right now. Your details are saved and Sarah will follow up personally.');
      } else {
        setResult(data);
        saveLead('bottleneck-complete', { industry: data.industry, company: data.businessName });
      }
    } catch {
      setError('We could not reach the engine. Your details are saved and Sarah will follow up personally.');
    }
    setLoading(false);
  }, [name, email, url, loading, saveLead]);

  const emailReport = useCallback(() => {
    saveLead('bottleneck-report', result ? { industry: result.industry, company: result.businessName } : undefined);
    setReportSent(true);
  }, [saveLead, result]);

  const reset = () => {
    setResult(null);
    setError(null);
    setUrl('');
    setPhase(0);
  };

  const inp =
    'w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-[#161616] font-body placeholder-[#161616]/40 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow';

  return (
    <section className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-32 md:pt-40 pb-24 px-6 overflow-hidden">
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.28) 1.5px, transparent 1.6px)', backgroundSize: '20px 20px' }} />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Framing */}
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-4">Free · 60 seconds · No fluff</span>
          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight leading-[0.95]">
            Bottleneck{' '}
            <span className="inline-block -rotate-[5deg] rounded-[10px] border-[3px] border-[#161616] bg-[#F5B700] px-3 py-1 text-[0.8em] leading-none uppercase tracking-tight shadow-[4px_4px_0_0_#161616,7px_7px_0_0_#1E50C8]">
              Breaker
            </span>
          </h1>
          <p className="text-[#3a3733] text-lg md:text-xl font-body leading-relaxed mt-6 max-w-2xl mx-auto">
            Every business has one thing quietly costing it the most. Drop your site, and we will find your biggest bottleneck and show you exactly how to break it.
          </p>
        </div>

        {/* The tool */}
        {!result && !loading && (
          <div className="pop-card p-6 md:p-8 max-w-xl mx-auto">
            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inp} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="your@email.com" className={inp} />
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} placeholder="yourbusiness.com" spellCheck={false} autoCapitalize="none" className={inp} />
            </div>
            {error && <p className="text-[#E0301E] font-body font-bold text-sm mt-3">{error}</p>}
            <button
              onClick={run}
              disabled={!name.trim() || !email.includes('@') || !url.trim()}
              className="mt-5 w-full py-4 text-[13px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-lg border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#161616] disabled:opacity-40 disabled:hover:translate-y-0 transition-all"
            >
              Break my bottleneck →
            </button>
            <p className="text-[#161616]/40 text-[11px] font-body text-center mt-3">Free. No credit card. You see the result on screen.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="pop-card p-10 max-w-xl mx-auto text-center">
            <div className="inline-block h-12 w-12 rounded-full border-4 border-[#161616]/15 border-t-[#F5B700] animate-spin mb-6" />
            <p className="font-display text-2xl font-black">{PHASES[phase]}…</p>
            <div className="flex gap-1.5 justify-center mt-5">
              {PHASES.map((_, i) => (
                <div key={i} className="h-1.5 w-10 rounded-full" style={{ background: i <= phase ? YELLOW : 'rgba(22,22,22,0.1)' }} />
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-6">
            {/* Headline */}
            <div className="pop-card p-6 md:p-8">
              <div className="flex items-center gap-5">
                <ScoreRing score={result.score} />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">{result.businessName} · Your #1 bottleneck</span>
                  <p className="font-display text-xl md:text-2xl font-black leading-snug">{result.headlineBottleneck || result.competitiveEdge}</p>
                </div>
              </div>
            </div>

            {/* Bottlenecks */}
            <div className="pop-card-cream p-6 md:p-8 border-l-[6px]" style={{ borderLeftColor: RED }}>
              <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold block mb-4" style={{ color: RED }}>Your bottlenecks</span>
              <ul className="space-y-2.5">
                {result.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: RED }} />
                    <span className="font-body text-[#161616]">{g}</span>
                  </li>
                ))}
              </ul>
              {result.riskOfInaction && <p className="mt-4 pt-4 border-t-2 border-[#161616]/10 font-body text-sm text-[#3a3733] italic">{result.riskOfInaction}</p>}
            </div>

            {/* How we break it (the services) */}
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-bold block mb-4">How we break it</span>
              <div className="grid sm:grid-cols-2 gap-4">
                {result.topTools.map((t, i) => (
                  <div key={i} className="pop-card p-5">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-sans font-extrabold text-[#161616]">{t.name}</span>
                      <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2 py-0.5">{t.impact}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#161616]/[0.06] mb-3 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${t.impact}%`, background: YELLOW }} />
                    </div>
                    <p className="font-body text-sm text-[#3a3733] leading-relaxed">{t.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What it's worth */}
            <div className="grid grid-cols-2 gap-4">
              <div className="pop-card-yellow p-6 text-center">
                <div className="font-display text-4xl font-black text-[#161616]">{result.monthlyTimeSaved}<span className="text-xl"> hrs</span></div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/60 mt-1">saved / month</div>
              </div>
              <div className="pop-card p-6 text-center" style={{ background: BLUE }}>
                <div className="font-display text-4xl font-black text-white">${result.estimatedROI.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-white/70 mt-1">est. monthly upside</div>
              </div>
            </div>

            {/* Quick wins */}
            {result.quickWins?.length > 0 && (
              <div className="pop-card p-6 md:p-8">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-bold block mb-4">Start here</span>
                <ul className="space-y-2.5">
                  {result.quickWins.map((w, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616]">{i + 1}</span>
                      <span className="font-body text-[#161616]">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What's working (small) */}
            {result.strengths?.length > 0 && (
              <p className="font-body text-sm text-[#3a3733] text-center">
                <span className="font-bold text-[#161616]">Already working for you:</span> {result.strengths.join(' · ')}
              </p>
            )}

            {/* CTA */}
            <div className="pop-card-yellow p-8 text-center">
              <h3 className="font-display text-2xl md:text-3xl font-black mb-3">Want us to break it for you?</h3>
              <p className="text-[#161616]/75 font-body mb-6 max-w-lg mx-auto">Book a free call and we will turn this into a fixed plan, scope, and price. Or have it emailed to you to sit with.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/?book=1" className="px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all">
                  Break it with us
                </Link>
                <button
                  onClick={emailReport}
                  disabled={reportSent}
                  className="px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 disabled:opacity-60 transition-all"
                >
                  {reportSent ? 'Sent to your inbox ✓' : 'Email me this'}
                </button>
              </div>
              <button onClick={reset} className="mt-5 text-[10px] uppercase tracking-[0.25em] font-mono text-[#161616]/40 hover:text-[#161616]">Break another →</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
