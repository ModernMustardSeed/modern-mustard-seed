import Link from '@/components/AttributionLink';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, faqJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { MONTANA_CITIES } from '@/data/montana-cities';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

/**
 * The parent of the local fleet. Catches the region-wide query ("web design
 * Flathead Valley", "voice agent Montana") and passes authority down to the
 * five city pages, which catch the town-level ones.
 */

export const metadata = buildMetadata({
  title: 'Montana Website Design and Agentic Systems',
  description: 'A Kalispell-based boutique design and agentic systems studio: websites and brand, custom software, voice agents, and advisory for Northwest Montana and clients nationwide.',
  path: '/montana',
});

const FAQ = [
  {
    q: 'Where in Montana are you based?',
    a: `Kalispell, in the Flathead Valley. We work in person across the valley and remotely with clients in every state. The phone is ${SITE.phone} and it is answered around the clock by the voice agent we build for other businesses. Sarah's own number is ${SITE.sarahPhone}.`,
  },
  {
    q: 'Do you only work with Montana businesses?',
    a: 'No. Most of our work is remote and nationwide. Our studio is in Kalispell. These pages explain how the same tools fit the different seasonal and operational needs of businesses across Northwest Montana.',
  },
  {
    q: 'What does a website cost?',
    a: 'There is no price list. Every engagement is scoped in one conversation and quoted privately as a set package price, agreed in writing before work starts, and it does not move afterwards. Domain, hosting, and ongoing care are inside the engagement, changes are included permanently, and you own the code and every account.',
  },
  {
    q: 'Can I try it before paying?',
    a: 'Yes. Every site in the portfolio is live right now and you are welcome to go poke around any of them, and the studio line answers day or night so you can hear a voice agent for yourself. For engagements that reach the proposal stage we design a full concept before either side commits.',
  },
];

const MT_ALT = 'Pop-art screenprint: a Montana valley at sunrise with a lake and island, snow-capped peaks, a red barn, a grain elevator and a pickup on a country road';

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

      <PopPageHero
        eyebrow={<span>▲ The Flathead Valley</span>}
        title={<>The agentic studio in your valley, not in your inbox from three time zones away.</>}
        issue={{ no: 'No.1', lines: ['The Flathead Valley', 'Kalispell, Montana'] }}
        art={{ src: '/art/pages/montana', alt: MT_ALT, caption: 'Big sky, short drive' }}
        sticker="Howdy!"
        mascot={{ bubble: 'Right down the road!' }}
      >
        <p>
          Modern Mustard Seed is a boutique design and agentic systems studio based in Kalispell. We design and build websites and brand, custom software, and voice agents for Northwest Montana and clients nationwide. You own everything we build.
        </p>
        <div className={pop.actions}>
          <Link href="/book" className={pop.cta}>
            See The Work
          </Link>
          <a href={`tel:${SITE.phoneE164}`} className={pop.ctaAlt}>
            Call {SITE.phone}
          </a>
        </div>
      </PopPageHero>

      <nav aria-label="Explore the studio" className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap gap-6 font-bold text-[#B92417] underline underline-offset-4">
        <Link href="/agentic-websites">Agentic websites, explained</Link>
        <Link href="/montana/kalispell">Our home in Kalispell</Link>
        <Link href="/nationwide">Working with us from outside Montana</Link>
        <Link href="/resources">The answer engine field notes</Link>
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
                <span className="mt-auto pt-5 font-sans font-bold text-sm text-[#B92417]">
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
