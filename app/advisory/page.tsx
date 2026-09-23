import Link from '@/components/AttributionLink';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd, webPageJsonLd } from '@/lib/jsonld';
import {
  ADVISORY,
  THE_PROBLEM,
  THE_QUARTER,
  WHAT_YOU_GET,
  WHAT_WE_REFUSE,
  FOR,
  NOT_FOR,
  ADVISORY_FAQ,
} from '@/data/advisory';

export const metadata = buildMetadata({
  title: ADVISORY.metaTitle,
  description: ADVISORY.metaDescription,
  path: '/advisory',
});

/**
 * ADVISORY. The fourth discipline finally gets an argument.
 *
 * It is the only door that sells judgment rather than a build, so the page is
 * built to prove judgment: it opens on the expensive mistake, spends its middle
 * on what a retained quarter actually contains, and gives a whole band to what
 * we refuse. A page that only lists what you get reads like every other
 * consultant. The refusals are the part a good operator believes.
 *
 * No price, per the boutique pass. No client outcome is claimed anywhere on it.
 */
export default function AdvisoryPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Advisory', url: '/advisory' },
          ]),
          webPageJsonLd({
            path: '/advisory',
            name: 'Advisory · Modern Mustard Seed',
            description: ADVISORY.metaDescription,
          }),
          serviceJsonLd({
            name: 'Advisory by Modern Mustard Seed',
            description: ADVISORY.metaDescription,
            path: '/advisory',
          }),
          faqJsonLd(ADVISORY_FAQ),
        ]}
      />

      {/* ─────────────── Hero ─────────────── */}
      <header className="relative overflow-hidden border-b-2 border-[#161616] halftone-bg">
        <div className="relative z-[2] mx-auto max-w-6xl px-6 pt-32 pb-16 md:pt-44 md:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-white px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C4160B] shadow-[3px_3px_0_0_#161616]">
              The fourth discipline · Retained by the quarter
            </span>
            <h1 className="mt-7 font-display text-5xl font-extrabold leading-[0.98] tracking-tight md:text-6xl lg:text-[4.4rem]">
              Almost nobody loses money on AI by picking the{' '}
              <em className="italic text-[#B48600]">wrong tool</em>.
            </h1>
            <p className="mt-7 max-w-2xl font-body text-lg leading-relaxed text-[#3d382e] md:text-xl">
              They lose it by building the wrong thing well. Advisory is the seat you hire so that
              does not happen: retained counsel for operators putting AI into a business that already
              works. What to build, what to refuse, what to automate, and in what order.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-[#161616] px-7 py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-[#FBF6EA] shadow-[5px_5px_0_0_#F5B700] transition-transform hover:-translate-y-0.5"
              >
                Begin an engagement →
              </Link>
              <a
                href="#quarter"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-white px-7 py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5"
              >
                What a quarter contains
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-20 px-6 py-16 lg:py-20">
        {/* ─────────────── Why this seat exists ─────────────── */}
        <section>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
            Why this seat exists // Three ways it goes wrong
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            The tool was never the hard part.
          </h2>
          <div className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
            {THE_PROBLEM.map((c) => (
              <div
                key={c.k}
                className="flex min-w-0 flex-col rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C4160B]">
                  {c.k}
                </span>
                <h3 className="mt-2 font-display text-2xl font-extrabold italic leading-tight">{c.h}</h3>
                <p className="mt-3 flex-1 font-body text-[13.5px] leading-relaxed text-[#161616]/75">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── The quarter ─────────────── */}
        <section id="quarter" className="scroll-mt-24">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
            The engagement // What a retained quarter contains
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            A cadence, not a call whenever you remember.
          </h2>
          <p className="mt-4 max-w-2xl font-body text-[15px] leading-relaxed text-[#161616]/70">
            Retainers go quiet because nobody agreed what happens in them. This one has a shape, and
            you can hold us to it.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {THE_QUARTER.map((s) => (
              <div
                key={s.n}
                className="flex min-w-0 flex-col rounded-2xl border-2 border-[#161616] bg-[#161616] p-7 shadow-[6px_6px_0_0_#F5B700]"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">
                  {s.n}
                </span>
                <h3 className="mt-2 font-display text-2xl font-extrabold italic leading-tight text-[#FBF6EA]">
                  {s.h}
                </h3>
                <p className="mt-3 flex-1 font-body text-[13.5px] leading-relaxed text-[#FBF6EA]/75">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── What you get ─────────────── */}
        <section>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
            The deliverables // Written down, so they are checkable
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            You keep everything, including the reasoning.
          </h2>
          <div className="mt-10 space-y-4">
            {WHAT_YOU_GET.map((w, i) => (
              <div
                key={w.h}
                className="flex min-w-0 flex-col gap-2 rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] sm:flex-row sm:items-baseline sm:gap-7"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#8f6600] sm:w-10 sm:shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 sm:flex-1">
                  <h3 className="font-display text-xl font-extrabold leading-tight">{w.h}</h3>
                  <p className="mt-1.5 font-body text-[14px] leading-relaxed text-[#161616]/75">{w.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── What we refuse ─────────────── */}
        <section className="rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-7 shadow-[8px_8px_0_0_#161616] sm:p-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#161616]">
            The part nobody advertises // What we will talk you out of
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            Half of this job is saying no.
          </h2>
          <p className="mt-4 max-w-2xl font-body text-[15px] leading-relaxed text-[#161616]/80">
            An advisor who never refuses anything is a salesperson with a nicer title. Here is what we
            argue against, in advance, so you know what you are hiring.
          </p>
          <ul className="mt-8 grid gap-x-8 gap-y-4 md:grid-cols-2">
            {WHAT_WE_REFUSE.map((r) => (
              <li key={r} className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden
                  className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-[#161616] bg-[#FBF6EA] font-mono text-[11px] font-black leading-none text-[#C4160B]"
                >
                  ×
                </span>
                <span className="font-body text-[14.5px] leading-relaxed text-[#161616]/85">{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ─────────────── Fit ─────────────── */}
        <section>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
            Fit // We say no early, and out loud
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            Who this seat is for.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="min-w-0 rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#B92417]">
                A fit
              </span>
              <ul className="mt-4 space-y-3">
                {FOR.map((f) => (
                  <li key={f} className="flex min-w-0 items-start gap-2.5 font-body text-[14px] leading-relaxed text-[#161616]/80">
                    <span aria-hidden className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#161616]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0 rounded-2xl border-2 border-[#161616] bg-[#F5F0E8] p-7 shadow-[6px_6px_0_0_#161616]">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
                Not a fit
              </span>
              <ul className="mt-4 space-y-3">
                {NOT_FOR.map((f) => (
                  <li key={f} className="flex min-w-0 items-start gap-2.5 font-body text-[14px] leading-relaxed text-[#161616]/75">
                    <span aria-hidden className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4160B]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─────────────── Where it sits ─────────────── */}
        <section>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
            The other doors // So you pick the right one
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            Counsel, a program, or a build.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                h: 'Advisory',
                d: 'No build attached. You keep running the business and you have somebody to decide the hard calls with. Retained by the quarter.',
                href: '/advisory',
                here: true,
              },
              {
                h: 'AI Native',
                d: 'A program with a finish line: every workflow mapped, the first five moved onto AI in accounts you own, your team coached to run it.',
                href: '/ai-native',
              },
              {
                h: 'A build',
                d: 'When the answer is make the thing. A website, a voice agent, custom software. One written scope, one set package price.',
                href: '/services',
              },
            ].map((c) => (
              <div
                key={c.h}
                className={`flex min-w-0 flex-col rounded-2xl border-2 border-[#161616] p-7 ${
                  c.here ? 'bg-[#161616] shadow-[6px_6px_0_0_#F5B700]' : 'bg-white shadow-[5px_5px_0_0_#161616]'
                }`}
              >
                <h3
                  className={`font-display text-2xl font-extrabold italic leading-tight ${
                    c.here ? 'text-[#F5B700]' : 'text-[#161616]'
                  }`}
                >
                  {c.h}
                </h3>
                <p
                  className={`mt-3 flex-1 font-body text-[13.5px] leading-relaxed ${
                    c.here ? 'text-[#FBF6EA]/75' : 'text-[#161616]/75'
                  }`}
                >
                  {c.d}
                </p>
                {c.here ? (
                  <span className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#FBF6EA]/55">
                    You are here
                  </span>
                ) : (
                  <Link
                    href={c.href}
                    className="mt-5 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#C4160B] transition-colors hover:text-[#161616]"
                  >
                    Read that one →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── FAQ ─────────────── */}
        <section>
          <p className="text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
            Straight answers // No sales call required
          </p>
          <h2 className="mt-3 text-center font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            Questions, answered plainly.
          </h2>
          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {ADVISORY_FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border-2 border-[#161616] bg-white p-5 transition-shadow open:shadow-[4px_4px_0_0_#F5B700]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold">
                  {f.q}
                  <span aria-hidden className="flex-shrink-0 text-[#C4160B] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 font-body leading-relaxed text-[#5c554a]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ─────────────── Close ─────────────── */}
        <section className="relative overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#161616] p-10 text-center shadow-[8px_8px_0_0_#F5B700] md:p-14">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5B700]">
            By inquiry · Answered personally
          </p>
          <h2 className="mt-4 font-display text-3xl font-extrabold italic leading-[1.02] text-[#FBF6EA] md:text-5xl">
            Tell us the decision you are stuck on.
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-body text-[15px] leading-relaxed text-[#FBF6EA]/80">
            Not the whole roadmap. The one call in front of you right now. Sarah reads every inquiry
            herself and answers inside one business day, whether or not it is a fit.
          </p>
          <Link
            href="/book"
            className="mt-8 inline-block rounded-full border-2 border-[#F5B700] bg-[#F5B700] px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#161616] transition-transform hover:-translate-y-0.5"
          >
            Begin an engagement →
          </Link>
          <p className="mt-6 font-body text-[13px] leading-relaxed text-[#FBF6EA]/55">
            Based in {SITE.city}, {SITE.regionName}. Working with operators nationwide.
          </p>
        </section>
      </div>
    </div>
  );
}
