import Link from '@/components/AttributionLink';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { DEMO_PRODUCTS, DEMO_BUNDLE, SITE_RUNGS, SITE_RUNG_KEYS, formatUsd } from '@/lib/demo-order';
import { DEMO_LINE } from '@/data/trade-pages';
import VoiceTalkButton from '@/components/VoiceTalkButton';
import MissedCallCalculator from '@/components/MissedCallCalculator';
import OneBrain from '@/components/talking-website/OneBrain';
import CommercialPlayer from '@/components/talking-website/CommercialPlayer';

const voice = DEMO_PRODUCTS.voice;
const site = DEMO_PRODUCTS.site;

// The savings story is DERIVED, never typed. If any single price moves, this
// moves with it (see mms-price-single-source).
const PAIR_SETUP = voice.setupCents + site.setupCents;
const PAIR_MONTHLY = voice.monthlyCents + site.monthlyCents;
const SAVE_SETUP = PAIR_SETUP - DEMO_BUNDLE.setupCents;
const SAVE_MONTHLY = PAIR_MONTHLY - DEMO_BUNDLE.monthlyCents;

// The three sizes of the site, and therefore of the bundle. The entry rung is
// DEMO_BUNDLE; the bigger ones are the same thing with every service and every
// town on its own page (lib/demo-order.ts SITE_RUNGS).
const RUNGS = SITE_RUNG_KEYS.map((k) => SITE_RUNGS[k]);

export const metadata = buildMetadata({
  title: 'The Talking Website: a website that answers its own phone',
  description: `Your website and your voice agent built as one thing, off one brain, so the answer a visitor reads is the exact answer a caller hears at midnight. From ${formatUsd(DEMO_BUNDLE.setupCents)} setup plus ${formatUsd(DEMO_BUNDLE.monthlyCents)} a month, in three sizes: 5, 20, or 50 pages. See yours built free.`,
  path: '/talking-website',
  // Route-level card. buildMetadata sets openGraph.images, which overrides
  // the file-based opengraph-image convention, so it must be named here.
  image: '/talking-website/opengraph-image',
});

// Verified figures only. The "85% of callers never call back" and "$126K a year"
// numbers everybody repeats have no primary source (see missed-call-stats-verified).
const STATS = [
  { figure: '82%', label: 'Call the next guy', source: 'CallRail, 2025' },
  { figure: '78%', label: 'Already walked over one missed call', source: 'CallRail, 2025' },
];

/**
 * TWO PIECES. There was a third card here, the command center, priced "Free
 * inside the bundle." Sarah took it off the offer on 2026-08-22 and repeated it
 * on 2026-08-25: it is sold on its own and never suggested next to anything.
 * The Talking Website is the site and the phone, off one brain. Nothing else.
 */
const PIECES = [
  {
    icon: '🌐',
    name: 'The website',
    price: `From ${formatUsd(site.setupCents)} + ${formatUsd(site.monthlyCents)}/mo on its own, in 5, 20, or 50 pages`,
    desc: 'Custom design for your trade and your town, funnels and a lead magnet live on day one, SEO and GEO baked in. Every service and every town can have its own page. We wire up your Google Business Profile and handle your reviews. Your domain, hosting, and care handled.',
  },
  {
    icon: '☎️',
    name: 'The voice agent',
    price: `${formatUsd(voice.setupCents)} + ${formatUsd(voice.monthlyCents)}/mo on its own`,
    desc: 'Answers your real number on ring one, around the clock. Qualifies the caller, books the job, and texts you the details before you have put your phone down.',
  },
];

const FAQ = [
  {
    q: 'What is The Talking Website?',
    a: `A website that answers its own phone. Instead of buying a site from one vendor and bolting a phone robot on later, your website and your voice agent are built as one thing, off one brain, so the answer a visitor reads on the page is the exact answer a caller hears at midnight. It starts at ${formatUsd(DEMO_BUNDLE.setupCents)} to set up plus ${formatUsd(DEMO_BUNDLE.monthlyCents)} a month for a ${SITE_RUNGS.five.label.replace(' pages', '-page')} site, and comes in three sizes.`,
  },
  {
    q: 'How is this different from adding a chatbot to my site?',
    a: 'A chatbot is a box in the corner of a page that cannot pick up a ringing phone. This is one system with two mouths. The voice agent answers your actual phone number on the actual phone network, and it knows exactly what your website says because they share the same source of truth. Update your price or your hours once and both change together, so a customer can never be told two different things.',
  },
  {
    q: 'How much does it cost?',
    a: `It comes in three sizes, and the price follows the size of the site. ${SITE_RUNGS.five.label}: ${formatUsd(SITE_RUNGS.five.bundleSetupCents)} to set up plus ${formatUsd(SITE_RUNGS.five.bundleMonthlyCents)} a month. ${SITE_RUNGS.twenty.label}: ${formatUsd(SITE_RUNGS.twenty.bundleSetupCents)} plus ${formatUsd(SITE_RUNGS.twenty.bundleMonthlyCents)} a month. ${SITE_RUNGS.fifty.label}: ${formatUsd(SITE_RUNGS.fifty.bundleSetupCents)} plus ${formatUsd(SITE_RUNGS.fifty.bundleMonthlyCents)} a month. Month to month, cancel anytime, no trials. At every size the bundle costs less than the site and the voice agent bought apart. At ${SITE_RUNGS.five.label} that is ${formatUsd(SAVE_SETUP)} less up front and ${formatUsd(SAVE_MONTHLY)} less every month.`,
  },
  {
    q: 'Why would I want 20 or 50 pages?',
    a: 'Because Google and AI search index pages, not sections. A page for each service and a page for each town you serve means you are the answer when somebody in that town asks for that job, on Google or in ChatGPT. Five pages is a real storefront. Twenty is every service and every town on its own page. Fifty is every service in every town, so you own the map. Bigger sites cost more because there is more to build and more to keep found.',
  },
  {
    q: 'What counts as an edit, and what counts as a new page?',
    a: 'Edits are free, forever, on every page you have: new copy, new photos, new prices, a new section, a whole new look. A page that did not exist before, beyond the size you bought, is the next size up. That is the only line, and it is the one that keeps the sizes honest.',
  },
  {
    q: 'Can I buy just the website or just the voice agent?',
    a: `Yes. Every piece is sold on its own. The website is ${formatUsd(site.setupCents)} plus ${formatUsd(site.monthlyCents)} a month at ${SITE_RUNGS.five.label}, ${formatUsd(SITE_RUNGS.twenty.setupCents)} plus ${formatUsd(SITE_RUNGS.twenty.monthlyCents)} at ${SITE_RUNGS.twenty.label}, and ${formatUsd(SITE_RUNGS.fifty.setupCents)} plus ${formatUsd(SITE_RUNGS.fifty.monthlyCents)} at ${SITE_RUNGS.fifty.label}. The voice agent is ${formatUsd(voice.setupCents)} plus ${formatUsd(voice.monthlyCents)} a month. The Talking Website is what happens when you take them together, and at every size it is cheaper than buying them separately.`,
  },
  {
    q: 'Can I put the voice agent on the website I already have?',
    a: 'Yes. The voice agent bolts onto any site, including one we did not build. You will not get the shared-brain part until the site is ours too, but you will get your phone answered 24/7 starting the week you order it.',
  },
  {
    q: 'Will my customers know it is AI?',
    a: 'It introduces itself honestly and it never pretends to be a person. That turns out to be fine, because at nine on a Saturday night the alternative was never a human, it was a beep. What loses you the job is the call nobody picks up.',
  },
  {
    q: 'How fast does it go live?',
    a: 'About a week from kickoff. You can tour a real working demo built for your business, in your hands within the hour, before you decide anything. No card and no meeting to see it.',
  },
  {
    q: 'Do I own it?',
    a: 'Yes, fully. The code, the domain, the hosting account, and every credential are yours. You can hire any other engineer to change it later. No vendor lock-in and no per-seat fee.',
  },
  {
    q: 'What happens if it cannot answer something?',
    a: `It takes a proper message and hands off to you, with the transcript and the caller's number in your inbox and a text on your phone. It also has a hard monthly minute cap, so a runaway month is not a runaway bill: ${voice.finePrint}`,
  },
];

function talkingWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'The Talking Website by Modern Mustard Seed',
        serviceType:
          'Combined small-business website and AI voice agent built on one shared knowledge base',
        description:
          'A website that answers its own phone. The website and the AI voice agent are built as one system off one brain, so the answer a visitor reads on the page is the same answer a caller hears at midnight. Includes custom website design, funnels, SEO and GEO, and a 24/7 AI voice agent answering the number you already have.',
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        url: `${SITE.url}/talking-website`,
        // One offer per size, so a search engine that reads prices reads all three.
        offers: RUNGS.map((r) => ({
          '@type': 'Offer',
          name: `${DEMO_BUNDLE.name}, ${r.label}`,
          description: `${DEMO_BUNDLE.blurb} ${r.pitch}`,
          price: Math.round(r.bundleMonthlyCents / 100),
          priceCurrency: 'USD',
          priceSpecification: [
            {
              '@type': 'UnitPriceSpecification',
              price: Math.round(r.bundleMonthlyCents / 100),
              priceCurrency: 'USD',
              billingIncrement: 1,
              unitText: 'MONTH',
            },
            {
              '@type': 'UnitPriceSpecification',
              priceType: 'https://schema.org/Installment',
              price: Math.round(r.bundleSetupCents / 100),
              priceCurrency: 'USD',
              description: 'One-time setup',
            },
          ],
          url: `${SITE.url}/talking-website#pricing`,
          availability: 'https://schema.org/InStock',
        })),
      },
      faqJsonLd(FAQ),
      // breadcrumbJsonLd prepends SITE.url itself, so these are PATHS. Passing
      // a full URL here doubles the origin in the emitted JSON-LD.
      breadcrumbJsonLd([
        { name: 'Modern Mustard Seed', url: '' },
        { name: 'The Talking Website', url: '/talking-website' },
      ]),
    ],
  };
}

export default function TalkingWebsitePage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd data={talkingWebsiteJsonLd()} />

      {/* ── Hero ── */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 pt-32 pb-16 md:pt-40 lg:pb-20">
          <div className="grid grid-cols-1 [&>*]:min-w-0 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 xl:col-span-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#C4160B] font-bold">
                The Talking Website // One shared brain
              </span>
              <h1 className="font-display text-[2.6rem] sm:text-5xl xl:text-6xl font-bold mt-4 leading-[1.02] tracking-tight">
                A website that answers its <em className="italic text-[#C4160B]">own phone.</em>
              </h1>
            <p className="mt-5 font-body text-base leading-relaxed">Built by Modern Mustard Seed, an AI-native product studio in Kalispell, Montana, serving Northwest Montana and clients nationwide. <Link href="/ai-websites" className="underline font-bold">See how our AI websites connect the page and the business.</Link></p>
              <p className="font-body text-[17px] text-[#161616]/75 mt-5 leading-relaxed">
                Not a site with a chat bubble bolted on. Your website and your voice agent, built as one thing off one
                brain, so the answer a visitor reads at noon is the exact answer a caller hears at midnight. The
                two are built as one thing, off one brain.
              </p>
              <p className="font-mono font-bold text-[15px] mt-5">
                From {formatUsd(DEMO_BUNDLE.setupCents)} setup{' '}
                <span className="text-[#161616]/70">+ {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo</span>
                <span className="block sm:inline font-normal text-[12px] text-[#161616]/60 sm:ml-2">
                  Three sizes: 5, 20, or 50 pages.{' '}
                  <a href="#pricing" className="underline underline-offset-4 hover:text-[#161616]">
                    See the ladder
                  </a>
                </span>
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/demos"
                  className="inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
                >
                  Build mine free →
                </Link>
                <a
                  href={`tel:${DEMO_LINE.tel}`}
                  className="inline-flex items-center gap-2 bg-white text-[#161616] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Call it: {DEMO_LINE.display}
                </a>
              </div>
              <p className="font-body text-[13px] text-[#161616]/70 mt-4">
                A real working demo, designed for your business, in your hands within the hour. No card.
              </p>
            </div>

            {/* The commercial, in a frame. */}
            <div className="lg:col-span-6 xl:col-span-7">
              <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[8px_8px_0_0_#161616] overflow-hidden">
                <div className="flex items-center gap-2 px-4 h-10 border-b-2 border-[#161616] bg-[#FBF6EA]">
                  <span className="flex gap-1.5">
                    {['#E0301E', '#F5B700', '#8FA98F'].map((c) => (
                      <span key={c} className="h-3 w-3 rounded-full border border-[#161616]" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="ml-2 flex-1 truncate rounded-full border border-[#161616]/30 bg-white px-3 py-1 font-mono text-[11px] text-[#161616]/65">
                    The Talking Website, the film
                  </span>
                </div>
                <CommercialPlayer
                  src="/ads/talking-website-16x9.mp4"
                  poster="/ads/talking-website-poster.png"
                  label="The Talking Website, a short film from Modern Mustard Seed about a website that answers its own phone"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20 space-y-20">
        {/* ── Signature moment: one brain, two mouths ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            The whole idea // Ask it something
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            One brain. Two mouths.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed mb-9">
            Pick what a customer would actually ask and watch it land in both places at once. Nobody gets a different
            story depending on how they reached you.
          </p>
          <OneBrain />
        </section>

        {/* ── Talk to this page ── */}
        <section className="border-2 border-[#161616] bg-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <div className="grid grid-cols-1 [&>*]:min-w-0 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#F5B700] uppercase">
                Proof // Right now, in your browser
              </p>
              <h2 className="font-display italic font-extrabold text-3xl md:text-[2.75rem] mt-3 leading-[1.04] text-[#FBF6EA]">
                This page talks. Go ahead.
              </h2>
              <p className="font-body text-[15px] text-[#FBF6EA]/75 mt-4 leading-relaxed">
                We are not going to sell you a talking website with a page that just sits there. Press the button and
                talk to Mr. Mustard, our own agent, out loud, right now. Ask him what this costs. Ask him something we
                would rather he dodged. He answers in six languages and he can book you a call with Sarah while you are
                on the line.
              </p>
              <p className="font-body text-[13px] text-[#FBF6EA]/60 mt-4">
                Prefer a real phone? Dial{' '}
                <a
                  href={`tel:${DEMO_LINE.tel}`}
                  className="font-bold text-[#F5B700] underline underline-offset-4 hover:text-[#FBF6EA]"
                >
                  {DEMO_LINE.display}
                </a>{' '}
                and the same brain picks up.
              </p>
            </div>
            <div className="lg:col-span-5">
              <VoiceTalkButton />
            </div>
          </div>
        </section>

        {/* ── Why it matters: verified stats ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            The stakes // Every unanswered ring
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            The lead does not wait for business hours.
          </h2>
          <div className="grid sm:grid-cols-3 gap-5 mt-10">
            {STATS.map((s) => (
              <div
                key={s.figure}
                className="border-2 border-[#161616] bg-white rounded-2xl shadow-[5px_5px_0_0_#161616] p-6"
              >
                <p className="font-display font-extrabold text-5xl leading-none text-[#C4160B]">{s.figure}</p>
                <p className="font-sans font-bold text-[14px] mt-3 leading-snug">{s.label}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#161616]/70 mt-3">{s.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Interactive tool + lead capture ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Do the math // Your numbers, not ours
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            What are the missed ones worth?
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed mb-9">
            Three numbers you already know, and you will see the size of the leak. Most operators find the monthly
            figure is larger than what the whole system costs.
          </p>
          <MissedCallCalculator />
        </section>

        {/* ── What is in it ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            What you get // Two pieces, one system
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Everything it takes to stop losing the job.
          </h2>
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            {PIECES.map((p) => (
              <div
                key={p.name}
                className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[5px_5px_0_0_#161616] p-6 transition-transform hover:-translate-y-1"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {p.icon}
                </span>
                <h3 className="font-display font-extrabold text-lg mt-2.5">{p.name}</h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f6600] font-bold mt-2">
                  {p.price}
                </p>
                <p className="font-body text-[13px] text-[#161616]/70 mt-2.5 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing: the page ladder ── */}
        <section id="pricing" className="scroll-mt-24">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Pricing // Three sizes, one brain
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Pick how much of the map you want to own.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed">
            Google and AI search index pages, not sections. Every service and every town on its own page is how you
            become the answer. The voice agent reads every page, so a bigger site is a smarter phone too. At every
            size the bundle costs less than the two pieces apart.
          </p>

          <div className="grid md:grid-cols-3 gap-5 mt-10 items-stretch">
            {RUNGS.map((r, i) => {
              const featured = r.key === 'twenty';
              const pairSetup = r.setupCents + voice.setupCents;
              const pairMonthly = r.monthlyCents + voice.monthlyCents;
              return (
                <div
                  key={r.key}
                  data-price={`talking-website-${r.pages}`}
                  className={`relative flex flex-col border-2 border-[#161616] rounded-2xl p-6 md:p-7 ${
                    featured ? 'bg-[#F5B700] shadow-[8px_8px_0_0_#161616]' : 'bg-white shadow-[6px_6px_0_0_#161616]'
                  }`}
                >
                  {featured ? (
                    <span
                      aria-hidden
                      className="absolute -top-4 -right-3 rotate-[8deg] bg-[#C4160B] text-[#FBF6EA] font-mono font-extrabold text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border-2 border-[#161616] shadow-[3px_3px_0_0_#161616]"
                    >
                      Built to be found
                    </span>
                  ) : null}
                  <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#161616]/70">
                    Size {i + 1} of 3
                  </span>
                  <h3 className="font-display italic font-extrabold text-3xl mt-1.5 leading-none">{r.label}</h3>
                  <p className="font-mono font-bold text-[19px] mt-4 text-[#161616]">
                    {formatUsd(r.bundleSetupCents)} setup{' '}
                    <span className="text-[#161616]/70">+ {formatUsd(r.bundleMonthlyCents)}/mo</span>
                  </p>
                  <p className="font-body text-[13.5px] text-[#161616]/80 mt-3 leading-relaxed">{r.pitch}</p>
                  <p className="font-body text-[12.5px] text-[#161616]/80 mt-2 leading-relaxed flex-1">{r.plan}</p>
                  <dl className="mt-5 pt-4 border-t-2 border-dashed border-[#161616]/25 space-y-1.5 font-body text-[12.5px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#161616]/70">Site alone</dt>
                      <dd className="font-mono text-right shrink-0">
                        {formatUsd(r.setupCents)} + {formatUsd(r.monthlyCents)}/mo
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#161616]/70">Voice agent alone</dt>
                      <dd className="font-mono text-right shrink-0">
                        {formatUsd(voice.setupCents)} + {formatUsd(voice.monthlyCents)}/mo
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#161616]/70">Apart</dt>
                      <dd className="font-mono text-right shrink-0 line-through decoration-[#C4160B] decoration-2">
                        {formatUsd(pairSetup)} + {formatUsd(pairMonthly)}/mo
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 font-bold">
                      <dt>You keep</dt>
                      <dd className="font-mono text-right shrink-0 text-[#161616]">
                        {formatUsd(pairSetup - r.bundleSetupCents)} + {formatUsd(pairMonthly - r.bundleMonthlyCents)}/mo
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-6 grid gap-2">
                    <Link
                      href="/demos"
                      className={`text-center border-2 border-[#161616] rounded-full px-5 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] hover:-translate-y-0.5 transition-all ${
                        featured
                          ? 'bg-[#161616] text-[#F5B700] shadow-[4px_4px_0_0_#FBF6EA]'
                          : 'bg-[#F5B700] text-[#161616] shadow-[4px_4px_0_0_#161616]'
                      }`}
                    >
                      Build mine free →
                    </Link>
                    <a
                      href={`/pay/talking-website-${r.pages}`}
                      className="text-center border-2 border-[#161616] bg-white text-[#161616] rounded-full px-5 py-3 font-sans font-bold text-[11px] uppercase tracking-[0.16em] hover:bg-[#FBF6EA] transition-colors"
                    >
                      Skip the demo, pay now
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2.5">
            {[
              'Custom website, live in about a week',
              'Voice agent answering your calls, 24/7',
              'One brain behind both',
              'Funnels, lead magnet, SEO and GEO',
              // The homepage Town Square (MI 47) promises both of these by
              // name. The flagship page has to say so too, or the CTA that
              // sends people here to "see what is baked in" is a dead end.
              'Google Business Profile set up and tuned',
              'Your reviews collected and answered',
              'Domain, hosting, and care handled',
              'You own the code and every account',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 font-body text-[13.5px] text-[#161616]/85">
                <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#161616] shrink-0" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <p className="font-body text-[13px] text-[#161616]/70 mt-6 max-w-2xl">
            Every size, every page: unlimited edits, forever. A new page beyond the size you bought is the next size
            up, not an edit. Month to month, cancel anytime, no trials. The demo was the trial.
          </p>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 mt-6">
            {[
              [
                '1',
                'Build it free',
                'Tell us your business once. We build a real working demo site and a voice agent you can actually call, in your hands within the hour. No card, no meeting.',
              ],
              [
                '2',
                'We wire the brain',
                'Order it and we customize the design, write the copy, and load your prices, hours, and service area into the one brain both mouths read from.',
              ],
              [
                '3',
                'It answers everything',
                'Live in about a week on your domain and your phone number. The page and the phone tell the same story, day or night, and you own all of it.',
              ],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-4 sm:block">
                <span className="font-display text-5xl font-bold text-[#F5B700] leading-none shrink-0">{n}</span>
                <div className="sm:mt-3">
                  <h3 className="font-display font-bold text-lg text-[#FBF6EA] leading-tight">{t}</h3>
                  <p className="font-body text-[13.5px] text-[#FBF6EA]/70 mt-1.5 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-5">
            <Link
              href="/websites"
              className="font-sans font-bold text-[12px] uppercase tracking-[0.14em] text-[#F5B700] hover:text-[#FBF6EA] transition-colors"
            >
              Just the website →
            </Link>
            <Link
              href="/voice-agents"
              className="font-sans font-bold text-[12px] uppercase tracking-[0.14em] text-[#F5B700] hover:text-[#FBF6EA] transition-colors"
            >
              Just the voice agent →
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase text-center">
            Straight answers // No sales call required
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] text-center">
            Questions, answered plainly.
          </h2>
          <div className="mt-10 max-w-3xl mx-auto space-y-4">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border-2 border-[#161616] bg-white p-5 open:shadow-[4px_4px_0_0_#F5B700] transition-shadow"
              >
                <summary className="font-display text-lg font-bold cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="flex-shrink-0 text-[#C4160B] transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[#5c554a] leading-relaxed font-body">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* ── Close ── */}
      <div className="max-w-6xl mx-auto px-6 pb-16 lg:pb-20">
        <section className="relative halftone-bg border-2 border-[#161616] rounded-2xl bg-[#F5B700] p-10 md:p-14 text-center overflow-hidden">
          <div className="relative">
            <h2 className="font-display italic font-extrabold text-3xl md:text-5xl leading-[1.02]">
              See yours talking, free.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/80 mt-4 max-w-xl mx-auto leading-relaxed">
              Enter your business once and tour a real website built for you, then call the voice agent that came with
              it. About twenty seconds to build, no card, no meeting. Keep it from{' '}
              {formatUsd(DEMO_BUNDLE.setupCents)} setup plus {formatUsd(DEMO_BUNDLE.monthlyCents)} a month.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Link
                href="/demos"
                className="inline-block border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-9 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Build mine free →
              </Link>
              <Link
                href="/book"
                className="inline-block border-2 border-[#161616] bg-white text-[#161616] rounded-full px-9 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Book a call
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
