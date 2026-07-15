import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { HATCHERY, HUCK, HATCH, hatcheryTiers, hatcheryFaq } from '@/data/hatchery';
import HuckVoiceWidget from '@/components/hatchery/HuckVoiceWidget';
import { ClaimEgg, FirstGlimpse } from '@/components/hatchery/HatcheryInteractive';

export const metadata = buildMetadata({
  title: HATCHERY.metaTitle,
  description: HATCHERY.metaDescription,
  path: '/hatchery',
});

const hatch = hatcheryTiers[0];
const carePlans = hatcheryTiers.slice(1);

export default function HatcheryPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'The Mustard Hatchery by Modern Mustard Seed',
        serviceType: 'Official brand mascot creation for small businesses',
        description: HATCHERY.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: {
          '@type': 'Offer',
          name: 'The Hatch',
          price: HATCH.priceUsd,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: `${SITE.url}/hatchery#claim`,
        },
      },
      {
        '@type': 'HowTo',
        name: 'How your business gets its own mascot',
        step: [
          { '@type': 'HowToStep', name: 'Claim your hatch', text: 'Start the hatch for $497. You approve the direction before any art is made.' },
          { '@type': 'HowToStep', name: 'We hatch your mascot', text: 'We write the Character Storybook, draw the model sheet, film the hatching, and give your mascot its own live phone line.' },
          { '@type': 'HowToStep', name: 'Birth Day', text: 'On a scheduled, public Birth Day the egg cracks live and your mascot answers its own phone for everyone you know.' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: hatcheryFaq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <div id="top" className="bg-[#FBF6EA] text-[#161616]" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,.09) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ───────────────────  HERO: the night before something wonderful  ─────────────────── */}
      <section className="relative overflow-hidden bg-[#0d0a05] text-[#FBF6EA] border-b-2 border-[#161616]">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-45"
          autoPlay
          muted
          loop
          playsInline
          poster="/hatchery/huck-hatch-poster.png"
          src="/hatchery/huck-hatching.mp4"
          aria-hidden="true"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(12,9,4,.94) 8%, rgba(12,9,4,.62) 48%, rgba(12,9,4,.72))' }} aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 md:pt-28 pb-16 md:pb-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[#F5B700] font-bold">Modern Mustard Seed presents</p>
          <h1 className="mt-5 font-display font-bold leading-[1.02] tracking-tight text-4xl md:text-6xl lg:text-7xl">
            Your business is<br className="hidden md:block" /> about to be born.
          </h1>
          <p className="mt-6 max-w-xl text-lg md:text-xl text-[#FBF6EA]/85" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)' }}>
            Your official mascot: a story, a face, a voice, and their own phone number. Hatched by candlelight, in front of everyone who loves your shop.
          </p>

          <div id="claim" className="mt-10 scroll-mt-24">
            <ClaimEgg variant="gold" />
          </div>

          <p className="mt-6 text-sm text-[#FBF6EA]/70">
            <Link href={HUCK.revealPath} className="text-[#F5B700] font-bold underline underline-offset-4 decoration-[#F5B700]/50 hover:decoration-[#F5B700]">
              Meet Huck, our first born mascot &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* ───────────────────  THE UNFORGETTABLE THING: he answers his own phone  ─────────────────── */}
      <section className="border-b-2 border-[#161616] bg-[#161616] text-[#FBF6EA]">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#F5B700] font-bold">The one unforgettable thing</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold leading-[1.05]">
              A mascot that answers its own phone.
            </h2>
            <p className="mt-4 text-[#FBF6EA]/75 leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.2rem' }}>
              Not a logo. Not a chatbot on your website. A character with a name and a story who picks up a real phone and talks. Meet Huck right now, no dialing required.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <HuckVoiceWidget />
            <p className="mt-4 text-center text-sm text-[#FBF6EA]/60">
              Prefer to dial? He is live at{' '}
              <a href={HUCK.phoneHref} className="font-bold text-[#F5B700] underline underline-offset-4">{HUCK.phone}</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────  WHAT A BIRTH DAY IS  ─────────────────── */}
      <section className="border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#B54423] font-bold">The Birth Day</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold leading-[1.05] text-[#161616]">
              A birthday the whole town watches.
            </h2>
            <p className="mt-4 text-[#6b6152] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.2rem' }}>
              We set a date and share a countdown. At zero the egg cracks live: the hatching film plays, your mascot is revealed, and the very first thing it does is answer its own phone. It is a marketing moment built to flood your inner circle all at once, and an heirloom you keep forever.
            </p>
            <ol className="mt-7 space-y-4">
              {[
                ['Claim', 'Start the hatch. You approve the direction before a single line is drawn.'],
                ['Hatch', 'We write the storybook, draw the model sheet, film the hatching, and light up the phone line.'],
                ['Birth Day', 'The countdown hits zero, the egg cracks in public, and your mascot says its first hello.'],
              ].map(([step, text], i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#F5B700] border-2 border-[#161616] grid place-items-center font-mono font-bold text-sm">{i + 1}</span>
                  <div>
                    <p className="font-display text-lg font-bold text-[#161616]">{step}</p>
                    <p className="text-[#6b6152] text-[15px] leading-relaxed">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <figure className="rounded-2xl overflow-hidden border-2 border-[#161616] shadow-[6px_6px_0_0_#161616]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hatchery/birth-day.png" alt="A candlelit shop window on Birth Day, the mascot revealed in the glow" className="w-full block" />
          </figure>
        </div>
      </section>

      {/* ───────────────────  WHAT IS BORN (the hatch)  ─────────────────── */}
      <section className="border-b-2 border-[#161616] bg-[#F5EDD9]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <figure className="order-2 md:order-1 rounded-2xl overflow-hidden border-2 border-[#161616] shadow-[6px_6px_0_0_#B54423]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hatchery/deliverables-flatlay.png" alt="The heirloom flat-lay: Character Storybook, hand-numbered Birth Certificate, and model sheet" className="w-full block" />
          </figure>
          <div className="order-1 md:order-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#B54423] font-bold">What is born</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold leading-[1.05] text-[#161616]">
              Everything a real someone needs.
            </h2>
            <p className="mt-4 text-[#6b6152] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.2rem' }}>
              {hatch.tagline} One hatch brings home:
            </p>
            <ul className="mt-6 space-y-3">
              {hatch.includes.map((line) => (
                <li key={line} className="flex gap-3 text-[#161616]">
                  <span className="flex-shrink-0 mt-1 text-[#E8A542]" aria-hidden="true">&#10022;</span>
                  <span className="text-[15px] leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 font-mono text-sm uppercase tracking-[0.2em] text-[#161616]">
              ${HATCH.priceUsd}, one time. The price does not climb.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────  MEET HUCK (proof of the craft)  ─────────────────── */}
      <section className="border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#B54423] font-bold">The pilot birth</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold leading-[1.05] text-[#161616]">This is Huck.</h2>
            <p className="mt-4 text-[#6b6152] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.2rem' }}>
              The official mascot of a little ice cream shop called The Huckleberry Scoop. He is the first mascot hatched here, and the proof of exactly what your business gets.
            </p>
          </div>
          <div className="grid md:grid-cols-[1.15fr_1fr] gap-8 items-center">
            <figure className="rounded-2xl overflow-hidden border-2 border-[#161616] shadow-[6px_6px_0_0_#161616]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hatchery/huck-model-sheet.png" alt="Huck's canonical model sheet: four poses of a round huckleberry mascot" className="w-full block" />
            </figure>
            <div>
              <blockquote className="space-y-4 text-[#161616]" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.2rem', lineHeight: 1.55 }}>
                <p>&ldquo;Picked on a September morning up the Jewel Basin trail, Huck rolled off the scale, under the counter, and refused to be weighed. The founder laughed so hard she gave him a name instead of a price.&rdquo;</p>
              </blockquote>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={HUCK.revealPath} className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-6 py-3 font-sans font-extrabold text-sm uppercase tracking-[0.14em] text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5">
                  See his reveal page
                </Link>
                <a href={HUCK.phoneHref} className="rounded-full border-2 border-[#161616] bg-transparent px-6 py-3 font-sans font-extrabold text-sm uppercase tracking-[0.14em] text-[#161616] transition-all hover:bg-[#161616] hover:text-[#FBF6EA]">
                  Call him: {HUCK.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────  FREE FIRST GLIMPSE (lead magnet)  ─────────────────── */}
      <section className="border-b-2 border-[#161616] bg-[#161616]">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          <FirstGlimpse />
        </div>
      </section>

      {/* ───────────────────  AFTER THE HATCH (the arc)  ─────────────────── */}
      <section className="border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl mb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#B54423] font-bold">After the Birth Day</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold leading-[1.05] text-[#161616]">Keep them alive, or let them rest.</h2>
            <p className="mt-4 text-[#6b6152] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.2rem' }}>
              The hatch is yours forever. If you want your mascot to keep drawing, filming, and answering, two gentle plans keep them going. Stop anytime and they simply hibernate. You never lose a thing.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {carePlans.map((plan) => (
              <div key={plan.slug} className="rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] p-7 shadow-[5px_5px_0_0_#161616]">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl font-bold text-[#161616]">{plan.name}</h3>
                  <p className="font-mono font-bold text-[#B54423]">${plan.priceUsd}<span className="text-[#6b6152] text-xs">/mo</span></p>
                </div>
                <p className="mt-2 text-[#6b6152]" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.1rem' }}>{plan.tagline}</p>
                <ul className="mt-4 space-y-2">
                  {plan.includes.map((line) => (
                    <li key={line} className="flex gap-2.5 text-[15px] text-[#161616]">
                      <span className="flex-shrink-0 mt-1 text-[#E8A542]" aria-hidden="true">&#10022;</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border-2 border-[#161616] bg-[#F5B700]/15 p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B54423] font-bold">The real upgrade</p>
            <p className="mt-2 text-[#161616] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.15rem' }}>
              Your born mascot can become the voice of your whole phone system: a full AI receptionist that answers, qualifies, and books for your business around the clock. The Birth Day is the beginning, not the end.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────  FAQ  ─────────────────── */}
      <section className="border-b-2 border-[#161616] bg-[#F5EDD9]">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#161616] mb-8 text-center">Questions, answered plainly.</h2>
          <div className="space-y-4">
            {hatcheryFaq.map((f) => (
              <details key={f.q} className="group rounded-xl border-2 border-[#161616] bg-[#FBF6EA] p-5 open:shadow-[4px_4px_0_0_#E8A542] transition-shadow">
                <summary className="font-display text-lg font-bold text-[#161616] cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="flex-shrink-0 text-[#B54423] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-[#6b6152] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.1rem' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────  FINAL CTA  ─────────────────── */}
      <section className="bg-[#0d0a05] text-[#FBF6EA]">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#F5B700] font-bold">The official mascot of your business</p>
          <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold leading-[1.05]">
            Every shop deserves a someone.
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-[#FBF6EA]/80" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.2rem' }}>
            Give yours a name, a face, a voice, and a birthday. One time, $497, and you approve the direction before we draw a thing.
          </p>
          <div className="mt-9 flex justify-center">
            <ClaimEgg variant="gold" />
          </div>
          <p className="mt-10 text-sm text-[#FBF6EA]/55 max-w-lg mx-auto leading-relaxed">
            Every hatched mascot is an AI character and says so, cheerfully. The Huckleberry Scoop is a fictional shop we used to hatch our pilot. Your business is real, and so is the mascot we will build for it.
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.35em] text-[#F5B700]/80">
            {HATCHERY.wordmark} &middot; {HATCHERY.by} &middot; Kalispell, Montana
          </p>
        </div>
      </section>
    </div>
  );
}
