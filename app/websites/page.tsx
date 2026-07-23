import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';
import { workByKey } from '@/data/website-work';
import EngineToggle from '@/components/websites/EngineToggle';
import WorkShowcase from '@/components/websites/WorkShowcase';

const site = DEMO_PRODUCTS.site;
const HERO = workByKey['linen-fresh'];

export const metadata = buildMetadata({
  title: 'Small Business Websites That Work: not a brochure, a working engine',
  description:
    'A website that answers the phone, captures every lead, and runs itself. Elite custom design, an AI receptionist on it, funnels and SEO baked in, and the command center free. Live in about a week from $97/mo. See yours built free.',
  path: '/websites',
});

const INCLUDED = [
  { icon: '🎨', name: 'Elite custom design', desc: 'Designed from scratch for your trade and your town. Not a template anyone else can buy.' },
  { icon: '🎙', name: 'An AI receptionist on it', desc: 'The site answers the phone 24/7, books the job, and texts you the details. Never a missed call.' },
  { icon: '⚙', name: 'The command center, free', desc: 'A back office wired to your calls, traffic, customers, and reviews. On the house with your site.' },
  { icon: '🧲', name: 'Funnels + a lead magnet', desc: 'A real capture flow and a reason to opt in, live and converting on day one, not someday.' },
  { icon: '🔎', name: 'SEO + GEO baked in', desc: 'Built to be found on Google and cited by AI search. Metadata, structured data, the works.' },
  { icon: '🔑', name: 'You own every line', desc: 'The repo, the domain, the accounts, all yours on launch day. No rental, no lock-in.' },
];

const FAQ = [
  {
    q: 'What kind of website do you build?',
    a: 'Not a brochure that sits there, a working engine. Elite custom design, an AI receptionist that answers the phone right on the site, funnels and a lead magnet live on day one, the command center wired behind it free, and SEO plus GEO built in so you get found. It looks like the brand you are trying to be, and it actually runs your business.',
  },
  {
    q: 'How much does a website cost?',
    a: `The productized website is ${formatUsd(site.setupCents)} to set up plus ${formatUsd(site.monthlyCents)} a month, and that includes your domain, hosting, ongoing care, and the command center free. It goes live in about a week. For a bigger, fully bespoke build (custom booking, an embedded CRM, a vertical app, an AI sales rep), we scope a Full-Service Business Build and quote it after a free call. Month to month, cancel anytime, no trials.`,
  },
  {
    q: 'How fast does it go live?',
    a: 'About a week from kickoff for the productized site. You can tour a free demo version built for your business in about twenty seconds before you decide anything. Bigger custom builds take two to four weeks depending on scope, and you see the exact timeline in your quote before any work begins.',
  },
  {
    q: 'How is this different from Wix, Squarespace, or an agency?',
    a: 'Wix and Squarespace are templates you rent and maintain yourself. An agency hands you a pretty brochure and a bill. We build a working engine you own outright: it answers the phone, captures the lead, and follows up on its own, and you get the repo, the domain, and every account on launch day. You are not renting it and you are not stuck with us.',
  },
  {
    q: 'Do I really own it?',
    a: 'Yes, fully. Every line of code, the domain, the hosting account, and every credential are transferred to you. You can hire any other engineer to change it later. There is no vendor lock-in and no per-seat fee.',
  },
  {
    q: 'Can I see it before I pay?',
    a: 'Yes. Enter your business once and we forge a real working demo website designed from scratch for you, in about twenty seconds, plus an AI receptionist and a command center. No card and no meeting. Keep what you love, or walk away.',
  },
  {
    q: 'What if I already have a website?',
    a: 'We can rebuild it as a working engine, or wire the parts you are missing (the AI receptionist, the command center, funnels, SEO and GEO) onto what you have. Start with a free demo or a free website audit and we will tell you the highest-leverage move.',
  },
];

function websitesJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Small Business Website Builds by Modern Mustard Seed',
        serviceType: 'Custom small-business website design and development (with AI receptionist, funnels, SEO/GEO)',
        description:
          'Custom websites that work: elite design, an AI receptionist on the site, funnels and a lead magnet day one, the command center wired behind it free, and SEO plus GEO built in. Live in about a week. You own the code, domain, and accounts.',
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        url: `${SITE.url}/websites`,
        offers: {
          '@type': 'Offer',
          name: 'Website',
          description: 'Custom website with an AI receptionist, funnels, SEO/GEO, and the command center free. Domain, hosting, and care included.',
          price: Math.round(site.monthlyCents / 100),
          priceCurrency: 'USD',
          priceSpecification: [
            {
              '@type': 'UnitPriceSpecification',
              price: Math.round(site.monthlyCents / 100),
              priceCurrency: 'USD',
              billingIncrement: 1,
              unitText: 'MONTH',
            },
            {
              '@type': 'UnitPriceSpecification',
              priceType: 'https://schema.org/Installment',
              price: Math.round(site.setupCents / 100),
              priceCurrency: 'USD',
              description: 'One-time setup',
            },
          ],
          url: `${SITE.url}/websites`,
          availability: 'https://schema.org/InStock',
        },
      },
      faqJsonLd(FAQ),
      breadcrumbJsonLd([
        { name: 'Modern Mustard Seed', url: SITE.url },
        { name: 'Websites', url: `${SITE.url}/websites` },
      ]),
    ],
  };
}

export default function WebsitesPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd data={websitesJsonLd()} />

      {/* ── Hero ── */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 pt-32 pb-16 md:pt-40 lg:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 xl:col-span-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#C4160B] font-bold">
                Websites // Live in about a week
              </span>
              <h1 className="font-display text-[2.6rem] sm:text-5xl xl:text-6xl font-bold mt-4 leading-[1.02] tracking-tight">
                Not a brochure. A website that <em className="italic text-[#C4160B]">works.</em>
              </h1>
              <p className="font-body text-[17px] text-[#161616]/75 mt-5 leading-relaxed">
                Elite custom design, an AI receptionist answering right on the page, funnels and SEO baked in, and the
                command center wired behind it free. It answers the phone, captures the lead, and follows up while you
                sleep. From {formatUsd(site.monthlyCents)}/mo, and you own every line.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/demos"
                  className="inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
                >
                  Build mine free →
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 bg-white text-[#161616] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Book a call
                </Link>
              </div>
              <p className="font-body text-[13px] text-[#161616]/70 mt-4">
                A real working demo, designed for your business, in about twenty seconds. No card.
              </p>
            </div>

            {/* Hero visual: a REAL site we built, in living color. */}
            <div className="lg:col-span-6 xl:col-span-7">
              <a
                href={HERO.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-2xl border-2 border-[#161616] bg-white shadow-[8px_8px_0_0_#161616] overflow-hidden hover:-translate-y-1 transition-transform"
              >
                <div className="flex items-center gap-2 px-4 h-10 border-b-2 border-[#161616] bg-[#FBF6EA]">
                  <span className="flex gap-1.5">
                    {['#E0301E', '#F5B700', '#8FA98F'].map((c) => (
                      <span key={c} className="h-3 w-3 rounded-full border border-[#161616]" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="ml-2 flex-1 truncate rounded-full border border-[#161616]/30 bg-white px-3 py-1 font-mono text-[11px] text-[#161616]/65">
                    linenfreshlv.com
                  </span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-[#161616]/70 group-hover:text-[#C4160B] transition-colors">Visit →</span>
                </div>
                <div className="relative">
                  <Image
                    src={HERO.img}
                    alt={`${HERO.name}, a real ${HERO.trade.toLowerCase()} website designed and built by Modern Mustard Seed, with the AI receptionist answering right on the page`}
                    width={1600}
                    height={1000}
                    priority
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    className="block w-full h-auto"
                  />
                  <div className="absolute top-3 right-3 max-w-[60%] rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2 shadow-[3px_3px_0_0_#F5B700]">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#C4160B] font-bold">New lead captured</p>
                    <p className="font-sans text-[11.5px] font-bold text-[#161616] mt-0.5 leading-snug">Filed to your command center</p>
                  </div>
                </div>
              </a>
              <p className="font-body text-[13px] text-[#161616]/70 mt-3">
                A real site we built for {HERO.name}, {HERO.place}. It answers the phone, too.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 lg:py-20 space-y-20">
        {/* ── Signature: brochure vs engine ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            The difference // Flip it and see
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            The same site, dead or alive.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed mb-9">
            Most small-business websites are a pretty brochure. Ours is the same beauty, wired to work. Flip the switch.
          </p>
          <EngineToggle />
        </section>

        {/* ── What ships ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            What ships // With every site
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Everything a working site needs, day one.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {INCLUDED.map((m) => (
              <div
                key={m.name}
                className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[5px_5px_0_0_#161616] p-6 transition-transform hover:-translate-y-1"
              >
                <span className="text-2xl leading-none" aria-hidden>{m.icon}</span>
                <h3 className="font-display font-extrabold text-lg mt-2.5">{m.name}</h3>
                <p className="font-body text-[13px] text-[#161616]/70 mt-1.5 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing: two tiers ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Pricing // Productized or bespoke
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            A real site fast, or the whole engine built to spec.
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mt-10 items-stretch">
            {/* Productized */}
            <div className="relative flex flex-col border-2 border-[#161616] bg-[#F5B700] rounded-2xl shadow-[8px_8px_0_0_#161616] p-7 md:p-8">
              <span
                aria-hidden
                className="absolute -top-4 -right-3 rotate-[8deg] bg-[#C4160B] text-[#FBF6EA] font-mono font-extrabold text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border-2 border-[#161616] shadow-[3px_3px_0_0_#161616]"
              >
                Live in a week
              </span>
              <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#161616]">The Website</span>
              <h3 className="font-display italic font-extrabold text-2xl mt-2">Forge it free, keep it monthly</h3>
              <p className="font-mono font-bold text-[15px] mt-3 text-[#161616]">
                {formatUsd(site.monthlyCents)}/mo <span className="text-[#161616]/75">+ {formatUsd(site.setupCents)} setup</span>
              </p>
              <p className="font-body text-[13.5px] text-[#161616]/80 mt-3 leading-relaxed flex-1">
                A custom site designed from scratch, an AI receptionist on it, funnels and SEO baked in. Your domain,
                hosting, care, and the command center all included. Month to month, cancel anytime.
              </p>
              <Link
                href="/demos"
                className="mt-6 text-center border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-5 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
              >
                Build mine free
              </Link>
            </div>

            {/* Bespoke */}
            <div className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 md:p-8">
              <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#C4160B]">Full-Service Business Build</span>
              <h3 className="font-display italic font-extrabold text-2xl mt-2">The whole engine, built to spec</h3>
              <p className="font-mono font-bold text-[15px] mt-3">Quoted after a free call</p>
              <p className="font-body text-[13.5px] text-[#161616]/75 mt-3 leading-relaxed flex-1">
                For operators who need more than a site: custom booking with an embedded CRM, an AI sales rep capturing
                every lead, a vertical app (ordering, a store, an academy), and the back office wired around it. Fixed
                scope, fixed quote, and you own all of it.
              </p>
              <Link
                href="/book"
                className="mt-6 text-center border-2 border-[#161616] bg-[#F5B700] text-[#161616] rounded-full px-5 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Scope my build
              </Link>
            </div>
          </div>
          <p className="font-body text-[13px] text-[#161616]/70 mt-6 text-center">
            Not sure which? Forge a free demo, or{' '}
            <Link href="/website-audit" className="font-bold text-[#1E50C8] underline underline-offset-4 hover:text-[#161616]">grade your current site free</Link>{' '}
            and we will tell you the highest-leverage move.
          </p>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 mt-6">
            {[
              ['1', 'Forge it free', 'Tell us your business and we design a real working demo site for you in about twenty seconds. Tour it, poke around, no card.'],
              ['2', 'We build it for real', 'Order it and we customize the design, write the copy, wire the receptionist and funnels, and put it on your domain by hand.'],
              ['3', 'Own it, and grow', 'Live in about a week. You get the repo, the domain, and every account. The site answers, captures, and follows up on its own.'],
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
          <div className="mt-8">
            <Link href="/work" className="font-sans font-bold text-[12px] uppercase tracking-[0.14em] text-[#F5B700] hover:text-[#FBF6EA] transition-colors">
              See the sites we have shipped →
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
              <details key={f.q} className="group rounded-xl border-2 border-[#161616] bg-white p-5 open:shadow-[4px_4px_0_0_#F5B700] transition-shadow">
                <summary className="font-display text-lg font-bold cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="flex-shrink-0 text-[#C4160B] transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-[#5c554a] leading-relaxed font-body">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

      </main>

      {/* ── Real work: the scrolling reel of sites we shipped ── */}
      <WorkShowcase />

      {/* ── Close ── */}
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <section className="relative halftone-bg border-2 border-[#161616] rounded-2xl bg-[#F5B700] p-10 md:p-14 text-center overflow-hidden">
          <div className="relative">
            <h2 className="font-display italic font-extrabold text-3xl md:text-5xl leading-[1.02]">
              See your website, built free.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/80 mt-4 max-w-xl mx-auto leading-relaxed">
              Enter your business once and tour a real working site, designed from scratch for you, in about twenty
              seconds. Keep it for {formatUsd(site.monthlyCents)}/mo, command center free.
            </p>
            <Link
              href="/demos"
              className="mt-7 inline-block border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-9 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
            >
              Build mine free →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
