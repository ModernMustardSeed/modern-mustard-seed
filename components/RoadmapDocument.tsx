import Link from 'next/link';
import { STAGES, type RoadmapReport } from '@/lib/roadmap-shape';

/**
 * THE HUNDREDFOLD ROADMAP, rendered.
 *
 * A server component on purpose: the share page at /scaling-roadmap/r/[slug]
 * renders the whole document in HTML so it is crawlable, quotable by AI search,
 * and readable with JavaScript off. The public tool wraps this same component on
 * the client once a fresh report comes back, so a roadmap looks identical
 * whether it was just generated, shared, or opened from the admin desk.
 *
 * Brand: pop-art cabin. Cream canvas, ink borders, hard offset sticker shadows,
 * mustard for the one thing the eye must hit. Small red type on cream uses
 * #C4160B (the bright #E0301E fails AA below large sizes).
 */

const RED = '#C4160B';

const DEPARTMENTS: Record<string, string> = {
  'The Talking Website': '/talking-website',
  'Voice Agents': '/voice-agents',
  'Command Center': '/command-center',
  'Mustard Pictures': '/pictures',
  'Mustard Broadcast': '/ads',
  'GEO Desk': '/website-audit',
  Websites: '/websites',
  'The Chief': '/chief',
};

const CONSTRAINT_LABELS: Record<string, string> = {
  leads: 'Not enough people know you exist',
  sales: 'People arrive, then do not buy',
  delivery: 'You cannot deliver more without breaking',
  cash: 'Growth costs more cash than it returns',
  offer: 'What you sell is not worth enough to enough people',
  owner: 'Everything runs through you',
};

function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`block text-[9px] uppercase tracking-[0.4em] font-mono font-bold ${className}`}
      style={{ color: RED }}
    >
      {children}
    </span>
  );
}

function SectionTitle({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="mb-6">
      <Eyebrow className="mb-3">{kicker}</Eyebrow>
      <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight leading-[1.05]">
        {title}
      </h2>
      {lede && (
        <p className="mt-3 text-[#161616]/70 font-body text-base leading-relaxed max-w-2xl">{lede}</p>
      )}
    </div>
  );
}

/** The growth ladder. Five rungs, the current one lit. */
function StageLadder({ stage }: { stage: string }) {
  const current = Math.max(0, STAGES.indexOf(stage as (typeof STAGES)[number]));
  return (
    <div className="flex items-end gap-1.5 sm:gap-2" aria-label={`Growth stage: ${stage}`}>
      {STAGES.map((s, i) => {
        const active = i === current;
        const passed = i < current;
        return (
          <div key={s} className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div
              className={`w-full rounded-t-md border-2 border-[#161616] transition-all ${
                active ? 'bg-[#F5B700]' : passed ? 'bg-[#161616]' : 'bg-white'
              }`}
              style={{ height: `${16 + i * 11}px` }}
            />
            <span
              className={`text-[8px] sm:text-[9px] uppercase tracking-[0.14em] font-mono font-bold truncate w-full text-center ${
                active ? 'text-[#161616]' : 'text-[#161616]/45'
              }`}
            >
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A 0-10 lever bar for the value equation. */
function LeverBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  return (
    <div className="h-2.5 rounded-full bg-[#161616]/10 border border-[#161616]/20 overflow-hidden">
      <div
        className={`h-full ${score >= 7 ? 'bg-[#2F7D32]' : score >= 4 ? 'bg-[#F5B700]' : 'bg-[#E0301E]'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Sum the stack's dollar values when they parse, so the anchor can be shown. */
function stackTotal(stack: { value: string }[]): string | null {
  let total = 0;
  let counted = 0;
  for (const item of stack) {
    const m = item.value.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)\s*([km])?/i);
    if (!m) continue;
    let n = parseFloat(m[1]);
    if (!Number.isFinite(n)) continue;
    if (m[2]?.toLowerCase() === 'k') n *= 1000;
    if (m[2]?.toLowerCase() === 'm') n *= 1_000_000;
    total += n;
    counted += 1;
  }
  if (counted < stack.length || total <= 0) return null;
  return `$${Math.round(total).toLocaleString('en-US')}`;
}

export default function RoadmapDocument({
  report,
  host,
  url,
  generatedAt,
}: {
  report: RoadmapReport;
  host: string;
  url?: string;
  generatedAt?: string;
}) {
  const total = stackTotal(report.offer_stack ?? []);
  const dateLine = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <article className="space-y-16 md:space-y-24">
      {/* ── The read ─────────────────────────────────────────────────── */}
      <header>
        <div className="pop-card p-7 md:p-12">
          <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-12">
            <div className="flex-1 min-w-0">
              <Eyebrow className="mb-4">The Hundredfold Roadmap</Eyebrow>
              <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[0.98]">
                {report.business_name}
              </h1>
              <p className="mt-4 text-[#161616]/75 font-body text-lg md:text-xl leading-snug max-w-2xl">
                {report.one_liner}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.3em] font-mono text-[#161616]/50">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#1E50C8] transition-colors"
                  >
                    {host}
                  </a>
                ) : (
                  <span>{host}</span>
                )}
                {dateLine && <span>{dateLine}</span>}
              </div>
            </div>

            {/* Score + stage */}
            <div className="lg:w-72 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-[3px] border-[#161616] bg-[#F5B700] shadow-[5px_5px_0_0_#161616] flex flex-col items-center justify-center shrink-0">
                  <span className="font-display text-4xl md:text-5xl font-black text-[#161616] leading-none">
                    {report.scale_score}
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.3em] text-[#161616]/65 font-mono mt-1">
                    Scale score
                  </span>
                </div>
                <div className="min-w-0">
                  <Eyebrow className="mb-1.5">Stage</Eyebrow>
                  <p className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight">
                    {report.stage}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <StageLadder stage={report.stage} />
              </div>
            </div>
          </div>

          <p className="mt-9 pt-8 border-t-2 border-[#161616]/12 font-display italic text-2xl md:text-3xl font-black text-[#161616] leading-snug">
            &ldquo;{report.headline}&rdquo;
          </p>
        </div>
      </header>

      {/* ── Verdict ──────────────────────────────────────────────────── */}
      <section>
        <SectionTitle kicker="The honest read" title="Where you actually are" />
        <div className="pop-card p-7 md:p-10">
          <p className="text-[#3a3733] font-body text-base md:text-lg leading-relaxed whitespace-pre-line">
            {report.verdict}
          </p>
        </div>
      </section>

      {/* ── The constraint. The signature moment of the document. ────── */}
      <section>
        <SectionTitle
          kicker="The one thing"
          title="Your constraint"
          lede="Businesses are capped by one thing at a time. Fix this and the next ninety days move. Work on anything else and you are decorating."
        />
        {/* Print variants throughout: browsers drop background graphics by
            default, so the ink card would print white text on white paper. On
            paper it becomes a bordered white card with ink text. */}
        <div className="border-2 border-[#161616] rounded-2xl bg-[#161616] shadow-[7px_7px_0_0_#F5B700] overflow-hidden print:bg-white print:shadow-none">
          <div className="p-7 md:p-11">
            <span className="inline-block px-3 py-1 rounded-full border-2 border-[#F5B700] text-[#F5B700] text-[9px] uppercase tracking-[0.3em] font-mono font-bold print:text-[#8f6600] print:border-[#8f6600]">
              {report.constraint.type}
            </span>
            <h3 className="mt-5 font-display text-3xl md:text-5xl font-black text-[#FBF6EA] tracking-tight leading-[1.02] print:text-[#161616]">
              {report.constraint.title}
            </h3>
            <p className="mt-3 text-[#F5B700] font-mono text-[11px] uppercase tracking-[0.22em] print:text-[#8f6600]">
              {CONSTRAINT_LABELS[report.constraint.type] ?? report.constraint.type}
            </p>

            <div className="mt-8 grid md:grid-cols-2 gap-6 md:gap-8">
              <div>
                <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#F5B700]/80 mb-2 print:text-[#8f6600]">
                  What we see
                </span>
                <p className="text-[#FBF6EA]/85 font-body text-sm md:text-base leading-relaxed print:text-[#161616]">
                  {report.constraint.evidence}
                </p>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#F5B700]/80 mb-2 print:text-[#8f6600]">
                  What it costs to ignore
                </span>
                <p className="text-[#FBF6EA]/85 font-body text-sm md:text-base leading-relaxed print:text-[#161616]">
                  {report.constraint.cost_of_ignoring}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[#F5B700] border-t-2 border-[#161616] p-6 md:p-8">
            <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#161616]/70 mb-2">
              Your first move
            </span>
            <p className="font-display text-xl md:text-2xl font-black text-[#161616] leading-snug">
              {report.constraint.first_move}
            </p>
          </div>
        </div>
      </section>

      {/* ── Value equation ───────────────────────────────────────────── */}
      <section>
        <SectionTitle
          kicker="Why they buy, or do not"
          title="The four levers"
          lede="Every purchase is one silent calculation: how big is the result, how sure am I that I get it, how long does it take, and how much does it cost me in effort. Pull the levers and the same business becomes an easy yes."
        />
        <div className="grid md:grid-cols-2 gap-4">
          {report.value_equation.map((lever) => (
            <div key={lever.lever} className="pop-card p-6 md:p-7">
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <h3 className="font-display text-xl font-black text-[#161616] tracking-tight">
                  {lever.lever}
                </h3>
                <span className="font-display text-2xl font-black text-[#161616] shrink-0">
                  {lever.score}
                  <span className="text-sm text-[#161616]/45"> / 10</span>
                </span>
              </div>
              <LeverBar score={lever.score} />
              <p className="mt-4 text-[#3a3733] font-body text-sm leading-relaxed">{lever.note}</p>
              <p className="mt-3 text-[#161616] font-body text-sm leading-relaxed">
                <span className="font-mono font-bold text-[10px] uppercase tracking-[0.25em] mr-2" style={{ color: RED }}>
                  Fix
                </span>
                {lever.fix}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The offer ────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          kicker="The rebuild"
          title="The offer to sell instead"
          lede="Price is not what you charge. It is what the buyer compares against what they get. Stack the value until the price looks small, then guarantee the part they are scared of."
        />

        <div className="pop-card-yellow p-7 md:p-10">
          <Eyebrow className="mb-3">Call it this</Eyebrow>
          <h3 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight leading-tight">
            {report.offer.name}
          </h3>
          <p className="mt-4 text-[#161616]/85 font-body text-base md:text-lg leading-relaxed max-w-3xl">
            {report.offer.promise}
          </p>
          <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-4 pt-6 border-t-2 border-[#161616]/20">
            <div>
              <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#161616]/60 mb-1">
                Price it at
              </span>
              <p className="font-display text-3xl md:text-4xl font-black text-[#161616]">{report.offer.price}</p>
            </div>
            {total && (
              <div>
                <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#161616]/60 mb-1">
                  Stack value
                </span>
                <p className="font-display text-3xl md:text-4xl font-black text-[#161616]/45 line-through decoration-[3px]">
                  {total}
                </p>
              </div>
            )}
          </div>
          <p className="mt-5 text-[#161616]/80 font-body text-sm leading-relaxed max-w-3xl">
            {report.offer.price_logic}
          </p>
        </div>

        <div className="mt-4 pop-card p-6 md:p-8">
          <Eyebrow className="mb-5">What is in it</Eyebrow>
          <div className="divide-y divide-[#161616]/10">
            {report.offer_stack.map((item, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4 md:gap-6">
                <span className="font-mono text-[10px] text-[#161616]/35 pt-1.5 w-5 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-sans font-extrabold text-[#161616] text-base leading-snug">
                    {item.item}
                  </h4>
                  <p className="mt-1 text-[#3a3733] font-body text-sm leading-relaxed">{item.why}</p>
                </div>
                <span className="font-display font-black text-[#161616] text-lg shrink-0 tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="pop-card p-6 md:p-7">
            <Eyebrow className="mb-3">The guarantee</Eyebrow>
            <p className="text-[#161616] font-body text-base leading-relaxed">{report.offer.guarantee}</p>
          </div>
          <div className="pop-card p-6 md:p-7">
            <Eyebrow className="mb-3">Why now, honestly</Eyebrow>
            <p className="text-[#161616] font-body text-base leading-relaxed">{report.offer.urgency}</p>
          </div>
        </div>

        {report.offer_cuts.length > 0 && (
          <div className="mt-4 pop-card p-6 md:p-8 border-[#E0301E]">
            <Eyebrow className="mb-4">Cut these</Eyebrow>
            <ul className="space-y-2.5">
              {report.offer_cuts.map((cut, i) => (
                <li key={i} className="flex items-start gap-3 text-[#161616] font-body text-sm md:text-base leading-relaxed">
                  <span className="font-mono font-black shrink-0 mt-0.5" style={{ color: RED }}>
                    &times;
                  </span>
                  {cut}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Money model ──────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          kicker="How growth pays for itself"
          title="Your money model"
          lede="A business that collects more in the first thirty days than it costs to win a customer can buy as many customers as it wants. That is the whole game."
        />
        <div className="grid md:grid-cols-5 gap-3">
          {[
            { label: 'Attraction', value: report.money_model.attraction },
            { label: 'Core', value: report.money_model.core },
            { label: 'Continuity', value: report.money_model.continuity },
            { label: 'Upsell', value: report.money_model.upsell },
            { label: 'Downsell', value: report.money_model.downsell },
          ].map((rung, i) => (
            <div
              key={rung.label}
              className={`border-2 border-[#161616] rounded-xl p-5 shadow-[4px_4px_0_0_#161616] ${
                i === 1 ? 'bg-[#F5B700]' : 'bg-white'
              }`}
            >
              <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-2.5">
                {rung.label}
              </span>
              <p className="text-[#161616] font-body text-sm leading-relaxed">{rung.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="pop-card p-6 md:p-7">
            <Eyebrow className="mb-3">The cash rule</Eyebrow>
            <p className="font-display text-lg md:text-xl font-black text-[#161616] leading-snug">
              {report.money_model.cash_rule}
            </p>
          </div>
          <div className="pop-card p-6 md:p-7">
            <Eyebrow className="mb-3">Lifetime profit to cost of a customer</Eyebrow>
            <p className="text-[#161616] font-body text-base leading-relaxed">{report.money_model.ltgp_cac}</p>
          </div>
        </div>
      </section>

      {/* ── Lead engine ──────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          kicker="Where the next hundred come from"
          title="Your lead engine"
          lede="Four ways to get customers, and you only need one of them working. Pick the one your situation already favors, run it past the point of boredom, then add the next."
        />
        <div className="border-2 border-[#161616] rounded-2xl bg-[#1E50C8] shadow-[7px_7px_0_0_#161616] p-7 md:p-10 text-white print:bg-white print:text-[#161616] print:shadow-none">
          <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-white/70 mb-3 print:text-[#8f6600]">
            Run this one first
          </span>
          <h3 className="font-display text-3xl md:text-5xl font-black tracking-tight leading-none">
            {report.lead_engine.primary_channel}
          </h3>
          <p className="mt-4 text-white/85 font-body text-base md:text-lg leading-relaxed max-w-3xl print:text-[#161616]">
            {report.lead_engine.why}
          </p>
          <div className="mt-8 grid md:grid-cols-2 gap-6 pt-7 border-t border-white/25 print:border-[#161616]/25">
            <div>
              <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-white/60 mb-2">
                Your weekly number
              </span>
              <p className="font-display text-xl md:text-2xl font-black leading-snug">
                {report.lead_engine.weekly_volume}
              </p>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-white/60 mb-2">
                The thing you give away
              </span>
              <p className="font-body text-sm md:text-base leading-relaxed text-white/90 print:text-[#161616]">
                {report.lead_engine.lead_magnet}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {report.channel_plays.map((play, i) => (
            <div key={i} className="pop-card p-6 md:p-8">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
                <h4 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight">
                  {play.channel}
                </h4>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#161616]/50">
                  {play.cadence}
                </span>
              </div>
              <p className="text-[#3a3733] font-body text-sm md:text-base leading-relaxed">{play.play}</p>
              <div className="mt-4 border-l-4 border-[#F5B700] bg-[#FFFDF6] rounded-r-lg px-5 py-4">
                <span className="block text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-[#161616]/50 mb-1.5">
                  Say this
                </span>
                <p className="font-body text-[#161616] text-sm md:text-base italic leading-relaxed">
                  &ldquo;{play.hook}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── The four phases ──────────────────────────────────────────── */}
      <section>
        <SectionTitle
          kicker="The next twelve months"
          title="Four windows, four gates"
          lede="You do not get to move to the next window because time passed. You move because the number cleared. That is the whole discipline."
        />
        <div className="space-y-4">
          {report.phases.map((phase, i) => (
            <div key={i} className="relative">
              <div className="pop-card overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* The rail */}
                  <div className="md:w-52 shrink-0 bg-[#161616] p-6 md:p-7 flex md:flex-col items-center md:items-start gap-4 md:gap-3 print:bg-white print:border-b-2 print:border-[#161616]">
                    <span className="font-display text-5xl md:text-6xl font-black text-[#F5B700] leading-none print:text-[#8f6600]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#FBF6EA]/70 print:text-[#161616]">
                      {phase.window}
                    </span>
                  </div>

                  <div className="flex-1 p-6 md:p-8 min-w-0">
                    <h3 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight leading-tight">
                      {phase.title}
                    </h3>
                    <p className="mt-2 text-[#3a3733] font-body text-base leading-relaxed">{phase.goal}</p>

                    <ul className="mt-5 space-y-2.5">
                      {phase.moves.map((move, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <span className="mt-[7px] w-2 h-2 rounded-full bg-[#F5B700] border border-[#161616] shrink-0" />
                          <span className="text-[#161616] font-body text-sm md:text-base leading-relaxed">
                            {move}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 pt-5 border-t-2 border-[#161616]/12 grid sm:grid-cols-2 gap-5">
                      <div>
                        <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#161616]/45 mb-1.5">
                          Watch this
                        </span>
                        <p className="text-[#161616] font-body text-sm leading-relaxed">{phase.metric}</p>
                      </div>
                      <div>
                        <span
                          className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold mb-1.5"
                          style={{ color: RED }}
                        >
                          Gate to the next window
                        </span>
                        <p className="text-[#161616] font-body font-semibold text-sm leading-relaxed">
                          {phase.gate}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scoreboard ───────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          kicker="What to put on the wall"
          title="Your scoreboard"
          lede="If it is not counted weekly it is not managed. Six to eight numbers, no more. Unknown is a valid starting answer, but only once."
        />
        <div className="pop-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="bg-[#161616] text-[#FBF6EA] print:bg-white print:text-[#161616] print:border-b-2 print:border-[#161616]">
                  <th className="px-5 py-3.5 text-[9px] uppercase tracking-[0.3em] font-mono font-bold">Metric</th>
                  <th className="px-5 py-3.5 text-[9px] uppercase tracking-[0.3em] font-mono font-bold">Why it matters</th>
                  <th className="px-5 py-3.5 text-[9px] uppercase tracking-[0.3em] font-mono font-bold whitespace-nowrap">Today</th>
                  <th className="px-5 py-3.5 text-[9px] uppercase tracking-[0.3em] font-mono font-bold whitespace-nowrap">Target</th>
                </tr>
              </thead>
              <tbody>
                {report.scoreboard.map((row, i) => (
                  <tr key={i} className="border-t border-[#161616]/10 align-top">
                    <td className="px-5 py-4 font-sans font-extrabold text-[#161616] text-sm">{row.metric}</td>
                    <td className="px-5 py-4 text-[#3a3733] font-body text-sm leading-relaxed">{row.why}</td>
                    <td className="px-5 py-4 text-[#161616]/60 font-mono text-xs whitespace-nowrap">{row.current}</td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-[#161616] whitespace-nowrap bg-[#F5B700]/20">
                      {row.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── AI leverage ──────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          kicker="Where the machine does it"
          title="What you should stop doing by hand"
          lede="Every one of these is a job an AI teammate already does well. None of them replaces you. They replace the parts of the week you resent."
        />
        <div className="grid md:grid-cols-2 gap-4">
          {report.ai_leverage.map((item, i) => {
            const href = DEPARTMENTS[item.department];
            return (
              <div key={i} className="pop-card p-6 md:p-7 flex flex-col">
                <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight leading-snug">
                  {item.title}
                </h3>
                <p className="mt-3 text-[#3a3733] font-body text-sm md:text-base leading-relaxed flex-1">
                  {item.what}
                </p>
                {href ? (
                  <Link
                    href={href}
                    className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#1E50C8] hover:text-[#161616] transition-colors"
                  >
                    {item.department} &rarr;
                  </Link>
                ) : (
                  <span className="mt-5 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/45">
                    {item.department}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── This week + the angles ───────────────────────────────────── */}
      <section>
        <SectionTitle kicker="Start here" title="Your next three moves" lede="This week. In this order." />
        <div className="grid md:grid-cols-3 gap-4">
          {report.next_three.map((move, i) => (
            <div key={i} className="pop-card p-6 md:p-7">
              <span
                className="font-display text-5xl font-black leading-none block mb-4"
                style={{ color: '#F5B700', WebkitTextStroke: '1.5px #161616' }}
              >
                {i + 1}
              </span>
              <p className="text-[#161616] font-body text-base leading-relaxed">{move}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {report.angles.map((angle, i) => (
            <div key={i} className="pop-card-cream p-6 md:p-8">
              <Eyebrow className="mb-3">{i === 0 ? 'The opportunity' : 'The risk'}</Eyebrow>
              <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-3 leading-snug">
                {angle.title}
              </h3>
              <p className="text-[#3a3733] font-body text-sm md:text-base leading-relaxed">{angle.argument}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
