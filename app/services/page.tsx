import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { DEPARTMENTS, BESPOKE } from '@/data/services-hub';
import PathFinder from '@/components/services/PathFinder';

export const metadata = buildMetadata({
  title: 'Services: everything the studio builds, one desk',
  description:
    'Websites, AI receptionists, command centers, commercials, ads, and print, plus custom apps, specialty AI tools, stores, and agentic systems. Every door opens with a free demo. Shipped end to end, fixed scope, you own it.',
  path: '/services',
});

const flagship = DEPARTMENTS.filter((d) => d.flagship);
const rest = DEPARTMENTS.filter((d) => !d.flagship);

const FAQ = [
  {
    q: 'What does Modern Mustard Seed build?',
    a: 'Productized doors that each open with a free demo (a website, an AI receptionist, a command center, a commercial, ads, print, a launch plan, and more), plus fully bespoke work: custom web and mobile apps, specialty AI tools, online stores, and agentic systems. Every engagement is shipped end to end by Sarah Scarano, fixed scope and fixed quote, and you own it.',
  },
  {
    q: 'How fast can you ship?',
    a: 'Websites, voice agents, and command centers go live in about a week from kickoff, and you can tour a free demo of each in about twenty seconds first. Custom apps, software, and online stores usually take two to four weeks. Every engagement is fixed scope with a fixed timeline you see before work begins.',
  },
  {
    q: 'What is a specialty AI tool?',
    a: 'An industry-specific software tool that replaces an expensive recurring workflow. Examples: a FSBO command center that replaces a real estate agent commission, a deal analyzer that cuts investment evaluation from 2 hours to 90 seconds, a staging tool that finishes in under a minute. Specialty AI tools turn $3K service line items into $99 subscriptions.',
  },
  {
    q: 'Do you build mobile apps as well as web apps?',
    a: 'Yes. Mobile apps for iOS and Android are built in one codebase using Expo and React Native. The same fixed-scope engagement structure applies as for web apps.',
  },
  {
    q: 'What is an agentic system?',
    a: 'A multi-agent workflow that replaces the human glue between disconnected tools. We use Trigger.dev for orchestration, Anthropic Claude for reasoning, and custom agents tuned for the specific operation. Voice agents are added when the workflow is phone-driven.',
  },
  {
    q: 'Do I own the code when the build is finished?',
    a: 'Yes, fully. You receive the repository, the live deployment, the domain, and every credential. There is no vendor lock-in and no per-seat fee. You can hire any other engineer to change it later.',
  },
  {
    q: 'What does it cost?',
    a: 'The productized doors show their price on each page (for example, a website is $497 setup plus $97 a month, and the command center is free with either). Bespoke apps, tools, stores, and agentic systems are quoted per project after a free discovery call. Pricing is fixed before work starts, with no hourly billing.',
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Services', url: '/services' },
          ]),
          ...BESPOKE.map((b) => serviceJsonLd({ name: b.name, description: b.desc })),
          faqJsonLd(FAQ),
        ]}
      />

      {/* ── Hero ── */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-6 pt-32 pb-16 md:pt-40 lg:pb-20 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold">
            The studio // One desk, everything built
          </span>
          <h1 className="font-display text-[2.7rem] sm:text-6xl xl:text-7xl font-bold mt-4 leading-[1.0] tracking-tight">
            Everything we build.<br /><em className="italic text-[#C4160B]">One desk.</em>
          </h1>
          <p className="font-body text-[17px] text-[#161616]/75 mt-6 leading-relaxed max-w-2xl mx-auto">
            Not a list of services on a slide. A row of working doors, and each one opens with a free demo before you
            pay a cent. Shipped end to end, fixed scope, fixed quote, and you own everything on launch day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/demos"
              className="inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
            >
              Forge free demos →
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-white text-[#161616] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Book a call
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 lg:py-20 space-y-20">
        {/* ── The flagship trio ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            The flagship // Free to try, yours in a week
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            A website, a receptionist, and the brain that runs them.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed">
            The three that work together. Forge all three free in about a minute, and the command center is free with
            either paid piece.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-10 items-stretch">
            {flagship.map((d) => (
              <Link
                key={d.key}
                href={d.href}
                className="group flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#F5B700] transition-all"
              >
                <span className="text-3xl leading-none" aria-hidden>{d.icon}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#C4160B] mt-3">{d.tag}</span>
                <h3 className="font-display italic font-extrabold text-2xl mt-1">{d.name}</h3>
                <p className="font-body text-[14px] text-[#161616]/75 mt-2.5 leading-relaxed flex-1">{d.blurb}</p>
                <span className="font-sans font-bold text-[12px] uppercase tracking-[0.14em] text-[#161616] mt-5 inline-flex items-center gap-1.5">
                  See it <span className="group-hover:translate-x-1 transition-transform" aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Signature: the path finder ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Not sure where to start? // Tell us the goal
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Tell us what you want. We will point at the door.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed mb-9">
            Skip the menu. Pick what you are actually trying to do and the right doors show up.
          </p>
          <PathFinder />
        </section>

        {/* ── Every department ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Every department // Each opens free
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            The whole studio, one door at a time.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {rest.map((d) => (
              <Link
                key={d.key}
                href={d.href}
                className="group flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[5px_5px_0_0_#161616] p-6 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#F5B700] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none" aria-hidden>{d.icon}</span>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-[#C4160B] block">{d.tag}</span>
                    <h3 className="font-display italic font-extrabold text-xl leading-tight">{d.name}</h3>
                  </div>
                </div>
                <p className="font-body text-[13px] text-[#161616]/75 mt-3 leading-relaxed flex-1">{d.blurb}</p>
                <span className="font-sans font-bold text-[11px] uppercase tracking-[0.14em] text-[#161616] mt-4 inline-flex items-center gap-1.5">
                  Open it <span className="group-hover:translate-x-1 transition-transform" aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bespoke ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">Beyond the doors // Built to spec</span>
          <h2 className="font-display italic font-extrabold text-3xl md:text-4xl text-[#FBF6EA] mt-3 leading-[1.05] max-w-2xl">
            When you need more than a productized door.
          </h2>
          <p className="font-body text-[14px] text-[#FBF6EA]/70 mt-3 max-w-2xl leading-relaxed">
            Custom software, a tool only your industry has, a store, or a system of agents. Same operator, same fixed
            scope, and you own all of it.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {BESPOKE.map((b) => (
              <div key={b.name} className="rounded-2xl border-2 border-[#FBF6EA]/15 bg-[#1F1F1F] p-5">
                <span className="text-2xl leading-none" aria-hidden>{b.icon}</span>
                <h3 className="font-display font-extrabold text-[17px] text-[#FBF6EA] mt-2.5">{b.name}</h3>
                <p className="font-body text-[12.5px] text-[#FBF6EA]/70 mt-1.5 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-block border-2 border-[#161616] bg-[#F5B700] text-[#161616] rounded-full px-7 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#000000] hover:-translate-y-0.5 transition-all"
            >
              Scope a custom build
            </Link>
            <Link
              href="/work"
              className="inline-flex items-center px-2 py-3.5 font-sans font-bold text-[11px] uppercase tracking-[0.14em] text-[#F5B700] hover:text-[#FBF6EA] transition-colors"
            >
              See what we have shipped →
            </Link>
          </div>
        </section>

        {/* ── How we engage ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            How we engage // One operator, no handoffs
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            You pay for outcomes, not hours.
          </h2>
          <div className="grid sm:grid-cols-3 gap-5 mt-10">
            {[
              ['Fixed scope, fixed quote', 'You see the full price and timeline before any work begins. No hourly billing, no surprise invoices.'],
              ['Shipped end to end', 'One operator-engineer who has built the same thing dozens of times. No junior handoffs, no strategy decks that never become products.'],
              ['You own it outright', 'The repo, the domain, the accounts, and every credential are yours on launch day. Keep us on a retainer or walk. No lock-in.'],
            ].map(([t, d]) => (
              <div key={t} className="border-2 border-[#161616] bg-white rounded-2xl shadow-[5px_5px_0_0_#161616] p-6">
                <h3 className="font-display font-extrabold text-lg leading-tight">{t}</h3>
                <p className="font-body text-[13px] text-[#161616]/75 mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <p className="font-body text-[13px] text-[#161616]/70 mt-6">
            The full engagement model lives on{' '}
            <Link href="/work-with-us" className="font-bold text-[#1E50C8] underline underline-offset-4 hover:text-[#161616]">How It Works</Link>.
          </p>
        </section>

        {/* ── FAQ ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase text-center">
            Straight answers // No sales call required
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] text-center">
            Questions, answered plainly.
          </h2>
          <div className="mt-10 max-w-3xl mx-auto space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border-2 border-[#161616] bg-white p-5 open:shadow-[4px_4px_0_0_#F5B700] transition-shadow">
                <summary className="font-display text-lg font-bold cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="flex-shrink-0 text-[#C4160B] transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-[#5c554a] leading-relaxed font-body">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Close ── */}
        <section className="relative halftone-bg border-2 border-[#161616] rounded-2xl bg-[#F5B700] p-10 md:p-14 text-center overflow-hidden">
          <div className="relative">
            <h2 className="font-display italic font-extrabold text-3xl md:text-5xl leading-[1.02]">
              Pick a door. It opens free.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/80 mt-4 max-w-xl mx-auto leading-relaxed">
              Enter your business once and tour a working website, an AI receptionist, and a command center in about
              twenty seconds. No card, no meeting.
            </p>
            <Link
              href="/demos"
              className="mt-7 inline-block border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-9 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
            >
              Forge my free demos →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
