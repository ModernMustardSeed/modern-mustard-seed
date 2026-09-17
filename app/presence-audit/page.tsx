import Link from '@/components/AttributionLink';
import WebsiteAuditEngine from '@/components/WebsiteAuditEngine';
import PresenceRequestForm from '@/components/presence/PresenceRequestForm';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { PRESENCE, WHY, PILLARS, DESK, PRESENCE_FAQ } from '@/data/presence-audit-page';

export const metadata = buildMetadata({
  title: PRESENCE.metaTitle,
  description: PRESENCE.metaDescription,
  path: '/presence-audit',
});

/**
 * THE ONLINE PRESENCE AUDIT. The front door for the audit desk.
 *
 * Sarah, 2026-09-16: "My audit page on website keeps going to bottleneck breaker
 * and those are two different things. We need the online presence audit landing
 * page that connects to all the audit things."
 *
 * She was right. Every "free audit" link pointed at /audit, which is the
 * Bottleneck Breaker: a different tool answering a different question. The three
 * other audit tools had no relationship to each other and no page explaining why
 * a business would want any of them.
 *
 * This page is the hub. It makes the argument for auditing a whole presence
 * rather than a website, runs the one pillar that genuinely works self-serve,
 * is honest about why the other two arrive by email, and then routes to the rest
 * of the desk instead of leaving them orphaned.
 */
export default function PresenceAuditPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'The Online Presence Audit', url: '/presence-audit' },
          ]),
          webPageJsonLd({
            path: '/presence-audit',
            name: 'The Online Presence Audit · Modern Mustard Seed',
            description: PRESENCE.metaDescription,
          }),
          faqJsonLd(PRESENCE_FAQ),
        ]}
      />

      {/* ─────────────── Hero ─────────────── */}
      <header className="relative overflow-hidden border-b-2 border-[#161616] halftone-bg">
        <div className="relative z-[2] mx-auto max-w-6xl px-6 pt-32 pb-14 md:pt-44 md:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border-2 border-[#161616] bg-white px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#C4160B] shadow-[3px_3px_0_0_#161616]">
              Free · No card · Yours to keep
            </span>
            <h1 className="mt-7 font-display text-5xl font-extrabold leading-[0.98] tracking-tight md:text-6xl lg:text-[4.4rem]">
              Most people decide about you{' '}
              <em className="italic text-[#B48600]">before</em> they reach your website.
            </h1>
            <p className="mt-7 max-w-2xl font-body text-lg leading-relaxed text-[#3d382e] md:text-xl">
              They find a listing, a star rating and a pile of reviews, and they have made up their
              mind before a single page of yours loads. So this grades all three: the site, the
              Google profile, and the reviews. Start with the website below and the whole report
              follows.
            </p>
          </div>
        </div>
      </header>

      {/* ─────────────── Pillar one, live on the page ─────────────── */}
      <section id="grade" className="scroll-mt-24 border-b-2 border-[#161616] bg-white py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              Pillar one // Running now, on this page
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              Start with the website.
            </h2>
            <p className="mt-4 font-body text-[15px] leading-relaxed text-[#161616]/70">
              Drop the address in. Seven categories graded against your real pages, in about a
              minute, and you keep the result whether or not we ever speak.
            </p>
          </div>
          <div className="mt-10">
            <WebsiteAuditEngine />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-6 py-16 md:py-24">
        {/* ─────────────── The three pillars ─────────────── */}
        <section>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              What gets graded // Three pillars, not one
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              A website audit grades a third of the problem.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PILLARS.map((p) => (
              <article
                key={p.name}
                className={`flex min-w-0 flex-col rounded-2xl border-2 border-[#161616] p-7 ${
                  p.instant ? 'bg-[#F5B700] shadow-[6px_6px_0_0_#161616]' : 'bg-white shadow-[6px_6px_0_0_#161616]'
                }`}
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
                  Pillar {p.n}
                </span>
                <h3 className="mt-2 font-display text-2xl font-extrabold italic leading-tight">{p.name}</h3>
                <p className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f6600]">
                  {p.how}
                </p>
                <p className="mt-3 flex-1 font-body text-[13.5px] leading-relaxed text-[#161616]/75">{p.d}</p>
                <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/55">
                  {p.instant ? 'Runs on this page' : 'Read off your real listing'}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ─────────────── Why it is checkable ─────────────── */}
        <section className="rounded-2xl border-2 border-[#161616] bg-[#161616] p-7 shadow-[8px_8px_0_0_#F5B700] md:p-10">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B700]">
              Why you can trust the number // You can check it yourself
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] text-[#FBF6EA] md:text-5xl">
              An audit nobody can check is a horoscope with a logo.
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {WHY.map((w) => (
              <div key={w.k} className="min-w-0 rounded-2xl border-2 border-[#F5B700]/40 bg-[#1F1F1F] p-6">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#F5B700]">
                  {w.k}
                </span>
                <h3 className="mt-2 font-display text-xl font-extrabold leading-tight text-[#FBF6EA]">{w.h}</h3>
                <p className="mt-2.5 font-body text-[13.5px] leading-relaxed text-[#FBF6EA]/70">{w.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── The full report ─────────────── */}
        <section className="grid items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              Pillars two and three // By email, because we go and look
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              The other two are facts, not guesses.
            </h2>
            <p className="mt-5 max-w-xl font-body text-[15px] leading-relaxed text-[#161616]/75">
              Your profile checks and your review numbers are read off your real Google listing.
              They are facts about your business rather than a model's opinion of it, and the report
              says where each one came from. Anything we cannot see is scored as could not see,
              never as zero.
            </p>
            <p className="mt-4 max-w-xl font-body text-[15px] leading-relaxed text-[#161616]/75">
              That takes longer than a page load, which is the only reason it arrives by email
              rather than appearing above. The fixes come ranked, and plenty of people take the list
              and do the work themselves. That is a fine outcome.
            </p>
          </div>
          <PresenceRequestForm />
        </section>

        {/* ─────────────── The rest of the desk ─────────────── */}
        <section>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              The rest of the desk // Different questions, different tools
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              Three more, and each answers something else.
            </h2>
            <p className="mt-4 font-body text-[15px] leading-relaxed text-[#161616]/70">
              These used to be scattered with nothing explaining the difference between them. Here
              is the difference.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DESK.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="group flex min-w-0 flex-col rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#F5B700]"
              >
                <h3 className="font-display text-2xl font-extrabold italic leading-tight">{d.name}</h3>
                <p className="mt-3 flex-1 font-body text-[13.5px] leading-relaxed text-[#161616]/75">{d.line}</p>
                <span className="mt-5 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#C4160B] transition-colors group-hover:text-[#161616]">
                  {d.cta} →
                </span>
              </Link>
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
        <section className="relative overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-10 text-center shadow-[8px_8px_0_0_#161616] md:p-14">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#161616]/70">
            No card · No meeting · Yours either way
          </p>
          <h2 className="mt-4 font-display text-3xl font-extrabold italic leading-[1.02] md:text-5xl">
            Find out what your presence is really doing.
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-body text-[15px] leading-relaxed text-[#161616]/80">
            Run the website grade above, or have the whole three-pillar report sent over. If you
            would rather just talk it through, the calendar is open.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#grade"
              className="rounded-full border-2 border-[#161616] bg-[#161616] px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#F5B700] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] transition-transform hover:-translate-y-0.5"
            >
              Grade my website →
            </a>
            <Link
              href="/book"
              className="rounded-full border-2 border-[#161616] bg-white px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] transition-transform hover:-translate-y-0.5"
            >
              Book a call
            </Link>
          </div>
          <p className="mt-7 font-body text-[13px] text-[#161616]/60">
            {SITE.city}, {SITE.regionName}. Working with clients nationwide.
          </p>
        </section>
      </div>
    </div>
  );
}
