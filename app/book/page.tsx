import Link from 'next/link';
import Image from 'next/image';
import BookCall from '@/components/BookCall';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';

export const metadata = buildMetadata({
  title: 'Book a Call with Sarah',
  description:
    'Book a free 30-minute discovery call with Sarah Scarano of Modern Mustard Seed. Tell her what you want to build and pick a time. Tuesdays through Fridays.',
  path: '/book',
});

/* The shell has no request-time data: open times are fetched client-side from
   /api/book/slots, so they stay live even when this page is served from the CDN.
   Prerendering it drops the per-request server render (~730ms of TTFB). */

const whatHappens = [
  {
    title: 'You talk, she listens',
    body: 'You walk her through what you are building and where it is stuck. She read your answers before the call, so you are not starting from zero.',
  },
  {
    title: 'She tells you what she would do',
    body: 'Straight read on the fastest path, what it takes, and what it costs. If software is the wrong answer, she says so on the call.',
  },
  {
    title: 'You leave with the next move',
    body: 'A plan you can act on whether or not you hire her. Most people leave with something they can do that same week.',
  },
];

const faq = [
  { q: 'What does the call cost?', a: 'Nothing. It is a free 30-minute discovery call. There is no pitch and no obligation at the end of it.' },
  { q: 'Who am I actually talking to?', a: 'Sarah Scarano, the founder of Modern Mustard Seed. Not a sales rep, not a scheduler, not an intake bot. She is the one who would build the thing.' },
  { q: 'Do I need to prepare anything?', a: 'No. The questions on this page are the prep. Answer what you can, leave the optional ones blank, and show up.' },
  { q: 'What if I am just exploring?', a: 'That is a fine reason to book. Mark the timeline as "Just exploring" and she will treat it as a thinking session, not a sales call.' },
  { q: 'What time zone are the times in?', a: 'Mountain Time. Every slot you see is shown in Mountain Time, and calls run Tuesdays through Fridays.' },
  { q: 'Can I reschedule?', a: 'Yes. Reply to the calendar invite or email sarah@modernmustardseed.com and we will move it. No penalty, no awkwardness.' },
];

export default function BookPage() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: 'Book a Call', url: '/book' }]),
          faqJsonLd(faq),
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Discovery call with Modern Mustard Seed',
            serviceType: 'Free 30-minute discovery call',
            description:
              'A free 30-minute discovery call with Sarah Scarano to talk through what you are building, what is stuck, and the fastest path forward.',
            provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
            areaServed: 'US',
            url: `${SITE.url}/book`,
            offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
          },
        ]}
      />

      {/* ───────────────  HERO — the desk  ─────────────── */}
      <section className="relative overflow-hidden border-b-2 border-[#161616] halftone-bg">
        <div className="relative z-[2] max-w-6xl mx-auto px-6 pt-28 md:pt-36 pb-14 md:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] font-bold bg-white text-[#E0301E] border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">
                ☎ Tuesdays through Fridays · 30 minutes · free
              </span>
              <h1 className="mt-6 font-display font-extrabold leading-[0.98] tracking-tight text-5xl md:text-6xl lg:text-[4.6rem] text-[#161616]">
                Get on the <em className="italic text-[#B48600]">book</em>.
              </h1>
              <p className="mt-6 max-w-xl text-lg md:text-xl text-[#3d382e] font-body leading-relaxed">
                Thirty minutes with Sarah, no pitch. Tell her what you are building and where you are stuck, pick a time, and she comes prepared. Done-for-you build or just figuring out the next move, this is where it starts.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#pick" className="rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]">
                  Pick your time
                </a>
                <a href="#what-happens" className="rounded-full border-2 border-[#161616] bg-white px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]">
                  See what happens on it
                </a>
              </div>
              <p className="mt-6 font-body text-[15px] text-[#5c554a]">
                Not ready to talk?{' '}
                <Link href="/contact" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
                  Send a note instead
                </Link>{' '}
                and Sarah answers inside a day.
              </p>
            </div>

            {/* The desk: her book is open, and you stamp your name into it. */}
            <div className="lg:col-span-5">
              <figure className="relative rotate-[-1.5deg] rounded-2xl border-[3px] border-[#161616] bg-white p-2.5 shadow-[9px_9px_0_0_#F5B700]">
                <Image
                  src="/book/datebook-hero.jpg"
                  alt="Pop-art screenprint: a hand stamps an open appointment datebook on a desk beside a rotary telephone and a gold fountain pen"
                  width={1600}
                  height={900}
                  priority
                  sizes="(min-width: 1024px) 40vw, 92vw"
                  className="rounded-xl border-2 border-[#161616] w-full h-auto"
                />
                <figcaption className="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5c554a] text-center">
                  Her book is open · stamp your name in it
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────  WHAT HAPPENS ON IT  ─────────────── */}
      <section id="what-happens" className="scroll-mt-20 border-b-2 border-[#161616] bg-[#F5F0E8]">
        <div className="relative z-[2] max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold">What happens on it</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] text-[#161616]">
              Thirty minutes. Nobody books blind.
            </h2>
            <p className="mt-4 text-[#5c554a] font-body leading-relaxed">
              You are not booking a mystery. Here is exactly how the half hour goes, start to finish.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {whatHappens.map((s, i) => (
              <div key={s.title} className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616]">
                <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-[#F5B700] border-2 border-[#161616] font-mono font-bold text-lg shadow-[3px_3px_0_0_#161616]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-[#161616]">{s.title}</h3>
                <p className="mt-1.5 text-[#5c554a] text-[15px] leading-relaxed font-body">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-6 md:p-7 shadow-[5px_5px_0_0_#161616] flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#161616] bg-white">
              <Image src="/brand/mascot.png" alt="" fill sizes="56px" className="object-contain p-1" />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#161616]/70">The no-pitch promise</p>
              <p className="mt-1 font-body text-[15px] leading-relaxed text-[#161616]/85">
                Nobody is going to chase you afterward. If it is a fit, Sarah tells you what it costs and you decide on your own clock. If it is not, she points you at what is.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────  THE CARD + THE FORM (signature)  ─────────────── */}
      <section className="border-b-2 border-[#161616] halftone-bg">
        <div className="relative z-[2] max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold">Your appointment card</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] text-[#161616]">
              Fill it in. Pick a time. Stamp it.
            </h2>
            <p className="mt-4 text-[#5c554a] font-body leading-relaxed">
              Your card writes itself as you go. Answer what you can, skip what you cannot, and pick whichever time fits. The optional questions just make the thirty minutes count for more.
            </p>
          </div>
          <BookCall />
        </div>
      </section>

      {/* ───────────────  FAQ  ─────────────── */}
      <section className="bg-[#F5F0E8]">
        <div className="relative z-[2] max-w-3xl mx-auto px-6 py-16 md:py-24">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-[#161616] mb-8 text-center">Questions, answered plainly.</h2>
          <div className="space-y-4">
            {faq.map((f) => (
              <details key={f.q} className="group rounded-xl border-2 border-[#161616] bg-white p-5 open:shadow-[4px_4px_0_0_#F5B700] transition-shadow">
                <summary className="font-display text-lg font-bold text-[#161616] cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="flex-shrink-0 text-[#E0301E] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-[#5c554a] leading-relaxed font-body">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-10 text-center font-body text-[15px] text-[#5c554a]">
            Would rather write it out?{' '}
            <Link href="/contact" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
              Send a note instead
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
