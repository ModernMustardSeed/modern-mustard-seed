import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import { PILLAR_WEIGHTS, type PresenceAuditReport, type Pillar } from '@/lib/presence-audit';

export const dynamic = 'force-dynamic';
export const metadata = buildMetadata({ title: 'Your Presence Audit', noindex: true });

/**
 * THE PRESENCE AUDIT SCORECARD, the fifth door on the demo suite.
 *
 * Three dials, not one. The whole reason this page persuades is that a
 * contractor can check every number on it: the profile checks are pass or fail
 * against his own listing, the review numbers print the benchmark they were
 * measured against, the pillar weights are printed rather than implied, and the
 * foot of the page lists every fact with where it came from.
 *
 * It ends by naming the gap it just measured, and offering the one thing that
 * closes it. That is the only sales sentence on the page, and it comes after
 * the receipts rather than instead of them.
 */

type Params = Promise<{ auditId: string }>;

const RING = (score: number) => (score >= 80 ? '#1E7A3C' : score >= 60 ? '#B87503' : '#C4160B');

function Dial({ pillar }: { pillar: Pillar }) {
  const pct = Math.max(0, Math.min(100, pillar.score));
  const color = pillar.unknown ? '#8A8378' : RING(pct);
  return (
    <div className="pop-card p-5 sm:p-6 flex flex-col">
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#161616]/55">{pillar.label}</span>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-display text-5xl font-black leading-none tabular-nums" style={{ color }}>
          {pillar.unknown ? '?' : pct}
        </span>
        <span
          className="font-mono text-sm font-bold px-2 py-0.5 rounded-md border-2 border-[#161616]"
          style={{ background: pillar.unknown ? '#EFEAE0' : color, color: pillar.unknown ? '#161616' : '#FFFDF6' }}
        >
          {pillar.unknown ? 'n/a' : pillar.letter}
        </span>
      </div>

      {/* The bar is the score. No animation, because this page gets printed. */}
      <div className="mt-3 h-3 w-full rounded-full border-2 border-[#161616] bg-white overflow-hidden">
        <div className="h-full" style={{ width: `${pillar.unknown ? 0 : pct}%`, background: color }} />
      </div>

      <p className="font-body text-[13.5px] leading-relaxed text-[#3A3733] mt-3 flex-1">{pillar.verdict}</p>
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#161616]/40 mt-3">
        Worth {Math.round(pillar.weight * 100)}% of the total
      </span>
    </div>
  );
}

function Checks({ pillar }: { pillar: Pillar }) {
  if (!pillar.checks.length) return null;
  return (
    <div className="pop-card-cream p-5 sm:p-7">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#E0301E]">{pillar.label}</span>
      <h2 className="font-display text-2xl sm:text-3xl font-black text-[#161616] mt-1 mb-4">
        {pillar.score} out of 100
      </h2>
      <ul className="space-y-3">
        {pillar.checks.map((c) => (
          <li key={c.label} className="flex gap-3 border-b border-[#161616]/10 pb-3 last:border-0 last:pb-0">
            <span
              className="shrink-0 mt-0.5 grid place-items-center h-6 w-6 rounded-md border-2 border-[#161616] font-mono text-xs font-bold"
              style={{ background: c.passed ? '#1E7A3C' : '#C4160B', color: '#FFFDF6' }}
              aria-label={c.passed ? 'Pass' : 'Missing'}
            >
              {c.passed ? '✓' : '✕'}
            </span>
            <span className="min-w-0">
              <span className="block font-sans text-[14px] font-bold text-[#161616]">{c.label}</span>
              <span className="block font-body text-[13px] leading-relaxed text-[#3A3733] mt-0.5">{c.detail}</span>
            </span>
            <span className="ml-auto shrink-0 font-mono text-[11px] font-bold tabular-nums text-[#161616]/45 whitespace-nowrap">
              {c.earned}/{c.points}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function PresenceAuditPage({ params }: { params: Params }) {
  const { auditId } = await params;
  const sb = getSupabase();

  const missing = (
    <div className="min-h-screen bg-[#FBF6EA] grid place-items-center px-6">
      <div className="pop-card p-10 text-center max-w-md">
        <h1 className="font-display text-3xl font-black text-[#161616]">We could not find that audit</h1>
        <p className="font-body text-[#3A3733] mt-3">
          The link may have expired. Want one run on your business? That is free and it takes about a minute.
        </p>
        <a
          href="https://modernmustardseed.com/demos"
          className="inline-block mt-6 bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[3px_3px_0_0_#161616]"
        >
          Get your free audit
        </a>
      </div>
    </div>
  );

  if (!sb || !/^[0-9a-f-]{36}$/i.test(auditId)) return missing;

  const { data: row } = await sb
    .from('presence_audits')
    .select('report, status, lead_id')
    .eq('id', auditId)
    .maybeSingle();
  if (!row?.report) return missing;

  const r = row.report as PresenceAuditReport;
  const pillars = r.pillars ?? [];
  const business = r.business_name || 'your business';

  // The hub, so the audit sends them back to the rest of the suite rather than
  // dead-ending on a score.
  let hubUrl: string | null = null;
  if (row.lead_id) {
    const { data: lead } = await sb.from('outbound_leads').select('hub_demo_url').eq('id', row.lead_id).maybeSingle();
    hubUrl = (lead?.hub_demo_url as string | null) ?? null;
  }

  const overallColor = RING(r.overall_score);
  const generated = new Date(r.generated_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <main className="min-h-screen bg-[#FBF6EA] text-[#161616] px-4 sm:px-6 py-10 sm:py-16 print:py-0">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── the score ── */}
        <header className="pop-card-yellow p-6 sm:p-10">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#161616]/70">
            Presence Audit &middot; {generated}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight mt-2">{business}</h1>

          <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-7xl sm:text-8xl font-black leading-none tabular-nums" style={{ color: overallColor }}>
                {r.overall_score}
              </span>
              <span
                className="font-mono text-xl font-bold px-3 py-1 rounded-lg border-2 border-[#161616]"
                style={{ background: overallColor, color: '#FFFDF6' }}
              >
                {r.letter_grade}
              </span>
            </div>
            <p className="font-display text-xl sm:text-2xl font-bold leading-snug flex-1 min-w-[16rem]">{r.headline}</p>
          </div>

          <p className="font-body text-[15px] sm:text-base leading-relaxed text-[#161616]/85 mt-5 max-w-3xl">{r.summary}</p>
        </header>

        {/* ── the three dials ── */}
        <section className="grid gap-5 sm:grid-cols-3">
          {pillars.map((p) => (
            <Dial key={p.key} pillar={p} />
          ))}
        </section>

        {/* ── what to do about it ── */}
        {r.top_fixes?.length > 0 && (
          <section className="pop-card p-6 sm:p-8">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#E0301E]">Do these, in this order</span>
            <h2 className="font-display text-2xl sm:text-3xl font-black mt-1 mb-5">
              The free ones are first on purpose
            </h2>
            <ol className="space-y-5">
              {r.top_fixes.map((f, i) => (
                <li key={`${f.title}-${i}`} className="flex gap-4">
                  <span className="shrink-0 grid place-items-center h-9 w-9 rounded-lg border-2 border-[#161616] bg-[#F5B700] font-display text-lg font-black">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold leading-tight">{f.title}</h3>
                    <p className="font-body text-[13.5px] leading-relaxed text-[#3A3733] mt-1">{f.why}</p>
                    <p className="font-body text-[13.5px] leading-relaxed text-[#161616]/70 mt-1">
                      <strong className="font-sans text-[11px] uppercase tracking-[0.14em] text-[#161616]/50">How</strong>{' '}
                      {f.how}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ── the pass/fail pillars, in full ── */}
        {pillars.filter((p) => p.checks.length > 0).map((p) => (
          <Checks key={`checks-${p.key}`} pillar={p} />
        ))}

        {/* ── the seven website categories ── */}
        {r.website_categories && (
          <section className="pop-card p-6 sm:p-8">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#E0301E]">Website, category by category</span>
            <h2 className="font-display text-2xl sm:text-3xl font-black mt-1 mb-5">{r.website || 'Your site'}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(r.website_categories).map(([key, cat]) => (
                <div key={key} className="border-2 border-[#161616]/15 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#161616]/60">
                      {key === 'geo' ? 'GEO (AI search)' : key === 'ai_features' ? 'AI features' : key}
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums" style={{ color: RING(cat.score) }}>
                      {cat.score} &middot; {cat.letter}
                    </span>
                  </div>
                  <p className="font-body text-[13px] leading-relaxed text-[#3A3733] mt-2">{cat.notes}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── the full to-do ── */}
        {r.website_todo?.length > 0 && (
          <section className="pop-card-cream p-6 sm:p-8">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#E0301E]">The full list</span>
            <h2 className="font-display text-2xl sm:text-3xl font-black mt-1 mb-4">Everything we would change</h2>
            <ul className="space-y-2.5">
              {r.website_todo.map((t, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="shrink-0 mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded border-2 border-[#161616]"
                    style={{
                      background: t.priority === 'high' ? '#C4160B' : t.priority === 'medium' ? '#F5B700' : '#FFFFFF',
                      color: t.priority === 'high' ? '#FFFDF6' : '#161616',
                    }}
                  >
                    {t.priority}
                  </span>
                  <span className="font-body text-[13.5px] leading-relaxed text-[#3A3733]">{t.task}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── the one sales sentence, after the receipts ── */}
        <section className="rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-6 sm:p-9 shadow-[5px_5px_0_0_#F5B700]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5B700]">What we would do about it</span>
          <h2 className="font-display text-2xl sm:text-3xl font-black mt-2 leading-tight">
            We would rather show you than pitch you.
          </h2>
          <p className="font-body text-[15px] leading-relaxed text-[#FBF6EA]/85 mt-3 max-w-2xl">
            So we already built it. A website for {business}, a voice agent that answers as you at two in the morning, a
            command center that puts your calls and your money on one board, and a step-by-step AI plan you keep either
            way. All free to look at, all yours, no card and no meeting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={hubUrl ?? 'https://modernmustardseed.com/demos'}
              className="inline-block bg-[#F5B700] text-[#161616] border-2 border-[#F5B700] rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm"
            >
              {hubUrl ? 'Open your demo suite' : 'Get your free demo suite'}
            </a>
            <a
              href="tel:+14063121223"
              className="inline-block border-2 border-[#FBF6EA]/40 rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm text-[#FBF6EA]"
            >
              Or call Mr. Mustard, (406) 312-1223
            </a>
          </div>
        </section>

        {/* ── the receipts ── */}
        {r.provenance?.length > 0 && (
          <footer className="border-t-2 border-[#161616]/15 pt-6">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#161616]/50">
              Every number above, and where it came from
            </span>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {r.provenance.map((p) => (
                <div key={p.label} className="flex gap-2 text-[12.5px] font-body text-[#161616]/65">
                  <dt className="font-bold text-[#161616]/80 whitespace-nowrap">{p.label}:</dt>
                  <dd className="min-w-0 break-words">
                    {p.value} <span className="text-[#161616]/45">({p.source})</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="font-body text-[12px] leading-relaxed text-[#161616]/50 mt-4 max-w-3xl">
              The website score is graded across brand, trust, SEO, GEO, AI features, conversion and design. The profile
              and review scores are arithmetic you can redo yourself: every check above shows what it is worth and what
              it earned. Website counts for {Math.round(PILLAR_WEIGHTS.website * 100)}%, reviews for{' '}
              {Math.round(PILLAR_WEIGHTS.reviews * 100)}%, the profile for {Math.round(PILLAR_WEIGHTS.profile * 100)}%. A
              pillar we could not see is left out of the total rather than counted as a zero.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/40 mt-5">
              Modern Mustard Seed &middot; Kalispell, Montana
            </p>
          </footer>
        )}
      </div>
    </main>
  );
}
