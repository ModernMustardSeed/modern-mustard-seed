import Link from '@/components/AttributionLink';
import { notFound } from 'next/navigation';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, faqJsonLd, breadcrumbJsonLd, serviceJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { MONTANA_CITIES, getCity, cityFaqs } from '@/data/montana-cities';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';

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
    title: `AI Website Design and Voice Agents in ${city.name}, Montana`,
    description: `Design-led websites, voice agents, and custom software for ${city.name} businesses. Built in Kalispell, Montana, by a boutique design and AI studio.`,
    path: `/montana/${city.slug}`,
  });
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) notFound();

  const faqs = cityFaqs(city);
  const others = MONTANA_CITIES.filter((c) => c.slug !== city.slug);

  const path = `/montana/${city.slug}`;
  const description = `AI website design, voice agents, automation and custom software for ${city.name} businesses, built by Modern Mustard Seed in Kalispell, Montana.`;
  const localForCity = serviceJsonLd({
    path, name: `AI websites and business systems for ${city.name}`, description,
    areaServed: [{ '@type': 'City', name: city.name, containedInPlace: { '@type': 'State', name: 'Montana' } }],
  });

  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          localForCity,
          webPageJsonLd({ path, name: `AI websites in ${city.name}`, description }),
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
                Modern Mustard Seed is a boutique design and AI studio based in Kalispell, serving {city.name} and clients nationwide. We design and build websites and brand, custom software, and voice agents. You own the code and accounts.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/inquire"
                  className="rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
                >
                  See the Work
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
      <section className="border-b-2 border-[#161616] bg-[#F5B700]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="font-display text-3xl font-extrabold">A front door connected to the work behind it.</h2>
          <p className="mt-4 max-w-3xl leading-relaxed">{city.slug === 'kalispell'
            ? 'A Kalispell contractor needs more than a gallery of finished jobs. The website should explain the work, qualify a request by service area and job type, and put the enquiry where the crew can act on it. That is a concrete brief for an AI website and a connected workflow.'
            : `For ${city.name} businesses, we scope the system around the enquiries you actually receive. Booking rules, service boundaries and human follow-up come before adding an AI feature.`}</p>
          <nav aria-label="Website and AI services" className="mt-6 flex flex-wrap gap-x-6 gap-y-3 font-bold underline underline-offset-4">
            <Link href="/ai-websites">How our AI websites work</Link>
            <Link href="/talking-website">The Talking Website</Link>
            <Link href="/voice-agents">AI voice agents</Link>
            <Link href="/services">Automation and custom software</Link>
            <Link href="/work">See the builds</Link>
            <Link href="/resources">AI search field notes</Link>
          </nav>
        </div>
      </section>

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
                b: 'Designed from scratch for your business, not filled into a template. Lead capture, funnels, and SEO built in. You own the code, the domain, and every account.',
                p: `From ${formatUsd(DEMO_PRODUCTS.site.setupCents)} setup, ${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo`,
                href: '/websites',
              },
              {
                t: 'The Voice Agent',
                b: 'Answers as your business, day or night, books the job, flags the emergencies, and texts you the summary. Trained on your services, your hours, and your service area.',
                p: `${formatUsd(DEMO_PRODUCTS.voice.setupCents)} setup, ${formatUsd(DEMO_PRODUCTS.voice.monthlyCents)}/mo`,
                href: '/voice-agents',
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
            Built for your {city.name} business.
          </h2>
          <p className="mt-4 font-body text-lg text-[#3d382e]">
            Tell us the business and what it has to do. Sarah reads every inquiry herself and answers inside one business day.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/inquire"
              className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-9 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
            >
              Begin An Engagement
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
