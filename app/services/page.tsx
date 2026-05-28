import Link from 'next/link';
import StaticBackground from '@/components/StaticBackground';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { services } from '@/data/services';

export const metadata = buildMetadata({
  title: 'Services',
  description:
    'AI products, voice agents, full-stack apps, business automation, brand strategy, and generative tech. Built end to end by Modern Mustard Seed.',
  path: '/services',
});

const servicesFaq = [
  {
    q: 'What services does Modern Mustard Seed offer?',
    a: 'Four lines of work: custom apps and web software, specialty AI tools tailored to a specific industry, brand and marketing sites, and agentic systems with multi-agent workflows and voice agents. Every service is shipped end to end by Sarah Scarano, the founder and sole engineer.',
  },
  {
    q: 'Do you build mobile apps as well as web apps?',
    a: 'Yes. Mobile apps for iOS and Android are built in one codebase using Expo and React Native. The same engagement structure applies as for web apps.',
  },
  {
    q: 'What is a specialty AI tool?',
    a: 'An industry-specific software tool that replaces an expensive recurring workflow. Examples: a FSBO command center that replaces a real estate agent commission, a deal analyzer that cuts investment evaluation from 2 hours to 90 seconds, a real estate staging tool that finishes in under a minute. Specialty AI tools turn $3K service line items into $99 subscriptions.',
  },
  {
    q: 'Can you handle the brand and the website together?',
    a: 'Yes. Brand and marketing sites is one of the four lines of work. Logo, color, type, voice, copy, animation, structured data, and launch assets are all included. The deliverable looks like the brand you are trying to be, not the brand you were.',
  },
  {
    q: 'What is an agentic system?',
    a: 'A multi-agent workflow that replaces the human glue between disconnected tools. Modern Mustard Seed uses Trigger.dev for orchestration, Anthropic Claude for reasoning, and custom agents tuned for the specific operation. Voice agents are added when the workflow is phone-driven.',
  },
  {
    q: 'Which industries have you built specialty AI tools for?',
    a: 'Real estate, real estate investing, design, content production, legal, healthcare intake, and contractor estimating, among others. The pattern is industry-agnostic: pick the friction, build the tool that removes it.',
  },
];

export default function ServicesPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Services', url: '/services' },
          ]),
          ...services.map((s) => serviceJsonLd({ name: s.title, description: s.description })),
          faqJsonLd(servicesFaq),
        ]}
      />
      <StaticBackground />

      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
              Services
            </span>
            <h1 className="font-sans text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6">
              What We <span className="text-gradient-mustard">Build</span>
            </h1>
            <p className="text-white/55 text-lg font-body font-light leading-relaxed max-w-2xl mx-auto">
              Six lines of work. Every one shipped end to end by an operator-engineer who has built the same thing dozens of times. No handoffs, no strategy decks that never become products.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {services.map((service) => (
              <article
                key={service.slug}
                id={service.slug}
                className="glass-card p-8 md:p-10 hover:border-mustard-500/20 transition-all duration-500"
              >
                <div className="text-3xl mb-5">{service.icon}</div>
                <h2 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight mb-4">
                  {service.title}
                </h2>
                <p className="text-white/55 text-base font-body font-light leading-7 mb-6">
                  {service.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold block mb-3">
                      Outcomes
                    </span>
                    <ul className="space-y-2">
                      {service.outcomes.map((o) => (
                        <li
                          key={o}
                          className="flex items-center gap-2 text-sm text-white/60 font-mono"
                        >
                          <div className="w-1 h-1 rounded-full bg-mustard-500/60" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold block mb-3">
                      Ideal for
                    </span>
                    <p className="text-sm text-white/55 font-body italic leading-relaxed">
                      {service.ideal}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/work-with-us"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(255,107,53,0.2)] transition-all"
            >
              See How We Engage
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
