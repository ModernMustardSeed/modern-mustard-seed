import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { industries } from '@/data/industries';
import PopPageHero from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: 'Industries We Build For',
  description:
    'Custom agentic tools, apps, and sites for real estate investors, real estate agents, service businesses, DTC and apparel brands, solopreneurs, and consultants. Shipped in weeks, not months.',
  path: '/for',
});

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE.url}/for#collection`,
  url: `${SITE.url}/for`,
  name: 'Industries Modern Mustard Seed Builds For',
  description:
    'Specialty agentic tools, apps, and sites for six core industries. Each industry page documents what we build, the real receipts, and how an engagement in that trade is scoped.',
  isPartOf: { '@id': `${SITE.url}/#website` },
  hasPart: [
    ...industries.map((i) => ({
      '@type': 'WebPage',
      name: i.metaTitle,
      url: `${SITE.url}/for/${i.slug}`,
      description: i.metaDescription,
    })),
    {
      '@type': 'WebPage',
      name: 'Agentic Systems for Restaurants. Phone Ordering and Missed-Call Revenue.',
      url: `${SITE.url}/for/restaurants`,
      description:
        'voice agents for restaurants that take phone orders, book tables, and save the dinner rush from voicemail. Integrates with Toast, Square, and Clover.',
    },
    {
      '@type': 'WebPage',
      name: 'Websites, Owner Portals and Marketing Systems for Home Builders and Contractors',
      url: `${SITE.url}/for/contractors`,
      description:
        'Websites Google and ChatGPT recommend, an owner portal for every build, and a studio that answers every lead and posts crew photos. Built for home builders and contractors.',
    },
    {
      '@type': 'WebPage',
      name: 'Websites, Booking and Agentic Front Desks for Health Practices',
      url: `${SITE.url}/for/health`,
      description:
        'Websites Google and ChatGPT recommend, online booking, and a voice or text front desk that answers every call. Built for optometrists, dentists, med spas, clinics and therapists.',
    },
    {
      '@type': 'WebPage',
      name: 'Wedding Websites, Guest Apps and Planners for Venues, Planners and Photographers',
      url: `${SITE.url}/for/weddings`,
      description:
        'A wedding website, a guest app and a couple’s planner on one guest list, built with the venue name, photos and weekend.',
    },
  ],
};

const IND_ALT = 'Painting: Mr. Mustard in a boater hat presents miniature businesses under glass bell jars, a bakery, a barber shop, a garage and a construction site, in a World’s Fair hall inside the tower';

export default function ForIndex() {
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Industries', url: '/for' },
          ]),
        ]}
      />
      <div className="relative min-h-screen bg-[#f6efe0] text-[#14110c] overflow-x-clip">
        <PopPageHero
          eyebrow={<span>Industries</span>}
          title={<>Built for the work you{' '}<em>actually do</em></>}
          issue={{ no: 'No.3', lines: ['Industries', 'Built per trade'] }}
          art={{ src: '/art/pages/industries', alt: IND_ALT, caption: 'Your street, your trade' }}
          sticker="Open!"
          mascot={{ bubble: 'Which one is yours?' }}
        >
          <p>
            Generic automation agencies pitch generic builds. We document exactly what gets built per industry, the case studies that anchor it, and what it costs.
          </p>
        </PopPageHero>
      <div className="relative pt-14 md:pt-20 pb-24">
        <div className="relative max-w-6xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
            {industries.map((i) => (
              <Link
                key={i.slug}
                href={`/for/${i.slug}`}
                className="pop-card p-8 md:p-10 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#14110c] transition-all duration-300 group"
              >
                <span className="text-[10px] uppercase tracking-[0.35em] text-[#8f1d22] font-mono font-bold mb-4 block">
                  {i.eyebrow}
                </span>
                <h2 className="font-display text-xl md:text-2xl font-black text-[#14110c] tracking-tight mb-4">
                  {i.name}
                </h2>
                <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-5">
                  {i.lede.split('. ').slice(0, 2).join('. ')}.
                </p>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#8f1d22] group-hover:text-[#8f1d22] transition-colors">
                  Read the playbook
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}

            <Link
              href="/for/restaurants"
              className="pop-card p-8 md:p-10 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#14110c] transition-all duration-300 group"
            >
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#8f1d22] font-mono font-bold mb-4 block">
                Agentic Systems for Restaurants
              </span>
              <h2 className="font-display text-xl md:text-2xl font-black text-[#14110c] tracking-tight mb-4">
                Restaurants
              </h2>
              <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-5">
                A voice agent that takes phone orders, books tables, and saves the dinner rush from voicemail. Fires orders to Toast, Square, or Clover, plus a commission-free ordering page.
              </p>
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#8f1d22] group-hover:text-[#8f1d22] transition-colors">
                Read the playbook
                <span aria-hidden="true">→</span>
              </span>
            </Link>

            <Link
              href="/for/contractors"
              className="pop-card p-8 md:p-10 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#14110c] transition-all duration-300 group"
            >
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#8f1d22] font-mono font-bold mb-4 block">
                Websites and Systems for Builders
              </span>
              <h2 className="font-display text-xl md:text-2xl font-black text-[#14110c] tracking-tight mb-4">
                Contractors and Construction
              </h2>
              <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-5">
                A website Google and ChatGPT recommend, an owner portal your clients check every Friday, and a studio that answers every lead and posts your crew photos.
              </p>
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#8f1d22] group-hover:text-[#8f1d22] transition-colors">
                Read the playbook
                <span aria-hidden="true">→</span>
              </span>
            </Link>

            <Link
              href="/for/health"
              className="pop-card p-8 md:p-10 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#14110c] transition-all duration-300 group"
            >
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#8f1d22] font-mono font-bold mb-4 block">
                Websites and Front Desks for Practices
              </span>
              <h2 className="font-display text-xl md:text-2xl font-black text-[#14110c] tracking-tight mb-4">
                Health Practices
              </h2>
              <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-5">
                Optometrists, dentists, med spas, clinics and therapists: a site patients choose, booking that works at midnight, and a front desk that answers every call.
              </p>
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#8f1d22] group-hover:text-[#8f1d22] transition-colors">
                Read the playbook
                <span aria-hidden="true">→</span>
              </span>
            </Link>

            <Link
              href="/for/weddings"
              className="pop-card p-8 md:p-10 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#0d0d0d] transition-all duration-300 group"
            >
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#c8201a] font-mono font-bold mb-4 block">
                Websites, Guest Apps and Planners
              </span>
              <h2 className="font-display text-xl md:text-2xl font-black text-[#0d0d0d] tracking-tight mb-4">
                Wedding Venues, Planners and Photographers
              </h2>
              <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-5">
                Give every couple the whole weekend: a wedding website, a guest app and a planner on one guest list, with your venue’s name on every one.
              </p>
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#c8201a] group-hover:text-[#d0241b] transition-colors">
                Read the playbook
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/audit"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold rounded-full border-2 border-[#14110c] shadow-[4px_4px_0_0_#14110c] hover:-translate-y-0.5 transition-all text-center text-[#14110c] bg-[#f5b700]"
            >
              Not sure which fits? Run the Bottleneck Breaker.
            </Link>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
