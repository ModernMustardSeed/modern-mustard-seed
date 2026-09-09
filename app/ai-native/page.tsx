import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { AI_NATIVE, STUDIO_PROOF, aiNativeTiers, aiNativeMethod, aiNativeFaq, aiNativeUsd } from '@/data/ai-native';
import AiNativeTiers from '@/components/ai-native/AiNativeTiers';
import ReadForm from '@/components/ai-native/ReadForm';

export const metadata = buildMetadata({
  title: AI_NATIVE.metaTitle,
  description: AI_NATIVE.metaDescription,
  path: '/ai-native',
  // Route-level card. buildMetadata sets openGraph.images, which overrides
  // the file-based opengraph-image convention, so it must be named here.
  image: '/ai-native/opengraph-image',
});

const PORTFOLIO_PATH = '/sarahscarano';

/** What a native company looks like on an ordinary Tuesday. Illustrative, not a client claim. */
const TUESDAY = [
  'The phone is answered at 6:40 a.m. and the job is on the calendar before anyone is in.',
  'The quote that used to take two days goes out the same afternoon, in your words, at your prices.',
  'The inbox is sorted, drafted and prioritized before the first coffee. A person sends it.',
  'The Monday numbers write themselves on Sunday night and are waiting in the owner’s inbox.',
  'A new hire reads the playbook on day one and is useful by Friday.',
  'Nobody on the team has our phone number in their favorites, because nothing needs us to run.',
];

const FOR = [
  'You run a company with a team, and the team runs the day to day without you in every step.',
  'You have watched a competitor get faster and you know why.',
  'You want AI in the business, in your accounts, with your people running it.',
  'You would rather pay a set price than sign up for a retainer with no finish line.',
];

const NOT_FOR = [
  'You want a tool recommended and a deck delivered. The map is the smallest thing we sell, and it comes with a working session.',
  'You want us to run it for you forever. That is HUNDREDFOLD, and it is a different door.',
  'You have an idea and no company yet. That is Idea to Product.',
];

export default function AiNativePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'AI Native by Modern Mustard Seed',
        serviceType: 'AI integration consulting and team training for small business',
        description: AI_NATIVE.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: aiNativeTiers.map((t) => ({
          '@type': 'Offer',
          name: `${AI_NATIVE.name} ${t.name}`,
          price: t.priceCents / 100,
          priceCurrency: 'USD',
          url: `${SITE.url}/ai-native#book`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'HowTo',
        name: 'How a company goes AI native here',
        step: aiNativeMethod.map((s) => ({ '@type': 'HowToStep', name: s.title, text: s.body })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: aiNativeFaq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <div id="top" className="bg-[#FBF6EA] text-[#161616]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── THE DOOR ─── */}
      <section className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-5 pt-28 md:pt-24 pb-14 md:pb-20">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">{AI_NATIVE.wordmark}</p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#161616] tracking-tight leading-[0.98]">
              Your company, running on AI.
              <br />
              Your team, <em className="italic">running it</em>.
            </h1>
            <p className="font-body text-base md:text-lg text-[#161616]/70 max-w-2xl mx-auto mt-6 leading-relaxed">{AI_NATIVE.promise}</p>
          </div>

          <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#book"
              className="rounded-full bg-[#161616] border-2 border-[#161616] px-8 py-3.5 font-sans font-extrabold text-[#FBF6EA] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5"
            >
              See the three doors
            </a>
            <a
              href="#read"
              className="rounded-full bg-white border-2 border-[#161616] px-8 py-3.5 font-sans font-extrabold text-[#161616] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5"
            >
              Get the free AI Read
            </a>
          </div>
          <p className="font-body text-sm text-[#161616]/60 text-center mt-6">
            Built and coached by Sarah Scarano.{' '}
            <Link href={PORTFOLIO_PATH} className="font-bold text-[#161616] underline underline-offset-4 decoration-[#F5B700] decoration-2 hover:decoration-[#161616]">
              See the portfolio
            </Link>
          </p>
        </div>
      </section>

      {/* ─── THE PROOF STRIP ─── */}
      <section className="bg-[#161616] border-b-2 border-[#161616]" aria-label="How the studio itself runs">
        <div className="max-w-5xl mx-auto px-5 py-8 md:py-10">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-7">
            {STUDIO_PROOF.map((p) => (
              <div key={p.label} className="text-center">
                <p className="font-display text-3xl md:text-4xl font-black text-[#F5B700] tracking-tight leading-none">{p.n}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FBF6EA]/70 mt-2 leading-snug">{p.label}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FBF6EA]/50 text-center mt-7">How this studio runs today. The company we help you become is the one we already are.</p>
        </div>
      </section>

      {/* ─── WE RUN THIS WAY OURSELVES ─── */}
      <section className="py-16 md:py-24" aria-labelledby="native-heading">
        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-[1.05fr_0.95fr] gap-10 md:gap-14 items-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3">[ We run this way ourselves ]</p>
            <h2 id="native-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
              One person. Seventeen agents. <em className="italic">A whole company.</em>
            </h2>
            <p className="font-body text-[#161616]/75 leading-relaxed mt-5">
              Modern Mustard Seed is a product studio run by one person and a back office of agents. The leads are found by the machine, the demo sites are built by it, the follow-up is sent by it, and the books are kept by it. The person at the desk decides, designs and talks to clients. That is what AI native means here, and it is the same shape we build inside your company.
            </p>
            <p className="font-body text-[#161616]/75 leading-relaxed mt-4">
              Nothing on this page is theory. Every workflow we move onto AI for you is one we moved first for ourselves, and the portfolio is the receipt.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href={PORTFOLIO_PATH}
                className="inline-flex items-center justify-center rounded-full bg-[#F5B700] border-2 border-[#161616] px-7 py-3 font-sans font-extrabold text-[#161616] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5"
              >
                See the portfolio
              </Link>
              <Link
                href="/work"
                className="inline-flex items-center justify-center rounded-full bg-white border-2 border-[#161616] px-7 py-3 font-sans font-extrabold text-[#161616] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5"
              >
                Read the case studies
              </Link>
            </div>
            <p className="font-body text-sm text-[#161616]/60 mt-5">
              The machine itself is drawn out on{' '}
              <Link href="/the-system" className="font-bold text-[#161616] underline underline-offset-4">
                The System
              </Link>
              , one running loop from lead to delivery.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">[ An ordinary Tuesday, native ]</p>
            <ul className="mt-4 space-y-3">
              {TUESDAY.map((line) => (
                <li key={line} className="flex gap-3 font-body text-sm text-[#161616] leading-snug">
                  <span aria-hidden="true" className="mt-[4px] h-3 w-3 flex-shrink-0 rounded-sm border-2 border-[#161616] bg-[#F5B700]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 mt-5">What the first five workflows usually buy back</p>
          </div>
        </div>
      </section>

      {/* ─── THE METHOD ─── */}
      <section className="py-16 md:py-24 bg-white border-y-2 border-[#161616]" aria-labelledby="method-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">[ The method ]</p>
          <h2 id="method-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
            Six steps. The same six, every company.
          </h2>
          <p className="font-body text-[#161616]/70 text-center max-w-2xl mx-auto mt-4">
            Going native is engineered, not improvised. The map decides the order, the build happens in your accounts, and the sessions happen on your real work, which is why the price is set before the first call.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {aiNativeMethod.map((s) => (
              <div key={s.n} className="rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] p-7 shadow-[6px_6px_0_0_#161616]">
                <p className="font-display italic text-4xl font-black text-[#F5B700]" aria-hidden="true">
                  {s.n}
                </p>
                <h3 className="font-display text-xl font-black text-[#161616] mt-3">{s.title}</h3>
                <p className="font-body text-sm text-[#161616]/70 leading-relaxed mt-2.5">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOR / NOT FOR ─── */}
      <section className="py-16 md:py-24" aria-labelledby="fit-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">[ The fit ]</p>
          <h2 id="fit-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
            For a company that already works.
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-7 shadow-[6px_6px_0_0_#161616]">
              <h3 className="font-display text-xl font-black text-[#161616]">This is your door if</h3>
              <ul className="mt-4 space-y-3">
                {FOR.map((line) => (
                  <li key={line} className="flex gap-3 font-body text-sm text-[#161616] leading-snug">
                    <span aria-hidden="true" className="mt-[4px] h-3 w-3 flex-shrink-0 rounded-sm border-2 border-[#161616] bg-[#FBF6EA]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
              <h3 className="font-display text-xl font-black text-[#161616]">This is a different door if</h3>
              <ul className="mt-4 space-y-3">
                {NOT_FOR.map((line) => (
                  <li key={line} className="flex gap-3 font-body text-sm text-[#161616] leading-snug">
                    <span aria-hidden="true" className="mt-[4px] h-3 w-3 flex-shrink-0 rounded-sm border-2 border-[#161616] bg-[#FBF6EA]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="font-body text-sm text-[#161616]/60 mt-5">
                <Link href="/hundredfold" className="font-bold text-[#161616] underline underline-offset-4">
                  HUNDREDFOLD
                </Link>
                {' · '}
                <Link href="/the-system" className="font-bold text-[#161616] underline underline-offset-4">
                  Idea to Product
                </Link>
                {' · '}
                <Link href="/ai-proof" className="font-bold text-[#161616] underline underline-offset-4">
                  AI-Proof Your Business
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── THE THREE DOORS ─── */}
      <section id="book" className="py-16 md:py-24 bg-white border-y-2 border-[#161616] scroll-mt-20" aria-labelledby="book-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">[ Set prices ]</p>
          <h2 id="book-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
            Three ways in.
          </h2>
          <p className="font-body text-[#161616]/70 text-center max-w-2xl mx-auto mt-4">
            The price is the price. Changes to what we built are included, and everything we set up is in your name: the accounts, the keys, the playbook and the habit.
          </p>
          <div className="mt-12">
            <AiNativeTiers />
          </div>
          <p className="font-body text-sm text-[#161616]/60 text-center mt-8 max-w-2xl mx-auto">
            The map credits in full toward the build within ninety days, so starting small costs nothing extra.
          </p>
        </div>
      </section>

      {/* ─── THE FREE READ ─── */}
      <section id="read" className="py-16 md:py-24 bg-[#F5B700] border-b-2 border-[#161616] scroll-mt-20" aria-labelledby="read-heading">
        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#161616]/70 font-bold mb-3">[ Free, first ]</p>
            <h2 id="read-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
              Send the business. Get the AI Read.
            </h2>
            <p className="font-body text-[#161616]/80 leading-relaxed mt-5">
              We read your business the way we would on day one of the map and send back one page: the three AI moves that pay first in your company, what each one costs to run, and which of the three doors fits. It comes back {AI_NATIVE.readDelivery}, it costs nothing, and it is yours whether or not you book.
            </p>
            <p className="font-body text-[#161616]/80 leading-relaxed mt-4">
              Most owners have never seen their own week written down as workflows with a price on each one. That is usually the moment they decide.
            </p>
          </div>
          <ReadForm />
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 md:py-24" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">[ Questions ]</p>
          <h2 id="faq-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
            Before you book.
          </h2>
          <div className="mt-10 space-y-3">
            {aiNativeFaq.map((f) => (
              <details key={f.q} className="group rounded-2xl border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616] open:shadow-[6px_6px_0_0_#F5B700]">
                <summary className="cursor-pointer list-none px-6 py-4 font-display text-lg font-black text-[#161616] flex items-center justify-between gap-4">
                  <span>{f.q}</span>
                  <span aria-hidden="true" className="font-mono text-xl leading-none text-[#F5B700] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="px-6 pb-5 font-body text-sm text-[#161616]/75 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 md:py-24 bg-[#161616] border-t-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#FBF6EA] tracking-tight leading-[1.05]">
            You built the company.
            <br className="hidden md:block" /> Now let it run on AI.
          </h2>
          <p className="font-body text-[#FBF6EA]/70 mt-4 max-w-xl mx-auto">
            From {aiNativeUsd(aiNativeTiers[0].priceCents)}, {AI_NATIVE.mapDelivery}. Or send the business first and read the AI Read before you decide.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#book"
              className="inline-block rounded-full bg-[#F5B700] border-2 border-[#F5B700] px-10 py-4 font-sans font-extrabold text-[#161616] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5"
            >
              Book the map
            </a>
            <Link
              href="/book"
              className="inline-block rounded-full bg-transparent border-2 border-[#FBF6EA] px-10 py-4 font-sans font-extrabold text-[#FBF6EA] text-sm uppercase tracking-[0.18em] transition-all hover:-translate-y-0.5"
            >
              Talk to Sarah first
            </Link>
          </div>
          <p className="font-body text-sm text-[#FBF6EA]/60 mt-8">
            Who you would be working with:{' '}
            <Link href={PORTFOLIO_PATH} className="font-bold text-[#FBF6EA] underline underline-offset-4 decoration-[#F5B700] decoration-2">
              the portfolio
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
