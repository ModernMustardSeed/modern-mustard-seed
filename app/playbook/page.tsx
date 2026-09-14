import Link from '@/components/AttributionLink';
import PortalShowcase from '@/components/PortalShowcase';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { DELIVERABLES, CADENCE, STANDARD } from '@/data/engagement';

export const metadata = buildMetadata({
  title: 'What You Get',
  description:
    'Exactly what lands on your desk from a Modern Mustard Seed engagement: the thing itself, the repository, the keys, the runbook, the source files, and changes included permanently.',
  path: '/playbook',
});

const PDF = '/downloads/modern-mustard-seed-playbook.pdf';

/**
 * WHAT YOU GET. Rebuilt 2026-09-14 (Sarah: the old one sucked, and it was not
 * all right).
 *
 * What was wrong with it: the page was a logo, a headline and a download
 * button. The five things it listed inside the PDF included "transparent
 * three-bucket pricing", which no longer exists, an audit step that is retired,
 * and a partner referral pitch on a page a client reads. Its own Begin An
 * Engagement button pointed at /audit.
 *
 * The fix is not a nicer download page. It is putting the playbook ON the page.
 * A studio that asks for an email before it will tell you what you receive is
 * behaving like a funnel, and this is supposed to read like a boutique.
 *
 * This page owns WHAT you receive. /work-with-us owns HOW it runs. They used to
 * say the same things in different words.
 */
export default function PlaybookPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'What You Get', url: '/playbook' },
          ]),
          webPageJsonLd({
            path: '/playbook',
            name: 'What You Get · Modern Mustard Seed',
            description:
              'Every deliverable from an engagement, the weekly cadence during a build, the client portal, and the standard every surface is held to.',
          }),
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
              What you get
            </span>
            <h1 className="mt-7 font-display text-5xl font-extrabold leading-[0.98] tracking-tight md:text-6xl lg:text-[4.4rem]">
              The whole asset, in your name, with{' '}
              <em className="italic text-[#B48600]">the keys</em>.
            </h1>
            <p className="mt-7 max-w-2xl font-body text-lg leading-relaxed text-[#3d382e] md:text-xl">
              Plenty of studios will tell you what they do. Fewer will tell you, before you pay,
              exactly what you are holding at the end. This page is that list, and it is on the page
              rather than behind an email form.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/inquire"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-[#161616] px-7 py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-[#FBF6EA] shadow-[5px_5px_0_0_#F5B700] transition-transform hover:-translate-y-0.5"
              >
                Begin an engagement →
              </Link>
              <Link
                href="/work-with-us"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-white px-7 py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5"
              >
                How an engagement runs
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────── The deliverables ─────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
            The deliverables // Handed over, not licensed
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            Six things land on your desk.
          </h2>
          <p className="mt-4 font-body text-[15px] leading-relaxed text-[#161616]/70">
            The test of whether you own something is whether another engineer could take it over
            tomorrow. Everything below exists so the answer is yes.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {DELIVERABLES.map((d, i) => (
            <article
              key={d.k}
              className="flex min-w-0 flex-col rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]"
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f6600]">
                {String(i + 1).padStart(2, '0')} · {d.k}
              </span>
              <h3 className="mt-2.5 font-display text-2xl font-extrabold italic leading-tight">
                {d.title}
              </h3>
              <p className="mt-3 flex-1 font-body text-[13.5px] leading-relaxed text-[#161616]/75">
                {d.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ─────────────── The week ─────────────── */}
      <section className="border-y-2 border-[#161616] bg-[#161616] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B700]">
              During the build // What a week looks like
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] text-[#FBF6EA] md:text-5xl">
              You never have to ask how it is going.
            </h2>
            <p className="mt-4 font-body text-[15px] leading-relaxed text-[#FBF6EA]/70">
              The worst part of hiring anybody to build something is the silence. There is none
              here, and you do not have to chase it.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CADENCE.map((c) => (
              <div
                key={c.when}
                className="flex min-w-0 flex-col rounded-2xl border-2 border-[#F5B700]/40 bg-[#1F1F1F] p-6"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">
                  {c.when}
                </span>
                <h3 className="mt-2 font-display text-xl font-extrabold leading-tight text-[#FBF6EA]">
                  {c.what}
                </h3>
                <p className="mt-2.5 flex-1 font-body text-[13.5px] leading-relaxed text-[#FBF6EA]/70">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── The portal ─────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
            Your portal // Open from day one
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
            One place that always knows where things stand.
          </h2>
        </div>
        <div className="mt-10">
          <PortalShowcase />
        </div>
      </section>

      {/* ─────────────── The standard ─────────────── */}
      <section className="border-y-2 border-[#161616] bg-[#F5F0E8] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              The standard // What ships, and what does not
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              Six things that are true of everything we hand over.
            </h2>
            <p className="mt-4 font-body text-[15px] leading-relaxed text-[#161616]/70">
              Not aspirations. These are the checks a build has to pass before it is allowed to be
              called finished.
            </p>
          </div>
          <div className="mt-12 space-y-4">
            {STANDARD.map((s, i) => (
              <div
                key={s.title}
                className="flex min-w-0 flex-col gap-2 rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] sm:flex-row sm:items-baseline sm:gap-7"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#8f6600] sm:w-10 sm:shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 sm:flex-1">
                  <h3 className="font-display text-xl font-extrabold leading-tight">{s.title}</h3>
                  <p className="mt-1.5 font-body text-[14px] leading-relaxed text-[#161616]/75">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── After launch ─────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              After launch // The part most contracts go quiet about
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] md:text-5xl">
              Changes are included. Permanently.
            </h2>
            <p className="mt-5 max-w-xl font-body text-[15px] leading-relaxed text-[#161616]/75">
              New copy, new photos, new prices, a new section, a whole new look at the thing you
              already have. No change order, no second invoice, and no conversation about whether it
              counts as a change.
            </p>
            <p className="mt-4 max-w-xl font-body text-[15px] leading-relaxed text-[#161616]/75">
              There is exactly one line, and it is the line that keeps the promise honest: something
              we never agreed to build is a new engagement, quoted the same way as the first. Adding
              a page is not the same as editing one, and we will say which is which before you
              spend anything.
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-7 shadow-[8px_8px_0_0_#161616] md:p-9">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#161616]">
              And if you leave
            </p>
            <p className="mt-3 font-display text-[1.6rem] font-extrabold italic leading-[1.12] md:text-[1.9rem]">
              Nothing turns off.
            </p>
            <p className="mt-4 font-body text-[14px] leading-relaxed text-[#161616]/80">
              The domain, the hosting, the accounts and the code are already in your name, so there
              is nothing for us to switch off and nothing to negotiate. Hire anybody you like to
              take it forward. That is what owning it means, and it is the whole point of building
              it this way.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────── Close ─────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#161616] p-10 text-center shadow-[8px_8px_0_0_#F5B700] md:p-14">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5B700]">
            By inquiry · Answered personally
          </p>
          <h2 className="mt-4 font-display text-3xl font-extrabold italic leading-[1.02] text-[#FBF6EA] md:text-5xl">
            Now tell us what you want to own.
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-body text-[15px] leading-relaxed text-[#FBF6EA]/80">
            The business, the problem, and what a good outcome looks like. You get a straight answer
            on fit inside one business day, whether or not it is one.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/inquire"
              className="rounded-full border-2 border-[#F5B700] bg-[#F5B700] px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#161616] transition-transform hover:-translate-y-0.5"
            >
              Begin an engagement →
            </Link>
            <a
              href={PDF}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border-2 border-[#FBF6EA]/40 px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#FBF6EA] transition-all hover:border-[#FBF6EA] hover:-translate-y-0.5"
            >
              Take the PDF
            </a>
          </div>
          <p className="mt-7 font-body text-[13px] text-[#FBF6EA]/55">
            {SITE.city}, {SITE.regionName}. Working with clients nationwide.
          </p>
        </div>
      </section>
    </div>
  );
}
