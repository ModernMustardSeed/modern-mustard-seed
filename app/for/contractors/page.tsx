import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { bookingUrl } from '@/data/socials';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: 'Websites, Owner Portals and Marketing Systems for Home Builders and Contractors',
  description:
    'Be the builder Google and ChatGPT recommend. A website as good as your work, an owner portal your clients check every Friday, and a studio that answers every inquiry and turns crew photos into posts. See Cairnfell live and Built Right in Montana.',
  path: '/for/contractors',
});

// The three pieces, each one live and clickable on Cairnfell.
const pieces = [
  {
    kicker: '01 The website',
    title: 'A site as good as your work.',
    body: 'Cinematic photography of your homes, every residence full screen, the way you build explained in plain words, and the answers buyers ask Google and ChatGPT written right on the page. Built to grade A+ on our presence audit.',
    shot: '/demos/cairnfell/shots/site-hero.webp',
    alt: 'The Cairnfell homepage: a timber and glass mountain home at dusk under the headline Homes that belong to the mountain',
    href: '/demos/cairnfell',
    cta: 'Open the site',
  },
  {
    kicker: '02 The owner portal',
    title: 'Your clients, updated every Friday.',
    body: 'Most luxury clients live somewhere else while you build. They sign in and see the week’s photos, the live schedule and every selection waiting on them, and they approve the soapstone with one tap instead of three phone calls.',
    shot: '/demos/cairnfell/shots/portal-ov.webp',
    alt: 'The Cairnfell owner portal overview: Hollow Creek Lodge, 68 percent complete, the next milestone and two decisions waiting',
    href: '/demos/cairnfell/portal',
    cta: 'Open the portal',
  },
  {
    kicker: '03 The builder studio',
    title: 'Your company, running itself.',
    body: 'Every inquiry answered in under a minute, day or night. Crew photos sorted and turned into posts for Instagram, Facebook and Google. Every review answered. And every week we ask Google and ChatGPT who the best builder is, and fix whatever drops.',
    shot: '/demos/cairnfell/shots/studio-top.webp',
    alt: 'The Cairnfell builder studio: new inquiries, a 38 second first reply, posts published and everything the agents ran today',
    href: '/demos/cairnfell/portal#studio',
    cta: 'Open the studio',
  },
];

const checks = [
  'Your title and headings name the towns you build in',
  'Your business facts in structured data Google and AI read directly',
  'Your reviews quoted on your own site, with names and homes',
  'Plain answers to the questions buyers actually ask',
  'The same name, address and phone on every profile',
  'A tap-to-call phone and a site that is fast on every phone',
];

const faqs = [
  {
    q: 'Can you make my building company the one ChatGPT and Google recommend?',
    a: 'Nobody can promise a ranking, and we never will. What we control is everything AI reads when it decides: your towns in your titles, your business facts in structured data, your reviews on your own site, and plain answers to the questions buyers ask. We build all of it, grade it on our presence audit, and ask Google and ChatGPT about you every week so we can fix whatever drops.',
  },
  {
    q: 'What is the owner portal, and do my clients have to download anything?',
    a: 'It is a private website for each build. Your clients sign in from any phone or computer with their email and a project code, and see the week’s photos, the schedule, the selections waiting on them, their documents, and a concierge that answers questions from the project’s own file at any hour. Nothing to download.',
  },
  {
    q: 'Is Cairnfell a real builder?',
    a: 'No. Cairnfell is a concept we built to show the whole system working together: the website, the owner portal and the builder studio are all real and clickable. Built Right in Montana, further down this page, is a real Flathead Valley builder and a client.',
  },
  {
    q: 'Do I need Buildertrend or another project tool?',
    a: 'No. If you already run Buildertrend or another tool, we work beside it. If you don’t, the owner portal gives your clients the part they care about: photos, schedule, selections and answers.',
  },
  {
    q: 'How does pricing work?',
    a: 'Set package prices, agreed before anything is built. Changes to what we build are included, and you own the site, the portal and every account. The fastest way to see what fits is a free demo of your own homepage in this style.',
  },
];

export default function ContractorsPage() {
  const pageUrl = `${SITE.url}/for/contractors`;
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: metadata.title,
    description: metadata.description,
    inLanguage: 'en-US',
    isPartOf: { '@id': `${SITE.url}/#website` },
    about: { '@id': `${SITE.url}/#organization` },
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'h2', '.contractors-lede'] },
  };
  const videoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'Cairnfell: be the builder Google and ChatGPT suggest',
    description: 'A 64-second film of a builder website, an owner portal and a builder studio, made by Modern Mustard Seed.',
    thumbnailUrl: `${SITE.url}/ads/cairnfell/poster.jpg`,
    contentUrl: `${SITE.url}/ads/cairnfell/cairnfell-16x9.mp4`,
    uploadDate: '2026-09-27',
    duration: 'PT1M4S',
  };

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd,
          videoJsonLd,
          serviceJsonLd({
            name: 'Websites, Owner Portals and Marketing Systems for Home Builders and Contractors',
            description:
              'Websites built so Google and ChatGPT recommend the builder, a private owner portal for every build, and a studio that answers every inquiry, posts crew photos and answers every review.',
          }),
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Industries', url: '/for' },
            { name: 'Contractors and Construction', url: '/for/contractors' },
          ]),
        ]}
      />
      <div className="relative min-h-screen bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
        <PopPageHero
          eyebrow={
            <>
              <Link href="/for" className={pop.back}>
                ← All industries
              </Link>
              <span className={pop.pill}>For Builders and Contractors</span>
            </>
          }
          title={<>Be the builder Google and ChatGPT{' '}<em>suggest</em></>}
          art={{ src: '/art/riviera/industries', alt: 'Painting: Mr. Mustard strolls a sunny seaside promenade of little shops with Tiffany-blue and coral awnings, a bakery, a gelato stand, a surf rental and a boat charter, the family with gelato and the sea at the end of the street', caption: 'Built for the builders', focus: '30% 60%' }}
          sticker="Break ground!"
          mascot={{ bubble: 'Hard hats on!' }}
        >
          <p className="contractors-lede">
            Your homes are beautiful. We make sure the people looking for a builder find you first: a website as
            good as your work, an owner portal your clients check every Friday, and a studio that answers every
            lead and posts your crew photos while you build.
          </p>
          <div className={pop.actions}>
            <Link href="/demos" className={pop.cta}>
              Build My Free Demo
            </Link>
            <Link href="/demos/cairnfell" className={pop.ctaAlt}>
              See Cairnfell live
            </Link>
          </div>
          <p className={pop.note}>
            Or{' '}
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="text-[#0a7c78] font-semibold underline underline-offset-2 hover:text-[#0a7c78] transition-colors">
              book a call
            </a>{' '}
            and we’ll walk you through it with your own homes on screen.
          </p>
        </PopPageHero>

        {/* The film: the ink band */}
        <section className="relative mt-4 bg-[#0b3b44] text-[#fbf5ea] border-y-2 border-[#0b3b44] overflow-hidden" aria-labelledby="film-h">
          <div className="pointer-events-none absolute inset-0 halftone-ink" aria-hidden="true" />
          <div className="relative max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-20">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#f5b700] font-mono font-bold mb-5 block">
                Watch it · 64 seconds
              </span>
              <h2 id="film-h" className="font-display text-3xl md:text-5xl font-black text-[#fbf5ea] tracking-tight leading-[1.1]">
                One builder, from the first search to the front door.
              </h2>
            </div>
            <div className="border-2 border-[#fbf5ea] shadow-[6px_6px_0_0_#f5b700] bg-black">
              <video
                controls
                playsInline
                preload="metadata"
                width={1920}
                height={1080}
                poster="/ads/cairnfell/poster.jpg"
                src="/ads/cairnfell/cairnfell-16x9.mp4"
                className="block w-full h-auto"
                aria-label="Cairnfell film: the website, the owner portal, the concierge, the builder studio and the A plus presence audit"
              >
                Your browser can’t play this video here.{' '}
                <a href="/ads/cairnfell/cairnfell-16x9.mp4">Download the film</a>.
              </video>
            </div>
            <p className="mt-5 text-center text-sm text-[#fbf5ea]/75 font-body">
              Cairnfell is a concept builder. The website, the portal and the studio in the film are real, and you can click through every one of them below.
            </p>
          </div>
        </section>

        {/* The three pieces */}
        <section className="relative max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24" aria-labelledby="pieces-h">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">
              Click through all of it
            </span>
            <h2 id="pieces-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              Three pieces. One system.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8">
            {pieces.map((p, i) => (
              <article key={p.href} className={`pop-card overflow-hidden grid grid-cols-1 md:grid-cols-2 ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}>
                <a href={p.href} className="block border-b-2 md:border-b-0 border-[#0b3b44] bg-[#0E1411]" aria-label={`${p.cta}: ${p.kicker}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.shot} alt={p.alt} width={1200} height={750} loading="lazy" className="block w-full h-auto" />
                </a>
                <div className="p-7 md:p-10 flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-[#0a7c78] font-mono font-bold mb-3 block">{p.kicker}</span>
                  <h3 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight leading-[1.1] mb-4">{p.title}</h3>
                  <p className="text-[#3a3733] text-base font-body leading-7 mb-6">{p.body}</p>
                  <a href={p.href} className="self-start inline-flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0b3b44] bg-[#f5b700] rounded-full border-2 border-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44] hover:-translate-y-0.5 transition-all">
                    {p.cta} <span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* The A+ checks */}
        <section className="relative max-w-5xl mx-auto px-6 md:px-8 pb-16 md:pb-24" aria-labelledby="grade-h">
          <div className="pop-card p-8 md:p-12 bg-[#f5b700] grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
            <div className="font-display text-[110px] md:text-[150px] leading-none font-black text-[#0b3b44]" aria-hidden="true">A+</div>
            <div>
              <h2 id="grade-h" className="font-display text-2xl md:text-4xl font-black text-[#0b3b44] tracking-tight leading-[1.1] mb-5">
                What AI reads before it names a builder.
              </h2>
              <ul className="grid gap-2.5">
                {checks.map((c) => (
                  <li key={c} className="flex gap-3 text-[#0b3b44] font-body text-base leading-6">
                    <span className="font-mono font-bold text-[#0a7c78]" aria-hidden="true">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-[#0b3b44]/75 font-body">These are the six things our presence audit grades. Want to know where your site stands? <Link href="/presence-audit" className="font-semibold underline underline-offset-2">Run the free presence audit</Link>. Still choosing who answers the phone? See <Link href="/best/ai-receptionists-for-contractors" className="font-semibold underline underline-offset-2">the best AI receptionists for contractors</Link>.</p>
            </div>
          </div>
        </section>

        {/* The real one */}
        <section className="relative bg-[#0b3b44] text-[#fbf5ea] border-y-2 border-[#0b3b44] overflow-hidden" aria-labelledby="brim-h">
          <div className="pointer-events-none absolute inset-0 halftone-ink" aria-hidden="true" />
          <div className="relative max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="border-2 border-[#fbf5ea] shadow-[6px_6px_0_0_#f5b700] bg-black">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/images/editorial/brim-homes-960.webp"
                src="/video/work/brim-homes.mp4"
                className="block w-full h-auto"
                aria-label="The Built Right in Montana website scrolling from the homepage through the project showcase"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#f5b700] font-mono font-bold mb-5 block">
                A real builder · Client
              </span>
              <h2 id="brim-h" className="font-display text-3xl md:text-5xl font-black text-[#fbf5ea] tracking-tight leading-[1.1] mb-5">
                Built Right in Montana
              </h2>
              <p className="text-[#fbf5ea]/85 text-base md:text-lg font-body leading-relaxed mb-7">
                A Flathead Valley custom home builder’s website, with a project showcase and a direct path to a
                build conversation. Built for the way Montana lives.
              </p>
              <a
                href="https://builtrightinmontana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0b3b44] bg-[#f5b700] rounded-full border-2 border-[#fbf5ea] shadow-[4px_4px_0_0_#fbf5ea] hover:-translate-y-0.5 transition-all"
              >
                Visit builtrightinmontana.com <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="relative max-w-4xl mx-auto px-6 md:px-8 py-16 md:py-24" aria-labelledby="faq-h">
          <h2 id="faq-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1] mb-10 text-center">
            Builders ask us
          </h2>
          <div className="grid gap-4">
            {faqs.map((f) => (
              <details key={f.q} className="pop-card p-6 md:p-7 group">
                <summary className="cursor-pointer list-none flex justify-between gap-4 font-display text-lg md:text-xl font-black text-[#0b3b44] tracking-tight">
                  {f.q}
                  <span className="font-mono text-[#0a7c78] group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
                </summary>
                <p className="mt-4 text-[#3a3733] text-base font-body leading-7">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Close */}
        <section className="relative max-w-4xl mx-auto px-6 md:px-8 pb-24">
          <div className="pop-card p-8 md:p-12 text-center">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1] mb-4">
              See your own homes in this style.
            </h2>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto mb-8">
              Tell us your company and the towns you build in. We’ll build a demo of your homepage, free, and show you
              what Google and ChatGPT say about you today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/demos" className={pop.cta}>Build My Free Demo</Link>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className={pop.ctaAlt}>Book a Call</a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
