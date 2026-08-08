import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';
import { DEMO_LINE } from '@/data/trade-pages';
import VoiceTalkButton from '@/components/VoiceTalkButton';
import MissedCallCalculator from '@/components/MissedCallCalculator';
import OneBrain from '@/components/talking-website/OneBrain';
import CommercialPlayer from '@/components/talking-website/CommercialPlayer';

const voice = DEMO_PRODUCTS.voice;
const site = DEMO_PRODUCTS.site;
const os = DEMO_PRODUCTS.os;

// The savings story is DERIVED, never typed. If any single price moves, this
// moves with it (see mms-price-single-source).
const PAIR_SETUP = voice.setupCents + site.setupCents;
const PAIR_MONTHLY = voice.monthlyCents + site.monthlyCents;
const SAVE_SETUP = PAIR_SETUP - DEMO_BUNDLE.setupCents;
const SAVE_MONTHLY = PAIR_MONTHLY - DEMO_BUNDLE.monthlyCents;

export const metadata = buildMetadata({
  title: 'The Talking Website: a website that answers its own phone',
  description: `Your website and your voice agent built as one thing, off one brain, so the answer a visitor reads is the exact answer a caller hears at midnight. Command center free. ${formatUsd(DEMO_BUNDLE.setupCents)} setup plus ${formatUsd(DEMO_BUNDLE.monthlyCents)} a month. See yours built free.`,
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
  { figure: '52%', label: 'Say AI answering after hours signals better service', source: 'CallRail, 2025' },
];

const PIECES = [
  {
    icon: '🌐',
    name: 'The website',
    price: `${formatUsd(site.setupCents)} + ${formatUsd(site.monthlyCents)}/mo on its own`,
    desc: 'Custom design for your trade and your town, funnels and a lead magnet live on day one, SEO and GEO baked in. We wire up your Google Business Profile and handle your reviews. Your domain, hosting, and care handled.',
  },
  {
    icon: '☎️',
    name: 'The voice agent',
    price: `${formatUsd(voice.setupCents)} + ${formatUsd(voice.monthlyCents)}/mo on its own`,
    desc: 'Answers your real number on ring one, around the clock. Qualifies the caller, books the job, and texts you the details before you have put your phone down.',
  },
  {
    icon: '⚙',
    name: 'The command center',
    price: 'Free inside the bundle',
    desc: 'Every call transcribed, your traffic and leads, customers, reviews, and money on one board. It is what makes the page and the phone one business instead of two tools.',
  },
];

const FAQ = [
  {
    q: 'What is The Talking Website?',
    a: `A website that answers its own phone. Instead of buying a site from one vendor and bolting a phone robot on later, your website and your voice agent are built as one thing, off one brain, so the answer a visitor reads on the page is the exact answer a caller hears at midnight. The business command center that runs both rides along free. It is ${formatUsd(DEMO_BUNDLE.setupCents)} to set up plus ${formatUsd(DEMO_BUNDLE.monthlyCents)} a month.`,
  },
  {
    q: 'How is this different from adding a chatbot to my site?',
    a: 'A chatbot is a box in the corner of a page that cannot pick up a ringing phone. This is one system with two mouths. The voice agent answers your actual phone number on the actual phone network, and it knows exactly what your website says because they share the same source of truth. Update your price or your hours once and both change together, so a customer can never be told two different things.',
  },
  {
    q: 'How much does it cost?',
    a: `${formatUsd(DEMO_BUNDLE.setupCents)} to set up plus ${formatUsd(DEMO_BUNDLE.monthlyCents)} a month, month to month, cancel anytime, no trials. Bought separately the two paid pieces are ${formatUsd(PAIR_SETUP)} setup plus ${formatUsd(PAIR_MONTHLY)} a month, so the bundle saves you ${formatUsd(SAVE_SETUP)} up front and ${formatUsd(SAVE_MONTHLY)} every month, and the command center (normally ${formatUsd(os.setupCents)} plus ${formatUsd(os.monthlyCents)}/mo) is free inside it.`,
  },
  {
    q: 'Can I buy just the website or just the voice agent?',
    a: `Yes. Every piece is sold on its own. The website is ${formatUsd(site.setupCents)} plus ${formatUsd(site.monthlyCents)} a month, the voice agent is ${formatUsd(voice.setupCents)} plus ${formatUsd(voice.monthlyCents)} a month, and the command center is free with either one. The Talking Website is simply what happens when you take both, and it is cheaper than buying them separately.`,
  },
  {
    q: 'Can I put the voice agent on the website I already have?',
    a: 'Yes. The voice agent bolts onto any site, including one we did not build. You will not get the shared-brain part until the site is ours too, but you will get your phone answered 24/7 starting the week you order it.',
  },
  {
    q: 'Will my customers know it is AI?',
    a: 'It introduces itself honestly and it never pretends to be a person. That turns out to be fine: 52% of consumers now say a business having AI answer after hours is a sign of better service, not worse (CallRail, 2025). What loses you the job is the call nobody picks up.',
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
    a: `It takes a proper message and hands off to you, with the transcript and the caller's number already in your command center and a text on your phone. It also has a hard monthly minute cap, so a runaway month is not a runaway bill: ${voice.finePrint}`,
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
          'Combined small-business website and AI voice agent built on one shared knowledge base, with a business command center included',
        description:
          'A website that answers its own phone. The website and the AI voice agent are built as one system off one brain, so the answer a visitor reads on the page is the same answer a caller hears at midnight. Includes custom website design, funnels, SEO and GEO, a 24/7 AI voice agent on your real phone number, and the business command center free.',
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        url: `${SITE.url}/talking-website`,
        offers: {
          '@type': 'Offer',
          name: DEMO_BUNDLE.name,
          description: DEMO_BUNDLE.blurb,
          price: Math.round(DEMO_BUNDLE.monthlyCents / 100),
          priceCurrency: 'USD',
          priceSpecification: [
            {
              '@type': 'UnitPriceSpecification',
              price: Math.round(DEMO_BUNDLE.monthlyCents / 100),
              priceCurrency: 'USD',
              billingIncrement: 1,
              unitText: 'MONTH',
            },
            {
              '@type': 'UnitPriceSpecification',
              priceType: 'https://schema.org/Installment',
              price: Math.round(DEMO_BUNDLE.setupCents / 100),
              priceCurrency: 'USD',
              description: 'One-time setup',
            },
          ],
          url: `${SITE.url}/talking-website`,
          availability: 'https://schema.org/InStock',
        },
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
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 xl:col-span-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#C4160B] font-bold">
                The Talking Website // First of its kind
              </span>
              <h1 className="font-display text-[2.6rem] sm:text-5xl xl:text-6xl font-bold mt-4 leading-[1.02] tracking-tight">
                A website that answers its <em className="italic text-[#C4160B]">own phone.</em>
              </h1>
              <p className="font-body text-[17px] text-[#161616]/75 mt-5 leading-relaxed">
                Not a site with a chat bubble bolted on. Your website and your voice agent, built as one thing off one
                brain, so the answer a visitor reads at noon is the exact answer a caller hears at midnight. The
                command center that runs both is free inside it.
              </p>
              <p className="font-mono font-bold text-[15px] mt-5">
                {formatUsd(DEMO_BUNDLE.setupCents)} setup{' '}
                <span className="text-[#161616]/70">+ {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo</span>
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

      <main className="max-w-6xl mx-auto px-6 py-16 lg:py-20 space-y-20">
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
          <div className="grid lg:grid-cols-12 gap-8 items-center">
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
            What you get // Three pieces, one system
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Everything it takes to stop losing the job.
          </h2>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
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

        {/* ── Pricing ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Pricing // Cheaper than the pieces
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Take both and the bundle pays you.
          </h2>

          <div className="grid lg:grid-cols-12 gap-6 mt-10 items-stretch">
            <div className="lg:col-span-7 relative flex flex-col border-2 border-[#161616] bg-[#F5B700] rounded-2xl shadow-[8px_8px_0_0_#161616] p-7 md:p-9">
              <span
                aria-hidden
                className="absolute -top-4 -right-3 rotate-[8deg] bg-[#C4160B] text-[#FBF6EA] font-mono font-extrabold text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border-2 border-[#161616] shadow-[3px_3px_0_0_#161616]"
              >
                The flagship
              </span>
              <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#161616]">
                {DEMO_BUNDLE.name}
              </span>
              <h3 className="font-display italic font-extrabold text-3xl mt-2">The site and the phone, as one</h3>
              <p className="font-mono font-bold text-[19px] mt-4 text-[#161616]">
                {formatUsd(DEMO_BUNDLE.setupCents)} setup{' '}
                <span className="text-[#161616]/75">+ {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo</span>
              </p>
              <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2.5 flex-1">
                {[
                  'Custom website, live in about a week',
                  'Voice agent on your real number, 24/7',
                  'Command center free inside it',
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
              <Link
                href="/demos"
                className="mt-7 text-center border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-5 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
              >
                Build mine free →
              </Link>
              <p className="font-body text-[12.5px] text-[#161616]/75 mt-3 text-center">
                Month to month, cancel anytime, no trials. The demo was the trial.
              </p>
            </div>

            {/* The honest receipt */}
            <div className="lg:col-span-5 flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#C4160B] p-7 md:p-8">
              <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#C4160B]">
                The receipt
              </span>
              <h3 className="font-display italic font-extrabold text-2xl mt-2">Bought separately</h3>
              <dl className="mt-5 space-y-3 font-body text-[13.5px]">
                <div className="flex justify-between gap-4 border-b border-dashed border-[#161616]/25 pb-2.5">
                  <dt className="text-[#161616]/75">{site.name}</dt>
                  <dd className="font-mono text-[12.5px] text-right shrink-0">
                    {formatUsd(site.setupCents)} + {formatUsd(site.monthlyCents)}/mo
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-dashed border-[#161616]/25 pb-2.5">
                  <dt className="text-[#161616]/75">{voice.name}</dt>
                  <dd className="font-mono text-[12.5px] text-right shrink-0">
                    {formatUsd(voice.setupCents)} + {formatUsd(voice.monthlyCents)}/mo
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b-2 border-[#161616] pb-2.5">
                  <dt className="text-[#161616]/75">{os.name}</dt>
                  <dd className="font-mono text-[12.5px] text-right shrink-0">
                    <span className="line-through text-[#161616]/70">
                      {formatUsd(os.setupCents)} + {formatUsd(os.monthlyCents)}/mo
                    </span>{' '}
                    <span className="font-bold text-[#161616]">free</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-4 pt-1">
                  <dt className="font-bold">Separately</dt>
                  <dd className="font-mono font-bold text-[12.5px] text-right shrink-0">
                    {formatUsd(PAIR_SETUP)} + {formatUsd(PAIR_MONTHLY)}/mo
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold">Together</dt>
                  <dd className="font-mono font-bold text-[12.5px] text-right shrink-0">
                    {formatUsd(DEMO_BUNDLE.setupCents)} + {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo
                  </dd>
                </div>
              </dl>
              <div className="mt-5 pt-4 border-t-2 border-dashed border-[#161616]/25">
                <p className="font-mono font-bold text-[10px] uppercase tracking-[0.16em] text-[#8f6600]">You keep</p>
                <p className="font-display font-extrabold text-3xl mt-1.5 leading-none">
                  {formatUsd(SAVE_SETUP)} up front
                </p>
                <p className="font-display font-extrabold text-3xl mt-1 leading-none">
                  {formatUsd(SAVE_MONTHLY)} every month
                </p>
                <p className="font-body text-[12.5px] text-[#161616]/70 mt-3 leading-relaxed">
                  Plus the command center on the house. We would rather you had the whole system than half of it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 mt-6">
            {[
              [
                '1',
                'Forge it free',
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
      </main>

      {/* ── Close ── */}
      <div className="max-w-6xl mx-auto px-6 pb-16 lg:pb-20">
        <section className="relative halftone-bg border-2 border-[#161616] rounded-2xl bg-[#F5B700] p-10 md:p-14 text-center overflow-hidden">
          <div className="relative">
            <h2 className="font-display italic font-extrabold text-3xl md:text-5xl leading-[1.02]">
              See yours talking, free.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/80 mt-4 max-w-xl mx-auto leading-relaxed">
              Enter your business once and tour a real website built for you, then call the voice agent that came with
              it. About twenty seconds to build, no card, no meeting. Keep it for{' '}
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
