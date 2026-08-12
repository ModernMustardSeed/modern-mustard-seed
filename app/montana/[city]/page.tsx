import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, faqJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { MONTANA_CITIES, getCity, cityFaqs } from '@/data/montana-cities';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';

/**
 * THE LOCAL FLEET: /montana/[city].
 *
 * The site had 116 indexable URLs and none of them targeted a place, so every
 * page was competing nationally for terms a Kalispell studio cannot win. These
 * pages compete where we can actually finish first.
 *
 * The schema here is the point as much as the copy: each page emits its OWN
 * LocalBusiness with that city's geo and areaServed, so "web designer near me"
 * in Whitefish resolves to a page that is genuinely about Whitefish.
 *
 * Design language is inherited from the trade fleet (/voice-agents/[trade]):
 * halftone hero, pop-cards with 2px ink borders and hard offset shadows, gold
 * CTAs. Gold-on-cream small text MUST be #8f6600, never #F5B700 (fails AA).
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return MONTANA_CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) return buildMetadata({ noindex: true });
  return buildMetadata({
    title: `Web Design and Voice Agents in ${city.nameWithState}`,
    description: `Custom websites and 24/7 AI phone answering for ${city.name}, Montana businesses, built by a studio in the Flathead Valley. See three working demos free before you pay anything. Call ${SITE.phone}.`,
    path: `/montana/${city.slug}`,
  });
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) notFound();

  const faqs = cityFaqs(city);
  const others = MONTANA_CITIES.filter((c) => c.slug !== city.slug);

  /**
   * A city-scoped LocalBusiness. Distinct @id per city so the five pages do not
   * collapse into one entity, with geo pointed at the city itself.
   */
  const localForCity = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE.url}/montana/${city.slug}#localbusiness`,
    name: `${SITE.name} (serving ${city.name}, Montana)`,
    url: `${SITE.url}/montana/${city.slug}`,
    description: `Website design, voice agents, and business automation for ${city.name}, Montana businesses. Built in the Flathead Valley.`,
    telephone: SITE.phoneE164,
    email: SITE.email,
    image: `${SITE.url}/opengraph-image`,
    priceRange: '$$',
    parentOrganization: { '@id': `${SITE.url}/#organization` },
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      postalCode: SITE.postalCode,
      addressCountry: SITE.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: city.lat, longitude: city.lng },
    areaServed: [
      { '@type': 'City', name: city.name },
      ...city.alsoServes.map((n) => ({ '@type': 'Place', name: n })),
      { '@type': 'AdministrativeArea', name: 'Flathead Valley' },
    ],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
  };

  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          localForCity,
          faqJsonLd(faqs),
          // breadcrumbJsonLd prepends SITE.url itself, so these are PATHS.
          breadcrumbJsonLd([
            { name: 'Montana', url: '/montana' },
            { name: city.name, url: `/montana/${city.slug}` },
          ]),
        ]}
      />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative overflow-hidden border-b-2 border-[#161616] halftone-bg">
        <div className="relative z-[2] max-w-6xl mx-auto px-6 pt-28 md:pt-36 pb-14 md:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-start">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] font-bold bg-white text-[#C4160B] border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">
                ▲ {city.nameWithState}
              </span>
              <h1 className="mt-6 font-display font-extrabold leading-[0.98] tracking-tight text-4xl md:text-5xl lg:text-[3.9rem]">
                Websites and a phone that always answers, for {city.name} businesses.
              </h1>
              <p className="mt-6 max-w-xl text-lg md:text-xl text-[#3d382e] font-body leading-relaxed">
                We are a studio in the Flathead Valley, {city.slug === 'kalispell' ? 'right here in Kalispell' : `a short drive from ${city.name}`}. We
                build the website and the 24/7 voice agent behind it, then hand you the keys. You own everything.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/demos"
                  className="rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
                >
                  See Three Demos Free
                </Link>
                <a
                  href={`tel:${SITE.phoneE164}`}
                  className="rounded-full border-2 border-[#161616] bg-white px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
                >
                  Call {SITE.phone}
                </a>
              </div>
              <p className="mt-6 font-body text-[15px] text-[#161616]/70">
                Our own line is answered by the voice agent we sell. Call it at midnight and try to stump it.
              </p>
            </div>

            {/* The local truth card. This is what makes the page about THIS town. */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border-[3px] border-[#161616] bg-[#161616] p-6 shadow-[9px_9px_0_0_#F5B700]">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#F5B700]">
                  Why the phone gets missed here
                </p>
                <p className="mt-4 font-body text-[15px] text-[#FBF6EA]/85 leading-relaxed">{city.phoneProblem}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── THE TOWN ─────────────── */}
      <section className="border-b-2 border-[#161616] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20 grid lg:grid-cols-2 gap-10 lg:gap-14">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">
              We Know The Ground
            </p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
              {city.name} is {city.locale}.
            </h2>
            <p className="mt-5 font-body text-[17px] text-[#3d382e] leading-relaxed">{city.economy}</p>
            <p className="mt-4 font-body text-[15px] text-[#161616]/70 leading-relaxed">{city.season}</p>
            <p className="mt-6 font-body text-[15px] text-[#161616]/70">
              We also serve {city.alsoServes.join(', ')}.
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">
              Fits Best
            </p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
              Who this helps most in {city.name}.
            </h2>
            <ul className="mt-6 space-y-3">
              {city.fits.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 rounded-xl border-2 border-[#161616] bg-[#FBF6EA] p-4 shadow-[3px_3px_0_0_#161616]"
                >
                  <span
                    aria-hidden
                    className="mt-[2px] shrink-0 grid place-items-center h-5 w-5 rounded-md bg-[#F5B700] border-2 border-[#161616] text-[11px] font-bold leading-none"
                  >
                    ✓
                  </span>
                  <span className="font-body text-[15px] text-[#161616]/85">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─────────────── WHAT YOU GET ─────────────── */}
      <section className="border-b-2 border-[#161616] bg-[#F5B700]">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
            What we build for {city.name}.
          </h2>
          <p className="mt-3 font-body text-[16px] text-[#161616]/80 max-w-2xl">
            Same prices everywhere. We do not quote by zip code.
          </p>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              {
                t: 'The Website',
                b: 'Designed from scratch for your business, not filled into a template. Lead capture, funnels, SEO, and the command center free. You own the code, the domain, and every account.',
                p: `${formatUsd(DEMO_PRODUCTS.site.setupCents)} setup, ${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo`,
                href: '/websites',
              },
              {
                t: 'The Voice Agent',
                b: 'Answers as your business, day or night, books the job, flags the emergencies, and texts you the summary. Trained on your services, your hours, and your service area.',
                p: `${formatUsd(DEMO_PRODUCTS.voice.setupCents)} setup, ${formatUsd(DEMO_PRODUCTS.voice.monthlyCents)}/mo`,
                href: '/voice-agents',
              },
              {
                t: 'The Command Center',
                b: 'Calls, leads, customers, reviews, traffic, and money on one board, with an AI that reads it back to you. Free with the website or the voice agent.',
                p: 'Free with either',
                href: '/command-center',
              },
            ].map((c) => (
              <Link
                key={c.t}
                href={c.href}
                className="flex flex-col rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] transition-transform hover:-translate-y-1"
              >
                <h3 className="font-display text-xl font-extrabold">{c.t}</h3>
                <p className="mt-2 font-body text-sm text-[#3d382e] leading-relaxed">{c.b}</p>
                <p className="mt-auto pt-5 font-mono text-[12px] font-bold text-[#8f6600]">{c.p}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── FAQ ─────────────── */}
      <section className="border-b-2 border-[#161616]">
        <div className="max-w-4xl mx-auto px-6 py-14 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">Straight Answers</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
            What {city.name} owners ask us first.
          </h2>
          <div className="mt-8 space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616]"
              >
                <summary className="cursor-pointer list-none font-sans font-bold text-[15px] flex items-start justify-between gap-4">
                  {f.q}
                  <span className="font-mono text-[#8f6600] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 font-body text-sm text-[#3d382e] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── NEARBY ─────────────── */}
      <section className="border-b-2 border-[#161616] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">Also In The Valley</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/montana/${o.slug}`}
                className="rounded-full border-2 border-[#161616] bg-[#FBF6EA] px-5 py-2.5 font-sans font-bold text-sm shadow-[3px_3px_0_0_#161616] transition-transform hover:-translate-y-0.5"
              >
                {o.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── CLOSE ─────────────── */}
      <section className="halftone-bg">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold leading-[1.02]">
            See it built for your {city.name} business, free.
          </h2>
          <p className="mt-4 font-body text-lg text-[#3d382e]">
            Three working demos, the first two open right away and the whole suite within the hour. No card and no meeting.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/demos"
              className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-9 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
            >
              Forge My Demos
            </Link>
            <a
              href={`tel:${SITE.phoneE164}`}
              className="rounded-full border-2 border-[#161616] bg-white px-9 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
            >
              Call {SITE.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
