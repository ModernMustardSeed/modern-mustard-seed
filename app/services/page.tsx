import Link from 'next/link';
import StaticBackground from '@/components/StaticBackground';
import { JsonLd, breadcrumbJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { services } from '@/data/services';

export const metadata = buildMetadata({
  title: 'Services',
  description:
    'AI products, voice agents, full-stack apps, business automation, brand strategy, and generative tech. Built end to end by Modern Mustard Seed.',
  path: '/services',
});

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
        ]}
      />
      <StaticBackground />

      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
              Services
            </span>
            <h1 className="font-sans text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
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
                <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-4">
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
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(200,164,21,0.2)] transition-all"
            >
              See Pricing &amp; Packages
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
