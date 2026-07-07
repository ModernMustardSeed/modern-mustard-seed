'use client';

import type { ProspectAudit } from '@/lib/prospects';

/**
 * The whole website-audit report, rendered from the cached audit_json. Used two
 * ways: `variant="modal"` (from the tracker row's score pill) shows everything
 * including the big score header; `variant="inline"` (inside the call card,
 * which already shows the score, headline, and top fixes) shows only the deep
 * half: analysis, category grades, and the full to-do list.
 */

const CATEGORY_LABELS: Record<string, string> = {
  brand: 'Brand',
  trust: 'Trust',
  seo: 'SEO',
  geo: 'GEO (AI search)',
  ai_features: 'AI features',
  conversion: 'Conversion',
  design: 'Design',
};

function scoreTone(score: number): { chip: string; bar: string } {
  if (score >= 80) return { chip: 'bg-[#2D6A4F] text-white border-[#2D6A4F]', bar: 'bg-[#2D6A4F]' };
  if (score >= 65) return { chip: 'bg-[#1E50C8] text-white border-[#1E50C8]', bar: 'bg-[#1E50C8]' };
  if (score >= 50) return { chip: 'bg-[#F5B700] text-[#161616] border-[#161616]', bar: 'bg-[#F5B700]' };
  return { chip: 'bg-[#9B3022] text-white border-[#9B3022]', bar: 'bg-[#9B3022]' };
}

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-[#9B3022] text-white border-[#9B3022]',
  medium: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  low: 'bg-white text-[#161616]/70 border-[#161616]/30',
};

export function siteHref(site: string): string {
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}

export default function AuditReport({
  audit,
  url,
  auditedAt,
  variant = 'modal',
}: {
  audit: ProspectAudit;
  url?: string | null;
  auditedAt?: string | null;
  variant?: 'modal' | 'inline';
}) {
  const score = Math.round(audit.overall_score);
  const tone = scoreTone(score);
  const categories = Object.entries(audit.categories ?? {});

  return (
    <div className="space-y-4">
      {variant === 'modal' && (
        <>
          {/* Score header */}
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 flex flex-wrap items-center gap-5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-6xl font-bold text-[#161616] leading-none">{score}</span>
              <span className="font-mono text-sm text-[#161616]/45">/100</span>
              <span className={`ml-1 text-sm font-mono font-bold rounded-full border-2 px-2.5 py-0.5 ${tone.chip}`}>{audit.letter_grade}</span>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-display text-lg italic text-[#161616] leading-snug">&ldquo;{audit.headline}&rdquo;</p>
              {auditedAt && <p className="text-[10px] font-mono text-[#161616]/40 mt-1">Audited {new Date(auditedAt).toLocaleDateString()}</p>}
            </div>
            {url && (
              <a
                href={siteHref(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-white bg-[#1E50C8] border-2 border-[#1E50C8] rounded-full hover:opacity-90 transition-all whitespace-nowrap"
              >
                🌐 See the live site ↗
              </a>
            )}
          </div>

          {/* Top three fixes */}
          {(audit.top_three_fixes ?? []).length > 0 && (
            <div className="bg-white border-2 border-[#161616] rounded-2xl p-5">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold block mb-3">Fix these first</span>
              <div className="space-y-3">
                {(audit.top_three_fixes ?? []).slice(0, 3).map((f, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="shrink-0 font-display text-2xl font-bold text-[#F5B700] leading-none">{i + 1}</span>
                    <div>
                      <p className="font-sans font-bold text-sm text-[#161616]">{f.title}</p>
                      <p className="font-body text-sm text-[#3A3733] leading-relaxed">{f.why} {f.how}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Overall analysis */}
      {audit.overall_analysis && (
        <div className="bg-white border-2 border-[#161616] rounded-2xl p-5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold block mb-2">The full read</span>
          {audit.overall_analysis.split(/\n\n+/).map((para, i) => (
            <p key={i} className="font-body text-sm text-[#3A3733] leading-relaxed mb-2 last:mb-0">{para}</p>
          ))}
        </div>
      )}

      {/* Category grades */}
      {categories.length > 0 && (
        <div className="bg-white border-2 border-[#161616] rounded-2xl p-5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold block mb-3">Category grades</span>
          <div className="space-y-3">
            {categories.map(([key, cat]) => {
              const t = scoreTone(cat.score);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-sans font-bold text-[12px] uppercase tracking-[0.12em] text-[#161616]">{CATEGORY_LABELS[key] ?? key}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#161616]/55">{Math.round(cat.score)}</span>
                      <span className={`text-[10px] font-mono font-bold rounded-full border-2 px-2 py-0.5 ${t.chip}`}>{cat.letter}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#161616]/10 overflow-hidden">
                    <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.max(4, Math.min(100, cat.score))}%` }} />
                  </div>
                  {cat.notes && <p className="font-body text-xs text-[#161616]/60 leading-relaxed mt-1">{cat.notes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full to-do */}
      {(audit.full_todo ?? []).length > 0 && (
        <div className="bg-white border-2 border-[#161616] rounded-2xl p-5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold block mb-3">The whole to-do list</span>
          <ol className="space-y-2">
            {(audit.full_todo ?? []).map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`shrink-0 mt-0.5 text-[9px] uppercase tracking-[0.12em] font-mono font-bold rounded-full border-2 px-2 py-0.5 ${PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.low}`}>{t.priority}</span>
                <p className="font-body text-sm text-[#3A3733] leading-relaxed">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#161616]/45 mr-1.5">{CATEGORY_LABELS[t.category] ?? t.category}</span>
                  {t.task}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
