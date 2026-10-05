import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { bookingUrl } from '@/data/socials';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: 'Websites, Booking and Agentic Front Desks for Health Practices',
  description:
    'Be the practice patients find first. Websites Google and ChatGPT recommend, booking that works at midnight, and a front desk that answers every call. See Wild Things Optometrists, the Serabella and Just Botox med spa concierges, and SLASH clinic mode.',
  path: '/for/health',
});

// Every piece of work below is live and clickable. Two are concepts, one is our own product.
const work = [
  {
    kicker: 'Optometry · Concept',
    title: 'Wild Things Optometrists',
    body: 'An eyewear practice that refuses to look like every other one: a Snellen chart hero that spells the name, nine couture animal scenes, a frame quiz, a "lens one or lens two" toggle, and booking right on the page. Plus the launch film below.',
    shot: '/demos/health/shots/wild-things.webp',
    alt: 'The Wild Things Optometrists homepage: an eye chart that spells Wild Things beside a giraffe in pearls reading at a dinner table',
    href: '/demos/wild-things',
    cta: 'Open the site',
    external: false,
  },
  {
    kicker: 'Med spa · Voice concierge',
    title: 'Serabella MedSpa',
    body: 'A front desk that never sleeps. It books the consult, knows members by name, and captures the big package instead of sending a laser question to voicemail. With a Glow Plan intake and a front-desk dashboard.',
    shot: '/demos/health/shots/serabella.webp',
    alt: 'The Serabella MedSpa concierge site: Beauty, always answered, beside a live call booking a laser consult',
    href: 'https://serabella-medspa-concierge.vercel.app',
    cta: 'Open the demo',
    external: true,
  },
  {
    kicker: 'Aesthetics · Voice concierge',
    title: 'Just Botox',
    body: 'One clinic, one treatment, done exactly right. The concierge prices every unit straight, books the appointment, and remembers the 90-day rebook cycle so the patient comes back before the lines do.',
    shot: '/demos/health/shots/just-botox.webp',
    alt: 'The Just Botox concierge site: Just Botox, just answered, beside a call pricing units for a wedding',
    href: 'https://just-botox-voice-concierge.vercel.app',
    cta: 'Open the demo',
    external: true,
  },
  {
    kicker: 'Physical therapy · Our product',
    title: 'SLASH, clinic mode',
    body: 'A body-tracked movement game that runs from a webcam, no hardware. Clinic mode sets thresholds for each patient, records every session (symmetry, reach, squat depth), and exports the report.',
    shot: '/demos/health/shots/slash.webp',
    alt: 'SLASH: pick a place and play with your body as the controller, with Clinic mode in the options bar',
    href: 'https://slash-neon.vercel.app',
    cta: 'Open SLASH',
    external: true,
  },
];

const builds = [
  { title: 'A website patients choose', body: 'Your providers, your services and your reviews on a site that feels like your practice, with the answers patients ask Google and ChatGPT written right on the page.' },
  { title: 'Booking that works at midnight', body: 'New patients book from their phone in under a minute, into the calendar you already use. Reminders go out on their own.' },
  { title: 'A front desk that answers every call', body: 'A voice or text concierge that answers new-patient questions, quotes what you allow it to quote, books the visit and hands anything clinical straight to your staff.' },
  { title: 'Reviews on autopilot', body: 'A short text after the visit asks happy patients for a Google review and brings anything unhappy to you first.' },
];

const checks = [
  'Your title and headings name your town and specialty',
  'Your practice facts in structured data Google and AI read directly',
  'Your reviews quoted on your own site',
  'Plain answers to the questions new patients ask',
  'The same name, address and phone on every profile',
  'A tap-to-call phone and booking that is fast on every phone',
];

const faqs = [
  {
    q: 'Can you make my practice the one Google and ChatGPT recommend?',
    a: 'Nobody can promise a ranking, and we never will. What we control is everything AI reads when it decides: your town and specialty in your titles, your practice facts in structured data, your reviews on your own site, and plain answers to what new patients ask. We build all of it and grade it on our presence audit.',
  },
  {
    q: 'Will the concierge give medical advice?',
    a: 'No. It answers the questions your front desk answers: hours, insurance you accept, what a visit involves, what things cost where you allow it, and when there is an opening. Anything clinical goes to your staff.',
  },
  {
    q: 'Are Wild Things, Serabella and Just Botox real practices?',
    a: 'They are demos. Wild Things Optometrists is a concept practice we designed to show what an eye care site can be, and the Serabella and Just Botox sites show the voice concierge working for a med spa. SLASH is our own product. Everything on this page is live and clickable.',
  },
  {
    q: 'How does pricing work?',
    a: 'Set package prices, agreed before anything is built. Changes to what we build are included, and you own the site and every account. The fastest way to see what fits is a free demo of your own homepage.',
  },
];

export default function HealthPage() {
  const pageUrl = `${SITE.url}/for/health`;
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
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'h2', '.health-lede'] },
  };
  const videoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'Frames That Roar: Wild Things Optometrists',
    description: 'A 64-second launch film for a concept eyewear practice, made from its real website by Modern Mustard Seed.',
    thumbnailUrl: `${SITE.url}/ads/wild-things/poster.jpg`,
    contentUrl: `${SITE.url}/ads/wild-things/frames-that-roar-16x9.mp4`,
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
            name: 'Websites, Booking and Agentic Front Desks for Health Practices',
            description:
              'Websites built so Google and ChatGPT recommend the practice, online booking, a voice or text concierge that answers every call, and automated review requests.',
          }),
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Industries', url: '/for' },
            { name: 'Health Practices', url: '/for/health' },
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
              <span className={pop.pill}>For Health Practices</span>
            </>
          }
          title={<>Be the practice patients{' '}<em>find first</em></>}
          art={{ src: '/art/riviera/industries', alt: 'Painting: Mr. Mustard strolls a sunny seaside promenade of little shops with Tiffany-blue and coral awnings, a bakery, a gelato stand, a surf rental and a boat charter, the family with gelato and the sea at the end of the street', caption: 'Built for the people who care for people', focus: '30% 60%' }}
          sticker="Say ahh!"
          mascot={{ bubble: 'Your 3:00 is here!' }}
        >
          <p className="health-lede">
            Optometrists, dentists, med spas, clinics and therapists: a website patients actually choose, booking that
            works at midnight, and a front desk that answers every call, so the new patient who searched at 10 p.m.
            books with you instead of the practice down the street.
          </p>
          <div className={pop.actions}>
            <Link href="/demos" className={pop.cta}>
              Build My Free Demo
            </Link>
            <Link href="/demos/wild-things" className={pop.ctaAlt}>
              See Wild Things live
            </Link>
          </div>
          <p className={pop.note}>
            Or{' '}
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="text-[#0a7c78] font-semibold underline underline-offset-2 hover:text-[#0a7c78] transition-colors">
              book a call
            </a>{' '}
            and we’ll walk you through it with your own practice on screen.
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
                Serious eye care. Ridiculous frames.
              </h2>
            </div>
            <div className="border-2 border-[#fbf5ea] shadow-[6px_6px_0_0_#f5b700] bg-black">
              <video
                controls
                playsInline
                preload="metadata"
                width={1920}
                height={1080}
                poster="/ads/wild-things/poster.jpg"
                src="/ads/wild-things/frames-that-roar-16x9.mp4"
                className="block w-full h-auto"
                aria-label="Frames That Roar, the Wild Things Optometrists launch film, made from the real website"
              >
                Your browser can’t play this video here.{' '}
                <a href="/ads/wild-things/frames-that-roar-16x9.mp4">Download the film</a>.
              </video>
            </div>
            <p className="mt-5 text-center text-sm text-[#fbf5ea]/75 font-body">
              Wild Things Optometrists is a concept practice. Every screen in the film is its real website, and you can open it below.
            </p>
          </div>
        </section>

        {/* The work */}
        <section className="relative max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24" aria-labelledby="work-h">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">
              Click through all of it
            </span>
            <h2 id="work-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              What we’ve built for health.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {work.map((w) => (
              <article key={w.href} className="pop-card overflow-hidden flex flex-col">
                <a href={w.href} {...(w.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="block border-b-2 border-[#0b3b44] bg-[#0b3b44]" aria-label={`${w.cta}: ${w.title}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.shot} alt={w.alt} width={1200} height={750} loading="lazy" className="block w-full h-auto" />
                </a>
                <div className="p-7 md:p-8 flex flex-col flex-1">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-[#0a7c78] font-mono font-bold mb-3 block">{w.kicker}</span>
                  <h3 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight leading-[1.1] mb-4">{w.title}</h3>
                  <p className="text-[#3a3733] text-base font-body leading-7 mb-6 flex-1">{w.body}</p>
                  <a href={w.href} {...(w.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="self-start inline-flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0b3b44] bg-[#f5b700] rounded-full border-2 border-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44] hover:-translate-y-0.5 transition-all">
                    {w.cta} <span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* What gets built */}
        <section className="relative max-w-6xl mx-auto px-6 md:px-8 pb-16 md:pb-24" aria-labelledby="builds-h">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">
              What gets built
            </span>
            <h2 id="builds-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              Four pieces. One practice that never misses a patient.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {builds.map((b) => (
              <article key={b.title} className="pop-card p-7">
                <h3 className="font-display text-lg md:text-xl font-black text-[#0b3b44] tracking-tight mb-3">{b.title}</h3>
                <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">{b.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* The checks */}
        <section className="relative max-w-5xl mx-auto px-6 md:px-8 pb-16 md:pb-24" aria-labelledby="grade-h">
          <div className="pop-card p-8 md:p-12 bg-[#f5b700] grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
            <div className="font-display text-[110px] md:text-[150px] leading-none font-black text-[#0b3b44]" aria-hidden="true">A+</div>
            <div>
              <h2 id="grade-h" className="font-display text-2xl md:text-4xl font-black text-[#0b3b44] tracking-tight leading-[1.1] mb-5">
                What AI reads before it names a practice.
              </h2>
              <ul className="grid gap-2.5">
                {checks.map((c) => (
                  <li key={c} className="flex gap-3 text-[#0b3b44] font-body text-base leading-6">
                    <span className="font-mono font-bold text-[#0a7c78]" aria-hidden="true">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-[#0b3b44]/75 font-body">These are the six things our presence audit grades. Want to know where your practice stands? <Link href="/presence-audit" className="font-semibold underline underline-offset-2">Run the free presence audit</Link>. For the moves that get a practice named in AI answers, see <Link href="/best/ways-to-get-recommended-by-chatgpt-and-google-ai" className="font-semibold underline underline-offset-2">the best ways to get recommended by ChatGPT and Google AI</Link>.</p>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="relative max-w-4xl mx-auto px-6 md:px-8 pb-16 md:pb-24" aria-labelledby="faq-h">
          <h2 id="faq-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1] mb-10 text-center">
            Practices ask us
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
              See your own practice in this style.
            </h2>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto mb-8">
              Tell us your practice and your town. We’ll build a demo of your homepage, free, and show you what Google and
              ChatGPT say about you today.
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
