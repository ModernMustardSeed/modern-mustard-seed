import { buildMetadata } from '@/lib/seo';
import DemoStation from '@/components/DemoStation';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';

export const metadata = buildMetadata({
  title: 'The Demo Station: three free AI demos, built for your business',
  description:
    'Tell us who you are and we forge three working demos, free: an AI receptionist that answers as your business, a brand-new website, and a business command center. Keep what you love from $97/mo.',
  path: '/demos',
});

const FAQ = [
  {
    q: 'Is it really free?',
    a: 'Yes. The three demos cost you nothing and there is no card and no meeting. We build them because the demos sell themselves; keep what you love from $97 a month, or walk away.',
  },
  {
    q: 'What exactly do I get?',
    a: 'Three working demos personalized to your business: an AI receptionist you can call and try to stump, a complete demo website designed from scratch, and a business command center with your name on the door. All three live at your private hub link.',
  },
  {
    q: 'How fast?',
    a: 'The receptionist and the command center are ready in about twenty seconds. The website is designed by hand-tuned AI and usually lands within the hour; it appears at your hub on its own.',
  },
  {
    q: 'What happens if I want to keep something?',
    a: 'Order right at your hub. Month to month, cancel anytime, a one-time setup covers customization, and we release the real thing within 7 days. No trials and no surprise bills; the demo was the trial.',
  },
];

const PIECES = [
  {
    icon: '🎙',
    title: 'AI Receptionist',
    desc: 'Call it. Pretend you are a customer. Try to stump it. It answers as YOUR business, day or night, and books the job.',
    price: DEMO_PRODUCTS.voice,
    tone: 'ink' as const,
  },
  {
    icon: '🌐',
    title: 'Your New Website',
    desc: 'Designed from scratch for your trade, your town, your phone number. A real working draft, not a template tour.',
    price: DEMO_PRODUCTS.site,
    tone: 'gold' as const,
  },
  {
    icon: '⚙',
    title: 'Command Center',
    desc: 'Your day, customers, reviews, and ads on one board, with an AI that reads the whole thing back to you.',
    price: DEMO_PRODUCTS.os,
    tone: 'white' as const,
  },
];

/**
 * THE DEMO STATION: the ad-funnel front door. Ads land here, the visitor
 * forges their own three-demo suite, the hub sells the keep, and the dial
 * floor follows up on everyone who stalls.
 *
 * Layout law here (learned the hard way): this page is a CONVERSION page, so
 * it is deliberately asymmetric and top-heavy. The film carries the hero (flat
 * color blocks read as a template), the form sits at the top of the fold on
 * desktop instead of below three cards, and every card is a flex column with
 * its price pill pinned to a common baseline so the buttons never float at
 * ragged heights.
 */
export default function DemosPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

      {/* ── Hero: headline left, the forge itself right. Never a centered column. ──
           The site Navbar is FIXED, and its height CHANGES with width (70px on
           phone and desktop, 84px at ~1024, 102px around 768 where it wraps), so
           hero padding must clear the worst case before it starts breathing.
           Measured: this keeps a 64-96px gap under the nav at every breakpoint. */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 pt-32 pb-14 md:pt-40 lg:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* The pitch */}
            <div className="lg:col-span-6 xl:col-span-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold">
                The Demo Station
              </span>
              <h1 className="font-display text-[2.6rem] sm:text-5xl xl:text-6xl font-bold mt-4 leading-[1.02] tracking-tight">
                We build your business{' '}
                <em className="italic text-[#E0301E]">three free demos.</em> Right now.
              </h1>
              <p className="font-body text-[17px] text-[#161616]/70 mt-5 leading-relaxed">
                A receptionist that answers as your business. A brand-new website. A command center with your name on
                the door. Real and working, personalized to you, not a slideshow.
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  'No card. No meeting. No sales call to sit through.',
                  'The first two are ready in about twenty seconds.',
                  `Keep what you love from ${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo. Or keep nothing.`,
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 font-body text-[15px] text-[#161616]/80">
                    <span
                      aria-hidden
                      className="mt-[3px] shrink-0 grid place-items-center h-5 w-5 rounded-md bg-[#F5B700] border-2 border-[#161616] text-[11px] font-bold leading-none"
                    >
                      ✓
                    </span>
                    {t}
                  </li>
                ))}
              </ul>

              <a
                href="#forge"
                className="mt-8 inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-xl px-7 py-4 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform lg:hidden"
              >
                Forge my three demos →
              </a>
            </div>

            {/* The proof: the film. Real motion beats another color block.
                This is the STATION's own film (the forge), not the Demo Suite's
                welcome film. Different audience: cold ad traffic who have never
                heard of us, versus someone who already has their demos. Served
                from the 3.4MB web cut, not the 23MB master: this page is the
                landing pad for paid mobile traffic. */}
            <div className="lg:col-span-6 xl:col-span-7">
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#161616] overflow-hidden">
                <video
                  controls
                  preload="metadata"
                  poster="/video/demos-landing-poster.jpg"
                  src="/video/demos-landing-web.mp4"
                  className="w-full aspect-video bg-[#161616]"
                />
                <div className="flex items-center gap-3 px-4 py-3 border-t-2 border-[#161616]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/mascot.png" alt="" width={34} height={34} className="shrink-0" />
                  <p className="font-body text-[13px] text-[#161616]/70 leading-snug">
                    Thirty seconds at the forge: what we build you, and why it costs nothing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 lg:py-16 space-y-16">
        {/* ── The form. The whole point of the page, so it does not hide below cards. ── */}
        <section id="forge" className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start scroll-mt-8">
          <div className="lg:col-span-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">Start the forge</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3 leading-[1.08]">
              Sixty seconds of you. Twenty seconds of us.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/70 mt-4 leading-relaxed">
              The phone number matters: your receptionist demo answers as your business, so we build it against a real
              line. Nothing is charged and nobody calls you unless you ask.
            </p>
            <div className="mt-6 bg-[#161616] rounded-2xl border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">What lands</p>
              <p className="font-body text-[14px] text-[#FBF6EA]/80 mt-2 leading-relaxed">
                One private hub link with all three demos inside, plus a calculator that shows what the calls you miss
                are already costing you.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7">
            <DemoStation />
          </div>
        </section>

        {/* ── The three pieces. Flex columns, pills pinned to one baseline. ── */}
        <section>
          <h2 className="font-display text-3xl sm:text-4xl font-bold">What actually shows up</h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-2 max-w-2xl">
            Three working things with your name on them. Play with all of them, keep any of them, or keep none.
          </p>
          <div className="grid sm:grid-cols-3 gap-5 mt-7">
            {PIECES.map((c) => (
              <div
                key={c.title}
                className={`flex flex-col border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 ${
                  c.tone === 'ink'
                    ? 'bg-[#161616] text-[#FBF6EA]'
                    : c.tone === 'gold'
                      ? 'bg-[#F5B700] text-[#161616]'
                      : 'bg-white text-[#161616]'
                }`}
              >
                <span className="text-3xl leading-none">{c.icon}</span>
                <h3 className="font-display text-xl font-bold mt-3 leading-tight">{c.title}</h3>
                <p
                  className={`font-body text-[13.5px] mt-2 leading-relaxed ${
                    c.tone === 'ink' ? 'text-[#FBF6EA]/70' : 'text-[#161616]/70'
                  }`}
                >
                  {c.desc}
                </p>
                {/* mt-auto is the fix for the ragged buttons: every pill sits on one line. */}
                <p
                  className={`mt-auto pt-5 font-mono text-[12px] font-bold ${
                    c.tone === 'gold' ? 'text-[#161616]' : c.tone === 'ink' ? 'text-[#F5B700]' : 'text-[#161616]'
                  }`}
                >
                  Free demo
                  <span className={c.tone === 'ink' ? 'text-[#FBF6EA]/40' : 'text-[#161616]/40'}> · </span>
                  keep for {formatUsd(c.price.monthlyCents)}/mo
                </p>
              </div>
            ))}
          </div>
          <p className="font-body text-[14px] text-[#161616]/60 mt-5">
            Want all three? The whole system is {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo, month to month, and you order
            it right from your hub.
          </p>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 mt-6">
            {[
              { n: '1', t: 'You tell us who you are', d: 'Sixty seconds, the form above. No card, no meeting.' },
              { n: '2', t: 'The forge builds', d: 'Receptionist and command center in seconds. Your website is designed by hand-tuned AI and lands at your hub within the hour.' },
              {
                n: '3',
                t: 'Keep what you love',
                d: `Order at your hub: from ${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo per piece, ${formatUsd(DEMO_BUNDLE.monthlyCents)}/mo for the whole system. Live within 7 days.`,
              },
            ].map((s) => (
              <div key={s.n} className="flex gap-4 sm:block">
                <span className="font-display text-5xl font-bold text-[#F5B700] leading-none shrink-0">{s.n}</span>
                <div className="sm:mt-3">
                  <h3 className="font-display text-lg font-bold text-[#FBF6EA] leading-tight">{s.t}</h3>
                  <p className="font-body text-[13.5px] text-[#FBF6EA]/65 mt-1.5 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <h2 className="font-display text-3xl font-bold">Fair questions</h2>
            <p className="font-body text-[14px] text-[#161616]/60 mt-3">
              Still stuck? Call us at{' '}
              <a href="tel:+14063121223" className="font-bold text-[#1E50C8] underline underline-offset-2">
                (406) 312-1223
              </a>
              . Yes, an AI answers our phone too. Try to stump it.
            </p>
          </div>
          <div className="lg:col-span-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 group">
                <summary className="font-sans font-bold cursor-pointer list-none flex justify-between items-center gap-4">
                  {f.q}
                  <span className="text-[#E0301E] group-open:rotate-45 transition-transform text-xl leading-none shrink-0">+</span>
                </summary>
                <p className="font-body text-[14px] text-[#161616]/70 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="font-mono text-[11px] text-[#161616]/40 text-center pb-4">
          Modern Mustard Seed · Kalispell, MT · (406) 312-1223
        </p>
      </main>
    </div>
  );
}
