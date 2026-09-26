import Link from '@/components/AttributionLink';
import PressMedallion from '@/components/PressMedallion';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, faqJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

/**
 * Nationwide Reach. The studio is in Kalispell; the clients are wherever they
 * are. This page catches the "web design studio" and "AI agency" queries that
 * carry no town, and says plainly that distance is not a factor.
 */

export const metadata = buildMetadata({
  title: 'Nationwide Reach: A Design and Agentic Systems Studio for Businesses Across the US',
  description: 'Modern Mustard Seed works with businesses throughout the United States. Websites and brand, custom software, voice agents, and advisory, designed and built from Kalispell, Montana, delivered nationwide.',
  path: '/nationwide',
  image: '/nationwide/opengraph-image',
});

const WORK = [
  { name: 'D & D Landscaping', place: 'Tallahassee, Florida', image: 'dd-landscaping', url: 'https://ddlandscapingfl.com', note: 'A client website with service selection, walkthrough booking, and a voice concierge.' },
  { name: 'Built Right in Montana', place: 'Flathead Valley, Montana', image: 'brim-homes', url: 'https://brimhomes.com', note: 'A custom homebuilder’s website with a project showcase and a direct path to a build conversation.' },
  { name: 'Cross + Covenant', place: 'Ships across the United States', image: 'cross-covenant-current', url: 'https://crossandcovenant.co', note: 'The studio’s own apparel storefront, selling and shipping nationwide.' },
];

const STEPS = [
  { title: 'Write in', text: 'Every engagement starts with a written inquiry. Tell us what you have in mind, from anywhere in the country.' },
  { title: 'Scope it together', text: 'We scope it in one conversation, on video or by phone, then send a set package price in writing before any work starts.' },
  { title: 'Watch it take shape', text: 'You see the build on a live preview link as it comes together. Changes to what we build are included.' },
  { title: 'Own all of it', text: 'The code, the domain, and every account are yours. We hand you something you can run without us.' },
];

const FAQ = [
  {
    q: 'Do you work with businesses outside Montana?',
    a: 'Yes. The studio is in Kalispell, Montana, and we work with businesses throughout the United States. D & D Landscaping in Tallahassee, Florida is a client.',
  },
  {
    q: 'How does a remote engagement work?',
    a: 'It starts with a written inquiry, then one conversation, on video or by phone, to scope it. You get a set package price in writing, watch the build on a live preview link, and own everything at the end. Nothing about it needs you to be in Montana.',
  },
  {
    q: 'What time zone do you work in?',
    a: `Mountain Time, and we meet you in yours. The studio line, ${SITE.phone}, is answered day or night by the same kind of voice agent we build for clients. Sarah's own number is ${SITE.sarahPhone}.`,
  },
  {
    q: 'Is there a different price outside Montana?',
    a: 'No. Every engagement is scoped in one conversation and quoted as a set package price, agreed in writing before work starts. Where you are does not change it.',
  },
];

export default function NationwidePage() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          faqJsonLd(FAQ),
          breadcrumbJsonLd([{ name: 'Nationwide Reach', url: '/nationwide' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Design and agentic systems studio services, nationwide',
            serviceType: 'Websites and brand, custom software, voice agents, and advisory',
            url: `${SITE.url}/nationwide`,
            provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
            areaServed: { '@type': 'Country', name: 'United States' },
          },
        ]}
      />

      <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#F7DC8A]">
        <PressMedallion />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#161616_1.3px,transparent_1.5px)] [background-size:11px_11px] [mask-image:linear-gradient(115deg,transparent_35%,#000_80%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-28 md:pt-36 pb-14 md:pb-20 xl:pr-[460px]">
          <span className="inline-block -rotate-1 bg-[#161616] text-[#F5B700] px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em]">
            Nationwide Reach
          </span>
          <h1 className="mt-6 flex flex-col items-start font-sans font-extrabold leading-[0.95] tracking-[-0.045em] text-[2.2rem] sm:text-5xl md:text-6xl lg:text-[5.2rem]">
            <span>Built in Montana.</span>{' '}
            <span className="my-[0.12em] -rotate-2 border-[3px] border-[#161616] bg-[#FBF6EA] px-[0.18em] pb-[0.08em] font-display italic font-medium tracking-[-0.03em] shadow-[7px_7px_0_0_#E0301E]">
              Working everywhere
            </span>{' '}
            <span>in the US.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg md:text-xl font-body font-medium leading-relaxed">
            Modern Mustard Seed is a design and agentic systems studio in Kalispell, Montana. We design and build websites and brand, custom software, and voice agents for businesses throughout the United States. Distance is not a factor. You own everything we build.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/inquire" className="inline-flex items-center gap-5 border-2 border-[#161616] bg-[#161616] px-7 py-4 font-sans font-bold text-sm text-[#FBF6EA] shadow-[5px_5px_0_0_#FBF6EA] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5">
              Tell Us What You Have In Mind <span aria-hidden="true" className="text-[#F5B700] text-lg">↗</span>
            </Link>
            <a href={`tel:${SITE.phoneE164}`} className="inline-flex items-center border-2 border-[#161616] bg-[#FBF6EA] px-7 py-4 font-sans font-bold text-sm shadow-[5px_5px_0_0_#161616] transition-transform hover:-translate-y-0.5">
              Call {SITE.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#B92417]">From Montana to Florida</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.03em]">
            The work already <em>travels.</em>
          </h2>
          <div className="mt-11 grid md:grid-cols-3 gap-8">
            {WORK.map((w) => (
              <a key={w.name} href={w.url} target="_blank" rel="noopener noreferrer" className="group block">
                <div className="overflow-hidden border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] bg-[#eae6dc]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/images/editorial/${w.image}-960.webp`} alt={`${w.name} website, designed and built by Modern Mustard Seed`} width={960} height={600} loading="lazy" decoding="async" className="block w-full aspect-[1.6] object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]" />
                </div>
                <p className="mt-5 inline-block bg-[#F5B700] border border-[#161616] px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.16em]">{w.place}</p>
                <h3 className="mt-3 font-display text-2xl tracking-[-0.02em]">{w.name}</h3>
                <p className="mt-2 font-body text-sm text-[#3d382e] leading-relaxed">{w.note}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-[#161616] text-[#FBF6EA]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#F5B700]">How it works from anywhere</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.03em]">
            One studio. <em className="text-[#F5B700]">Every state.</em>
          </h2>
          <ol className="mt-11 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-2 border-[#FBF6EA] p-6 shadow-[6px_6px_0_0_#F5B700]">
                <span className="font-sans text-xs font-bold text-[#F5B700]">0{i + 1}</span>
                <h3 className="mt-3 font-sans text-lg font-bold">{s.title}</h3>
                <p className="mt-2 font-body text-sm text-[#d9d7cc] leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <nav aria-label="Explore the studio" className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap gap-6 font-bold text-[#B92417] underline underline-offset-4">
        <Link href="/work">What we have built</Link>
        <Link href="/montana">Our home in Northwest Montana</Link>
        <Link href="/for">Industries we build for</Link>
        <Link href="/about">Meet Sarah Scarano</Link>
      </nav>

      <section>
        <div className="max-w-4xl mx-auto px-6 pb-16 md:pb-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#B92417]">Straight Answers</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl leading-[1.05] tracking-[-0.03em]">Questions from outside Montana.</h2>
          <div className="mt-8 space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616]">
                <summary className="cursor-pointer list-none font-sans font-bold text-[15px] flex items-start justify-between gap-4">
                  {f.q}
                  <span aria-hidden="true" className="text-[#B92417] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 font-body text-sm text-[#3d382e] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
