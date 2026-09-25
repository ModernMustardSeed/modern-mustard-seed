import { Suspense, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BookCall from '@/components/BookCall';
import { Marquee } from '@/components/home/HeroMotion';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import s from './book.module.css';

export const metadata = buildMetadata({
  title: 'Book a Call with Sarah',
  description:
    'Book a free 30-minute discovery call with Sarah Scarano of Modern Mustard Seed. Tell her what you want to build and pick a time. Tuesdays through Fridays.',
  path: '/book',
});

/* The shell has no request-time data: open times are fetched client-side from
   /api/book/slots, so they stay live even when this page is served from the CDN.
   Prerendering it drops the per-request server render (~730ms of TTFB). */

/* Each step is a comic panel cut from the same screenprint as the hero: the
   phone for the talking, the pen for the plan, the stamp for the next move.
   s is the zoom, ox/oy the point it zooms into. */
const whatHappens = [
  {
    title: 'You talk, she listens',
    body: 'You walk her through what you are building and where it is stuck. She read your answers before the call, so you are not starting from zero.',
    narr: 'Meanwhile, on the call',
    bubble: 'Tell me everything.',
    crop: { s: 2.0, ox: '80%', oy: '30%' },
    tilt: '-1.4deg',
  },
  {
    title: 'She tells you what she would do',
    body: 'Straight read on the fastest path, what it takes, and what it costs. If software is the wrong answer, she says so on the call.',
    narr: 'Then',
    bubble: 'Here is the fast path.',
    crop: { s: 2.5, ox: '14%', oy: '88%' },
    tilt: '0.9deg',
  },
  {
    title: 'You leave with the next move',
    body: 'A plan you can act on whether or not you hire her. Most people leave with something they can do that same week.',
    narr: 'And finally',
    bubble: 'Stamped. Your move.',
    crop: { s: 1.9, ox: '44%', oy: '46%' },
    tilt: '-0.7deg',
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

const DAYS = ['Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', '30 minutes', 'Free', 'No pitch'];
const TAPE = ['Questions, answered plainly', 'Mountain Time', 'Tuesdays through Fridays', 'Reschedule any time', 'No intake bot'];

/** A comic starburst as SVG polygon points, in a 100 by 100 box. */
function burst(points: number, outer: number, inner: number): string {
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}
const BIG_BURST = burst(16, 50, 38);
const INNER_BURST = burst(16, 41, 31);
const NUM_BURST = burst(12, 50, 36);

/** Mr. Mustard, waving. AVIF first, WebP next, the PNG for everything else. */
function Mascot({ sizes, eager = false }: { sizes: string; eager?: boolean }) {
  return (
    <picture>
      <source type="image/avif" srcSet="/brand/mascot-hero-480.avif 480w, /brand/mascot-hero-720.avif 720w" sizes={sizes} />
      <source type="image/webp" srcSet="/brand/mascot-hero-480.webp 480w, /brand/mascot-hero-720.webp 720w" sizes={sizes} />
      <img src="/brand/mascot.png" alt="" width={480} height={652} loading={eager ? 'eager' : 'lazy'} decoding="async" className={s.mascotImg} />
    </picture>
  );
}

function Strip({ items, className }: { items: string[]; className: string }) {
  return (
    <Marquee className={className}>
      <div>
        {[0, 1].map((k) => (
          <span key={k} className="inline-flex">
            {items.map((t) => (
              <span key={t} className={s.mItem}>{t}<i>✦</i></span>
            ))}
          </span>
        ))}
      </div>
    </Marquee>
  );
}

export default function BookPage() {
  return (
    <div className={s.page}>
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

      {/* ───────────────  HERO: the desk, framed and hung  ─────────────── */}
      <section className={s.hero}>
        <div className={s.heroDots} aria-hidden="true" />
        <span className={`${s.spark} ${s.hs1}`} aria-hidden="true">✦</span>
        <span className={`${s.spark} ${s.hs2}`} aria-hidden="true">✦</span>
        <span className={`${s.spark} ${s.hs3}`} aria-hidden="true">✦</span>
        <span className={`${s.spark} ${s.hs4}`} aria-hidden="true">✦</span>
        <span className={`${s.spark} ${s.hs5}`} aria-hidden="true">✦</span>

        <div className={s.heroInner}>
          <div className={s.heroCopy}>
            <span className="inline-flex items-center gap-2 font-mono text-[9.5px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.18em] font-bold bg-white text-[#B92417] border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">
              ☎ Tuesdays through Fridays · 30 minutes · free
            </span>
            <h1 className={s.h1}>
              Get on the <em className={s.hl}>book</em>.
            </h1>
            <p className={s.lead}>
              Thirty minutes with Sarah, no pitch. Tell her what you are building and where you are stuck, pick a time, and she comes prepared. Done-for-you build or just figuring out the next move, this is where it starts.
            </p>
            <div className={s.actions}>
              <a href="#pick" className={s.cta}>
                Pick your time <span aria-hidden="true">↓</span>
              </a>
              <a href="#what-happens" className={s.ctaAlt}>
                See what happens on it
              </a>
            </div>
            <p className={s.note}>
              Not ready to talk?{' '}
              <Link href="/contact" className="font-bold text-[#B92417] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
                Send a note instead
              </Link>{' '}
              and Sarah answers inside a day.
            </p>
          </div>

          {/* The desk: her book is open, and you stamp your name into it. */}
          <div className={s.stage}>
            <div className={s.glow} aria-hidden="true" />
            <div className={s.rays} aria-hidden="true" />
            <figure className={s.frame}>
              <span className={`${s.tape} ${s.tapeL}`} aria-hidden="true" />
              <span className={`${s.tape} ${s.tapeR}`} aria-hidden="true" />
              <Image
                src="/book/datebook-hero.jpg"
                alt="Pop-art screenprint: a hand stamps an open appointment datebook on a desk beside a rotary telephone and a gold fountain pen"
                width={1600}
                height={904}
                priority
                sizes="(min-width: 1024px) 600px, 92vw"
                className={s.frameImg}
              />
              <figcaption className={s.frameCap}>Her book is open · stamp your name in it</figcaption>
            </figure>
            <div className={s.sticker} aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <polygon points={BIG_BURST} fill="#E0301E" stroke="#161616" strokeWidth="2.4" strokeLinejoin="round" />
                <polygon points={INNER_BURST} fill="#F5B700" stroke="#161616" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              <span className={s.stickerText}>Ka-<br />chunk!</span>
            </div>
            <div className={s.heroMascot} aria-hidden="true">
              <Mascot sizes="(max-width: 760px) 92px, 168px" eager />
            </div>
            <span className={`${s.bubble} ${s.heroBubble}`} aria-hidden="true">Your name goes here!</span>
          </div>
        </div>
      </section>

      <Strip items={DAYS} className={s.marquee} />

      {/* ───────────────  WHAT HAPPENS ON IT: the comic strip  ─────────────── */}
      <section id="what-happens" className={`scroll-mt-20 ${s.steps}`}>
        <div className={s.stepsDots} aria-hidden="true" />
        <div className={s.inner}>
          <div className={s.head}>
            <p className={s.caption}>What happens on it</p>
            <h2 className={s.h2}>
              Thirty minutes. Nobody books <em className={s.hl}>blind.</em>
            </h2>
            <p className={s.sub}>
              You are not booking a mystery. Here is exactly how the half hour goes, start to finish.
            </p>
          </div>

          <div className={s.panels}>
            {whatHappens.map((step, i) => (
              <article key={step.title} className={s.panel} style={{ '--tilt': step.tilt } as CSSProperties}>
                <div className={s.num} aria-hidden="true">
                  <svg viewBox="0 0 100 100">
                    <polygon points={NUM_BURST} fill="#F5B700" stroke="#161616" strokeWidth="3.2" strokeLinejoin="round" />
                  </svg>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div
                  className={s.panelArt}
                  style={{ '--s': step.crop.s, '--ox': step.crop.ox, '--oy': step.crop.oy } as CSSProperties}
                >
                  {/* The crop zooms in about 2x, so ask for twice the pixels to stay sharp. */}
                  <Image src="/book/datebook-hero.jpg" alt="" fill sizes="(min-width: 900px) 760px, 200vw" />
                  <span className={`${s.bubble} ${s.bubbleRight} ${s.panelBubble}`} aria-hidden="true">{step.bubble}</span>
                  <span className={s.narr} aria-hidden="true">{step.narr}</span>
                </div>
                <h3 className={s.panelTitle}>{step.title}</h3>
                <p className={s.panelBody}>{step.body}</p>
              </article>
            ))}
          </div>

          <div className={s.promise}>
            <div className={s.promiseDots} aria-hidden="true" />
            <div className={s.promiseMascot} aria-hidden="true">
              <Mascot sizes="(max-width: 760px) 118px, 170px" />
            </div>
            <span className={s.swear} aria-hidden="true">Pinky swear</span>
            <p className={s.promiseLabel}>The no-pitch promise</p>
            <p className={s.promiseText}>
              Nobody is going to chase you afterward. If it is a fit, Sarah tells you what it costs and you decide on your own clock. If it is not, she points you at what is.
            </p>
          </div>
        </div>
      </section>

      <div className={s.zig} aria-hidden="true" />

      {/* ───────────────  THE CARD + THE FORM (signature), on mustard  ─────────────── */}
      <section className={s.ticket}>
        <div className={s.ticketRays} aria-hidden="true" />
        <div className={s.ticketDots} aria-hidden="true" />
        <span className={`${s.spark} ${s.ts1}`} aria-hidden="true">✦</span>
        <span className={`${s.spark} ${s.ts2}`} aria-hidden="true">✦</span>
        <span className={`${s.spark} ${s.ts3}`} aria-hidden="true">✦</span>
        <span className={`${s.spark} ${s.ts4}`} aria-hidden="true">✦</span>
        <div className={s.ticketInner}>
          <div className={s.ticketHead}>
            <p className={s.caption}>Your appointment card</p>
            <h2 className={s.h2}>
              Fill it in. Pick a time. <em className={`${s.hl} ${s.hlCream}`}>Stamp it.</em>
            </h2>
            <p className={s.ticketSub}>
              Your card writes itself as you go. Answer what you can, skip what you cannot, and pick whichever time fits. The optional questions just make the thirty minutes count for more.
            </p>
          </div>
          {/*
            SUSPENSE IS REQUIRED, not decoration.

            BookCall reads useSearchParams so the foot of a presence audit can
            hand it "Scored 78. Would like us to build: a website." A client
            component that reads search params inside a statically prerendered
            page fails the export outright, which is what happened: "Error
            occurred prerendering page /book". The boundary is what lets the rest
            of the page stay static while the form waits for the URL.
          */}
          <div className={s.bookWrap}>
            {/* Mr. Mustard peeks over the top of the first card. */}
            <div className={s.peek} aria-hidden="true">
              <Mascot sizes="(max-width: 1023px) 104px, 150px" />
            </div>
            <span className={`${s.bubble} ${s.bubbleRight} ${s.peekBubble}`} aria-hidden="true">Psst. Pick a time!</span>
            <Suspense fallback={<div className="min-h-[420px]" />}>
              <BookCall />
            </Suspense>
          </div>
        </div>
      </section>

      <Strip items={TAPE} className={s.tapeBand} />

      {/* ───────────────  FAQ: speech bubbles  ─────────────── */}
      <section className={s.faq}>
        <div className={s.faqDots} aria-hidden="true" />
        <span className={`${s.spark} ${s.fs1}`} aria-hidden="true">✦</span>
        <span className={`${s.spark} ${s.fs2}`} aria-hidden="true">✦</span>
        <span className={`${s.spark} ${s.fs3}`} aria-hidden="true">✦</span>
        <div className={s.faqInner}>
          <div className={s.faqHead}>
            <div className={`${s.faqMascot} ${s.faqArt}`} aria-hidden="true">
              <div className={s.faqBurst}>
                <svg viewBox="0 0 100 100">
                  <polygon points={BIG_BURST} fill="#F5B700" stroke="#161616" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
              </div>
              <Mascot sizes="(min-width: 1024px) 200px, 84px" />
              <span className={`${s.bubble} ${s.faqBubble}`}>?</span>
            </div>
            <h2 className={`${s.h2} ${s.faqH2}`}>
              Questions, answered <em className={s.hl}>plainly.</em>
            </h2>
          </div>
          <div className={s.faqList}>
            {faq.map((f) => (
              <details key={f.q} className={s.q}>
                <summary>
                  {f.q}
                  <span className={s.toggle} aria-hidden="true">+</span>
                </summary>
                <p className={s.answer}>{f.a}</p>
              </details>
            ))}
          </div>
          <p className={s.faqNote}>
            Would rather write it out?{' '}
            <Link href="/contact" className="font-bold text-[#B92417] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
              Send a note instead
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
