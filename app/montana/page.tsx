import Link from '@/components/AttributionLink';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, faqJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { MONTANA_CITIES } from '@/data/montana-cities';

/**
 * The parent of the local fleet. Catches the region-wide query ("web design
 * Flathead Valley", "voice agent Montana") and passes authority down to the
 * five city pages, which catch the town-level ones.
 */

export const metadata = buildMetadata({
  title: 'AI Websites and Automation in Montana, Built in Kalispell',
  description: 'A Kalispell-based boutique design and AI studio: websites and brand, custom software, voice agents, and advisory for Northwest Montana and clients nationwide.',
  path: '/montana',
});

const FAQ = [
  {
    q: 'Where in Montana are you based?',
    a: `Kalispell, in the Flathead Valley. We work in person across the valley and remotely with clients in every state. The phone is ${SITE.phone} and it is answered around the clock by the voice agent we build for other businesses.`,
  },
  {
    q: 'Do you only work with Montana businesses?',
    a: 'No. Most of our work is remote and nationwide. Our studio is in Kalispell. These pages explain how the same tools fit the different seasonal and operational needs of businesses across Northwest Montana.',
  },
  {
    q: 'What does a website cost?',
    a: 'There is no price list. Every engagement is scoped in one conversation and quoted privately as a set package price, agreed in writing before work starts, and it does not move afterwards. Domain, hosting, and ongoing care are inside the engagement, changes are included permanently, and you own the code and every account. Studio engagements begin in the five figures.',
  },
  {
    q: 'Can I try it before paying?',
    a: 'Yes. Every site in the portfolio is live right now and you are welcome to go poke around any of them, and the studio line answers day or night so you can hear a voice agent for yourself. For engagements that reach the proposal stage we design a full concept before either side commits.',
  },
];

export default function MontanaPage() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          faqJsonLd(FAQ),
          // breadcrumbJsonLd prepends SITE.url itself, so this is a PATH.
          breadcrumbJsonLd([{ name: 'Montana', url: '/montana' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Modern Mustard Seed service areas in Northwest Montana',
            itemListElement: MONTANA_CITIES.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${c.name}, Montana`,
              url: `${SITE.url}/montana/${c.slug}`,
            })),
          },
        ]}
      />

      <section className="relative overflow-hidden border-b-2 border-[#161616] halftone-bg">
        <div className="relative z-[2] max-w-5xl mx-auto px-6 pt-28 md:pt-36 pb-14 md:pb-20">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] font-bold bg-white text-[#C4160B] border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">
            ▲ The Flathead Valley
          </span>
          <h1 className="mt-6 font-display font-extrabold leading-[0.98] tracking-tight text-4xl md:text-5xl lg:text-[3.9rem]">
            The AI studio in your valley, not in your inbox from three time zones away.
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-[#3d382e] font-body leading-relaxed">
            Modern Mustard Seed is a boutique design and AI studio based in Kalispell. We design and build websites and brand, custom software, and voice agents for Northwest Montana and clients nationwide. You own everything we build.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/inquire"
              className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
            >
              See The Work
            </Link>
            <a
              href={`tel:${SITE.phoneE164}`}
              className="rounded-full border-2 border-[#161616] bg-white px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
            >
              Call {SITE.phone}
            </a>
          </div>
        </div>
      </section>

      <nav aria-label="Explore the studio" className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap gap-6 font-bold text-[#1E50C8] underline underline-offset-4">
        <Link href="/ai-websites">AI websites, explained</Link>
        <Link href="/montana/kalispell">Our home in Kalispell</Link>
        <Link href="/resources">The AI search field notes</Link>
        <Link href="/work">What we have built</Link>
        <Link href="/about">Meet Sarah Scarano</Link>
      </nav>
      <section className="border-b-2 border-[#161616] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">Pick Your Town</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
            Every town in the valley runs on a different clock.
          </h2>
          <p className="mt-4 font-body text-[16px] text-[#161616]/70 max-w-2xl">
            A gallery in Bigfork and a roofing crew in Kalispell miss calls for completely different reasons. Pick
            yours and we will show you the version that fits.
          </p>
          <div className="mt-9 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MONTANA_CITIES.map((c) => (
              <Link
                key={c.slug}
                href={`/montana/${c.slug}`}
                className="flex flex-col rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] p-6 shadow-[5px_5px_0_0_#161616] transition-transform hover:-translate-y-1"
              >
                <h3 className="font-display text-2xl font-extrabold">{c.name}</h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8f6600] font-bold">
                  {c.alsoServes.slice(0, 3).join(' · ')}
                </p>
                <p className="mt-3 font-body text-sm text-[#3d382e] leading-relaxed">{c.locale}.</p>
                <span className="mt-auto pt-5 font-sans font-bold text-sm text-[#1E50C8]">
                  {c.name} businesses →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616]">
        <div className="max-w-4xl mx-auto px-6 py-14 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">Straight Answers</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
            Questions we get from the valley.
          </h2>
          <div className="mt-8 space-y-4">
            {FAQ.map((f) => (
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
    </div>
  );
}
