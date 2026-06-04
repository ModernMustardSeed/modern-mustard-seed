'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from './AdminHeader';

type Category = { score: number; letter: string; notes: string };
type Fix = { title: string; why: string; how: string };
type TodoItem = { category: string; priority: 'high' | 'medium' | 'low'; task: string };
type Report = {
  overall_score: number;
  letter_grade: string;
  headline: string;
  overall_analysis: string;
  categories: Record<string, Category>;
  top_three_fixes: Fix[];
  full_todo: TodoItem[];
};

const CATEGORY_LABELS: Record<string, string> = {
  brand: 'Brand',
  trust: 'Trust',
  seo: 'SEO',
  geo: 'GEO / AI search',
  ai_features: 'AI features',
  conversion: 'Conversion',
  design: 'Design',
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'text-red-300 border-red-400/40 bg-red-500/10',
  medium: 'text-mustard-200 border-mustard-500/40 bg-mustard-500/10',
  low: 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10',
};

const inp =
  'bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-mustard-500/40 w-full';

function hostOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function AuditAdmin() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [auditedUrl, setAuditedUrl] = useState('');
  const [runError, setRunError] = useState('');

  // Send-to-lead
  const [toName, setToName] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  const runAudit = async () => {
    if (!url.trim() || running) return;
    setRunning(true);
    setRunError('');
    setReport(null);
    setSent(false);
    setSendError('');
    try {
      const res = await fetch('/api/website-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        setRunError((data && data.error) || 'Audit failed. Try again.');
      } else {
        setReport(data.report as Report);
        setAuditedUrl(data.url as string);
        // Seed an editable, personal note so each send reads one-to-one.
        const host = hostOf(data.url as string);
        setNote(
          `I ran a full audit on ${host} and wanted to share what I found. The score, the three highest-leverage fixes, and your full to-do list are below. Happy to walk through any of it, or take the whole list off your plate.`
        );
      }
    } catch {
      setRunError('Network error. Try again.');
    } finally {
      setRunning(false);
    }
  };

  const send = async () => {
    if (!toEmail.trim() || !report || sending) return;
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/admin/audit/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail.trim(),
          name: toName.trim() || undefined,
          url: auditedUrl,
          report,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setSendError((data && data.error) || 'Could not send. Try again.');
      } else {
        setSent(true);
      }
    } catch {
      setSendError('Network error. Try again.');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setReport(null);
    setUrl('');
    setAuditedUrl('');
    setRunError('');
    setToName('');
    setToEmail('');
    setNote('');
    setSent(false);
    setSendError('');
  };

  // Hand the audit to the proposal builder: carry the URL, a situation line, a
  // rich notes block for the AI draft, and a suggested path. Passed via
  // sessionStorage (the full report is too big for a query string).
  const toProposal = () => {
    if (!report) return;
    const host = hostOf(auditedUrl);
    const situation = `${host}: ${report.headline} Scored ${report.overall_score}/100 (${report.letter_grade}).`;
    const notes = [
      `Website audit summary for ${host}.`,
      `Overall ${report.overall_score}/100, grade ${report.letter_grade}.`,
      `Headline: ${report.headline}`,
      '',
      report.overall_analysis,
      '',
      'Category scores:',
      ...Object.entries(report.categories).map(
        ([k, c]) => `- ${CATEGORY_LABELS[k] ?? k}: ${c.score} (${c.letter}). ${c.notes}`
      ),
      '',
      'Top fixes:',
      ...report.top_three_fixes.map((f, i) => `${i + 1}. ${f.title}. ${f.why}`),
      '',
      'Full to-do:',
      ...report.full_todo.map((t) => `- [${t.priority}] ${t.task}`),
    ].join('\n');
    // Suggested path from the score. Sarah can change it in the builder.
    const s = report.overall_score;
    const pathId = s >= 75 ? 'off_site_only' : s >= 55 ? 'modern_invisible' : 'closed_builder';

    try {
      sessionStorage.setItem(
        'mms_proposal_seed',
        JSON.stringify({
          url: auditedUrl,
          name: toName.trim() || undefined,
          email: toEmail.trim() || undefined,
          situation,
          notes,
          pathId,
        })
      );
    } catch {
      /* sessionStorage blocked; builder just starts empty */
    }
    router.push('/admin/proposals');
  };

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <AdminHeader active="audit" title="Website Audit" />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-white/45 text-sm font-body mb-6 max-w-2xl">
          Run the same audit visitors get, then email it to a lead as a personal, one-off offer.
          This does not enter anyone into a drip. It is a single email with the audit, the to-do
          list, and your booking link.
        </p>

        {/* Run */}
        <div className="glass-card p-5 md:p-6 mb-6">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">
            Run an audit
          </span>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runAudit()}
              placeholder="theirbusiness.com"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              disabled={running}
              className={inp}
            />
            <button
              onClick={runAudit}
              disabled={running || !url.trim()}
              className="px-6 py-2.5 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {running ? 'Auditing…' : 'Run audit'}
            </button>
          </div>
          {runError && <p className="text-red-300 text-sm font-body mt-3">{runError}</p>}
        </div>

        {report && (
          <>
            {/* Handoff to the proposal builder */}
            <div className="flex justify-end mb-3">
              <button
                onClick={toProposal}
                className="px-5 py-2.5 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-mustard-300 border border-mustard-500/40 hover:bg-mustard-500/10 transition-colors"
              >
                Build a proposal from this audit →
              </button>
            </div>

            {/* Report summary */}
            <div className="glass-card p-5 md:p-6 mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-mustard-400/80 font-mono font-bold block mb-1">
                    {hostOf(auditedUrl)}
                  </span>
                  <p className="font-display italic text-lg md:text-xl text-cream-50 leading-snug max-w-xl">
                    &ldquo;{report.headline}&rdquo;
                  </p>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className="font-display text-4xl font-semibold text-white leading-none">
                    {report.overall_score}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono mt-1">
                    /100
                  </span>
                  <span className="mt-1.5 px-2 py-0.5 rounded-full border border-mustard-500/40 text-mustard-300 font-display italic text-sm">
                    {report.letter_grade}
                  </span>
                </div>
              </div>

              <p className="text-white/60 text-sm font-body leading-relaxed whitespace-pre-line mb-5">
                {report.overall_analysis}
              </p>

              {/* Categories */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
                {Object.entries(report.categories).map(([key, cat]) => (
                  <div key={key} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-white/45 font-mono">
                        {CATEGORY_LABELS[key] ?? key}
                      </span>
                      <span className="text-sm font-mono font-bold text-mustard-300">{cat.letter}</span>
                    </div>
                    <div className="font-sans text-lg font-semibold text-white">{cat.score}</div>
                  </div>
                ))}
              </div>

              {/* Top fixes */}
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-2">
                Top three fixes
              </span>
              <div className="space-y-2 mb-5">
                {report.top_three_fixes.map((f, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
                    <p className="text-sm font-sans font-semibold text-white/90">
                      {i + 1}. {f.title}
                    </p>
                    <p className="text-xs text-white/50 font-body mt-1 leading-relaxed">{f.how}</p>
                  </div>
                ))}
              </div>

              {/* To-do */}
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-2">
                Full to-do ({report.full_todo.length})
              </span>
              <div className="space-y-1.5">
                {report.full_todo.map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded ${PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.medium}`}
                    >
                      {t.priority}
                    </span>
                    <span className="text-xs text-white/65 font-body leading-relaxed">{t.task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Email to a lead */}
            <div className="glass-card p-5 md:p-6 mb-10 border-mustard-500/20">
              <span className="text-[10px] uppercase tracking-[0.3em] text-mustard-400/80 font-mono font-bold block mb-1">
                Email this audit
              </span>
              <p className="text-white/45 text-xs font-body mb-4">
                Sends one personalized email (audit + to-do list + your booking link). No drip, no
                auto-follow-up.
              </p>

              {sent ? (
                <div className="text-center py-6">
                  <p className="font-display italic text-xl text-mustard-300 mb-2">Sent.</p>
                  <p className="text-white/55 text-sm font-body mb-5">
                    {toEmail} has the audit. Reply-to is set to you.
                  </p>
                  <button
                    onClick={reset}
                    className="text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-white/80 font-mono"
                  >
                    Audit another site
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-3 mb-3">
                    <input
                      value={toName}
                      onChange={(e) => setToName(e.target.value)}
                      placeholder="Their name (optional)"
                      className={inp}
                    />
                    <input
                      value={toEmail}
                      onChange={(e) => setToEmail(e.target.value)}
                      placeholder="their@email.com"
                      type="email"
                      className={inp}
                    />
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={5}
                    placeholder="Your personal note at the top of the email"
                    className={`${inp} resize-y leading-relaxed`}
                  />
                  <p className="text-white/30 text-[11px] font-body mt-1.5 mb-4">
                    This note sits at the top in your voice. The score, fixes, and full to-do list
                    are added automatically below it.
                  </p>
                  {sendError && <p className="text-red-300 text-sm font-body mb-3">{sendError}</p>}
                  <button
                    onClick={send}
                    disabled={sending || !toEmail.trim()}
                    className="px-6 py-2.5 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors"
                  >
                    {sending ? 'Sending…' : 'Send the audit'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
