import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { partnerMath } from '@/lib/partner-desk/letters';
import PartnerFilm from '@/components/partners/PartnerFilm';

const m = partnerMath();
const $ = m.dollars;
const tw = m.talkingWebsite;

/** Posted and review dates for the Google for Jobs listing. Move both when the role is re-posted. */
const DATE_POSTED = '2026-09-30';
const VALID_THROUGH = '2027-03-31';

export const metadata = buildMetadata({
  title: 'Independent Sales Rep, Commission Only, Remote. AI websites and voice agents for local businesses',
  description: `Commission-only independent sales rep role with Modern Mustard Seed, remote, anywhere in the US. Bring us local businesses, we build each one a free demo before they pay, and you earn ${m.pct}% of every invoice for ${m.months} months: ${$(tw.firstCheck)} the month a Talking Website signs, ${$(tw.year)} over the year. No quota, no cap, no cost to join.`,
  path: '/partners/sales-rep',
});

const EARN = [
  { big: $(tw.firstCheck), label: 'The month they sign', d: `The first invoice carries the ${$(tw.setup)} setup fee plus month one, and your ${m.pct}% is taken on all of it.` },
  { big: $(tw.perMonth), label: `Every month after, for ${m.months - 1} more`, d: `${m.pct}% of the ${$(tw.monthly)} monthly invoice, for as long as they stay inside your ${m.months}-month window.` },
  { big: $(tw.year), label: 'Year one, per business', d: `Ten kept Talking Websites is ${$(m.tenTalkingWebsites.perMonth)} a month to you, on top of each first check.` },
];

const JOB = [
  { t: 'Find owners who miss calls', d: 'Contractors, salons, restaurants, clinics, cleaners, landscapers. Anyone whose phone rings while their hands are full. You likely know twenty already.' },
  { t: 'Get us the name', d: 'A business name and a town, through your link or your portal. That starts the build. You never write a proposal or quote a price.' },
  { t: 'We build their demo, free', d: 'Their own website and a voice agent that answers as their business, built to their trade before anyone pays a cent. The demo does the selling.' },
  { t: 'They keep it, you get paid', d: `The checkout carries your code, the ledger in your portal shows every dollar, and ${m.pct}% of every invoice comes to you for ${m.months} months.` },
];

const FIT = [
  'You already sit across from small-business owners: marketing, bookkeeping, insurance, lending, printing, signage, coaching, real estate.',
  'You design websites but do not build AI receptionists, and you want to offer one without building it.',
  'You run in a chamber, a BNI chapter, a trade association, or a church business circle.',
  'You have sold door to door, on the phone, or on a showroom floor, and you want recurring income instead of one-time spiffs.',
];

const GET = [
  { t: 'Your own tracked link', d: 'Follows every business you send for 60 days and ties the demo, the checkout and every invoice back to you.' },
  { t: 'A portal with real numbers', d: 'Clicks, demos built, businesses kept, what is pending and what is paid.' },
  { t: 'A field guide for your territory', d: 'Walk-in routes, local events with a vendor floor, the ninety-second script, and a printed card kit with your QR code.' },
  { t: 'A free demo for every prospect', d: 'No cap on how many we build for you. Every one is real, built to the business, and theirs to call.' },
];

const FAQ = [
  { q: 'Is there a base salary?', a: 'No. This is an independent contractor role paid on commission only, reported on a 1099. There is no cost to join, no quota and no cap.' },
  { q: 'Do I have to close deals?', a: 'No. You open the door. The free demo and our team do the rest. Reps who like to close can walk an owner through their demo in person, and that is where the best months come from.' },
  { q: 'When do I get paid?', a: `A commission is recorded the moment a referred payment clears, visible in your portal the same day, and paid out on the schedule you set. The ${m.pct}% runs for ${m.months} paid invoices per business.` },
  { q: 'What else can I earn on?', a: `Businesses that need a bigger build, like a store, an app or an agentic system, pay you ${m.buildPct}% of the project, ${m.producerPct}% once you close them regularly. Every playbook we sell pays ${m.productPct}%.` },
  { q: 'Where can I work?', a: 'Anywhere in the United States. We build for businesses nationwide from our home base in Kalispell, Montana, and every demo is delivered online.' },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: 'Independent Sales Rep, AI Websites and Voice Agents (Commission Only, Remote)',
  description: [
    `<p>Modern Mustard Seed builds websites that answer their own phone: a site and an AI voice receptionist for local businesses, ${$(tw.setup)} to launch and ${$(tw.monthly)} a month.</p>`,
    '<p>You bring us local businesses. We build each one a free demo of their own site and voice agent before they pay anything, so you walk in with the product already made.</p>',
    `<p><strong>Compensation:</strong> commission only, independent contractor (1099). ${m.pct}% of every invoice for ${m.months} months per business: ${$(tw.firstCheck)} the month a Talking Website signs, then ${$(tw.perMonth)} a month, ${$(tw.year)} in year one. ${m.buildPct}% to ${m.producerPct}% on custom builds. No quota, no cap, no cost to join.</p>`,
    '<p><strong>Who does well:</strong> people who already talk to small-business owners, including marketers, bookkeepers, insurance agents, print and sign shops, chamber and BNI members, and web designers who do not offer AI.</p>',
    '<p><strong>You get:</strong> a partner portal, your own tracking link, a printed card kit, a field guide for your territory and a free demo build for every prospect.</p>',
  ].join(''),
  datePosted: DATE_POSTED,
  validThrough: `${VALID_THROUGH}T23:59:59-06:00`,
  employmentType: 'CONTRACTOR',
  jobLocationType: 'TELECOMMUTE',
  applicantLocationRequirements: { '@type': 'Country', name: 'USA' },
  hiringOrganization: {
    '@type': 'Organization',
    name: SITE.name,
    sameAs: SITE.url,
    logo: `${SITE.url}/brand/mascot.png`,
  },
  industry: 'Web design and AI software',
  directApply: true,
  url: `${SITE.url}/partners/sales-rep`,
};

export default function SalesRepPage() {
  return (
    <div className="bg-[#fbf5ea] text-[#0b3b44]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative px-6 pt-36 pb-16 overflow-hidden halftone-bg">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold block mb-6">Independent Sales Rep · Commission only · Remote, US</span>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.02] text-[#0b3b44]">
            Walk in with the product<br className="hidden sm:block" /> already built.
          </h1>
          <p className="mt-7 text-[#3A3733] text-lg font-body font-light max-w-2xl mx-auto leading-relaxed">
            We build websites that answer their own phone for local businesses. You bring us the business, we build them a free demo before they pay a cent, and you earn {m.pct}% of every invoice for {m.months} months: {$(tw.firstCheck)} the month a Talking Website signs, {$(tw.year)} over the year.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/partners#apply" className="inline-block px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#0b3b44] bg-[#f5b700] border-2 border-[#0b3b44] rounded-full shadow-[4px_4px_0_0_#0b3b44] hover:shadow-[6px_6px_0_0_#0b3b44] hover:-translate-y-0.5 transition-all">
              Apply to rep for us
            </Link>
            <a href="#earn" className="text-[12px] uppercase tracking-[0.18em] font-mono font-bold text-[#0b3b44]/70 hover:text-[#0b3b44] transition-colors underline underline-offset-4 decoration-[#f5b700] decoration-2">
              See what one client pays you
            </a>
          </div>
        </div>

        {/* The job in 67 seconds, from real screens. */}
        <div id="film" className="relative z-10 max-w-4xl mx-auto mt-14 scroll-mt-24">
          <PartnerFilm />
        </div>
      </section>

      {/* What one client pays */}
      <section id="earn" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-24">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold block mb-3">One kept Talking Website</span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0b3b44] max-w-2xl mx-auto text-balance">Paid when they sign. Paid every month after.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {EARN.map((e) => (
            <div key={e.label} className="bg-white border-2 border-[#0b3b44] rounded-2xl shadow-[5px_5px_0_0_#0b3b44] p-7">
              <div className="font-display text-5xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-[#0b3b44] leading-none mb-2 whitespace-nowrap">{e.big}</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[#0b3b44]/60 font-mono font-bold mb-4">{e.label}</div>
              <p className="text-[#3A3733] font-body text-sm leading-relaxed">{e.d}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[#3A3733] font-body text-sm mt-6">
          A {m.voice.name} on its own pays {$(m.voice.firstCheck)} the month it signs and {$(m.voice.perMonth)} a month after, {$(m.voice.year)} over the year.
        </p>
      </section>

      {/* The job */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white border-2 border-[#0b3b44] rounded-3xl shadow-[6px_6px_0_0_#0b3b44] p-8 md:p-12">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold block mb-3">The job</span>
          <h2 className="font-display text-3xl font-semibold text-[#0b3b44] mb-8">You open the door. The demo does the selling.</h2>
          <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {JOB.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-[#f5b700] border-2 border-[#0b3b44] font-display font-bold text-lg">{i + 1}</span>
                <div>
                  <h3 className="font-sans font-bold text-[#0b3b44] mb-1 text-[15px]">{s.t}</h3>
                  <p className="text-[#3A3733] font-body text-sm leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who does well */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-[#0b3b44] text-[#fbf5ea] border-2 border-[#0b3b44] rounded-3xl p-8 md:p-12">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#f5b700] font-mono font-bold block mb-3">Who does well here</span>
          <h2 className="font-display text-3xl font-semibold mb-6 text-[#fbf5ea]">People an owner already trusts.</h2>
          <ul className="space-y-4">
            {FIT.map((f) => (
              <li key={f} className="flex gap-3 font-body text-[15px] leading-relaxed text-[#fbf5ea]/85">
                <span className="text-[#f5b700] text-lg leading-none mt-1">●</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What you get */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold block mb-3">What you get on day one</span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0b3b44]">Everything but the introduction.</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {GET.map((g) => (
            <div key={g.t} className="bg-white border-2 border-[#0b3b44] rounded-2xl shadow-[5px_5px_0_0_#0b3b44] p-7">
              <h3 className="font-sans font-bold text-[#0b3b44] mb-2 text-[16px]">{g.t}</h3>
              <p className="text-[#3A3733] font-body text-sm leading-relaxed">{g.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="font-display text-3xl font-semibold text-[#0b3b44] mb-6 text-center">The straight answers</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group bg-white border-2 border-[#0b3b44] rounded-2xl p-5 open:shadow-[4px_4px_0_0_#0b3b44]">
              <summary className="cursor-pointer list-none font-sans font-bold text-[#0b3b44] text-[15px] flex justify-between items-center gap-4">
                {f.q}
                <span className="text-[#0a7c78] font-mono text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-[#3A3733] font-body text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Apply */}
      <section className="px-6 py-16 halftone-bg text-center">
        <h2 className="font-display text-4xl font-semibold text-[#0b3b44]">Rep for us.</h2>
        <p className="text-[#3A3733] font-body mt-3 max-w-xl mx-auto">Sarah reads every application. Approved reps get their link, their portal and the field guide the same day.</p>
        <Link href="/partners#apply" className="mt-8 inline-block px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#0b3b44] bg-[#f5b700] border-2 border-[#0b3b44] rounded-full shadow-[4px_4px_0_0_#0b3b44] hover:shadow-[6px_6px_0_0_#0b3b44] hover:-translate-y-0.5 transition-all">
          Apply now
        </Link>
      </section>
    </div>
  );
}
