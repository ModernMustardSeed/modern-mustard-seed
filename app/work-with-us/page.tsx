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
    'Four engagement structures: AI audits, voice agent launches, custom builds, and fractional partnerships. Quoted per project. Scoped before commitment.',
  path: '/work-with-us',
});

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
        <div className="max-w-5xl mx-auto px-6 md:px-8 text-center mb-12">
          <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
            How We Work
          </span>
          <h1 className="font-sans text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6">
            Four Ways to <span className="text-gradient-mustard">Engage</span>
          </h1>
          <p className="text-white/55 text-lg font-body font-light leading-relaxed max-w-2xl mx-auto mb-4">
            Every engagement is a flat fee tied to a defined deliverable and a tight timeline. No hourly billing. No surprise scope. Most engagements start with an audit, then expand into a build or a partnership.
          </p>
          <p className="text-white/35 text-sm font-mono italic">
            Scope and quote shared after a free 30-minute discovery call.
          </p>
        </div>

        <PricingTable />

        <div className="max-w-4xl mx-auto px-6 md:px-8 py-16">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-4 block">
              FAQ
            </span>
            <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Common <span className="text-gradient-mustard">Questions</span>
            </h2>
          </div>
          <div className="space-y-4">
            {pricingFaq.map((item) => (
              <details
                key={item.q}
                className="glass-card p-6 group cursor-pointer hover:border-mustard-500/20 transition-all"
              >
                <summary className="flex justify-between items-start gap-4 list-none">
                  <h3 className="font-sans text-lg font-bold text-white/90 tracking-wide">
                    {item.q}
                  </h3>
                  <span className="text-mustard-400 text-2xl flex-shrink-0 transition-transform group-open:rotate-45">
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

        <div className="max-w-4xl mx-auto px-6 md:px-8 py-12 text-center">
          <div className="glass-card p-10">
            <h3 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight mb-4">
              Not sure which engagement fits?
            </h3>
            <p className="text-white/55 text-base font-body font-light mb-6 max-w-lg mx-auto">
              Book a 30-minute discovery call. We will scope your project, recommend the right path, and send a fixed quote within 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(200,164,21,0.2)] transition-all"
              >
                Book a Discovery Call
              </a>
              <Link
                href="/audit"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 transition-all"
              >
                Start with the Free Audit
              </Link>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 py-20">
          <NewsletterSignup
            headline="Get the playbooks we use in client engagements."
            subhead="Subscribers get an AI implementation checklist and a new playbook every week."
          />
        </div>
      </div>
    </>
  );
}
