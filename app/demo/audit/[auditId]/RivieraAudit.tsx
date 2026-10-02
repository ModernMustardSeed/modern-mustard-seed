import type { CSSProperties, ReactNode } from 'react';
import { PILLAR_WEIGHTS, type PresenceAuditReport, type Pillar } from '@/lib/presence-audit';
import PresenceAsk from '@/components/PresenceAsk';

/**
 * THE PRESENCE AUDIT, RIVIERA EDITION (2026-09-28).
 *
 * The same report, the same receipts, the same order of argument as the classic
 * scorecard in page.tsx, set in the house the site moved into on 2026-09-27:
 * Unbounded for display, Figtree for everything read, sand under it all, and the
 * palette of the water (sea, lagoon, Tiffany, mustard, coral).
 *
 * /demo/ is outside RivieraScope on purpose (built demos keep their own type),
 * so this page does not lean on app/riviera-type.css. It sets its own faces from
 * the --font-riviera and --font-caps variables the root layout already loads.
 *
 * Every score still prints its number and its letter. Colour only repeats what
 * the text already says, because this page gets printed and forwarded.
 */

const SEA = '#0b3b44';
const SAND = '#fbf5ea';
const TIFFANY = '#81d8d0';
const LAGOON = '#0a7c78';
const FOAM = '#d8f3f0';
const MUSTARD = '#f5b700';
const CORAL = '#ff6f59';

const DISPLAY: CSSProperties = { fontFamily: "var(--font-riviera), 'Unbounded', system-ui, sans-serif" };
const READ: CSSProperties = { fontFamily: "var(--font-caps), 'Figtree', system-ui, sans-serif" };

const WAVE = (stroke: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 8'%3E%3Cpath d='M0 4c5 0 5-3 10-3s5 3 10 3 5-3 10-3 5 3 10 3' fill='none' stroke='%23${stroke.slice(1)}' stroke-width='2.2' stroke-linecap='round'/%3E%3C/svg%3E")`;

/** Good, middling, needs work: lagoon, mustard, coral. The pill carries it, the number stays sea. */
function tone(score: number) {
  if (score >= 80) return { bg: LAGOON, fg: '#ffffff', label: 'Strong' };
  if (score >= 60) return { bg: MUSTARD, fg: SEA, label: 'Room to grow' };
  return { bg: CORAL, fg: SEA, label: 'Needs work' };
}

/** The accent word: Unbounded Regular in lagoon with a Tiffany wave under it. Unbounded has no italic. */
function Accent({ children, onSea = false }: { children: ReactNode; onSea?: boolean }) {
  return (
    <span
      style={{
        ...DISPLAY,
        fontWeight: 400,
        color: onSea ? TIFFANY : LAGOON,
        background: `${WAVE(onSea ? MUSTARD : TIFFANY)} 0 100% / .9em .2em repeat-x`,
        paddingBottom: '.1em',
        WebkitBoxDecorationBreak: 'clone',
        boxDecorationBreak: 'clone',
      }}
    >
      {children}
    </span>
  );
}

/** Tracked capitals after a little sun. */
function Kicker({ children, onSea = false }: { children: ReactNode; onSea?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2.5 text-[11.5px] sm:text-[12px] font-semibold uppercase tracking-[0.18em]"
      style={{ ...READ, color: onSea ? TIFFANY : LAGOON }}
    >
      <span aria-hidden className="h-[0.7em] w-[0.7em] rounded-full shrink-0" style={{ background: MUSTARD, boxShadow: '0 0 0 3px #f5b70033' }} />
      {children}
    </span>
  );
}

const CARD = 'rounded-[26px] bg-white p-6 sm:p-9 shadow-[0_30px_60px_-38px_#0b3b4455] ring-1 ring-[#0b3b44]/[0.07]';

function ScorePill({ score, letter, big = false }: { score: number; letter: string; big?: boolean }) {
  const t = tone(score);
  return (
    <span
      className={`inline-grid place-items-center rounded-full font-bold tabular-nums ${big ? 'px-4 py-1.5 text-xl' : 'px-3 py-0.5 text-sm'}`}
      style={{ ...READ, background: t.bg, color: t.fg }}
    >
      {letter}
    </span>
  );
}

function Dial({ pillar }: { pillar: Pillar }) {
  const pct = Math.max(0, Math.min(100, pillar.score));
  const t = tone(pct);
  return (
    <div className={`${CARD} !p-6 flex flex-col`}>
      <Kicker>{pillar.label}</Kicker>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-[52px] leading-none font-bold tabular-nums tracking-[-0.04em]" style={{ ...DISPLAY, color: SEA }}>
          {pillar.unknown ? '?' : pct}
        </span>
        {pillar.unknown ? (
          <span className="rounded-full px-3 py-0.5 text-sm font-bold" style={{ ...READ, background: FOAM, color: SEA }}>n/a</span>
        ) : (
          <ScorePill score={pct} letter={pillar.letter} />
        )}
      </div>

      {/* The bar is the score. No animation, because this page gets printed. */}
      <div className="mt-4 h-2.5 w-full rounded-full overflow-hidden" style={{ background: FOAM }}>
        <div className="h-full rounded-full" style={{ width: `${pillar.unknown ? 0 : pct}%`, background: pillar.unknown ? FOAM : t.bg }} />
      </div>

      <p className="text-[15px] leading-relaxed mt-4 flex-1" style={{ ...READ, color: `${SEA}cc` }}>{pillar.verdict}</p>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] mt-4" style={{ ...READ, color: `${SEA}80` }}>
        Worth {Math.round(pillar.weight * 100)}% of the total
      </span>
    </div>
  );
}

function Checks({ pillar }: { pillar: Pillar }) {
  if (!pillar.checks.length) return null;
  return (
    <section className={CARD}>
      <Kicker>{pillar.label}</Kicker>
      <h2 className="text-[26px] sm:text-[34px] font-bold leading-[1.08] tracking-[-0.03em] mt-3 mb-6" style={{ ...DISPLAY, color: SEA }}>
        {pillar.score} <Accent>out of 100</Accent>
      </h2>
      <ul>
        {pillar.checks.map((c) => (
          <li key={c.label} className="flex gap-4 py-4 border-t first:border-t-0 first:pt-0" style={{ borderColor: `${SEA}14` }}>
            <span
              className="shrink-0 mt-0.5 grid place-items-center h-7 w-7 rounded-full text-[13px] font-bold"
              style={{ ...READ, background: c.passed ? LAGOON : CORAL, color: c.passed ? '#ffffff' : SEA }}
              aria-label={c.passed ? 'Pass' : 'Missing'}
            >
              {c.passed ? '✓' : '✕'}
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold" style={{ ...READ, color: SEA }}>{c.label}</span>
              <span className="block text-[14.5px] leading-relaxed mt-0.5" style={{ ...READ, color: `${SEA}b3` }}>{c.detail}</span>
            </span>
            <span className="ml-auto shrink-0 text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ ...READ, color: `${SEA}80` }}>
              {c.earned}/{c.points}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PRIORITY: Record<string, { bg: string; fg: string }> = {
  high: { bg: CORAL, fg: SEA },
  medium: { bg: MUSTARD, fg: SEA },
  low: { bg: FOAM, fg: SEA },
};

export default function RivieraAudit({
  r,
  auditId,
  leadId,
}: {
  r: PresenceAuditReport;
  auditId: string;
  leadId: string;
}) {
  const pillars = r.pillars ?? [];
  const business = r.business_name || 'your business';
  const generated = r.generated_at
    ? new Date(r.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' })
    : '';
  const overall = tone(r.overall_score);
  const domain = (r.website || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');

  return (
    <main
      data-audit-edition="riviera"
      className="min-h-screen px-4 sm:px-6 py-8 sm:py-14 print:py-0"
      style={{ ...READ, background: SAND, color: SEA }}
    >
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">

        {/* ── the score, under the painting ── */}
        <header className="rounded-[30px] overflow-hidden bg-white shadow-[0_40px_80px_-44px_#0b3b4466] ring-1 ring-[#0b3b44]/[0.07] grid lg:grid-cols-[1.1fr_1fr]">
          <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center order-2 lg:order-1">
            <Kicker>Presence Audit{generated ? <> &middot; {generated}</> : null}</Kicker>
            <h1
              className="text-[34px] sm:text-[48px] font-bold leading-[1.04] tracking-[-0.035em] mt-4 break-words [text-wrap:balance]"
              style={{ ...DISPLAY, color: SEA }}
            >
              {business}
            </h1>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <span className="text-[88px] sm:text-[108px] font-bold leading-[0.85] tabular-nums tracking-[-0.05em]" style={{ ...DISPLAY, color: SEA }}>
                {r.overall_score}
              </span>
              <span className="flex flex-col items-start gap-2">
                <ScorePill score={r.overall_score} letter={r.letter_grade} big />
                <span className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ ...READ, color: `${SEA}99` }}>
                  {overall.label} &middot; out of 100
                </span>
              </span>
            </div>

            <p className="text-[21px] sm:text-[24px] font-semibold leading-snug tracking-[-0.02em] mt-7" style={{ ...DISPLAY, fontWeight: 600, color: SEA }}>
              {r.headline}
            </p>
            <p className="text-[16px] sm:text-[17px] leading-relaxed mt-4 max-w-2xl" style={{ ...READ, color: `${SEA}cc` }}>{r.summary}</p>
          </div>

          <figure className="relative order-1 lg:order-2 m-0 min-h-[220px] sm:min-h-[300px]">
            <picture>
              <source type="image/avif" srcSet="/art/riviera/audit-960.avif 960w, /art/riviera/audit-1600.avif 1600w" sizes="(min-width: 1024px) 480px, 100vw" />
              <source type="image/webp" srcSet="/art/riviera/audit-960.webp 960w, /art/riviera/audit-1600.webp 1600w" sizes="(min-width: 1024px) 480px, 100vw" />
              <img
                src="/art/riviera/audit-960.webp"
                alt="Painting: Mr. Mustard and one of the seed kids look out from the deck of a yacht through binoculars and a brass spyglass, the seed dog beside them, a whitewashed Riviera village on the cliffs behind."
                width={960}
                height={640}
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </picture>
            <figcaption
              className="absolute left-4 bottom-4 rounded-full px-4 py-1.5 text-[13px] font-medium italic"
              style={{ ...READ, background: '#ffffffe6', color: SEA }}
            >
              We went looking for you, the way a customer does
            </figcaption>
          </figure>
        </header>

        {/* ── the three dials ── */}
        <section className="grid gap-5 sm:gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <Dial key={p.key} pillar={p} />
          ))}
        </section>

        {/* ── what to do about it ── */}
        {r.top_fixes?.length > 0 && (
          <section className="rounded-[26px] p-6 sm:p-10" style={{ background: SEA, color: SAND }}>
            <Kicker onSea>Do these, in this order</Kicker>
            <h2 className="text-[28px] sm:text-[38px] font-bold leading-[1.06] tracking-[-0.03em] mt-3 mb-8" style={{ ...DISPLAY, color: SAND }}>
              The free ones are <Accent onSea>first on purpose</Accent>
            </h2>
            <ol className="grid gap-5 md:grid-cols-3">
              {r.top_fixes.map((f, i) => (
                <li key={`${f.title}-${i}`} className="rounded-[20px] p-5 sm:p-6" style={{ background: '#ffffff0f', boxShadow: 'inset 0 0 0 1px #81d8d033' }}>
                  <span className="grid place-items-center h-10 w-10 rounded-full text-[17px] font-bold" style={{ ...DISPLAY, background: MUSTARD, color: SEA }}>
                    {i + 1}
                  </span>
                  <h3 className="text-[19px] font-semibold leading-tight tracking-[-0.02em] mt-4" style={{ ...DISPLAY, fontWeight: 600, color: SAND }}>{f.title}</h3>
                  <p className="text-[15px] leading-relaxed mt-2" style={{ ...READ, color: `${SAND}d9` }}>{f.why}</p>
                  <p className="text-[15px] leading-relaxed mt-3" style={{ ...READ, color: `${SAND}b3` }}>
                    <strong className="text-[11px] font-semibold uppercase tracking-[0.16em] mr-1.5" style={{ color: TIFFANY }}>How</strong>
                    {f.how}
                  </p>
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
          <section className={CARD}>
            <Kicker>Website, category by category</Kicker>
            <h2 className="text-[26px] sm:text-[34px] font-bold leading-[1.08] tracking-[-0.03em] mt-3" style={{ ...DISPLAY, color: SEA }}>
              Seven ways a stranger <Accent>reads your site</Accent>
            </h2>
            {domain && (
              /* A domain has no spaces, so it is allowed to break anywhere on a phone. */
              <p className="text-[15px] font-semibold mt-2 break-words [overflow-wrap:anywhere]" style={{ ...READ, color: LAGOON }}>{domain}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 mt-7">
              {/* A stored report can carry a junk category key whose value is null; skip it rather than 500. */}
              {Object.entries(r.website_categories)
                .filter((e): e is [string, { score: number; letter: string; notes: string }] =>
                  Boolean(e[1]) && typeof (e[1] as { score?: unknown }).score === 'number')
                .map(([key, cat]) => (
                  <div key={key} className="rounded-[18px] p-5" style={{ background: `${FOAM}80` }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ ...READ, color: SEA }}>
                        {key === 'geo' ? 'GEO (AI search)' : key === 'ai_features' ? 'AI features' : key}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[15px] font-bold tabular-nums" style={{ ...DISPLAY, color: SEA }}>{cat.score}</span>
                        <ScorePill score={cat.score} letter={cat.letter} />
                      </span>
                    </div>
                    <p className="text-[14.5px] leading-relaxed mt-3" style={{ ...READ, color: `${SEA}c7` }}>{cat.notes}</p>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ── the full to-do ── */}
        {r.website_todo?.length > 0 && (
          <section className={CARD}>
            <Kicker>The full list</Kicker>
            <h2 className="text-[26px] sm:text-[34px] font-bold leading-[1.08] tracking-[-0.03em] mt-3 mb-6" style={{ ...DISPLAY, color: SEA }}>
              Everything we <Accent>would change</Accent>
            </h2>
            <ul className="space-y-3.5">
              {r.website_todo.map((t, i) => {
                const p = PRIORITY[t.priority] ?? PRIORITY.low;
                return (
                  <li key={i} className="flex gap-3.5 items-start">
                    <span
                      className="shrink-0 mt-0.5 w-[4.6rem] text-center rounded-full py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]"
                      style={{ ...READ, background: p.bg, color: p.fg }}
                    >
                      {t.priority}
                    </span>
                    <span className="text-[15px] leading-relaxed" style={{ ...READ, color: `${SEA}d1` }}>{t.task}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ── the ask, after the receipts and never instead of them ── */}
        <PresenceAsk business={business} leadId={leadId} auditId={auditId} score={r.overall_score} edition="riviera" />

        {/* ── the receipts ── */}
        {r.provenance?.length > 0 && (
          <footer className="pt-4">
            <Kicker>Every number above, and where it came from</Kicker>
            <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {r.provenance.map((p) => (
                <div key={p.label} className="flex gap-2 text-[13.5px]" style={{ ...READ, color: `${SEA}a6` }}>
                  <dt className="font-semibold whitespace-nowrap" style={{ color: SEA }}>{p.label}:</dt>
                  <dd className="min-w-0 break-words">
                    {p.value}{' '}
                    {/* A short label that links, never the raw 200-character Maps URL. */}
                    {p.sourceUrl ? (
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="underline underline-offset-2 hover:text-[#0a7c78]"
                        style={{ textDecorationColor: `${TIFFANY}` }}
                      >
                        ({p.source})
                      </a>
                    ) : (
                      <span>({p.source})</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-[13px] leading-relaxed mt-5 max-w-3xl" style={{ ...READ, color: `${SEA}99` }}>
              The website score is graded across brand, trust, SEO, GEO, AI features, conversion and design. The profile
              and review scores are arithmetic you can redo yourself: every check above shows what it is worth and what
              it earned. Website counts for {Math.round(PILLAR_WEIGHTS.website * 100)}%, reviews for{' '}
              {Math.round(PILLAR_WEIGHTS.reviews * 100)}%, the profile for {Math.round(PILLAR_WEIGHTS.profile * 100)}%. A
              pillar we could not see is left out of the total rather than counted as a zero.
            </p>
            <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ ...READ, color: `${SEA}80` }}>
              <a href="https://modernmustardseed.com" className="hover:text-[#0a7c78]" style={{ color: LAGOON }}>Modern Mustard Seed</a>
              {' '}&middot; Flathead Valley, Montana
            </p>
          </footer>
        )}
      </div>
    </main>
  );
}
