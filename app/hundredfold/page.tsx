import Link from 'next/link';
import TheInterview from '@/components/hundredfold/TheInterview';
import HundredfoldFilm from '@/components/hundredfold/HundredfoldFilm';
import { activeMemberCount } from '@/lib/hundredfold-store';
import {
  FIT,
  GUARANTEE,
  HUNDREDFOLD,
  PILLARS,
  SCARCITY,
  STACK,
  money,
  priceSentence,
  seatsLeft,
  stackTotalCents,
} from '@/lib/hundredfold';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'HUNDREDFOLD. The Scaling Program That Builds The Machine With You.',
  description:
    'Mr. Mustard interviews you, we forge your offer, we build the agents that run your plan, and we coach you through four gates for twelve months. $5,000 to start, then $2,500 a month. Ten founding seats.',
  path: '/hundredfold',
});

export const revalidate = 300;

const RED = '#C4160B';

const FAQS = [
  {
    q: 'What is HUNDREDFOLD?',
    a: 'A twelve month scaling program for a business that already works and is capped. It has four parts that most programs only have one of. Mr. Mustard interviews you with about thirty questions and builds your roadmap from your answers. We forge the offer you should actually be selling, priced and guaranteed and written. We build the AI agents and automations that execute the plan inside your business, in your accounts. And we coach you every week against four gates, so you learn to run the machine instead of just owning one.',
  },
  {
    q: 'What does it cost?',
    a: 'Five thousand dollars to start, then two thousand five hundred a month. The start covers your interview, your roadmap, your offer, and the first system we build. The monthly covers weekly coaching, the ongoing build queue, and running the agents. Founding members hold that price for twelve months. There is no free trial and no discount, because a program that hand-holds this closely cannot be run at volume.',
  },
  {
    q: 'How is this different from a coaching program or a mastermind?',
    a: 'A coaching program tells you what to do and leaves you to do it. An agency does it for you and teaches you nothing. HUNDREDFOLD does both on purpose: we build the actual systems, wired into your actual business, and we walk you through the reasoning every week so you can make the next call yourself. You end the year with a machine you own and the understanding to change it.',
  },
  {
    q: 'What is the interview really like?',
    a: 'It is a live conversation, in your browser or on the phone, that runs about twenty minutes. Mr. Mustard asks what you sell and to whom, what a customer actually pays, what your margin is, what happens to the people who say not right now, what breaks first if you double tomorrow, what part of your week you resent, and what you actually want twelve months from now. When an answer is vague he pushes once. Most owners say it is the first time anyone has made them say those numbers out loud.',
  },
  {
    q: 'What kind of systems do you actually build?',
    a: 'Whatever your roadmap calls for, one window at a time. Commonly: a voice agent that answers your real number day and night and books the job, a follow-up engine that works the warm leads you have already paid for, a site that sells instead of sitting there, a content engine that turns finished work into proof, a dashboard that puts your scoreboard numbers in one place, and quoting or intake tools specific to your trade. Everything lives in your accounts, in your name, and stays yours.',
  },
  {
    q: 'Do I have to do the work?',
    a: 'Yes, the parts only you can do. We build the machines and we tell you exactly what to do each week, but nobody can make your calls, set your prices, or decide what your business becomes. If you want to hand it all off and stay out of the room, this is the wrong program and we will say so before you pay.',
  },
  {
    q: 'What is the guarantee?',
    a: 'The First Window Guarantee. Your first thirty days produce your offer, your roadmap, and your first built system, live and working. If all three are not in your hands by day thirty, you do not pay the second month and you keep everything we made. After that it is thirty days notice, any month, no exit fee. Everything built stays in your accounts either way.',
  },
  {
    q: 'Why only ten seats?',
    a: 'Because Sarah runs every interview and every build herself. The seat count is simply the number of businesses she can serve without the quality dropping. When they are full, the next opening is the next one someone finishes. That is not a marketing tactic, it is arithmetic.',
  },
  {
    q: 'How do I start?',
    a: 'Run the free Hundredfold Roadmap on your website first, which costs nothing and takes ninety seconds. If what it says lands, do the interview. After the interview Sarah reviews everything herself and brings you your plan along with what it would take to run it together. Nobody is charged anything before that conversation.',
  },
];

export default async function HundredfoldPage() {
  const active = await activeMemberCount();
  // Fails toward FULL: if we cannot read the count we do not advertise seats we
  // might not have.
  const left = active === null ? null : seatsLeft(active);
  const stackTotal = stackTotalCents();

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            '@id': `${SITE.url}/hundredfold#service`,
            name: 'HUNDREDFOLD',
            description:
              'A twelve month scaling program: a thirty question coaching interview, a forged offer, custom AI agents and automations built into the business, and weekly coaching against four numeric gates.',
            provider: { '@id': `${SITE.url}/#organization` },
            serviceType: 'Business scaling program',
            areaServed: 'United States',
            offers: {
              '@type': 'Offer',
              price: (HUNDREDFOLD.setupCents / 100).toFixed(0),
              priceCurrency: 'USD',
              description: `${priceSentence()}. ${HUNDREDFOLD.foundingSeats} founding seats.`,
            },
          },
          serviceJsonLd({
            name: 'HUNDREDFOLD scaling program',
            description:
              'Coaching plus custom AI systems: interview, offer forge, build, and weekly coaching against four gates over twelve months.',
          }),
          faqJsonLd(FAQS),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Hundredfold', url: '/hundredfold' },
          ]),
        ]}
      />

      <div className="relative bg-[#FBF6EA] text-[#161616]">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <header className="relative pt-36 md:pt-44 pb-20 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-6 md:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <span className="text-[10px] uppercase tracking-[0.45em] font-mono font-bold mb-7 block" style={{ color: RED }}>
                The flagship
              </span>
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.92]">
                HUNDRED
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                  FOLD
                </span>
              </h1>
              <p className="mt-6 font-display italic font-bold text-2xl md:text-3xl leading-snug">
                We do not hand you a plan. We build the machine that runs it.
              </p>
              <p className="mt-5 text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto">
                Mr. Mustard interviews you like a coach who will not take a vague answer. We forge the offer
                you should actually be selling. We wire the AI agents that execute your roadmap inside your
                business. Then we coach you every week for a year, against four gates with a number on each.
              </p>
            </div>

            {/* The film */}
            <div className="mt-12 max-w-4xl mx-auto">
              <HundredfoldFilm />
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
              <a
                href="#interview"
                className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-xl border-2 border-[#161616] hover:-translate-y-0.5 transition-all text-center"
              >
                Start the interview
              </a>
              <Link
                href="/scaling-roadmap"
                className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-xl border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all text-center"
              >
                Get the free roadmap first
              </Link>
            </div>

            {left !== null && (
              <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] font-mono font-bold" style={{ color: RED }}>
                {left > 0
                  ? `${left} of ${HUNDREDFOLD.foundingSeats} founding seats open`
                  : 'All founding seats are taken. The waitlist is open.'}
              </p>
            )}
          </div>
        </header>

        {/* ── The truth ────────────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 border-y-2 border-[#161616]/12">
          <div className="max-w-3xl mx-auto px-6 md:px-8">
            <span className="block text-[10px] uppercase tracking-[0.45em] font-mono font-bold mb-6" style={{ color: RED }}>
              Read this part slowly
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
              You already know what is wrong. That has never been the problem.
            </h2>
            <div className="mt-7 space-y-5 text-[#3a3733] font-body text-base md:text-lg leading-relaxed">
              <p>
                You know your follow-up is bad. You know your price is too low. You know the phone rings
                after five and nobody picks it up. You know there are people in your phone right now who
                would have paid you if anyone had called them back.
              </p>
              <p>
                Knowing has never once fixed it. What fixes it is a plan built from your real numbers, the
                machines that carry the parts you will not do consistently, and somebody checking on you
                every single week until the number clears.
              </p>
              <p className="font-display italic font-black text-xl md:text-2xl text-[#161616] leading-snug">
                That is the entire program. A plan, the machines, and someone who does not let it slide.
              </p>
            </div>
          </div>
        </section>

        {/* ── The six pillars ──────────────────────────────────────────────── */}
        <section className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6 md:px-8">
            <div className="text-center mb-14">
              <span className="block text-[10px] uppercase tracking-[0.45em] font-mono font-bold mb-5" style={{ color: RED }}>
                What is in it
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">
                Six parts.{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  Nobody else has all six.
                </span>
              </h2>
            </div>

            <div className="space-y-5">
              {PILLARS.map((p, i) => (
                <div key={p.key} className="pop-card overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div
                      className={`md:w-56 shrink-0 p-7 flex md:flex-col items-center md:items-start gap-4 md:gap-2 ${
                        i % 2 === 0 ? 'bg-[#161616]' : 'bg-[#F5B700]'
                      }`}
                    >
                      <span
                        className={`font-display text-5xl md:text-6xl font-black leading-none ${
                          i % 2 === 0 ? 'text-[#F5B700]' : 'text-[#161616]'
                        }`}
                      >
                        {p.n}
                      </span>
                      <span
                        className={`font-display text-xl md:text-2xl font-black tracking-tight leading-tight ${
                          i % 2 === 0 ? 'text-[#FBF6EA]' : 'text-[#161616]'
                        }`}
                      >
                        {p.name}
                      </span>
                    </div>
                    <div className="flex-1 p-7 md:p-9 min-w-0">
                      <p className="font-display italic font-black text-xl md:text-2xl leading-snug mb-4">
                        {p.line}
                      </p>
                      <p className="text-[#3a3733] font-body text-sm md:text-base leading-relaxed">{p.body}</p>
                      <ul className="mt-5 space-y-2">
                        {p.gets.map((g) => (
                          <li key={g} className="flex items-start gap-3 text-[#161616] font-body text-sm">
                            <span className="mt-[7px] w-2 h-2 rounded-full bg-[#F5B700] border border-[#161616] shrink-0" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── The interview, live ──────────────────────────────────────────── */}
        <section id="interview" className="py-20 md:py-28 bg-[#161616] scroll-mt-24">
          <div className="max-w-6xl mx-auto px-6 md:px-8">
            <div className="text-center mb-12 max-w-3xl mx-auto">
              <span className="block text-[10px] uppercase tracking-[0.45em] font-mono font-bold text-[#F5B700] mb-6">
                Start here
              </span>
              <h2 className="font-display text-4xl md:text-6xl font-black tracking-tight text-[#FBF6EA] leading-[0.98]">
                Get interviewed right now
              </h2>
              <p className="mt-5 text-[#FBF6EA]/75 font-body text-base md:text-lg leading-relaxed">
                Not a form. Not a survey. A coach asking you about your money for twenty minutes, and pushing
                when the answer is soft. It is free, it works at eleven at night, and at the end of it you
                have said things out loud that will change what you do on Monday.
              </p>
            </div>
            <TheInterview />
            <p className="mt-8 text-center text-[#FBF6EA]/45 text-xs font-body max-w-xl mx-auto">
              Nothing is charged for the interview and there is nothing to cancel. Sarah reads it, builds
              your plan, and brings it to you.
            </p>
          </div>
        </section>

        {/* ── The stack and the price ──────────────────────────────────────── */}
        <section className="py-20 md:py-28">
          <div className="max-w-4xl mx-auto px-6 md:px-8">
            <div className="text-center mb-12">
              <span className="block text-[10px] uppercase tracking-[0.45em] font-mono font-bold mb-5" style={{ color: RED }}>
                What the year is worth
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">Itemized, honestly</h2>
            </div>

            <div className="pop-card p-6 md:p-9">
              <div className="divide-y divide-[#161616]/10">
                {STACK.map((s) => (
                  <div key={s.item} className="py-5 first:pt-0 last:pb-0 flex items-start gap-5">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-sans font-extrabold text-base leading-snug">{s.item}</h3>
                      <p className="mt-1 text-[#3a3733] font-body text-sm leading-relaxed">{s.why}</p>
                    </div>
                    <span className="font-display font-black text-lg shrink-0 tabular-nums">
                      {s.valueCents > 0 ? money(s.valueCents) : 'Yours'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-7 pt-6 border-t-2 border-[#161616] flex flex-wrap items-end justify-between gap-6">
                <div>
                  <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#161616]/55 mb-1">
                    What it is worth
                  </span>
                  <p className="font-display text-3xl md:text-4xl font-black text-[#161616]/40 line-through decoration-[3px]">
                    {money(stackTotal)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold mb-1" style={{ color: RED }}>
                    What you pay
                  </span>
                  <p className="font-display text-3xl md:text-5xl font-black leading-none">
                    {money(HUNDREDFOLD.setupCents)}
                  </p>
                  <p className="mt-1 font-display text-xl md:text-2xl font-black">
                    then {money(HUNDREDFOLD.monthlyCents)}/mo
                  </p>
                </div>
              </div>
              <p className="mt-5 text-[#161616]/70 font-body text-sm leading-relaxed">
                Price held for {HUNDREDFOLD.priceLockMonths} months for founding members. Month to month
                after the first window, thirty days notice, no exit fee. Everything we build stays in your
                accounts whatever happens.
              </p>
            </div>

            {/* Guarantee + scarcity */}
            <div className="mt-5 grid md:grid-cols-2 gap-5">
              <div className="pop-card-yellow p-7">
                <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#161616]/70 mb-3">
                  The guarantee
                </span>
                <h3 className="font-display text-2xl font-black tracking-tight mb-3">{GUARANTEE.name}</h3>
                <p className="text-[#161616]/85 font-body text-sm leading-relaxed">{GUARANTEE.body}</p>
              </div>
              <div className="pop-card p-7">
                <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold mb-3" style={{ color: RED }}>
                  Why the seats are capped
                </span>
                <h3 className="font-display text-2xl font-black tracking-tight mb-3">{SCARCITY.headline}</h3>
                <p className="text-[#3a3733] font-body text-sm leading-relaxed">{SCARCITY.body}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Fit ──────────────────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-white border-y-2 border-[#161616]/12">
          <div className="max-w-4xl mx-auto px-6 md:px-8">
            <div className="text-center mb-12">
              <span className="block text-[10px] uppercase tracking-[0.45em] font-mono font-bold mb-5" style={{ color: RED }}>
                Be honest with yourself here
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">Who this is for</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="border-2 border-[#161616] rounded-2xl p-7 bg-[#FBF6EA] shadow-[5px_5px_0_0_#161616]">
                <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#2F7D32] mb-4">
                  This is you
                </span>
                <ul className="space-y-3">
                  {FIT.yes.map((f) => (
                    <li key={f} className="flex items-start gap-3 font-body text-sm md:text-base leading-relaxed">
                      <span className="text-[#2F7D32] font-black shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-2 border-[#161616] rounded-2xl p-7 bg-[#FBF6EA]">
                <span className="block text-[9px] uppercase tracking-[0.35em] font-mono font-bold mb-4" style={{ color: RED }}>
                  Not yet, or not this
                </span>
                <ul className="space-y-3">
                  {FIT.no.map((f) => (
                    <li key={f} className="flex items-start gap-3 font-body text-sm md:text-base leading-relaxed text-[#161616]/75">
                      <span className="font-black shrink-0" style={{ color: RED }}>
                        ×
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="py-20 md:py-28">
          <div className="max-w-3xl mx-auto px-6 md:px-8">
            <div className="text-center mb-12">
              <span className="block text-[10px] uppercase tracking-[0.45em] font-mono font-bold mb-5" style={{ color: RED }}>
                Questions
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">Before you decide</h2>
            </div>
            <div className="space-y-4">
              {FAQS.map((f) => (
                <details key={f.q} className="pop-card p-6 group">
                  <summary className="font-display text-lg md:text-xl font-black tracking-tight cursor-pointer list-none flex items-start justify-between gap-4">
                    {f.q}
                    <span
                      className="text-[#F5B700] font-mono text-xl leading-none shrink-0 group-open:rotate-45 transition-transform"
                      style={{ WebkitTextStroke: '1px #161616' }}
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-[#3a3733] text-sm md:text-base font-body leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Close ────────────────────────────────────────────────────────── */}
        <section className="pb-24">
          <div className="max-w-4xl mx-auto px-6 md:px-8">
            <div className="border-2 border-[#161616] rounded-2xl bg-[#161616] shadow-[8px_8px_0_0_#F5B700] p-9 md:p-14 text-center">
              <h2 className="font-display text-4xl md:text-6xl font-black tracking-tight text-[#FBF6EA] leading-[0.98]">
                A seed does not argue about the harvest
              </h2>
              <p className="mt-6 text-[#FBF6EA]/80 font-body text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
                It goes in the ground, it gets tended, and it grows into something birds can live in. Twenty
                minutes with Mr. Mustard is the first honest look at your ground. Everything after that is
                tending.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
                <a
                  href="#interview"
                  className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-xl border-2 border-[#F5B700] hover:-translate-y-0.5 transition-all"
                >
                  Start the interview
                </a>
                <Link
                  href="/book"
                  className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#FBF6EA] rounded-xl border-2 border-[#FBF6EA]/40 hover:border-[#FBF6EA] transition-all"
                >
                  Talk to Sarah first
                </Link>
              </div>
              <p className="mt-6 text-[#FBF6EA]/45 text-[10px] uppercase tracking-[0.3em] font-mono">
                {priceSentence()}
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
