import Link from '@/components/AttributionLink';
import Image from 'next/image';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { workByKey } from '@/data/website-work';
import EngineToggle from '@/components/websites/EngineToggle';
import WorkShowcase from '@/components/websites/WorkShowcase';
import HeroFilm from '@/components/websites/HeroFilm';

const STORE = workByKey['cross-covenant'];

// The hero film: a real scroll through a real build, recorded off the live
// site by scripts/record-wildmere-scroll.mjs. Wildmere is a from-scratch
// studio build, not a client engagement, so the copy here boasts about the
// craft and never implies a customer. See mms-work-reel-copy-honesty.
const HERO_FILM = {
  brand: 'Wildmere Honey Co.',
  host: 'wildmere.vercel.app',
  src: '/video/wildmere-scroll.mp4',
  poster: '/video/wildmere-scroll-poster.jpg',
};

export const metadata = buildMetadata({
  title: 'Websites and Brand: design-led sites that work',
  description:
    'Design-led websites from a boutique studio. Identity, art direction, funnels and SEO baked in, your domain and hosting handled, and you own every line. Scoped and quoted privately, by inquiry.',
  path: '/websites',
});

const INCLUDED = [
  { icon: '🎨', name: 'Elite custom design', desc: 'Designed from scratch for your trade and your town. Not a template anyone else can buy.' },
  { icon: '🌐', name: 'Domain, hosting, and care', desc: 'Your domain, the hosting, and ongoing care all handled. Unlimited edits, before launch and forever after, and we keep it running.' },
  { icon: '📈', name: 'Funnels and SEO', desc: 'Built in from the first page, not bolted on later. Your site is found, and the people who find it get somewhere to go.' },
  { icon: '🧲', name: 'Funnels + a lead magnet', desc: 'A real capture flow and a reason to opt in, live and converting on day one, not someday.' },
  { icon: '🔎', name: 'SEO + GEO baked in', desc: 'Built to be found on Google and cited by AI search. Metadata, structured data, the works.' },
  { icon: '🔑', name: 'You own every line', desc: 'The repo, the domain, the accounts, all yours on launch day. No rental, no lock-in.' },
];

const FAQ = [
  {
    q: 'What kind of website do you build?',
    a: 'Not a brochure that sits there, a working engine. Elite custom design, funnels and a lead magnet live on day one, SEO plus GEO built in so you get found, and your domain, hosting, and care handled. It looks like the brand you are trying to be, and it actually runs your business.',
  },
  {
    q: 'Is the voice agent included with the website?',
    a: 'No, and we will not pretend otherwise. The voice agent is its own discipline and it bolts onto any site, the one we build you or the one you already have. It answers your calls around the clock, qualifies the caller, books the job, and texts you the details. Commissioned together, the site and the agent become the Talking Website: one brain answering the page and the phone, scoped as a single engagement.',
  },
  {
    q: 'How much does a website cost?',
    a: 'There is no price list, because a five page site for one town and a full engine with booking, a CRM, and a store are not the same piece of work. Every engagement is scoped in one conversation and quoted privately as a set package price, agreed in writing before anything is built. That number does not move, and changes to what we built are included permanently. Studio engagements begin in the five figures.',
  },
  {
    q: 'How fast does it go live?',
    a: 'A focused site is typically live within a week or two of kickoff. Deeper builds with booking, a store, or an embedded back office run two to six weeks depending on scope. You see the exact timeline in your proposal, next to the price, before any work begins.',
  },
  {
    q: 'How is this different from Wix, Squarespace, or an agency?',
    a: 'Wix and Squarespace are templates you rent and maintain yourself. An agency hands you a pretty brochure and a bill. We build a working engine you own outright: it captures the lead and follows up on its own, it can answer the phone too once you add the voice agent, and you get the repo, the domain, and every account on launch day. You are not renting it and you are not stuck with us.',
  },
  {
    q: 'Do I really own it?',
    a: 'Yes, fully. Every line of code, the domain, the hosting account, and every credential are transferred to you. You can hire any other engineer to change it later. There is no vendor lock-in and no per-seat fee.',
  },
  {
    q: 'Can I see the work before I commit?',
    a: 'Yes. Every site in the portfolio on this page is live right now and you can go poke around any of them. For engagements that reach the proposal stage, we design a full concept before either side commits, so you are approving real work rather than a description of it.',
  },
  {
    q: 'Can you build it on WordPress or Webflow?',
    a: 'No. Every site we ship is built on Next.js and hosted on Vercel, and that is not a limitation you feel. Anything you use as a WordPress or Webflow plugin, whether it is an AI tool, a booking system, a CRM, a chat widget, or a payment processor, we wire in directly. You own the code, edits are included forever, and any JavaScript developer can pick it up if you leave. What you skip is the admin panel with thirty plugins that need updating every month.',
  },
  {
    q: 'What if I already have a website?',
    a: 'We can rebuild it as a working engine, or wire the parts you are missing onto what you have: the voice agent, the funnels, the SEO and GEO work. Say what you have in your inquiry and the first reply will tell you which of the two is actually worth your money.',
  },
];

function websitesJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Small Business Website Builds by Modern Mustard Seed',
        serviceType: 'Custom small-business website design and development (funnels, SEO/GEO, optional voice agent add-on)',
        description:
          'Design-led websites from a boutique studio: identity and art direction, funnels and a lead magnet on day one, SEO plus GEO built in, and your domain, hosting, and care handled. You own the code, the domain, and the accounts. The voice agent is its own discipline and can be added to this site or to one you already have.',
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        url: `${SITE.url}/websites`,
        offers: {
          '@type': 'Offer',
          name: 'Website engagement',
          description:
            'Design-led website with funnels and SEO/GEO. Domain, hosting, and care included. Scoped and quoted privately per engagement as a set package price. The voice agent is its own discipline and can be commissioned with the site or added to one you already have.',
          url: `${SITE.url}/websites`,
          availability: 'https://schema.org/InStock',
        },
      },
      faqJsonLd(FAQ),
      // breadcrumbJsonLd prepends SITE.url itself, so these are PATHS.
      breadcrumbJsonLd([
        { name: 'Modern Mustard Seed', url: '' },
        { name: 'Websites', url: '/websites' },
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
                Websites and Brand // By inquiry
              </span>
              <h1 className="font-display text-[2.6rem] sm:text-5xl xl:text-6xl font-bold mt-4 leading-[1.02] tracking-tight">
                Not a brochure. A website that <em className="italic text-[#C4160B]">works.</em>
              </h1>
            <p className="mt-5 font-body text-base leading-relaxed">Designed and built by Modern Mustard Seed, a boutique design and AI studio in Kalispell, Montana, working with clients nationwide. <Link href="/ai-websites" className="underline font-bold">See how our AI websites connect the page and the business.</Link></p>
              <p className="font-body text-[17px] text-[#161616]/75 mt-5 leading-relaxed">
                Identity and art direction, funnels and SEO baked in, your domain and hosting handled.
                It captures the lead and follows up while you sleep, and it answers the phone too the
                day you commission the voice agent. You own every line of it.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/inquire"
                  className="inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
                >
                  Begin an engagement →
                </Link>
                <Link
                  href="/work"
                  className="inline-flex items-center gap-2 bg-white text-[#161616] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  See the work
                </Link>
              </div>
              <p className="font-body text-[13px] text-[#161616]/70 mt-4">
                A small number of engagements at a time. Sarah answers every inquiry herself, inside one business day.
              </p>
            </div>

            {/* Hero visual: a REAL site we built, in living color. */}
            <div className="lg:col-span-6 xl:col-span-7">
              <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[8px_8px_0_0_#161616] overflow-hidden">
                <div className="flex items-center gap-2 px-4 h-10 border-b-2 border-[#161616] bg-[#FBF6EA]">
                  <span className="flex gap-1.5">
                    {['#E0301E', '#F5B700', '#8FA98F'].map((c) => (
                      <span key={c} className="h-3 w-3 rounded-full border border-[#161616]" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="ml-2 flex-1 truncate rounded-full border border-[#161616]/30 bg-white px-3 py-1 font-mono text-[11px] text-[#161616]/65">
                    {HERO_FILM.host}
                  </span>
                </div>
                <div className="relative">
                  {/* Poster is the film's own first frame, so the still and the
                      first frame of playback are the same image and nothing
                      jumps when it starts. */}
                  <HeroFilm
                    src={HERO_FILM.src}
                    poster={HERO_FILM.poster}
                    alt={`The homepage of ${HERO_FILM.brand}, a honey company website designed and built from scratch by Modern Mustard Seed, scrolling from the hero through the shelf to the booking form`}
                  />
                  <div className="absolute top-3 right-3 max-w-[62%] rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2 shadow-[3px_3px_0_0_#F5B700]">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#C4160B] font-bold">What it does</p>
                    <p className="font-sans text-[11.5px] font-bold text-[#161616] mt-0.5 leading-snug">Ends on a booking form, not a phone number</p>
                  </div>
                </div>
              </div>
              <p className="font-body text-[13px] text-[#161616]/70 mt-3">
                {HERO_FILM.brand}, designed and built from scratch. Every scroll, every reveal, and the
                booking form at the end.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20 space-y-20">
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

        {/* ── The voice agent is its own product, not part of the site ── */}
        <section>
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center border-2 border-[#161616] bg-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
            <div className="lg:col-span-7">
              <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#F5B700] uppercase">
                A second discipline // Commissioned separately
              </p>
              <h2 className="font-display italic font-extrabold text-3xl md:text-[2.75rem] mt-3 leading-[1.04] text-[#FBF6EA]">
                Want it to answer the phone? Add the voice agent.
              </h2>
              <p className="font-body text-[15px] text-[#FBF6EA]/75 mt-4 leading-relaxed">
                Straight answer: the voice agent is not part of the website. It is its own product, and it bolts onto
                any site. It answers your calls 24/7, qualifies the caller, books the job, and texts you the
                details before you have put your phone down.
              </p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {[
                  'Add it to the site we build you',
                  'Or to the site you already have',
                  'Keeps the number you already have',
                  'Commission both and they are built as one thing',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 font-body text-[13.5px] text-[#FBF6EA]/85">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#F5B700] shrink-0" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-5">
              <div className="border-2 border-[#161616] bg-[#FBF6EA] rounded-2xl shadow-[5px_5px_0_0_#C4160B] p-6">
                <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#C4160B]">
                  The Voice Agent
                </span>
                <p className="font-display italic font-extrabold text-[22px] mt-2.5 text-[#161616] leading-tight">
                  It answers, it qualifies, it books.
                </p>
                <p className="font-body text-[12.5px] text-[#161616]/70 mt-2 leading-relaxed">
                  Trained on your services, your hours, your pricing, and the questions your callers
                  actually ask. It keeps the number you already have.
                </p>
                <div className="mt-4 pt-4 border-t-2 border-dashed border-[#161616]/25">
                  <p className="font-mono font-bold text-[10px] uppercase tracking-[0.16em] text-[#8f6600]">
                    Commissioned together
                  </p>
                  <p className="font-body text-[13px] text-[#161616]/80 mt-1.5 leading-relaxed">
                    Site and agent built off one brain becomes the Talking Website. The answer a visitor
                    reads is the answer a midnight caller hears.
                  </p>
                </div>
                <Link
                  href="/voice-agents"
                  className="mt-5 block text-center border-2 border-[#161616] bg-[#F5B700] text-[#161616] rounded-full px-5 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Hear it answer
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stores: we build those too ── */}
        <section>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="order-2 lg:order-1">
              <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
                Online stores // We build those too
              </p>
              <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02]">
                Need to sell? We build the whole store.
              </h2>
              <p className="font-body text-[15px] text-[#161616]/75 mt-4 leading-relaxed">
                A real online store, not a plugin bolted onto a template. Full catalog, cart, and secure checkout,
                inventory and shipping wired up, and an orders board that shows every sale the moment it lands.
                Designed to look like the brand, built to actually sell.
              </p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {[
                  'Full product catalog + collections',
                  'Cart + secure checkout',
                  'Inventory, shipping, and taxes',
                  'An orders board you actually run it from',
                  'Discounts, email, abandoned-cart',
                  'You own the store and the data',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 font-body text-[13.5px] text-[#161616]/80">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#C4160B] shrink-0" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex items-center gap-3 border-2 border-[#161616] bg-white rounded-xl px-4 py-3 shadow-[4px_4px_0_0_#161616] max-w-md">
                <span className="font-mono font-bold text-[10px] uppercase tracking-[0.16em] text-[#C4160B] shrink-0">
                  Its own engagement
                </span>
                <span className="font-body text-[12.5px] text-[#161616]/75 leading-snug">
                  More than a site. Scoped around your catalog and quoted privately.
                </span>
              </div>
              <div className="mt-7">
                <Link
                  href="/inquire"
                  className="inline-flex items-center gap-2 bg-[#161616] text-[#F5B700] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
                >
                  Scope my store →
                </Link>
              </div>
            </div>

            {/* The store, in living color (display only) */}
            <div className="order-1 lg:order-2">
              <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[8px_8px_0_0_#161616] overflow-hidden">
                <div className="flex items-center gap-2 px-4 h-10 border-b-2 border-[#161616] bg-[#FBF6EA]">
                  <span className="flex gap-1.5">
                    {['#E0301E', '#F5B700', '#8FA98F'].map((c) => (
                      <span key={c} className="h-3 w-3 rounded-full border border-[#161616]" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="ml-2 flex-1 truncate rounded-full border border-[#161616]/30 bg-white px-3 py-1 font-mono text-[11px] text-[#161616]/65">
                    crossandcovenant.co
                  </span>
                </div>
                <div className="relative">
                  <Image
                    src={STORE.img}
                    alt="Cross + Covenant, a full online store designed and built by Modern Mustard Seed, with catalog, cart, and checkout wired to its orders board"
                    width={1600}
                    height={1000}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="block w-full h-auto"
                  />
                  <div className="absolute top-3 right-3 max-w-[62%] rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2 shadow-[3px_3px_0_0_#F5B700]">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#C4160B] font-bold">New order</p>
                    <p className="font-sans text-[11.5px] font-bold text-[#161616] mt-0.5 leading-snug">Filed to your orders board</p>
                  </div>
                </div>
              </div>
              <p className="font-body text-[13px] text-[#161616]/70 mt-3">
                A real store we built for Cross + Covenant. 80+ pieces, cart to checkout, every order on one board.
              </p>
            </div>
          </div>
        </section>

        {/* ── How an engagement is scoped ──
            Sarah 2026-09-11: this was a two-card price ladder (three site rungs
            with setup and monthly, then "Quoted after a free call"). A published
            number is a ceiling, so it came out. What replaces it is the thing a
            buyer actually wants to know: how the number gets arrived at, and
            that it does not move afterwards. */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Scope // How the number is arrived at
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            One price, agreed in writing, before anything is built.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed">
            There is no price list here, because a focused site for one town and a full engine with
            booking, a CRM, and a store are not the same piece of work. What follows instead is
            exactly how the quote gets made.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-10 items-stretch">
            {[
              {
                k: 'What decides it',
                h: 'The shape of the work',
                d: 'How many pages have to earn their keep, whether every service and every town needs its own, and what has to run behind the page: booking, a store, a CRM, an AI sales rep, a back office.',
              },
              {
                k: 'What is always in',
                h: 'The whole surface',
                d: 'Design and art direction, the copy, the funnels, SEO and GEO, your domain, the hosting, and ongoing care. Plus every account and every line of code, transferred to you on launch day.',
              },
              {
                k: 'What never costs extra',
                h: 'Changes',
                d: 'Changes to what we built are included, permanently. No change order, no second invoice, no conversation about whether it counts. Work that adds something we never agreed to build is a new engagement.',
              },
            ].map((c) => (
              <div
                key={c.k}
                className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 md:p-8"
              >
                <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#C4160B]">{c.k}</span>
                <h3 className="font-display italic font-extrabold text-2xl mt-2 leading-tight">{c.h}</h3>
                <p className="font-body text-[13.5px] text-[#161616]/75 mt-3 leading-relaxed flex-1">{c.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-2 border-[#161616] bg-[#F5B700] rounded-2xl shadow-[8px_8px_0_0_#161616] p-7 md:p-9">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <div className="flex-1">
                <p className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#161616]">
                  Before you write
                </p>
                <p className="font-display italic font-extrabold text-2xl md:text-[1.9rem] mt-2 leading-[1.1] text-[#161616]">
                  Studio engagements begin in the five figures.
                </p>
                <p className="font-body text-[13.5px] text-[#161616]/80 mt-3 leading-relaxed max-w-xl">
                  Said plainly so nobody wastes an afternoon. If you are earlier than that, say so in
                  your note anyway and Sarah will point you somewhere useful.
                </p>
              </div>
              <Link
                href="/inquire"
                className="shrink-0 text-center border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-8 py-4 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
              >
                Begin an engagement
              </Link>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 mt-6">
            {[
              ['1', 'The conversation', 'You write, Sarah answers herself, and one working session maps the outcome and the constraints. Then a written scope with a set package price and a fixed timeline.'],
              ['2', 'The build', 'We design it, write the copy, wire the funnels and the forms, and put it on your domain by hand. You watch it happen and you weigh in the whole way through.'],
              ['3', 'Own it, and grow', 'You get the repo, the domain, and every account. Commission the voice agent whenever you want it answering the phone. Changes stay included, permanently.'],
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

        {/* ── Why not WordPress or Webflow ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Why not WordPress or Webflow // The platform question, answered
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            We build on Next.js. Here is what that gets you.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed">
            The platform question usually stands in for four real ones. Can I keep the tools I use, do I own it, can I
            change it, and can I leave. Yes to all four.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {[
              ['Keep your tools', 'Anything you run as a plugin today, an AI assistant, a booking system, a CRM, a chat widget, a payment processor, we wire in directly. No plugin marketplace in the way.'],
              ['Own it', 'The code lives in a GitHub repo in your name. The hosting is a Vercel project in your name. The domain stays yours. Nothing runs through an account of ours.'],
              ['Change it', 'Edits to what we built are included, before launch and forever after. Send the change, we ship it. No ticket and no charge.'],
              ['Leave whenever', 'No theme license, no plugin subscription, no login of ours to get past. Any developer who works in JavaScript can pick the repo up the day you hand it over.'],
            ].map(([t, d]) => (
              <div key={t} className="border-2 border-[#161616] bg-white rounded-2xl shadow-[5px_5px_0_0_#161616] p-6">
                <h3 className="font-display font-extrabold text-lg leading-tight">{t}</h3>
                <p className="font-body text-[13px] text-[#161616]/75 mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <p className="font-body text-[13px] text-[#161616]/70 mt-6">
            Already on WordPress or Webflow? We move the content over. We do not rebuild inside those tools.
          </p>
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

      </div>

      {/* ── Real work: the scrolling reel of sites we shipped ── */}
      <WorkShowcase />

      {/* ── Close ── */}
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <section className="relative halftone-bg border-2 border-[#161616] rounded-2xl bg-[#F5B700] p-10 md:p-14 text-center overflow-hidden">
          <div className="relative">
            <h2 className="font-display italic font-extrabold text-3xl md:text-5xl leading-[1.02]">
              Tell us what you are building.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/80 mt-4 max-w-xl mx-auto leading-relaxed">
              The business, the problem, and what a good outcome looks like. Sarah reads every inquiry
              herself and answers inside one business day, whether or not it is a fit.
            </p>
            <Link
              href="/inquire"
              className="mt-7 inline-block border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-9 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
            >
              Begin an engagement →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
