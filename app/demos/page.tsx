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

/**
 * THE DEMO STATION: the ad-funnel front door. Ads land here, the visitor
 * forges their own three-demo suite, the hub sells the keep, and the dial
 * floor follows up on everyone who stalls. Pop-art MMS system throughout.
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

      {/* Hero */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-12 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold">The Demo Station</span>
          <h1 className="font-display text-4xl md:text-6xl font-bold mt-4 leading-[1.05]">
            We build your business <em className="italic text-[#E0301E]">three free demos.</em> Right now.
          </h1>
          <p className="font-body text-[17px] text-[#161616]/70 mt-5 max-w-xl mx-auto">
            An AI receptionist that answers as your business. A brand-new website. A command center with your name on
            the door. Real, working, and personalized to you, not a slideshow. Keep what you love from{' '}
            {formatUsd(DEMO_PRODUCTS.site.monthlyCents)} a month.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        {/* The three things */}
        <section className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: '🎙', title: 'AI Receptionist', desc: 'Call it. Pretend you are a customer. Try to stump it. It answers as YOUR business, 24/7.', price: DEMO_PRODUCTS.voice },
            { icon: '🌐', title: 'Your New Website', desc: 'Designed from scratch for your trade, your town, your phone number. Not a template tour.', price: DEMO_PRODUCTS.site },
            { icon: '⚙', title: 'Command Center', desc: 'Your day, customers, reviews, and ads on one board, with an AI that reads it to you.', price: DEMO_PRODUCTS.os },
          ].map((c) => (
            <div key={c.title} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-5">
              <span className="text-3xl">{c.icon}</span>
              <h2 className="font-display text-xl font-bold mt-2">{c.title}</h2>
              <p className="font-body text-[13px] text-[#161616]/70 mt-2 leading-relaxed">{c.desc}</p>
              <p className="font-mono text-[12px] font-bold text-[#161616] mt-3 bg-[#F5B700] border-2 border-[#161616] rounded-full px-3 py-1 inline-block">
                free demo · keep for {formatUsd(c.price.monthlyCents)}/mo
              </p>
            </div>
          ))}
        </section>

        {/* The form */}
        <section id="forge">
          <div className="text-center mb-5">
            <h2 className="font-display text-3xl font-bold">Sixty seconds of you, twenty seconds of us</h2>
            <p className="font-body text-[#161616]/70 mt-2">
              The phone number matters: your receptionist demo answers as your business.
            </p>
          </div>
          <DemoStation />
        </section>

        {/* How it works */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#B58A2A] p-6 sm:p-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-6 mt-4">
            {[
              { n: '1', t: 'You tell us who you are', d: 'Sixty seconds, the form above. No card, no meeting.' },
              { n: '2', t: 'The forge builds', d: 'Receptionist and command center in seconds; your website lands within the hour at your private hub.' },
              { n: '3', t: 'Keep what you love', d: `Order at your hub: from ${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo per piece, ${formatUsd(DEMO_BUNDLE.monthlyCents)}/mo for the whole system. Live within 7 days.` },
            ].map((s) => (
              <div key={s.n}>
                <span className="font-display text-4xl font-bold text-[#F5B700]">{s.n}</span>
                <h3 className="font-display text-lg font-bold text-[#FBF6EA] mt-1">{s.t}</h3>
                <p className="font-body text-[13px] text-[#FBF6EA]/65 mt-1.5 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">Fair questions</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 group">
                <summary className="font-sans font-bold cursor-pointer list-none flex justify-between items-center">
                  {f.q}
                  <span className="text-[#E0301E] group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="font-body text-[14px] text-[#161616]/70 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="font-mono text-[11px] text-[#161616]/40 text-center pb-8">
          Modern Mustard Seed · Kalispell, MT · (406) 312-1223 · Yes, an AI answers our phone too. Try it.
        </p>
      </main>
    </div>
  );
}
