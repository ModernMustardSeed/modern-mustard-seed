// Presentational website-audit report in the MMS pop-art brand. Pure display, no
// hooks, so it renders in a server component. Defensive against partial data so
// it works for both a freshly-run audit and a stored outbound audit_json (whose
// category keys / priorities can vary). The self-serve WebsiteAuditEngine keeps
// its own inline copy; this one powers the shareable per-lead report page.

type Category = { score: number; letter: string; notes: string };

export type AuditReportData = {
  overall_score: number;
  letter_grade: string;
  headline: string;
  overall_analysis: string;
  categories?: Record<string, Category> | null;
  top_three_fixes?: { title: string; why: string; how: string }[] | null;
  full_todo?: { category: string; priority: string; task: string }[] | null;
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
  high: 'text-[#E0301E] border-[#E0301E]/50 bg-[#E0301E]/10',
  medium: 'text-[#161616] border-[#161616]/30 bg-[#F5B700]/30',
  low: 'text-[#1E50C8] border-[#1E50C8]/50 bg-[#1E50C8]/10',
};

function gradeGlow(grade: string): string {
  if (grade.startsWith('A')) return 'shadow-[6px_6px_0_0_#15803D]';
  if (grade.startsWith('B')) return 'shadow-[6px_6px_0_0_#F5B700]';
  if (grade.startsWith('C')) return 'shadow-[6px_6px_0_0_#FF8A00]';
  return 'shadow-[6px_6px_0_0_#E0301E]';
}

/** Humanize an unknown category key ("ai_features" -> "AI features"). */
function catLabel(key: string): string {
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  const acr = new Set(['seo', 'geo', 'ai', 'ux', 'cta']);
  return key
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => (acr.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function hostnameOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function AuditReport({ report, auditedUrl }: { report: AuditReportData; auditedUrl?: string | null }) {
  const categories = report.categories ? Object.entries(report.categories) : [];
  const fixes = report.top_three_fixes ?? [];
  const todo = report.full_todo ?? [];
  const host = hostnameOf(auditedUrl);

  return (
    <div className="space-y-12">
      {/* Score circle + headline */}
      <div className="text-center">
        <div className="inline-flex flex-col items-center gap-5">
          <div className={`relative w-44 h-44 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center border-[3px] border-[#161616] bg-[#F5B700] ${gradeGlow(report.letter_grade || '')}`}>
            <span className="font-display text-6xl md:text-7xl font-black text-[#161616] leading-none">{report.overall_score}</span>
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#161616]/60 font-mono mt-1.5">out of 100</span>
            {report.letter_grade && (
              <div className="mt-3 px-3 py-0.5 rounded-full border-2 border-[#161616] bg-white">
                <span className="font-display italic text-lg md:text-xl font-black text-[#161616] tracking-tight">{report.letter_grade}</span>
              </div>
            )}
          </div>
          {report.headline && (
            <p className="font-display italic text-xl md:text-2xl text-[#161616] font-bold max-w-2xl leading-snug px-4">&ldquo;{report.headline}&rdquo;</p>
          )}
          {host && <p className="text-[10px] uppercase tracking-[0.4em] text-[#161616]/45 font-mono">{host}</p>}
        </div>
      </div>

      {/* Overall analysis */}
      {report.overall_analysis && (
        <div className="pop-card p-8 md:p-10">
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-4">Analysis</span>
          <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed whitespace-pre-line">{report.overall_analysis}</p>
        </div>
      )}

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div>
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-5 text-center">The category breakdown</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(([key, cat]) => (
              <div key={key} className="pop-card p-6">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-display text-xl text-[#161616] font-black tracking-tight">{catLabel(key)}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl font-black text-[#161616]">{cat.score}</span>
                    {cat.letter && <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">{cat.letter}</span>}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[#161616]/10 border border-[#161616]/15 mb-4 overflow-hidden">
                  <div className="h-full bg-[#F5B700]" style={{ width: `${Math.max(0, Math.min(100, cat.score))}%` }} />
                </div>
                {cat.notes && <p className="text-[#3a3733] text-sm font-body leading-relaxed">{cat.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 fixes */}
      {fixes.length > 0 && (
        <div>
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-5 text-center">Fix these first</span>
          <div className="space-y-4">
            {fixes.map((fix, i) => (
              <div key={i} className="pop-card p-6 md:p-8">
                <div className="flex items-start gap-5">
                  <span className="font-display text-4xl md:text-5xl font-black text-[#F5B700] leading-none flex-shrink-0 mt-1" style={{ WebkitTextStroke: '1.5px #161616' }}>{i + 1}</span>
                  <div>
                    <h3 className="font-display text-xl md:text-2xl text-[#161616] font-black tracking-tight mb-2">{fix.title}</h3>
                    {fix.why && (
                      <p className="text-[#3a3733] text-sm md:text-base font-body leading-relaxed mb-2">
                        <span className="text-[#E0301E] font-mono font-bold text-[10px] uppercase tracking-[0.25em] mr-2">Why</span>
                        {fix.why}
                      </p>
                    )}
                    {fix.how && (
                      <p className="text-[#161616] text-sm md:text-base font-body leading-relaxed">
                        <span className="text-[#E0301E] font-mono font-bold text-[10px] uppercase tracking-[0.25em] mr-2">How</span>
                        {fix.how}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full to-do */}
      {todo.length > 0 && (
        <div>
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-5 text-center">The full to-do list to your A</span>
          <div className="pop-card p-6 md:p-8 space-y-3">
            {todo.map((item, i) => (
              <div key={i} className="flex items-start gap-4 py-2 border-b border-[#161616]/10 last:border-0">
                {item.priority && (
                  <span className={`flex-shrink-0 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] font-mono font-bold border-2 rounded ${PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.medium}`}>
                    {item.priority}
                  </span>
                )}
                {item.category && (
                  <span className="flex-shrink-0 text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono pt-1 hidden md:inline-block min-w-[90px]">{catLabel(item.category)}</span>
                )}
                <p className="text-[#161616] text-sm font-body leading-relaxed flex-1">{item.task}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
