'use client';

import { useState, useEffect, FormEvent } from 'react';

type Category = { score: number; letter: string; notes: string };
type Fix = { title: string; why: string; how: string };
type TodoItem = {
  category: 'brand' | 'trust' | 'seo' | 'geo' | 'ai_features' | 'conversion' | 'design';
  priority: 'high' | 'medium' | 'low';
  task: string;
};

type Report = {
  overall_score: number;
  letter_grade: string;
  headline: string;
  overall_analysis: string;
  categories: {
    brand: Category;
    trust: Category;
    seo: Category;
    geo: Category;
    ai_features: Category;
    conversion: Category;
    design: Category;
  };
  top_three_fixes: Fix[];
  full_todo: TodoItem[];
};

type AuditResponse = {
  ok: true;
  url: string;
  report: Report;
};

const LOAD_STEPS = [
  'Fetching the page',
  'Extracting brand signals',
  'Inspecting SEO foundations',
  'Checking GEO and AI readiness',
  'Reading the content',
  'Grading conversion + trust',
  'Building your to-do list',
];

const CATEGORY_LABELS = {
  brand: 'Brand',
  trust: 'Trust',
  seo: 'SEO',
  geo: 'GEO / AI search',
  ai_features: 'AI features',
  conversion: 'Conversion',
  design: 'Design',
};

const PRIORITY_STYLES = {
  high: 'text-rust-light border-rust-light/40 bg-rust-light/10',
  medium: 'text-gold-light border-gold-light/40 bg-gold-light/10',
  low: 'text-sage-light border-sage-light/40 bg-sage-light/10',
};

const GRADE_GLOW = (grade: string): string => {
  if (grade.startsWith('A')) return 'shadow-[0_0_60px_rgba(127,228,197,0.35),0_0_120px_rgba(127,228,197,0.18)]';
  if (grade.startsWith('B')) return 'shadow-[0_0_60px_rgba(240,208,144,0.35),0_0_120px_rgba(240,208,144,0.18)]';
  if (grade.startsWith('C')) return 'shadow-[0_0_60px_rgba(200,150,78,0.35),0_0_120px_rgba(200,150,78,0.18)]';
  if (grade === 'D') return 'shadow-[0_0_60px_rgba(255,142,114,0.35),0_0_120px_rgba(255,142,114,0.18)]';
  return 'shadow-[0_0_60px_rgba(255,107,53,0.45),0_0_120px_rgba(255,107,53,0.22)]';
};

export default function WebsiteAuditEngine() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [auditedUrl, setAuditedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Save form
  const [saveEmail, setSaveEmail] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Animate the loading step indicator while waiting.
  useEffect(() => {
    if (!loading) {
      setLoadStep(0);
      return;
    }
    const t = setInterval(() => {
      setLoadStep((s) => Math.min(s + 1, LOAD_STEPS.length - 1));
    }, 3500);
    return () => clearInterval(t);
  }, [loading]);

  const runAudit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setReport(null);
    setSaved(false);

    try {
      const res = await fetch('/api/website-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as AuditResponse | { error: string };
      if (!res.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : 'Audit failed');
      }
      setReport(data.report);
      setAuditedUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!saveEmail.trim() || !report || !auditedUrl) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch('/api/website-audit/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: auditedUrl,
          email: saveEmail.trim(),
          name: saveName.trim(),
          overallScore: report.overall_score,
          letterGrade: report.letter_grade,
          headline: report.headline,
          topThreeFixes: report.top_three_fixes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* URL input form */}
      {!report && (
        <form onSubmit={runAudit} className="relative">
          <div className="glass-card p-2 md:p-3 flex flex-col md:flex-row gap-2 md:gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourbusiness.com"
              disabled={loading}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              className="flex-1 bg-transparent text-cream-50 placeholder:text-cream-100/30 px-4 md:px-5 py-4 font-body text-base md:text-lg focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-7 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-bold text-cream-50 bg-brass rounded-xl campfire-glow hover:shadow-[0_0_45px_rgba(255,107,53,0.55)] disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {loading ? 'Auditing…' : 'Audit my site →'}
            </button>
          </div>
          <p className="text-center text-cream-100/50 text-xs font-body mt-4">
            Free. No email required to see your score. Powered by Anthropic Claude.
          </p>
        </form>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-12 max-w-xl mx-auto">
          <div className="space-y-3">
            {LOAD_STEPS.map((s, i) => (
              <div
                key={s}
                className={`flex items-center gap-3 text-sm md:text-base font-body transition-all ${
                  i < loadStep
                    ? 'text-sage-light'
                    : i === loadStep
                      ? 'text-cream-100 animate-pulse'
                      : 'text-cream-100/30'
                }`}
              >
                <span className="w-5 inline-flex items-center justify-center">
                  {i < loadStep ? '✓' : i === loadStep ? '●' : '○'}
                </span>
                <span>{s}{i === loadStep ? '…' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mt-8 glass-card p-6 border-rust-light/30">
          <p className="text-rust-light text-sm font-body leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-3 text-[10px] uppercase tracking-[0.25em] text-cream-100/65 hover:text-cream-50 font-mono"
          >
            Try again
          </button>
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <div className="space-y-12">
          {/* Score circle + headline */}
          <div className="text-center">
            <div className="inline-flex flex-col items-center gap-5">
              <div
                className={`relative w-44 h-44 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center border border-gold-light/30 bg-midnight-700/55 backdrop-blur-md ${GRADE_GLOW(report.letter_grade)}`}
              >
                <span className="font-display text-6xl md:text-7xl font-medium text-cream-50 leading-none">
                  {report.overall_score}
                </span>
                <span className="text-[10px] uppercase tracking-[0.4em] text-cream-100/55 font-mono mt-1.5">
                  out of 100
                </span>
                <div className="mt-3 px-3 py-0.5 rounded-full border border-gold-light/40 bg-midnight-900/70">
                  <span className="font-display italic text-lg md:text-xl font-medium text-gold-light tracking-tight">
                    {report.letter_grade}
                  </span>
                </div>
              </div>
              <p className="font-display italic text-xl md:text-2xl text-cream-50 font-medium max-w-2xl leading-snug px-4">
                &ldquo;{report.headline}&rdquo;
              </p>
              {auditedUrl && (
                <p className="text-[10px] uppercase tracking-[0.4em] text-cream-100/45 font-mono">
                  {new URL(auditedUrl).hostname}
                </p>
              )}
            </div>
          </div>

          {/* Overall analysis */}
          <div className="glass-card p-8 md:p-10">
            <span className="text-[9px] uppercase tracking-[0.4em] text-gold-light/85 font-mono font-medium block mb-4">
              Analysis
            </span>
            <p className="text-cream-100/85 text-base md:text-lg font-body font-light leading-relaxed whitespace-pre-line">
              {report.overall_analysis}
            </p>
          </div>

          {/* Category breakdown */}
          <div>
            <span className="text-[9px] uppercase tracking-[0.4em] text-gold-light/85 font-mono font-medium block mb-5 text-center">
              The 7 categories
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.entries(report.categories) as [keyof typeof CATEGORY_LABELS, Category][]).map(
                ([key, cat]) => (
                  <div key={key} className="glass-card p-6">
                    <div className="flex items-baseline justify-between mb-3">
                      <h3 className="font-display text-xl text-cream-50 font-medium tracking-tight">
                        {CATEGORY_LABELS[key]}
                      </h3>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-2xl font-medium text-cream-50">
                          {cat.score}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.3em] text-gold-light font-mono font-bold">
                          {cat.letter}
                        </span>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="h-1 rounded-full bg-midnight-900/70 mb-4 overflow-hidden">
                      <div
                        className="h-full bg-brass rounded-full transition-all duration-700"
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                    <p className="text-cream-100/70 text-sm font-body font-light leading-relaxed">
                      {cat.notes}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Top 3 fixes */}
          <div>
            <span className="text-[9px] uppercase tracking-[0.4em] text-gold-light/85 font-mono font-medium block mb-5 text-center">
              Fix these three first
            </span>
            <div className="space-y-4">
              {report.top_three_fixes.map((fix, i) => (
                <div key={i} className="glass-card p-6 md:p-8">
                  <div className="flex items-start gap-5">
                    <span className="font-display text-4xl md:text-5xl font-medium text-gradient-brass leading-none flex-shrink-0 mt-1">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-xl md:text-2xl text-cream-50 font-medium tracking-tight mb-2">
                        {fix.title}
                      </h3>
                      <p className="text-cream-100/70 text-sm md:text-base font-body font-light leading-relaxed mb-2">
                        <span className="text-gold-light font-mono text-[10px] uppercase tracking-[0.25em] mr-2">
                          Why
                        </span>
                        {fix.why}
                      </p>
                      <p className="text-cream-100/85 text-sm md:text-base font-body font-light leading-relaxed">
                        <span className="text-gold-light font-mono text-[10px] uppercase tracking-[0.25em] mr-2">
                          How
                        </span>
                        {fix.how}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full to-do */}
          <div>
            <span className="text-[9px] uppercase tracking-[0.4em] text-gold-light/85 font-mono font-medium block mb-5 text-center">
              The full to-do list to your A
            </span>
            <div className="glass-card p-6 md:p-8 space-y-3">
              {report.full_todo.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 py-2 border-b border-cream-100/[0.05] last:border-0"
                >
                  <span
                    className={`flex-shrink-0 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] font-mono font-bold border rounded ${
                      PRIORITY_STYLES[item.priority]
                    }`}
                  >
                    {item.priority}
                  </span>
                  <span className="flex-shrink-0 text-[9px] uppercase tracking-[0.3em] text-cream-100/45 font-mono pt-1 hidden md:inline-block min-w-[90px]">
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  <p className="text-cream-100/85 text-sm font-body font-light leading-relaxed flex-1">
                    {item.task}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Save report */}
          <div className="glass-card p-8 md:p-10 border-gold-light/25">
            {!saved ? (
              <>
                <span className="text-[9px] uppercase tracking-[0.4em] text-gold-light/85 font-mono font-medium block mb-3">
                  Save the report
                </span>
                <h3 className="font-display text-2xl md:text-3xl text-cream-50 font-medium tracking-tight mb-2">
                  Want this report in your inbox?
                </h3>
                <p className="text-cream-100/65 text-sm md:text-base font-body font-light leading-relaxed mb-6">
                  Drop your email and we will send you the top three fixes plus a path to the A version. No spam. Reply to talk to Sarah directly.
                </p>
                <form onSubmit={saveReport} className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Your name (optional)"
                    disabled={saving}
                    className="flex-1 bg-midnight-900/70 border border-cream-100/10 rounded-lg px-4 py-3 text-cream-100 placeholder:text-cream-100/30 font-body text-sm focus:outline-none focus:border-gold-light/50 disabled:opacity-50"
                  />
                  <input
                    type="email"
                    value={saveEmail}
                    onChange={(e) => setSaveEmail(e.target.value)}
                    placeholder="you@yourbusiness.com"
                    disabled={saving}
                    required
                    className="flex-1 bg-midnight-900/70 border border-cream-100/10 rounded-lg px-4 py-3 text-cream-100 placeholder:text-cream-100/30 font-body text-sm focus:outline-none focus:border-gold-light/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={saving || !saveEmail.trim()}
                    className="px-6 py-3 text-[10px] uppercase tracking-[0.22em] font-sans font-bold text-cream-50 bg-brass rounded-lg campfire-glow disabled:opacity-50 hover:shadow-[0_0_30px_rgba(255,107,53,0.5)] transition-all whitespace-nowrap"
                  >
                    {saving ? 'Sending…' : 'Email me'}
                  </button>
                </form>
                {saveError && <p className="text-rust-light text-xs font-mono mt-3">{saveError}</p>}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="font-display italic text-xl md:text-2xl text-gold-light font-medium mb-3">
                  Sent. Check your inbox.
                </p>
                <p className="text-cream-100/65 text-sm font-body font-light leading-relaxed">
                  Sarah was copied. If you want to skip the queue, reply to her note and tell her your context.
                </p>
              </div>
            )}
          </div>

          {/* Reset */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setReport(null);
                setUrl('');
                setAuditedUrl(null);
                setSaved(false);
                setSaveEmail('');
                setSaveName('');
              }}
              className="text-[10px] uppercase tracking-[0.3em] text-cream-100/55 hover:text-cream-50 font-mono transition-colors"
            >
              ← Audit another site
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
