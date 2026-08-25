import Link from 'next/link';
import MrMustardHeroCTA from '@/components/MrMustardHeroCTA';
import SystemLoop from '@/components/the-system/SystemLoop';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { STATIONS, CAPABILITIES, A_DAY, SYSTEM_FAQ } from '@/data/the-system';
import { DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';
import { HUNDREDFOLD, money } from '@/lib/hundredfold';

export const metadata = buildMetadata({
  title: 'The System: your whole company, AI native',
  description:
    'Website, voice agent, command center, lead finder, campaigns, deal tracking, social scheduling, forms, interviews, automations, and custom software, built as one loop off one brain. See the whole cycle a lead travels, from found to grown, and start with a free build.',
  path: '/the-system',
});

const RED = '#C4160B';

const ARCHITECT_SPEC = [
  ['Front door', 'Next.js, App Router, TypeScript strict, Tailwind'],
  ['Brain', 'Supabase: Postgres, auth, storage, row-level security'],
  ['Voice', 'Vapi agents, ElevenLabs voices, Twilio numbers'],
  ['Money', 'Stripe: proposals signed and paid on one link'],
  ['Mail', 'Resend from your domain, SPF and DKIM set, bounces braked'],
  ['Deploys', 'Vercel, git integration, preview per branch'],
  ['Intelligence', 'Claude, wired to your board with tools, not a chat box'],
  ['Ownership', 'Your GitHub org, your keys, your docs, handed over on launch day'],
];

const DOORS = [
  {
    eyebrow: 'The flagship // Free build first',
    name: 'The Talking Website',
    price: `${formatUsd(DEMO_BUNDLE.setupCents)} setup, then ${formatUsd(DEMO_BUNDLE.monthlyCents)}/mo`,
    body: 'A website that answers its own phone. Your site and your voice agent built as one thing off one brain, so every call and every form lands in the same place. Stations 03, 04 and 07, live within a week.',
    href: '/demos',
    cta: 'Build Mine Free',
    tone: 'yellow',
  },
  {
    eyebrow: 'The program // Twelve months, four gates',
    name: HUNDREDFOLD.name,
    price: `${money(HUNDREDFOLD.setupCents)} to start, then ${money(HUNDREDFOLD.monthlyCents)} a month`,
    body: 'The scaling program that builds the machine with you. The offer rebuilt, the whole loop installed station by station, the agents running, and a build queue that does not stop until the branches hold weight.',
    href: HUNDREDFOLD.path,
    cta: 'See Hundredfold',
    tone: 'white',
  },
  {
    eyebrow: 'The custom build // Fixed quote, fixed timeline',
    name: 'Idea to Product',
    price: 'Quoted after a free 30-minute call',
    body: 'The portal, the app, the store, the agentic tool nobody sells off the shelf. Scoped and sequenced, built and shipped, launched, then handed off with the repo and every credential in your name.',
    href: '/book',
    cta: 'Book the Call',
    tone: 'white',
  },
];

export default function TheSystemPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'The System', url: '/the-system' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            '@id': `${SITE.url}/the-system#howto`,
            name: 'The System: how a lead travels from found to grown',
            description: 'The eight stations every lead moves through when a business runs on the Modern Mustard Seed system.',
            inLanguage: 'en-US',
            step: STATIONS.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: `${s.code} ${s.verb}`,
              text: s.blurb,
              url: `${SITE.url}/the-system#the-loop`,
            })),
          },
          faqJsonLd(SYSTEM_FAQ),
        ]}
      />

      {/* ── Hero ── */}
      <header className="halftone-bg border-b-2 border-[#161616] overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-32 pb-14 md:pt-40 lg:pb-20">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.35em] font-bold" style={{ color: RED }}>
                The system // One desk, one brain, every door
              </span>
              <h1 className="font-display text-[2.8rem] sm:text-6xl xl:text-[5.2rem] font-extrabold mt-4 leading-[0.98] tracking-tight">
                Your whole company,
                <br />
                <em className="italic text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                  AI native.
                </em>
              </h1>
              <p className="font-body text-[17px] md:text-lg text-[#161616]/75 mt-6 max-w-xl leading-relaxed">
                Not a website. Not a chatbot. The whole loop: the lead is found, reached, answered, booked, sold, built, run, and grown, and the growth goes and finds the next lead. Designed by one architect, built on infrastructure you own, run from one board.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link
                  href="/demos"
                  className="inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
                >
                  Build Mine Free →
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 bg-white text-[#161616] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Book a Free Call
                </Link>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/60 mt-5">
                Set package prices. Changes included. You own it on launch day.
              </p>
            </div>

            {/* Hero sticker stack */}
            <div className="relative h-[300px] sm:h-[340px] lg:h-[420px]" aria-hidden="true">
              <div className="absolute left-2 top-4 pop-card-yellow px-5 py-4 -rotate-3 w-[240px]">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: RED }}>
                  9:15 AM
                </p>
                <p className="font-display font-extrabold text-xl leading-tight mt-1">Your agent answered on the first ring.</p>
              </div>
              <div className="absolute right-0 top-[110px] pop-card px-5 py-4 rotate-2 w-[250px]">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: RED }}>
                  11:30 AM
                </p>
                <p className="font-display font-extrabold text-xl leading-tight mt-1">Proposal signed and paid. Deal marked won.</p>
              </div>
              <div className="absolute left-8 bottom-6 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#F5B700] px-5 py-4 -rotate-2 w-[260px]">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] font-bold text-[#F5B700]">6:30 PM</p>
                <p className="font-display font-extrabold text-xl leading-tight mt-1">Job closed. Review asked. Next lead already found.</p>
              </div>
              <span className="absolute -right-2 -top-3 bg-[#E0301E] text-[#FBF6EA] font-mono font-bold text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] rotate-6">
                One Tuesday
              </span>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ── The loop ── */}
        <section id="the-loop" className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] uppercase" style={{ color: RED }}>
            The cycle // Eight stations, one lead, no re-typing
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Watch one lead go all the way around.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed">
            Every station below is a real part of the system. Hover a number to read it. The ring advances on its own because that is the point: it runs whether or not you are watching.
          </p>
          <div className="mt-12">
            <SystemLoop />
          </div>
        </section>

        {/* ── Marquee band ── */}
        <div className="bg-[#161616] border-y-2 border-[#161616] py-4 overflow-hidden" aria-hidden="true">
          <div className="marquee-track flex whitespace-nowrap font-sans font-extrabold uppercase tracking-[0.2em] text-[13px] text-[#F5B700]">
            {[0, 1].map((rep) => (
              <div key={rep} className="flex shrink-0">
                {STATIONS.map((s) => (
                  <span key={`${rep}-${s.code}`} className="px-6 flex items-center gap-6">
                    {s.verb}
                    <span className="text-[#FBF6EA]/40">◆</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── What lives inside ── */}
        <section id="inside" className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono font-bold text-[11px] tracking-[0.18em] uppercase" style={{ color: RED }}>
                Inside the system // Twelve working parts
              </p>
              <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
                Everything the loop runs on.
              </h2>
            </div>
            <p className="font-body text-[15px] text-[#161616]/70 max-w-md leading-relaxed">
              Each one is a door you can open on its own. Together, they are one machine that reports to one board.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {CAPABILITIES.map((c, i) => (
              <div
                key={c.name}
                className={`group flex flex-col border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-6 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#F5B700] transition-all ${
                  i % 5 === 2 ? 'bg-[#F5B700]' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl" aria-hidden="true">
                    {c.icon}
                  </span>
                  <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#161616]/50">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="font-display font-extrabold text-2xl mt-4 leading-tight">{c.name}</h3>
                <p className="font-body text-[14.5px] leading-relaxed text-[#161616]/75 mt-2">{c.what}</p>
                <p className="mt-auto pt-5 font-mono text-[10.5px] uppercase tracking-[0.15em] font-bold" style={{ color: RED }}>
                  Replaces: <span className="text-[#161616]/70 normal-case tracking-normal font-sans font-semibold">{c.replaces}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── A day on the system ── */}
        <section id="a-day" className="bg-[#161616] text-[#FBF6EA] halftone-ink border-y-2 border-[#161616]">
          <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
            <p className="font-mono font-bold text-[11px] tracking-[0.18em] uppercase text-[#F5B700]">
              One day, illustrated // The loop with a clock on it
            </p>
            <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
              A Tuesday, running on the system.
            </h2>
            <p className="font-body text-[15px] text-[#FBF6EA]/70 mt-4 max-w-2xl leading-relaxed">
              You touched it twice: one sales call and one question to the board. Everything else happened because the stations were wired to each other.
            </p>
            <ol className="mt-12 grid md:grid-cols-2 gap-x-10 gap-y-0 relative">
              {A_DAY.map((d, i) => (
                <li key={d.time} className="relative flex gap-5 py-5 border-b border-dashed border-[#FBF6EA]/15">
                  <div className="shrink-0 w-[52px] h-[52px] rounded-full bg-[#F5B700] border-2 border-[#FBF6EA] text-[#161616] font-mono font-extrabold text-[12px] flex items-center justify-center shadow-[3px_3px_0_0_#FBF6EA]">
                    {d.station}
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#F5B700] font-bold">
                      {d.time} <span className="text-[#FBF6EA]/40">{`// ${STATIONS[i].verb}`}</span>
                    </p>
                    <p className="font-body text-[15px] leading-relaxed text-[#FBF6EA]/85 mt-1.5">{d.beat}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#FBF6EA]/45 mt-8">
              Illustrative day. Your stations, your trade, your clock.
            </p>
          </div>
        </section>

        {/* ── The architect ── */}
        <section id="architect" className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14 items-start">
            <div>
              <p className="font-mono font-bold text-[11px] tracking-[0.18em] uppercase" style={{ color: RED }}>
                The architect // Designed, not assembled
              </p>
              <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02]">
                One digital architect. One agentic engineer. Same person.
              </h2>
              <p className="font-body text-[15px] text-[#161616]/75 mt-5 leading-relaxed">
                Sarah Scarano, self-taught full-stack engineer and AI systems architect, Kalispell, Montana. Forty plus shipped products, four ventures run from one desk on this exact system. The person who draws the blueprint is the person who pours the foundation and the person who hands you the keys.
              </p>
              <p className="font-body text-[15px] text-[#161616]/75 mt-4 leading-relaxed">
                Off-the-shelf software makes you bend your business around it. Custom infrastructure bends around you: your intake, your pricing, your crew, your customer. That is the difference between a tool you rent and an asset you own.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  'Scoped and sequenced before a line of code is written',
                  'Built in the open, with demos while it is being built',
                  'Documented and handed over: repo, deploys, keys, runbook',
                  'Changes included. No change orders, ever',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 font-sans font-semibold text-[14.5px]">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#F5B700] border-2 border-[#161616] text-[10px] flex items-center justify-center font-bold">✓</span>
                    {line}
                  </li>
                ))}
              </ul>
              <Link
                href="/about"
                className="inline-block mt-7 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Meet the architect →
              </Link>
            </div>

            {/* Blueprint card */}
            <div className="relative">
              <span className="absolute -top-4 left-6 z-10 inline-block bg-[#1E50C8] text-[#FBF6EA] font-mono font-bold text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] -rotate-2">
                Blueprint // Standard stack
              </span>
              <div className="pop-card-cream p-7 md:p-8">
                <div className="flex items-baseline justify-between border-b-2 border-[#161616] pb-3">
                  <span className="font-display italic font-extrabold text-2xl">Spec sheet</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/60">Rev. 2026</span>
                </div>
                <dl className="mt-4 divide-y divide-dashed divide-[#161616]/20">
                  {ARCHITECT_SPEC.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[110px_1fr] gap-4 py-3">
                      <dt className="font-mono text-[10.5px] uppercase tracking-[0.2em] font-bold pt-0.5" style={{ color: RED }}>
                        {k}
                      </dt>
                      <dd className="font-sans text-[14px] font-semibold text-[#161616]">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="font-body text-[12.5px] text-[#161616]/60 mt-4 leading-relaxed">
                  Swapped for your existing tools when you already have them. The standard is a default, not a lock-in.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── The offer ── */}
        <section id="offer" className="bg-[#F5B700] border-y-2 border-[#161616]">
          <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
            <p className="font-mono font-bold text-[11px] tracking-[0.18em] uppercase" style={{ color: RED }}>
              The offer // See it built before you pay for it
            </p>
            <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
              Start at any station. Every door opens with a free build.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/75 mt-4 max-w-2xl leading-relaxed">
              We build your demo first, for your trade, with your name on it. You see the loop running before a card is on the table. Then you pick the door.
            </p>
            <div className="grid lg:grid-cols-3 gap-6 mt-12 items-stretch">
              {DOORS.map((d) => (
                <div key={d.name} className={`${d.tone === 'yellow' ? 'bg-[#161616] text-[#FBF6EA]' : 'bg-white text-[#161616]'} border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 flex flex-col`}>
                  <span className={`font-mono text-[10px] uppercase tracking-[0.25em] font-bold ${d.tone === 'yellow' ? 'text-[#F5B700]' : ''}`} style={d.tone === 'yellow' ? undefined : { color: RED }}>
                    {d.eyebrow}
                  </span>
                  <h3 className="font-display font-extrabold text-3xl mt-3 leading-tight">{d.name}</h3>
                  <p className={`font-mono font-bold text-[13px] mt-2 ${d.tone === 'yellow' ? 'text-[#F5B700]' : 'text-[#8f6600]'}`}>{d.price}</p>
                  <p className={`font-body text-[14.5px] leading-relaxed mt-4 ${d.tone === 'yellow' ? 'text-[#FBF6EA]/80' : 'text-[#161616]/75'}`}>{d.body}</p>
                  <Link
                    href={d.href}
                    className={`mt-auto pt-6 inline-flex self-start items-center gap-2 rounded-full px-6 py-3.5 font-sans font-bold uppercase tracking-[0.14em] text-[11px] border-2 border-[#161616] hover:-translate-y-0.5 transition-transform ${
                      d.tone === 'yellow' ? 'bg-[#F5B700] text-[#161616] shadow-[4px_4px_0_0_#FBF6EA]' : 'bg-[#161616] text-[#FBF6EA] shadow-[4px_4px_0_0_#F5B700]'
                    }`}
                    style={{ marginTop: 'auto' }}
                  >
                    {d.cta} →
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-10 grid sm:grid-cols-3 gap-4">
              {[
                ['Fixed before work starts', 'You see the whole price and the whole timeline first.'],
                ['Changes are included', 'Adjust, refine, rework what we built. No change orders.'],
                ['Yours on launch day', 'Repo, deploys, number, docs, keys. Stewardship, not extraction.'],
              ].map(([t, b]) => (
                <div key={t} className="bg-[#FBF6EA] border-2 border-[#161616] rounded-xl p-4 shadow-[4px_4px_0_0_#161616]">
                  <p className="font-sans font-extrabold text-[14px]">{t}</p>
                  <p className="font-body text-[13px] text-[#161616]/70 mt-1">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="max-w-4xl mx-auto px-6 py-16 lg:py-24">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] uppercase" style={{ color: RED }}>
            Straight answers // No sales call required
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02]">Questions, answered plainly.</h2>
          <div className="mt-10 space-y-4">
            {SYSTEM_FAQ.map((f) => (
              <details key={f.q} className="group pop-card px-6 py-5 open:bg-[#FFFDF6]">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-display font-extrabold text-lg md:text-xl">
                  {f.q}
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#F5B700] border-2 border-[#161616] flex items-center justify-center font-bold text-sm transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="font-body text-[15px] leading-relaxed text-[#161616]/75 mt-4">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Close ── */}
        <section className="max-w-5xl mx-auto px-6 pb-20 lg:pb-28">
          <div className="text-center mb-10">
            <p className="font-mono font-bold text-[11px] tracking-[0.18em] uppercase" style={{ color: RED }}>
              The close // Mr. Mustard takes it
            </p>
            <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02]">
              Hear station 03 for yourself.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-xl mx-auto leading-relaxed">
              Mr. Mustard runs this exact system for the studio. Talk to him, ask him anything about the loop, and let him book the call.
            </p>
          </div>
          <MrMustardHeroCTA location="the-system" />
        </section>
      </main>
    </div>
  );
}
