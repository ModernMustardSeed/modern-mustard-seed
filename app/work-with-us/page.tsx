import Link from 'next/link';
import StaticBackground from '@/components/StaticBackground';
import PricingTable from '@/components/PricingTable';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { pricingFaq } from '@/data/pricing';
import { bookingUrl } from '@/data/socials';

export const metadata = buildMetadata({
  title: 'How We Work',
  description:
    'Four engagement structures aligned with how clients actually start: Full-Service Business Build (site + AI SDR + funnels + back office + embedded AI agents), Idea to Product, AI-Proof Your Business, and Fractional AI Partner. Fixed scope, fixed timeline, quoted per project.',
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
      <StaticBackground />

      <div className="relative pt-36 md:pt-44">
        {/* Header */}
        <div className="max-w-5xl mx-auto px-6 md:px-8 text-center mb-16">
          <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-6 block">
            How We Work
          </span>
          <h1 className="font-sans text-4xl md:text-6xl font-semibold text-white tracking-tight leading-[1.1] mb-6">
            Four ways to <span className="text-gradient-mustard">engage</span>.
          </h1>
          <p className="text-white/60 text-base md:text-lg font-body font-light leading-relaxed max-w-2xl mx-auto mb-3">
            Every engagement is a fixed scope, a fixed timeline, and a quote you see before anyone writes a line of code. No hourly billing. No surprise scope.
          </p>
          <p className="text-white/40 text-sm font-body italic">
            Pick the path that sounds like your situation. We quote after a free discovery call.
          </p>

          <div className="mt-10 max-w-2xl mx-auto px-5 py-4 border border-mustard-500/20 rounded-lg bg-mustard-500/[0.03]">
            <p className="text-white/65 text-sm font-body font-light leading-relaxed">
              <span className="text-mustard-400 font-semibold">Pricing orientation.</span>{' '}
              The free AI Audit is free. Builds range from $2,500 to $45,000+ depending on scope and complexity. Retainers from $1,500/month. The number below each engagement is the range typical for that path. Every project is quoted in writing before any work begins.
            </p>
          </div>
        </div>

        {/* Engagements */}
        <PricingTable />

        {/* Process */}
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-5 block">
              The process
            </span>
            <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
              The same four steps, <span className="text-gradient-mustard">every time</span>.
            </h2>
            <p className="text-white/55 text-base font-body font-light leading-relaxed">
              No new playbook per client. The repeated parts are what make the speed possible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {PROCESS_STEPS.map((step, i) => (
              <div
                key={step.number}
                className="relative glass-card p-7 hover:border-mustard-500/20 transition-all duration-500"
              >
                <span className="font-sans text-3xl md:text-4xl font-semibold text-gradient-mustard-subtle tracking-tight block mb-3">
                  {step.number}
                </span>
                <h3 className="font-sans text-lg font-semibold text-white tracking-tight mb-2.5">
                  {step.title}
                </h3>
                <p className="text-white/50 text-sm font-body font-light leading-6">{step.body}</p>
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-mustard-500/20" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Principles */}
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-5 block">
              How we operate
            </span>
            <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight">
              What you can count on.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: 'Fixed scope, fixed timeline.',
                body: 'You see the full cost and the full delivery date before any work begins. No hourly drift.',
              },
              {
                title: 'We iterate until it is right.',
                body: 'Revisions are part of every engagement. We do not stop when a contract says so. We stop when you are happy.',
              },
              {
                title: 'You own everything.',
                body: 'Code, deploys, credentials, accounts. All transferred from day one. No vendor lock-in.',
              },
              {
                title: 'One operator, end to end.',
                body: 'No handoffs to junior staff. No coordination tax. The person who scopes it is the person who ships it.',
              },
              {
                title: 'Payment plans, on request.',
                body: 'Most engagements can be split into milestones that fit your situation. We structure it together on the call.',
              },
              {
                title: 'Stewardship over extraction.',
                body: 'We treat your business like it has to last. Decisions get made for the long game, not the demo.',
              },
            ].map((principle) => (
              <div key={principle.title} className="glass-card p-6">
                <h3 className="font-sans text-base font-semibold text-white/95 tracking-tight mb-2">
                  {principle.title}
                </h3>
                <p className="text-white/50 text-sm font-body font-light leading-6">
                  {principle.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Who this is (and is not) for */}
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="glass-card p-8 border-mustard-500/20">
              <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-4 block">
                Who this is for
              </span>
              <h3 className="font-sans text-xl font-semibold text-white tracking-tight mb-4">
                Operators who want it built right and shipped fast.
              </h3>
              <ul className="space-y-2.5 text-white/60 text-sm font-body font-light leading-6">
                <li>Founders with a clear vision who need a technical partner, not a strategy deck.</li>
                <li>Small business owners who know the old way is too slow and do not have time to become AI experts.</li>
                <li>Operators with revenue to protect who want AI on the front lines before competitors get there.</li>
                <li>Service businesses bleeding hours to repetitive work that should already be automated.</li>
              </ul>
            </div>

            <div className="glass-card p-8 border-white/[0.08]">
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-mono font-medium mb-4 block">
                Who this is not for
              </span>
              <h3 className="font-sans text-xl font-semibold text-white tracking-tight mb-4">
                We do not take every project, and we say no early.
              </h3>
              <ul className="space-y-2.5 text-white/45 text-sm font-body font-light leading-6">
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
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-4 block">
              FAQ
            </span>
            <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Common <span className="text-gradient-mustard">questions</span>.
            </h2>
          </div>
          <div className="space-y-3">
            {pricingFaq.map((item) => (
              <details
                key={item.q}
                className="glass-card p-6 group cursor-pointer hover:border-mustard-500/20 transition-all"
              >
                <summary className="flex justify-between items-start gap-4 list-none">
                  <h3 className="font-sans text-base md:text-lg font-semibold text-white/90 tracking-tight">
                    {item.q}
                  </h3>
                  <span className="text-mustard-400 text-2xl flex-shrink-0 transition-transform group-open:rotate-45 leading-none">
                    +
                  </span>
                </summary>
                <p className="text-white/55 text-sm md:text-base font-body font-light leading-7 mt-4">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-4xl mx-auto px-6 md:px-8 py-12 text-center">
          <div className="glass-card p-10">
            <h3 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight mb-4">
              Not sure which engagement fits?
            </h3>
            <p className="text-white/55 text-base font-body font-light mb-6 max-w-lg mx-auto">
              Drop your idea on the Build Queue. Sarah reads every entry and replies within 3 business days with a fit-check and a recommendation. No pressure, no decks.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/build-queue"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(255,107,53,0.25)] transition-all"
              >
                Join the Build Queue
              </Link>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 transition-all"
              >
                Book a Discovery Call
              </a>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 py-20">
          <NewsletterSignup
            headline="Get the playbooks we use in client engagements."
            subhead="One playbook per week. Free to read, free to run. The same plays we charge to execute."
          />
        </div>
      </div>
    </>
  );
}
