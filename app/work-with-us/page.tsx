import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import MrMustardHeroCTA from '@/components/MrMustardHeroCTA';
import PortalShowcase from '@/components/PortalShowcase';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { pricingFaq } from '@/data/pricing';
import { bookingUrl } from '@/data/socials';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';

export const metadata = buildMetadata({
  title: 'How We Work',
  description:
    'How Modern Mustard Seed works: try any productized door free (a website, an AI receptionist, a command center, and more) then keep it monthly, or scope a fully custom build. Fixed scope, fixed timeline, and you own everything on launch day.',
  path: '/work-with-us',
});

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Discovery',
    body:
      'A free 30-minute call. You tell us what you are trying to build or fix. We tell you whether we are a fit and what the right engagement looks like.',
  },
  {
    number: '02',
    title: 'Scope & Quote',
    body:
      'Within 48 hours we send a written scope with a fixed timeline and a fixed quote. No decks, no surprises, no hourly billing. You see the full cost before anything starts.',
  },
  {
    number: '03',
    title: 'Build & Ship',
    body:
      'We build it. Weekly check-ins, daily demos when it helps, iteration baked in. The work is not done until it is right by you. No handoffs.',
  },
  {
    number: '04',
    title: 'Hand Off',
    body:
      'You get the repo, the deploys, the docs, every credential. The build is yours from day one. The relationship continues only if you want it to.',
  },
];

const PRINCIPLES = [
  {
    title: 'Fixed scope, fixed timeline',
    body: 'You see the full cost and the full delivery date before any work begins. No hourly drift.',
  },
  {
    title: 'We iterate until it is right',
    body: 'Revisions are part of every engagement. We do not stop when a contract says so. We stop when you are happy.',
  },
  {
    title: 'You own everything',
    body: 'Code, deploys, credentials, accounts. All transferred from day one. No vendor lock-in.',
  },
  {
    title: 'One operator, end to end',
    body: 'No handoffs to junior staff. No coordination tax. The person who scopes it is the person who ships it.',
  },
  {
    title: 'Payment plans, on request',
    body: 'Most engagements can be split into milestones that fit your situation. We structure it together on the call.',
  },
  {
    title: 'Stewardship over extraction',
    body: 'We treat your business like it has to last. Decisions get made for the long game, not the demo.',
  },
];

export default function WorkWithUsPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'How We Work', url: '/work-with-us' },
          ]),
          faqJsonLd(pricingFaq),
        ]}
      />

      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative">
          {/* Header */}
          <div className="max-w-5xl mx-auto px-6 md:px-8 text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-6 block">
              How We Work
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.1] mb-6">
              Two ways in.{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                One standard.
              </span>
            </h1>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto mb-3">
              Try a productized door free and keep it monthly, or scope a fully custom build. Either way it is a fixed scope, a fixed timeline, and a quote you see before anyone writes a line of code. No hourly billing, no surprise scope.
            </p>
            <p className="text-[#161616]/70 text-sm font-body italic">
              Not sure which fits? We quote after a free discovery call.
            </p>
            <Link
              href="/sample-proposal"
              className="inline-block mt-5 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              See a sample proposal →
            </Link>
          </div>

          {/* Two ways in: productized doors, or a bespoke build */}
          <section className="max-w-6xl mx-auto px-6 md:px-8">
            <div className="grid lg:grid-cols-2 gap-6 items-stretch">
              {/* Path one: productized */}
              <div className="pop-card p-8 md:p-9 flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Path one // Forge it free</span>
                <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mt-2.5 leading-[1.05]">
                  Productized doors, tried free before you pay.
                </h2>
                <p className="text-[#3a3733] text-sm font-body leading-6 mt-3">
                  Each one opens with a real working demo, built for your business in about twenty seconds. Keep what
                  you love, month to month, cancel anytime, no trials. Live within a week.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    ['🌐', 'Website', `${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo + ${formatUsd(DEMO_PRODUCTS.site.setupCents)} setup`],
                    ['🎙', 'AI receptionist', `${formatUsd(DEMO_PRODUCTS.voice.monthlyCents)}/mo + ${formatUsd(DEMO_PRODUCTS.voice.setupCents)} setup`],
                    ['⚙', 'Command center', 'Free with either'],
                    ['✦', 'The whole system', `${formatUsd(DEMO_BUNDLE.monthlyCents)}/mo + ${formatUsd(DEMO_BUNDLE.setupCents)} setup`],
                  ].map(([icon, name, price]) => (
                    <li key={name} className="flex items-center justify-between gap-3 border-b border-dashed border-[#161616]/15 pb-2.5 last:border-0">
                      <span className="font-sans font-bold text-[14px] text-[#161616]"><span aria-hidden="true">{icon}</span> {name}</span>
                      <span className="font-mono font-bold text-[12.5px] text-[#8f6600] text-right whitespace-nowrap">{price}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[#161616]/70 text-[12.5px] font-body mt-4">
                  Broadcast, Pictures, Press, the GEO Desk, Launch, and more each open free too.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/demos"
                    className="text-center px-6 py-3.5 text-[11px] uppercase tracking-[0.16em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                  >
                    Forge free demos →
                  </Link>
                  <Link
                    href="/services"
                    className="text-center px-6 py-3.5 text-[11px] uppercase tracking-[0.16em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                  >
                    See every door
                  </Link>
                </div>
              </div>

              {/* Path two: bespoke */}
              <div className="pop-card-yellow p-8 md:p-9 flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616] font-mono font-bold">Path two // Built to spec</span>
                <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mt-2.5 leading-[1.05]">
                  Bespoke builds, quoted after a free call.
                </h2>
                <p className="text-[#161616]/80 text-sm font-body leading-6 mt-3">
                  When you need more than a productized door: custom software, a tool only your industry has, an online
                  store, or a system of agents. Fixed scope, fixed quote, and you own all of it.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    ['📱', 'Custom apps & software', 'Web and mobile, built end to end'],
                    ['🛠', 'Specialty AI tools', 'The $3K workflow becomes a $99 tool'],
                    ['🏪', 'Online stores', 'Headless commerce with an AI concierge'],
                    ['🤖', 'Agentic systems', 'Multi-agent workflows that run themselves'],
                  ].map(([icon, name, note]) => (
                    <li key={name} className="flex items-start gap-2.5">
                      <span aria-hidden="true" className="text-lg leading-none mt-0.5">{icon}</span>
                      <span>
                        <span className="block font-sans font-bold text-[14px] text-[#161616]">{name}</span>
                        <span className="block font-body text-[12px] text-[#161616]/70 leading-snug">{note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/book"
                  className="mt-auto pt-6 inline-block text-center px-6 py-3.5 text-[11px] uppercase tracking-[0.16em] font-sans font-extrabold text-[#F5B700] bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
                >
                  Scope a custom build →
                </Link>
              </div>
            </div>
          </section>

          {/* Process */}
          <div className="max-w-6xl mx-auto px-6 md:px-8 py-20">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-5 block">
                The process
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mb-4">
                The same four steps,{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  every time
                </span>
              </h2>
              <p className="text-[#3a3733] text-base font-body leading-relaxed">
                No new playbook per client. The repeated parts are what make the speed possible.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              {PROCESS_STEPS.map((step) => (
                <div key={step.number} className="relative pop-card p-7">
                  <span
                    className="font-display text-3xl md:text-4xl font-black text-[#F5B700] tracking-tight block mb-3"
                    style={{ WebkitTextStroke: '1.5px #161616' }}
                  >
                    {step.number}
                  </span>
                  <h3 className="font-display text-lg font-black text-[#161616] tracking-tight mb-2.5">
                    {step.title}
                  </h3>
                  <p className="text-[#3a3733] text-sm font-body leading-6">{step.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Proof: the client portal every build ships with */}
          <PortalShowcase />

          {/* Principles */}
          <div className="max-w-5xl mx-auto px-6 md:px-8 py-12">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-5 block">
                How we operate
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
                What you can count on
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PRINCIPLES.map((principle) => (
                <div key={principle.title} className="pop-card p-6">
                  <h3 className="font-display text-base font-black text-[#161616] tracking-tight mb-2">
                    {principle.title}
                  </h3>
                  <p className="text-[#3a3733] text-sm font-body leading-6">{principle.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Who this is (and is not) for */}
          <div className="max-w-5xl mx-auto px-6 md:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="pop-card-yellow p-8">
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#161616] font-mono font-bold mb-4 block">
                  Who this is for
                </span>
                <h3 className="font-display text-xl font-black text-[#161616] tracking-tight mb-4">
                  Operators who want it built right and shipped fast
                </h3>
                <ul className="space-y-2.5 text-[#161616]/80 text-sm font-body font-medium leading-6 list-disc pl-5">
                  <li>Founders with a clear vision who need a technical partner, not a strategy deck.</li>
                  <li>Small business owners who know the old way is too slow and do not have time to become AI experts.</li>
                  <li>Operators with revenue to protect who want AI on the front lines before competitors get there.</li>
                  <li>Service businesses bleeding hours to repetitive work that should already be automated.</li>
                </ul>
              </div>

              <div className="pop-card p-8">
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#161616]/45 font-mono font-bold mb-4 block">
                  Who this is not for
                </span>
                <h3 className="font-display text-xl font-black text-[#161616] tracking-tight mb-4">
                  We do not take every project, and we say no early
                </h3>
                <ul className="space-y-2.5 text-[#3a3733] text-sm font-body leading-6 list-disc pl-5">
                  <li>Anyone looking for a $300 website or a magic-button AI tool.</li>
                  <li>Founders who want endless meetings instead of a shipped build.</li>
                  <li>Projects that need 8 stakeholders to approve a button color.</li>
                  <li>Businesses chasing AI hype without a problem to solve.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-4xl mx-auto px-6 md:px-8 py-16">
            <div className="text-center mb-10">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-4 block">
                FAQ
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
                Common{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  questions
                </span>
              </h2>
            </div>
            <div className="space-y-3">
              {pricingFaq.map((item) => (
                <details key={item.q} className="pop-card p-6 group cursor-pointer">
                  <summary className="flex justify-between items-start gap-4 list-none">
                    <h3 className="font-display text-base md:text-lg font-black text-[#161616] tracking-tight">
                      {item.q}
                    </h3>
                    <span className="text-[#E0301E] text-2xl flex-shrink-0 transition-transform group-open:rotate-45 leading-none font-black">
                      +
                    </span>
                  </summary>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mt-4">{item.a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="max-w-4xl mx-auto px-6 md:px-8 py-12 text-center">
            <div className="pop-card-yellow p-10">
              <h3 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-4">
                Not sure which engagement fits?
              </h3>
              <p className="text-[#161616]/75 text-base font-body font-medium mb-6 max-w-lg mx-auto">
                Book a free call. Sarah takes every one herself, and you leave with a fit-check and a recommendation. No pressure, no decks.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/book"
                  className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.35)] hover:-translate-y-0.5 transition-all"
                >
                  Book a Free Call
                </Link>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Book a Discovery Call
                </a>
              </div>
            </div>

            {/* Or just ask him directly: voice or chat */}
            <MrMustardHeroCTA location="work-with-us" />
          </div>

          <div className="px-6 md:px-8 py-20">
            <NewsletterSignup
              headline="Get the playbooks we use in client engagements."
              subhead="One playbook per week. Free to read, free to run. The same plays we charge to execute."
            />
          </div>
        </div>
      </div>
    </>
  );
}
