import Link from '@/components/AttributionLink';
import PresenceRequestForm from '@/components/presence/PresenceRequestForm';
import SampleScorecard from '@/components/presence/SampleScorecard';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { PRESENCE, TICKER, STEPS, WHY, PILLARS, DESK, PRESENCE_FAQ } from '@/data/presence-audit-page';

export const metadata = buildMetadata({
  title: PRESENCE.metaTitle,
  description: PRESENCE.metaDescription,
  path: '/presence-audit',
});

/**
 * THE FREE ONLINE PRESENCE AUDIT.
 *
 * Sarah, 2026-09-16: every "free audit" link went to the Bottleneck Breaker, and
 * "those are two different things." Sarah, 2026-09-18: the visitor has to leave
 * an email, she runs the audit from the admin, and it emails them when she does.
 *
 * So this page does one job: make the ask irresistible. The form is in the hero
 * and again at the close. Between them the page shows the report rather than
 * describing it (a labelled sample that counts up on sight), names the three
 * pillars and their printed weights, says how it works in three steps, makes the
 * argument for why the number can be checked, and sends anyone with a different
 * question to the tool that answers it, the Bottleneck Breaker first.
 *
 * Requests land on the Audit Desk (/admin/audit) via /api/presence-audit.
 */
export default function PresenceAuditPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'The Online Presence Audit', url: '/presence-audit' },
          ]),
          webPageJsonLd({
            path: '/presence-audit',
            name: 'The Free Online Presence Audit · Modern Mustard Seed',
            description: PRESENCE.metaDescription,
          }),
          faqJsonLd(PRESENCE_FAQ),
        ]}
      />

      {/* ─────────────── Hero, with the ask in it ─────────────── */}
      <header className="relative border-b-2 border-[#161616] halftone-bg">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-24 hidden h-[420px] w-[420px] rounded-full border-2 border-[#161616] bg-[#F5B700] opacity-90 lg:block"
        />
        <div className="relative z-[2] mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 md:pt-36 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:pb-24 lg:pt-40">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-[#161616] bg-white px-3.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#C4160B] shadow-[3px_3px_0_0_#161616] sm:px-4 sm:text-[10px] sm:tracking-[0.22em]">
              <span className="h-2 w-2 rounded-full bg-[#E0301E]" aria-hidden />
              Free · Three pillars · Yours to keep
            </span>
            <h1 className="mt-7 font-display text-[2.65rem] font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-[4.3rem]">
              Most people decide about you{' '}
              <em className="relative inline-block italic text-[#161616]">
                <span className="relative z-[1]">before</span>
                <span aria-hidden className="absolute inset-x-[-4px] bottom-[0.08em] z-0 h-[0.34em] -rotate-1 bg-[#F5B700]" />
              </em>{' '}
              they reach your website.
            </h1>
            <p className="mt-7 max-w-xl font-body text-lg leading-relaxed text-[#3d382e] md:text-xl">
              A listing, a star rating and a pile of reviews, and their mind is made up before a page of yours loads. So we
              grade all three, the way a stranger meets you, and email you the whole report.
            </p>

            <ul className="mt-8 hidden max-w-xl gap-3 sm:grid sm:grid-cols-3">
              {PILLARS.map((p) => (
                <li key={p.name} className="rounded-xl border-2 border-[#161616] bg-white px-4 py-3 shadow-[3px_3px_0_0_#161616]">
                  <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#C4160B]">{p.weight}% of the score</span>
                  <span className="mt-1 block font-display text-lg font-extrabold italic leading-tight">{p.name.replace(/^The (\w)/, (_, c: string) => c.toUpperCase())}</span>
                  <span className="mt-0.5 block font-body text-[12px] leading-snug text-[#161616]/60">{p.how}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 lg:pl-2">
            <PresenceRequestForm id="get" />
          </div>
        </div>
      </header>

      {/* ─────────────── Ticker ─────────────── */}
      <div className="overflow-hidden border-b-2 border-[#161616] bg-[#161616] py-3.5" aria-hidden>
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={`${k}-${i}`} className="flex items-center whitespace-nowrap px-5 font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-[#F5B700]">
                  {t}
                  <span className="ml-10 text-[#FBF6EA]/40">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────── What you get ─────────────── */}
      <section className="border-b-2 border-[#161616] bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">What lands in your inbox</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              One number, three dials, and the fixes in order.
            </h2>
            <p className="mt-5 max-w-lg font-body text-[16px] leading-relaxed text-[#161616]/75">
              The headline is written from the shape of your three scores, never the average, because the shape is the
              story. Reviews outrunning the website. A great site nobody can find. A profile two free fixes from complete.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                'Every check prints what it is worth and what you earned',
                'Every number says where it came from, so you can verify it',
                'Free fixes rank above anything that costs money',
                'Anything we could not see is left out, never scored as zero',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 font-body text-[15px] leading-snug text-[#161616]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-[#161616] bg-[#1E7A3C] font-mono text-[10px] font-bold text-white" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <SampleScorecard />
            <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/45">
              Sample report. The business is invented, the arithmetic is real.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-4 py-16 sm:px-6 md:space-y-24 md:py-24">
        {/* ─────────────── How it works ─────────────── */}
        <section>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">How it works // Three steps, one of them yours</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              You ask. We grade. It lands.
            </h2>
          </div>
          <ol className="relative mt-12 grid gap-6 md:grid-cols-3">
            <div aria-hidden className="absolute left-[16%] right-[16%] top-9 hidden h-0.5 border-t-2 border-dashed border-[#161616]/30 md:block" />
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className={`relative flex min-w-0 flex-col rounded-2xl border-2 border-[#161616] p-7 shadow-[6px_6px_0_0_#161616] ${
                  i === 0 ? 'bg-[#F5B700]' : 'bg-white'
                }`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#161616] bg-[#161616] font-mono text-sm font-bold text-[#F5B700]">
                  {s.n}
                </span>
                <h3 className="mt-5 font-display text-2xl font-extrabold italic leading-tight">{s.h}</h3>
                <p className="mt-2.5 font-body text-[14px] leading-relaxed text-[#161616]/75">{s.d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 font-body text-[14px] text-[#161616]/60">
            The full report arrives {PRESENCE.turnaround}, and a note lands the moment you ask so you know it is in.
          </p>
        </section>

        {/* ─────────────── The three pillars ─────────────── */}
        <section>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">What gets graded // Three pillars, not one</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              A website audit grades a third of the problem.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <article
                key={p.name}
                className={`group flex min-w-0 flex-col rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] transition-transform hover:-translate-y-1 ${
                  i === 1 ? 'md:translate-y-6 md:hover:translate-y-5' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">Pillar {p.n}</span>
                  <span className="font-display text-3xl font-black tabular-nums text-[#161616]">
                    {p.weight}
                    <span className="text-base text-[#161616]/40">%</span>
                  </span>
                </div>
                <h3 className="mt-2 font-display text-2xl font-extrabold italic leading-tight">{p.name}</h3>
                <p className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f6600]">{p.how}</p>
                <p className="mt-3 flex-1 font-body text-[14px] leading-relaxed text-[#161616]/75">{p.d}</p>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full border-2 border-[#161616] bg-[#FBF6EA]">
                  <div className="h-full bg-[#F5B700]" style={{ width: `${p.weight * 2}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ─────────────── Why it is checkable ─────────────── */}
        <section className="relative overflow-hidden rounded-3xl border-2 border-[#161616] bg-[#161616] p-7 shadow-[8px_8px_0_0_#F5B700] md:p-12">
          <div aria-hidden className="halftone-ink pointer-events-none absolute inset-0" />
          <div className="relative max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B700]">Why you can trust the number // Check it yourself</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] text-[#FBF6EA] md:text-5xl">
              An audit nobody can check is a horoscope with a logo.
            </h2>
          </div>
          <div className="relative mt-10 grid gap-6 md:grid-cols-3">
            {WHY.map((w) => (
              <div key={w.k} className="min-w-0 rounded-2xl border-2 border-[#F5B700]/40 bg-[#1F1F1F] p-6">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#F5B700]">{w.k}</span>
                <h3 className="mt-2 font-display text-xl font-extrabold leading-tight text-[#FBF6EA]">{w.h}</h3>
                <p className="mt-2.5 font-body text-[13.5px] leading-relaxed text-[#FBF6EA]/70">{w.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── Different question, different tool ─────────────── */}
        <section>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">Different question? // Different tool</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              Not what you came for? One of these is.
            </h2>
            <p className="mt-4 font-body text-[15px] leading-relaxed text-[#161616]/70">
              The Presence Audit answers one question: how you look to a stranger deciding whether to call. These answer
              others.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DESK.map((d, i) => (
              <Link
                key={d.href}
                href={d.href}
                className={`group flex min-w-0 flex-col rounded-2xl border-2 border-[#161616] p-7 shadow-[6px_6px_0_0_#161616] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#F5B700] ${
                  i === 0 ? 'bg-[#FFFDF6]' : 'bg-white'
                }`}
              >
                <h3 className="font-display text-2xl font-extrabold italic leading-tight">{d.name}</h3>
                <p className="mt-3 flex-1 font-body text-[14px] leading-relaxed text-[#161616]/75">{d.line}</p>
                <span className="mt-5 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#C4160B] transition-colors group-hover:text-[#161616]">
                  {d.cta} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ─────────────── FAQ ─────────────── */}
        <section>
          <p className="text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">Straight answers</p>
          <h2 className="mt-3 text-center font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            Questions, answered plainly.
          </h2>
          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {PRESENCE_FAQ.map((f) => (
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
        <section className="relative overflow-hidden rounded-3xl border-2 border-[#161616] bg-[#F5B700] p-8 shadow-[8px_8px_0_0_#161616] md:p-14">
          <div aria-hidden className="stripe-ink pointer-events-none absolute -right-10 -top-10 h-40 w-40 rotate-12 rounded-3xl opacity-[0.12]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#161616]/70">No card · No meeting · Yours either way</p>
              <h2 className="mt-4 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
                Find out what strangers see before they call.
              </h2>
              <p className="mt-5 max-w-xl font-body text-[16px] leading-relaxed text-[#161616]/80">
                Thirty seconds to ask. The whole report in your inbox {PRESENCE.turnaround}. Nobody rings you unless you
                want them to.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 lg:items-end">
              <a
                href="#get"
                className="group inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-[#161616] px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#F5B700] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] transition-transform hover:-translate-y-0.5"
              >
                Get my free audit
                <span className="transition-transform group-hover:-translate-y-0.5">↑</span>
              </a>
              <Link href="/audit" className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#161616]/70 underline decoration-2 underline-offset-4 hover:text-[#161616]">
                Or run the Bottleneck Breaker
              </Link>
            </div>
          </div>
          <p className="relative mt-8 font-body text-[13px] text-[#161616]/60">
            {SITE.city}, {SITE.regionName}. Working with businesses nationwide.
          </p>
        </section>
      </div>
    </div>
  );
}
