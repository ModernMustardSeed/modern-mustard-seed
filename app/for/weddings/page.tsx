import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { bookingUrl } from '@/data/socials';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: 'Wedding Websites, Guest Apps and Planners for Venues, Planners and Photographers',
  description:
    'Give every couple the whole weekend: a wedding website, a guest app and a couple’s planner running off one guest list, built with your venue’s name on it. See the Mara and Jonah demo live.',
  path: '/for/weddings',
});

// The three views of one guest list, each open in the live demo.
const pieces = [
  {
    kicker: '01 The wedding website',
    title: 'Their names, their mountains, their countdown.',
    body: 'The couple’s story, the engagement gallery full screen, the whole weekend hour by hour, and RSVPs with dinner choices. A lightbox countdown ticks on the front page from the day they say yes.',
    shot: '/demos/wedding-shots/site-hero.webp',
    alt: 'The Mara and Jonah wedding website: Glacier National Park at sunset with the countdown to June 19, 2027',
    href: '/demos/wedding#site',
    cta: 'Open the website',
    phone: false,
  },
  {
    kicker: '02 The guest app',
    title: 'Every guest, their own weekend.',
    body: 'Guests sign in with the code on their invitation and see their own table, their dinner, every shuttle time and one shared album for every phone photo from the weekend. Try it as Priya Raman with code GLACIER27.',
    shot: '/demos/wedding-shots/app-home.webp',
    alt: 'The guest app on a phone: Priya Raman’s table, dinner and the weekend schedule',
    href: '/demos/wedding#app',
    cta: 'Open the guest app',
    phone: true,
  },
  {
    kicker: '03 The couple’s planner',
    title: 'Everything, in one place.',
    body: 'Replies and dinner counts, a seating plan filled table by table, the budget, the timeline, every vendor’s due date and the day-of run of show. When a guest RSVPs on the website, it lands here. Nobody retypes anything.',
    shot: '/demos/wedding-shots/plan-overview.webp',
    alt: 'The couple’s planner overview: how much is done, replies, the budget and what is due next',
    href: '/demos/wedding#planner',
    cta: 'Open the planner',
    phone: false,
  },
];

const who = [
  { title: 'Venues', body: 'Every couple who books gets a website, a guest app and a planner with your venue’s name, photos and weekend built in. The best reason to book you that another venue can’t match.' },
  { title: 'Planners', body: 'One guest list your couples and you both work from. Replies, seating, budget and vendor dates in one planner, instead of five spreadsheets and a group text.' },
  { title: 'Photographers', body: 'Your engagement gallery full screen on the couple’s site, and a shared album in the guest app, instead of a Dropbox link nobody opens twice.' },
];

const faqs = [
  {
    q: 'Couples can get a free wedding website from The Knot or Zola. Why would they want this?',
    a: 'They get a template with an ad bar, and nothing that knows their venue. This is built around your venue and your weekend: the guest app knows the shuttle times, the planner knows your vendor list, and every piece carries your name. It is a reason to book you.',
  },
  {
    q: 'Is Mara and Jonah a real wedding?',
    a: 'No. Mara and Jonah are a sample couple we built for a Glacier National Park wedding, to show all three pieces working off one guest list. Everything in the demo is real and clickable.',
  },
  {
    q: 'Can it carry our venue’s name and photos?',
    a: 'Yes. That is the point. We build it with your venue’s name, your photos, your weekend and your vendors, so every couple you book gets it ready to fill in.',
  },
  {
    q: 'How does pricing work?',
    a: 'Set package prices, agreed before anything is built. Changes to what we build are included, and you own it. The fastest way to see what fits is a free demo built for your venue.',
  },
];

export default function WeddingsPage() {
  const pageUrl = `${SITE.url}/for/weddings`;
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
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'h2', '.weddings-lede'] },
  };
  const videoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'The Whole Weekend: a wedding website, guest app and planner on one guest list',
    description: 'A 64-second film made from the real Mara and Jonah demo by Modern Mustard Seed.',
    thumbnailUrl: `${SITE.url}/ads/whole-weekend/poster.jpg`,
    contentUrl: `${SITE.url}/ads/whole-weekend/whole-weekend-16x9.mp4`,
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
            name: 'Wedding Websites, Guest Apps and Planners for Venues, Planners and Photographers',
            description:
              'A wedding website, a guest app and a couple’s planner running off one guest list, built with the venue’s name, photos and weekend.',
          }),
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Industries', url: '/for' },
            { name: 'Weddings', url: '/for/weddings' },
          ]),
        ]}
      />
      <div className="relative min-h-screen bg-[#f1ede4] text-[#0d0d0d] overflow-x-clip">
        <PopPageHero
          eyebrow={
            <>
              <Link href="/for" className={pop.back}>
                ← All industries
              </Link>
              <span className={pop.pill}>For Venues, Planners and Photographers</span>
            </>
          }
          title={<>Give every couple the{' '}<em>whole weekend</em></>}
          art={{ src: '/art/pages/industries', alt: 'Graffiti couture painting: Mr. Mustard waves from a mustard-yellow classic convertible cruising down a mountain-town main street of shops, under a railroad trestle painted in bright graffiti', caption: 'Just married, just built', focus: '30% 60%' }}
          sticker="I do!"
          mascot={{ bubble: 'Table 4, by the window!' }}
        >
          <p className="weddings-lede">
            A wedding website, a guest app and a couple’s planner, all running off one guest list, with your venue’s
            name on every one. When a guest RSVPs, it lands in the planner. When the couple seats them, their table
            shows up on the guest’s phone. Nobody retypes anything.
          </p>
          <div className={pop.actions}>
            <Link href="/demos/wedding" className={pop.cta}>
              See the Demo Live
            </Link>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className={pop.ctaAlt}>
              Book a Call
            </a>
          </div>
          <p className={pop.note}>
            Run a venue or plan weddings? We’ll build it with your name and your photos,{' '}
            <Link href="/demos" className="text-[#c8201a] font-semibold underline underline-offset-2 hover:text-[#d0241b] transition-colors">
              free
            </Link>
            .
          </p>
        </PopPageHero>

        {/* The film: the ink band */}
        <section className="relative mt-4 bg-[#0d0d0d] text-[#f1ede4] border-y-2 border-[#0d0d0d] overflow-hidden" aria-labelledby="film-h">
          <div className="pointer-events-none absolute inset-0 halftone-ink" aria-hidden="true" />
          <div className="relative max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-20">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#ffd400] font-mono font-bold mb-5 block">
                Watch it · 64 seconds
              </span>
              <h2 id="film-h" className="font-display text-3xl md:text-5xl font-black text-[#f1ede4] tracking-tight leading-[1.1]">
                The Whole Weekend.
              </h2>
            </div>
            <div className="border-2 border-[#f1ede4] shadow-[6px_6px_0_0_#ffd400] bg-black">
              <video
                controls
                playsInline
                preload="metadata"
                width={1920}
                height={1080}
                poster="/ads/whole-weekend/poster.jpg"
                src="/ads/whole-weekend/whole-weekend-16x9.mp4"
                className="block w-full h-auto"
                aria-label="The Whole Weekend: the Mara and Jonah wedding website, guest app and planner on one guest list"
              >
                Your browser can’t play this video here.{' '}
                <a href="/ads/whole-weekend/whole-weekend-16x9.mp4">Download the film</a>.
              </video>
            </div>
            <p className="mt-5 text-center text-sm text-[#f1ede4]/75 font-body">
              Mara and Jonah are a sample couple. Every screen in the film is the real demo, and you can open all three pieces below.
            </p>
          </div>
        </section>

        {/* The three pieces */}
        <section className="relative max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24" aria-labelledby="pieces-h">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#c8201a] font-mono font-bold mb-5 block">
              Click through all of it
            </span>
            <h2 id="pieces-h" className="font-display text-3xl md:text-5xl font-black text-[#0d0d0d] tracking-tight leading-[1.1]">
              One guest list. Three pieces.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8">
            {pieces.map((p, i) => (
              <article key={p.href} className={`pop-card overflow-hidden grid grid-cols-1 md:grid-cols-2 ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}>
                <a href={p.href} className={`block border-b-2 md:border-b-0 border-[#0d0d0d] ${p.phone ? 'bg-[#0B1517] flex items-center justify-center py-8' : 'bg-[#0B1517]'}`} aria-label={`${p.cta}: ${p.kicker}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.shot} alt={p.alt} width={p.phone ? 800 : 1200} height={p.phone ? 1602 : 750} loading="lazy" className={p.phone ? 'block h-auto w-[62%] max-w-[260px] rounded-[22px] border-2 border-[#f1ede4]/20' : 'block w-full h-auto'} />
                </a>
                <div className="p-7 md:p-10 flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-[#c8201a] font-mono font-bold mb-3 block">{p.kicker}</span>
                  <h3 className="font-display text-2xl md:text-3xl font-black text-[#0d0d0d] tracking-tight leading-[1.1] mb-4">{p.title}</h3>
                  <p className="text-[#3a3733] text-base font-body leading-7 mb-6">{p.body}</p>
                  <a href={p.href} className="self-start inline-flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0d0d0d] bg-[#ffd400] rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_#0d0d0d] hover:-translate-y-0.5 transition-all">
                    {p.cta} <span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Who it is for */}
        <section className="relative max-w-6xl mx-auto px-6 md:px-8 pb-16 md:pb-24" aria-labelledby="who-h">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#c8201a] font-mono font-bold mb-5 block">
              Who it is for
            </span>
            <h2 id="who-h" className="font-display text-3xl md:text-5xl font-black text-[#0d0d0d] tracking-tight leading-[1.1]">
              Built for the people who make the day.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {who.map((w) => (
              <article key={w.title} className="pop-card p-7">
                <h3 className="font-display text-xl md:text-2xl font-black text-[#0d0d0d] tracking-tight mb-3">{w.title}</h3>
                <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">{w.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Questions */}
        <section className="relative max-w-4xl mx-auto px-6 md:px-8 pb-16 md:pb-24" aria-labelledby="faq-h">
          <h2 id="faq-h" className="font-display text-3xl md:text-5xl font-black text-[#0d0d0d] tracking-tight leading-[1.1] mb-10 text-center">
            Venues ask us
          </h2>
          <div className="grid gap-4">
            {faqs.map((f) => (
              <details key={f.q} className="pop-card p-6 md:p-7 group">
                <summary className="cursor-pointer list-none flex justify-between gap-4 font-display text-lg md:text-xl font-black text-[#0d0d0d] tracking-tight">
                  {f.q}
                  <span className="font-mono text-[#c8201a] group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
                </summary>
                <p className="mt-4 text-[#3a3733] text-base font-body leading-7">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Close */}
        <section className="relative max-w-4xl mx-auto px-6 md:px-8 pb-24">
          <div className="pop-card p-8 md:p-12 text-center">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#0d0d0d] tracking-tight leading-[1.1] mb-4">
              See it built for your venue.
            </h2>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto mb-8">
              Tell us your venue and send a few photos. We’ll build the website, the guest app and the planner with
              your name on them, free, so you can show it to the next couple who tours.
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
