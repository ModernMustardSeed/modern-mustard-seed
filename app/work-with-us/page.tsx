import Link from '@/components/AttributionLink';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { STEPS, TERMS, GOOD_FIT, POOR_FIT, ENGAGEMENT_FAQ } from '@/data/engagement';

export const metadata = buildMetadata({
  title: 'How We Work',
  description:
    'Five steps, one written scope, one set package price agreed before anything is built, changes included permanently, and you own everything on launch day. How an engagement with Modern Mustard Seed actually runs.',
  path: '/work-with-us',
});

/**
 * HOW WE WORK. Rebuilt 2026-09-14 (Sarah: the old one sucked).
 *
 * What was wrong with it: four generic steps, six principle cards, a portal
 * video, a newsletter box, and a pricing FAQ that still talked about free
 * discovery calls and productized doors. It read like an agency template.
 *
 * This page owns HOW an engagement runs and nothing else. /playbook owns WHAT
 * you receive. They used to overlap and repeat each other.
 *
 * The spine is a numbered rail, and each step states four things most process
 * pages never say: what we do, what YOU do, what exists at the end of it, and
 * how long that step alone takes. A step with no named owner and no clock is a
 * promise nobody can hold you to.
 *
 * The Terms band is the part that sells. It is written as a standing agreement
 * rather than a list of adjectives, because "changes are included, permanently"
 * is only worth anything if it reads like something you could hold up later.
 */
export default function WorkWithUsPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'How We Work', url: '/work-with-us' },
          ]),
          webPageJsonLd({
            path: '/work-with-us',
            name: 'How We Work · Modern Mustard Seed',
            description:
              'The five steps of an engagement, the standing terms, and who the studio is and is not for.',
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'How an engagement with Modern Mustard Seed runs',
            step: STEPS.map((s) => ({
              '@type': 'HowToStep',
              name: s.title,
              text: s.body,
            })),
          },
          faqJsonLd(ENGAGEMENT_FAQ),
        ]}
      />

      {/* ─────────────── Hero ─────────────── */}
      <header className="relative overflow-hidden border-b-2 border-[#161616]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(#161616 1px, transparent 1px), linear-gradient(90deg, #161616 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-32 pb-16 md:pt-44 md:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border-2 border-[#161616] bg-white px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C4160B] shadow-[3px_3px_0_0_#161616]">
              How we work
            </span>
            <h1 className="mt-7 font-display text-5xl font-extrabold leading-[0.98] tracking-tight md:text-6xl lg:text-[4.4rem]">
              Five steps. One number.{' '}
              <em className="italic text-[#B48600]">No surprises</em> anywhere in it.
            </h1>
            <p className="mt-7 max-w-2xl font-body text-lg leading-relaxed text-[#3d382e] md:text-xl">
              Most studios describe their process in adjectives. Here is ours in specifics: what
              happens at each step, what you have to do, what exists at the end of it, and how long
              it takes. If a step cannot answer all four, it is not a step, it is a delay.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-[#161616] px-7 py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-[#FBF6EA] shadow-[5px_5px_0_0_#F5B700] transition-transform hover:-translate-y-0.5"
              >
                Begin an engagement →
              </Link>
              <Link
                href="/playbook"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-white px-7 py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5"
              >
                See what you receive
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────── The five steps ─────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
            The engagement // Start to keys
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            Nothing here happens in a room you are not in.
          </h2>
        </div>

        <ol className="mt-14 space-y-10 md:space-y-0">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative md:grid md:grid-cols-[auto_1fr] md:gap-10">
              {/* The rail */}
              <div className="hidden md:flex md:flex-col md:items-center">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-[#161616] bg-[#F5B700] font-display text-xl font-black shadow-[4px_4px_0_0_#161616]">
                  {s.n}
                </span>
                {i < STEPS.length - 1 && (
                  <span aria-hidden className="mt-3 w-[2px] flex-1 bg-[#161616]/20" />
                )}
              </div>

              <div className={`min-w-0 ${i < STEPS.length - 1 ? 'md:pb-14' : ''}`}>
                <div className="flex items-center gap-4 md:hidden">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[#161616] bg-[#F5B700] font-display text-base font-black shadow-[3px_3px_0_0_#161616]">
                    {s.n}
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f6600]">
                    {s.clock}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-3xl font-extrabold leading-tight md:mt-0 md:text-4xl">
                  {s.title}
                </h3>
                <p className="mt-2 font-display text-xl font-bold italic leading-snug text-[#C4160B] md:text-2xl">
                  {s.promise}
                </p>
                <p className="mt-4 max-w-2xl font-body text-[15px] leading-relaxed text-[#161616]/75 md:text-base">
                  {s.body}
                </p>

                <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    { t: 'Your part', v: s.yours },
                    { t: 'What exists after', v: s.output },
                    { t: 'How long', v: s.clock },
                  ].map((d) => (
                    <div
                      key={d.t}
                      className="min-w-0 rounded-xl border-2 border-[#161616] bg-white p-4 shadow-[4px_4px_0_0_#161616]"
                    >
                      <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#8f6600]">
                        {d.t}
                      </dt>
                      <dd className="mt-1.5 font-body text-[13.5px] leading-relaxed text-[#161616]/80">
                        {d.v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ─────────────── The terms ─────────────── */}
      <section className="border-y-2 border-[#161616] bg-[#161616] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B700]">
              The terms // The same for everybody, every time
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] text-[#FBF6EA] md:text-5xl">
              These are not values. They are the deal.
            </h2>
            <p className="mt-4 font-body text-[15px] leading-relaxed text-[#FBF6EA]/70">
              Every one of these is something you could hold up later and point at. That is the only
              kind worth printing.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border-2 border-[#F5B700] bg-[#F5B700]/40 md:grid-cols-2">
            {TERMS.map((t, i) => (
              <div key={t.title} className="min-w-0 bg-[#161616] p-7 md:p-8">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 font-display text-xl font-extrabold leading-tight text-[#FBF6EA] md:text-2xl">
                  {t.title}
                </h3>
                <p className="mt-3 font-body text-[14px] leading-relaxed text-[#FBF6EA]/70">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── What it costs ─────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              The number // How it gets arrived at
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              There is no price list, and that is not coyness.
            </h2>
            <p className="mt-5 max-w-xl font-body text-[15px] leading-relaxed text-[#161616]/75">
              A focused site for one town and a full operating system with booking, a store, and a
              back office are not the same piece of work, and pricing them as though they were only
              ever serves the one that is cheaper to build.
            </p>
            <p className="mt-4 max-w-xl font-body text-[15px] leading-relaxed text-[#161616]/75">
              So the quote comes after the working session, when we both know what is actually being
              made. It is one set package price for a written scope, it is agreed before anything is
              built, and it does not move afterwards.
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-7 shadow-[8px_8px_0_0_#161616] md:p-9">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#161616]">
              Where to start
            </p>
            <p className="mt-3 font-display text-[1.7rem] font-extrabold italic leading-[1.1] md:text-[2rem]">
              Start with the audit, not the sales call.
            </p>
            <p className="mt-4 font-body text-[14px] leading-relaxed text-[#161616]/80">
              Sixty seconds, no card. It names the one thing quietly costing you the most, and the
              answer is yours to keep whether or not we ever work together. Most engagements begin
              there, because it is easier to decide what to build once you can see what is leaking.
            </p>
            <Link
              href="/presence-audit"
              className="mt-7 inline-block rounded-full border-2 border-[#161616] bg-[#161616] px-7 py-3.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F5B700] shadow-[4px_4px_0_0_#FBF6EA] transition-transform hover:-translate-y-0.5"
            >
              Run the free audit
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────── Fit ─────────────── */}
      <section className="border-y-2 border-[#161616] bg-[#F5F0E8] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              Fit // We say no early, and out loud
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              A fast no is worth more than a slow maybe.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="min-w-0 rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] md:p-8">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#B92417]">
                We are probably a fit
              </span>
              <ul className="mt-5 space-y-3.5">
                {GOOD_FIT.map((f) => (
                  <li
                    key={f}
                    className="flex min-w-0 items-start gap-3 font-body text-[14.5px] leading-relaxed text-[#161616]/80"
                  >
                    <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#161616]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0 rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] p-7 shadow-[6px_6px_0_0_#161616] md:p-8">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
                We are probably not
              </span>
              <ul className="mt-5 space-y-3.5">
                {POOR_FIT.map((f) => (
                  <li
                    key={f}
                    className="flex min-w-0 items-start gap-3 font-body text-[14.5px] leading-relaxed text-[#161616]/75"
                  >
                    <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4160B]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── FAQ ─────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <p className="text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
          Straight answers // No sales call required
        </p>
        <h2 className="mt-3 text-center font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
          Questions, answered plainly.
        </h2>
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {ENGAGEMENT_FAQ.map((f) => (
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
      <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-10 text-center shadow-[8px_8px_0_0_#161616] md:p-14">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#161616]/70">
            Step one · Answered inside one business day
          </p>
          <h2 className="mt-4 font-display text-3xl font-extrabold italic leading-[1.02] md:text-5xl">
            Tell us what you are building.
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-body text-[15px] leading-relaxed text-[#161616]/80">
            The business, the problem, and what a good outcome looks like. You will get a straight
            answer on fit, whether or not it is one.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/book"
              className="rounded-full border-2 border-[#161616] bg-[#161616] px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#F5B700] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] transition-transform hover:-translate-y-0.5"
            >
              Begin an engagement →
            </Link>
            <Link
              href="/work"
              className="rounded-full border-2 border-[#161616] bg-white px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] transition-transform hover:-translate-y-0.5"
            >
              See the work
            </Link>
          </div>
          <p className="mt-7 font-body text-[13px] text-[#161616]/60">
            {SITE.city}, {SITE.regionName}. Working with clients nationwide.
          </p>
        </div>
      </section>
    </div>
  );
}
