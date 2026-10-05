import Link from '@/components/AttributionLink';
import { notFound } from 'next/navigation';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, faqJsonLd, breadcrumbJsonLd, serviceJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { MONTANA_CITIES, getCity, cityFaqs } from '@/data/montana-cities';

import PopPageHero, { pop } from '@/components/pop/PopPageHero';

// Five service areas, one Kalispell business. Preserve each town's local context.
export const dynamicParams = false;

export function generateStaticParams() {
  return MONTANA_CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) return buildMetadata({ noindex: true });
  return buildMetadata({
    title: `Website Design in ${city.name}, MT`,
    description: `Design-led websites, voice agents, and custom software for ${city.name} businesses. Built in Kalispell, Montana, by a boutique design and agentic systems studio.`,
    path: `/montana/${city.slug}`,
  });
}

const MT_ALT = 'Painting: the Mustard family on a classic wooden runabout on the clear water of Flathead Lake, colored stones below, cherry orchards on the hillside and the peaks of Glacier National Park behind';

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) notFound();

  const faqs = cityFaqs(city);
  const others = MONTANA_CITIES.filter((c) => c.slug !== city.slug);

  const path = `/montana/${city.slug}`;
  const description = `Agentic website design, voice agents, automation and custom software for ${city.name} businesses, built by Modern Mustard Seed in Kalispell, Montana.`;
  const localForCity = serviceJsonLd({
    path, name: `Agentic websites and business systems for ${city.name}`, description,
    areaServed: [{ '@type': 'City', name: city.name, containedInPlace: { '@type': 'State', name: 'Montana' } }],
  });

  return (
    <div className="bg-[#fbf5ea] text-[#0b3b44]">
      <JsonLd
        data={[
          localForCity,
          webPageJsonLd({ path, name: `Agentic websites in ${city.name}`, description }),
          faqJsonLd(faqs),
          // breadcrumbJsonLd prepends SITE.url itself, so these are PATHS.
          breadcrumbJsonLd([
            { name: 'Montana', url: '/montana' },
            { name: city.name, url: `/montana/${city.slug}` },
          ]),
        ]}
      />

      <PopPageHero
        eyebrow={<span>▲ {city.nameWithState}</span>}
        title={<>Websites and a phone that always answers, for {city.name} businesses.</>}
        art={{ src: '/art/riviera/montana', alt: MT_ALT, caption: `Hello, ${city.name}` }}
        sticker="Howdy!"
      >
        <p>
          Modern Mustard Seed is a boutique design and agentic systems studio based in Kalispell, serving {city.name} and clients nationwide. We design and build websites and brand, custom software, and voice agents. You own the code and accounts.
        </p>
        <div className={pop.actions}>
          <Link href="/book" className={pop.cta}>
            See the Work
          </Link>
          <a href={`tel:${SITE.phoneE164}`} className={pop.ctaAlt}>
            Call {SITE.phone}
          </a>
        </div>
        <p className={pop.note}>
          Our own line is answered by the voice agent we sell. Call it at midnight and try to stump it.
        </p>
      </PopPageHero>

      {/* The local truth card. This is what makes the page about THIS town. */}
      <section className="border-b-2 border-[#0b3b44] bg-[#fbf5ea]">
        <div className="max-w-6xl mx-auto px-6 pb-12">
          <div className="max-w-3xl rounded-2xl border-[3px] border-[#0b3b44] bg-[#0b3b44] p-6 md:p-8 shadow-[9px_9px_0_0_#f5b700]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#f5b700]">
              Why the phone gets missed here
            </p>
            <p className="mt-4 font-body text-[15px] text-[#fbf5ea]/85 leading-relaxed">{city.phoneProblem}</p>
          </div>
        </div>
      </section>

      {/* ─────────────── THE TOWN ─────────────── */}
      <section className="border-b-2 border-[#0b3b44] bg-[#f5b700]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="font-display text-3xl font-extrabold">A front door connected to the work behind it.</h2>
          <p className="mt-4 max-w-3xl leading-relaxed">{city.slug === 'kalispell'
            ? 'A Kalispell contractor needs more than a gallery of finished jobs. The website should explain the work, qualify a request by service area and job type, and put the enquiry where the crew can act on it. That is a concrete brief for an agentic website and a connected workflow.'
            : `For ${city.name} businesses, we scope the system around the enquiries you actually receive. Booking rules, service boundaries and human follow-up come before adding an agentic feature.`}</p>
          <nav aria-label="Website and agentic systems services" className="mt-6 flex flex-wrap gap-x-6 gap-y-3 font-bold underline underline-offset-4">
            <Link href="/agentic-websites">How our agentic websites work</Link>
            <Link href="/talking-website">The Talking Website</Link>
            <Link href="/best/ways-to-get-a-website-montana-small-business">Website options for a Montana business, compared</Link>
            <Link href="/voice-agents">Voice agents</Link>
            <Link href="/services">Automation and custom software</Link>
            <Link href="/work">See the builds</Link>
            <Link href="/resources">Answer engine field notes</Link>
          </nav>
        </div>
      </section>

      <section className="border-b-2 border-[#0b3b44] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20 grid lg:grid-cols-2 gap-10 lg:gap-14">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">
              We Know The Ground
            </p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
              {city.name} is {city.locale}.
            </h2>
            <p className="mt-5 font-body text-[17px] text-[#3d382e] leading-relaxed">{city.economy}</p>
            <p className="mt-4 font-body text-[15px] text-[#0b3b44]/70 leading-relaxed">{city.season}</p>
            <p className="mt-6 font-body text-[15px] text-[#0b3b44]/70">
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
                  className="flex items-start gap-3 rounded-xl border-2 border-[#0b3b44] bg-[#fbf5ea] p-4 shadow-[3px_3px_0_0_#0b3b44]"
                >
                  <span
                    aria-hidden
                    className="mt-[2px] shrink-0 grid place-items-center h-5 w-5 rounded-md bg-[#f5b700] border-2 border-[#0b3b44] text-[11px] font-bold leading-none"
                  >
                    ✓
                  </span>
                  <span className="font-body text-[15px] text-[#0b3b44]/85">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─────────────── WHAT YOU GET ─────────────── */}
      <section className="border-b-2 border-[#0b3b44] bg-[#f5b700]">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
            What we build for {city.name}.
          </h2>
          <p className="mt-3 font-body text-[16px] text-[#0b3b44]/80 max-w-2xl">
            Quoted around your business, your goals and the scope of the work.
          </p>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              {
                t: 'The Website',
                b: 'Designed from scratch for your business, not filled into a template. Lead capture, funnels, and SEO built in. You own the code, the domain, and every account.',
                p: 'Request a quote',
                href: '/websites',
              },
              {
                t: 'The Voice Agent',
                b: 'Answers as your business, day or night, books the job, flags the emergencies, and texts you the summary. Trained on your services, your hours, and your service area.',
                p: 'Request a quote',
                href: '/voice-agents',
              },
            ].map((c) => (
              <Link
                key={c.t}
                href={c.href}
                className="flex flex-col rounded-2xl border-2 border-[#0b3b44] bg-white p-6 shadow-[5px_5px_0_0_#0b3b44] transition-transform hover:-translate-y-1"
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
      <section className="border-b-2 border-[#0b3b44]">
        <div className="max-w-4xl mx-auto px-6 py-14 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">Straight Answers</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
            What {city.name} owners ask us first.
          </h2>
          <div className="mt-8 space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border-2 border-[#0b3b44] bg-white p-5 shadow-[4px_4px_0_0_#0b3b44]"
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
      <section className="border-b-2 border-[#0b3b44] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">Also In The Valley</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/montana/${o.slug}`}
                className="rounded-full border-2 border-[#0b3b44] bg-[#fbf5ea] px-5 py-2.5 font-sans font-bold text-sm shadow-[3px_3px_0_0_#0b3b44] transition-transform hover:-translate-y-0.5"
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
            Built for your {city.name} business.
          </h2>
          <p className="mt-4 font-body text-lg text-[#3d382e]">
            Tell us the business and what it has to do. Sarah reads every inquiry herself and answers inside one business day.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/book"
              className="rounded-full border-2 border-[#0b3b44] bg-[#f5b700] px-9 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#0b3b44] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0b3b44]"
            >
              Begin An Engagement
            </Link>
            <a
              href={`tel:${SITE.phoneE164}`}
              className="rounded-full border-2 border-[#0b3b44] bg-white px-9 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#0b3b44] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0b3b44]"
            >
              Call {SITE.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
