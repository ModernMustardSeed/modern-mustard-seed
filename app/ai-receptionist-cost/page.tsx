import Link from 'next/link';
import { JsonLd, articleJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import ReceptionistPaybackCalculator from '@/components/ReceptionistPaybackCalculator';
import HearItAnswers from '@/components/conversion/HearItAnswers';
import BookCallLink from '@/components/conversion/BookCallLink';
import { formatChecked } from '@/lib/checked-date';
import { BLS_RECEPTIONIST, CHECKED, PUBLISHED, RECHECKED, blsMonthly, costFaqs, vendors } from '@/data/receptionist-cost';

const PATH = '/ai-receptionist-cost';
const TITLE = 'AI Receptionist Cost in 2026: Real Prices Compared';
const DESCRIPTION =
  'What an AI receptionist costs in 2026, from published pricing pages: Upfirst, Dialzara, Rosie, Goodcall, My AI Front Desk, Smith.ai and Ruby, compared with hiring a receptionist. Options under $100 a month, dental and restaurant notes, and a payback calculator.';

export const metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  article: { published: PUBLISHED, modified: CHECKED },
});

const ANSWER = `An AI receptionist costs about $25 to $350 a month on published self-serve plans: Upfirst from $24.95, Dialzara from $29, Rosie from $49, Goodcall from $79 and My AI Front Desk from $99, per their pricing pages checked ${formatChecked(CHECKED)}. Smith.ai's AI-first plans start with a free plan for 25 calls, then Pro from $150 and Enterprise from $500 a month, checked ${formatChecked(RECHECKED)}. Services with humans answering cost more: Ruby from $250 and Smith.ai's human-first plans from $300 a month. A full-time receptionist costs about $${blsMonthly.toLocaleString('en-US')} a month in wages alone at the US median. Built-for-you receptionists are quoted as a set package price.`;

const ART_ALT = 'Painting: Mr. Mustard strolls a sunny seaside promenade of little shops with Tiffany-blue and coral awnings, the family with gelato and the sea at the end of the street';

const under100 = [
  { name: 'Upfirst Starter', price: '$24.95 a month', what: '30 calls, then $1.50 a call', url: 'https://www.upfirst.ai/pricing' },
  { name: 'Dialzara Business Lite', price: '$29 a month', what: '60 minutes, then $0.48 a minute', url: 'https://www.dialzara.com/pricing' },
  { name: 'Rosie Professional', price: '$49 a month', what: '250 minutes, English and Spanish', url: 'https://heyrosie.com/pricing' },
  { name: 'Upfirst Premium', price: '$59.95 a month', what: '90 calls, then $1 a call', url: 'https://www.upfirst.ai/pricing' },
  { name: 'Smith.ai AI-first Free', price: '$0 a month', what: '25 calls, then $3.00 a call', url: 'https://smith.ai/pricing/ai-receptionist' },
  { name: 'Goodcall Starter', price: '$79 a month', what: '100 unique customers, then 79 cents each', url: 'https://www.goodcall.com/pricing' },
  { name: 'My AI Front Desk', price: '$79 a month billed annually', what: '200 voice minutes ($99 billed monthly)', url: 'https://www.myaifrontdesk.com/pricing' },
];

const drivers = [
  {
    h: 'What the meter counts',
    p: 'Plans charge by minutes (Dialzara, Rosie, Ruby), by calls (Upfirst, Smith.ai) or by unique customers (Goodcall, which states it does not meter minutes, calls or tokens). Long calls favor a per-call plan; many short calls favor a per-minute plan; repeat callers favor a per-customer plan.',
  },
  {
    h: 'Booking into your calendar',
    p: 'Booking is the feature that turns a call into a job. Some plans include it; others gate or charge for it. Rosie lists calendar booking on Scale and Growth. Smith.ai lists AI scheduling on every AI-first plan, and charges $1.50 a call to book an appointment on its human-first plans.',
  },
  {
    h: 'After-hours coverage',
    p: 'AI receptionists answer around the clock on every published plan we checked. A human receptionist covers business hours unless you pay for more people or an answering service on top.',
  },
  {
    h: 'Spanish and other languages',
    p: 'Rosie answers in English and Spanish on every plan, Upfirst lists 35+ languages, Ruby lists 24/7 Spanish and bilingual handling, and Smith.ai charges $1.00 a call for a dedicated Spanish line on its human-first plans.',
  },
  {
    h: 'Script customization',
    p: 'How far the agent can be shaped to your business is often a plan limit: Rosie allows 2, 5 or unlimited message-taking scenarios by plan, and Goodcall allows 5, 10 or 20 workers. A built-for-you receptionist is scripted around your services, prices and booking rules from the start.',
  },
];

export default function AiReceptionistCostPage() {
  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, datePublished: PUBLISHED, dateModified: CHECKED }),
          faqJsonLd(costFaqs),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Voice Agents', url: '/voice-agents' },
            { name: 'AI Receptionist Cost', url: PATH },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
        <PopPageHero
          eyebrow={
            <>
              <Link href="/compare" className={pop.back}>
                ← All Comparisons
              </Link>
              <span className={pop.pill}>Pricing guide</span>
            </>
          }
          title={TITLE}
          art={{ src: '/art/riviera/industries', alt: ART_ALT, caption: 'Published prices, side by side' }}
          sticker="Prices"
        >
          <p className="compare-answer">{ANSWER}</p>
          <p className={pop.note}>
            Last checked {formatChecked(CHECKED)}. Every price is from the vendor&apos;s own pricing page, linked below. Modern Mustard Seed wrote this guide and is one of the options in it.
          </p>
          <div className={pop.actions}>
            <a href="#prices" className={pop.cta}>
              See the prices
            </a>
            <a href="#payback" className={pop.ctaAlt}>
              Run the payback math
            </a>
          </div>
        </PopPageHero>

        <HearItAnswers
          source="seo:/ai-receptionist-cost:after-answer"
          heading="Before you compare prices, hear one answer."
          lede="Type your number and our AI receptionist calls you in about ten seconds. Ask it what a customer would ask, and judge the call, not the price list."
        />

        {/* Price table */}
        <section id="prices" className="relative max-w-6xl mx-auto px-6 md:px-8 py-12 scroll-mt-24" aria-labelledby="prices-h">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">Published prices</span>
            <h2 id="prices-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              What each one <span className="italic text-[#0a7c78]">charges</span>
            </h2>
          </div>

          <div className="hidden md:block pop-card overflow-hidden p-0">
            <table className="w-full text-left text-sm font-body">
              <caption className="sr-only">AI receptionist and answering service prices, checked {formatChecked(CHECKED)}</caption>
              <thead className="bg-[#0b3b44] text-[#fbf5ea]">
                <tr>
                  <th scope="col" className="p-4 w-[16%] text-[10px] uppercase tracking-[0.25em] font-mono">Option</th>
                  <th scope="col" className="p-4 w-[15%] text-[10px] uppercase tracking-[0.25em] font-mono">From</th>
                  <th scope="col" className="p-4 w-[44%] text-[10px] uppercase tracking-[0.25em] font-mono">Plans</th>
                  <th scope="col" className="p-4 w-[25%] text-[10px] uppercase tracking-[0.25em] font-mono">Metered by</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v, idx) => (
                  <tr key={v.name} className={v.isUs ? 'bg-[#fff4cc]' : idx % 2 ? 'bg-[#fbf5ea]' : 'bg-white'}>
                    <th scope="row" className="p-4 align-top">
                      <a href={v.source.url} target={v.isUs ? undefined : '_blank'} rel={v.isUs ? undefined : 'noopener noreferrer'} className="font-display font-black text-[#0b3b44] underline underline-offset-2">
                        {v.name}
                      </a>
                      <span className="block mt-1 text-[10px] uppercase tracking-[0.2em] font-mono text-[#0a7c78]">{v.isUs ? 'This is us' : v.kind}</span>
                      {v.checked && <span className="block mt-1 text-[10px] font-mono text-[#3a3733]/80">Checked {formatChecked(v.checked)}</span>}
                    </th>
                    <td className="p-4 align-top font-semibold text-[#0b3b44]">{v.from}</td>
                    <td className="p-4 align-top text-[#3a3733] leading-6">
                      {v.plans}
                      {v.notes.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-[#3a3733]/90">
                          {v.notes.map((n) => <li key={n}>{n}</li>)}
                        </ul>
                      )}
                    </td>
                    <td className="p-4 align-top text-[#3a3733] leading-6">{v.meter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4">
            {vendors.map((v) => (
              <div key={v.name} className={v.isUs ? 'pop-card-yellow p-5' : 'pop-card p-5'}>
                <p className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#0a7c78] mb-1">{v.isUs ? 'This is us' : v.kind}</p>
                <h3 className="font-display text-lg font-black text-[#0b3b44]">
                  <a href={v.source.url} target={v.isUs ? undefined : '_blank'} rel={v.isUs ? undefined : 'noopener noreferrer'} className="underline underline-offset-2">
                    {v.name}
                  </a>
                </h3>
                <p className="text-sm font-semibold text-[#0b3b44] mt-1 mb-3">From {v.from}</p>
                {v.checked && <p className="text-xs font-mono text-[#3a3733]/80 -mt-2 mb-3">Checked {formatChecked(v.checked)}</p>}
                <p className="text-sm text-[#3a3733] leading-6 mb-2">{v.plans}</p>
                <p className="text-sm text-[#3a3733] leading-6"><span className="font-semibold">Metered by:</span> {v.meter}</p>
                {v.notes.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-[#3a3733] leading-6">
                    {v.notes.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-[#0b3b44]/70 font-body text-center">Prices change. Check each source before you buy.</p>
        </section>

        {/* Human vs virtual vs AI */}
        <section className="max-w-6xl mx-auto px-6 md:px-8 py-12" aria-labelledby="human-h">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">The real comparison</span>
            <h2 id="human-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              Hire, outsource, or <span className="italic text-[#0a7c78]">automate</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="pop-card p-7">
              <p className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] mb-2">In-house receptionist</p>
              <p className="font-display text-3xl font-black text-[#0b3b44]">About ${blsMonthly.toLocaleString('en-US')}/mo</p>
              <p className="mt-3 text-sm text-[#3a3733] font-body leading-7">
                US median pay for receptionists was ${BLS_RECEPTIONIST.annual.toLocaleString('en-US')} a year in {BLS_RECEPTIONIST.period} (
                <a href={BLS_RECEPTIONIST.url} target="_blank" rel="noopener noreferrer" className="text-[#0a7c78] underline underline-offset-2">BLS</a>
                ). That is wages only, before payroll taxes and benefits, for business hours, with lunches, sick days and nights uncovered.
              </p>
            </div>
            <div className="pop-card p-7">
              <p className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] mb-2">Virtual receptionist service</p>
              <p className="font-display text-3xl font-black text-[#0b3b44]">$250 to $2,100/mo</p>
              <p className="mt-3 text-sm text-[#3a3733] font-body leading-7">
                Ruby charges for live minutes ($250 for 50 up to $1,725 for 500). Smith.ai's human-first plans charge by the call ($300 for 30 up to $2,100 for 300) with booking at $1.50 a call. You get people, metered.
              </p>
            </div>
            <div className="pop-card-yellow p-7">
              <p className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0b3b44] mb-2">AI receptionist</p>
              <p className="font-display text-3xl font-black text-[#0b3b44]">$25 to $350/mo</p>
              <p className="mt-3 text-sm text-[#0b3b44]/85 font-body leading-7">
                Published self-serve plans from Upfirst, Dialzara, Rosie, Goodcall and My AI Front Desk. Answers every call at once, day and night. You set it up, or have one built for you at a set package price.
              </p>
            </div>
          </div>
          <div className="pop-card-cream p-7 md:p-9 mt-5">
            <h3 className="font-display text-xl md:text-2xl font-black text-[#0b3b44] tracking-tight mb-3">When a person is still the right hire</h3>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">
              Hire a person when the front desk does more than answer the phone: greeting walk-ins, handling payments, calming an upset patient, or making judgment calls a script cannot. Many offices run both: a person in the building, and an AI receptionist for overflow, lunch and after hours.
            </p>
          </div>
        </section>

        {/* Under $100 */}
        <section className="max-w-6xl mx-auto px-6 md:px-8 py-12" aria-labelledby="under-h">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">On a tight budget</span>
            <h2 id="under-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              AI receptionists under <span className="italic text-[#0a7c78]">$100</span> a month
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {under100.map((u) => (
              <a key={u.name} href={u.url} target="_blank" rel="noopener noreferrer" className="pop-card p-5 hover:-translate-y-1 transition-transform duration-300">
                <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] block mb-2">{u.price}</span>
                <span className="font-display text-lg font-black text-[#0b3b44] block">{u.name}</span>
                <span className="text-sm text-[#3a3733] font-body">{u.what}</span>
              </a>
            ))}
          </div>
          <p className="mt-5 text-sm text-[#3a3733] font-body leading-7 max-w-3xl mx-auto text-center">
            The lowest entry price is only lowest at low volume. Price your busiest month, with overage, before you choose.
          </p>
        </section>

        {/* Drivers */}
        <section className="max-w-6xl mx-auto px-6 md:px-8 py-12" aria-labelledby="drivers-h">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">Read the fine print</span>
            <h2 id="drivers-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              What drives the <span className="italic text-[#0a7c78]">price</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {drivers.map((d) => (
              <div key={d.h} className="pop-card p-6">
                <h3 className="font-display text-lg md:text-xl font-black text-[#0b3b44] tracking-tight mb-2">{d.h}</h3>
                <p className="text-[#3a3733] text-sm font-body leading-7">{d.p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* By industry */}
        <section className="max-w-6xl mx-auto px-6 md:px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-5" aria-label="By industry">
          <div className="pop-card p-7 md:p-9">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-4 block">Dental offices</span>
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-4">AI receptionist cost for a dental office</h2>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-3">
              A dental office pays the same published plan prices as anyone, so the table above is the starting point. The deciding question is not price: patient details on a call are protected health information, so use only a vendor that will sign a Business Associate Agreement. Upfirst lists BAAs on its Custom plan. Get it in writing from any vendor before the line goes live.
            </p>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">
              Most practices keep a person at the front desk and use AI for the lunch hour, after hours and the overflow when the desk is checking someone out. See{' '}
              <Link href="/for/health" className="text-[#0a7c78] underline underline-offset-2">how we build for health practices</Link>.
            </p>
          </div>
          <div className="pop-card p-7 md:p-9">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-4 block">Restaurants</span>
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-4">AI receptionist cost for a restaurant</h2>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-3">
              Restaurants get many short calls at the same time: hours, directions, reservations, is the patio open. That pattern makes the meter matter more than the sticker price. A per-minute plan suits short calls; a per-call plan gets expensive on a Friday night; a per-customer plan suits regulars who call often.
            </p>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">
              Whatever you choose, make sure it answers several calls at once, so nobody hears a busy signal at 6 pm. See{' '}
              <Link href="/for/restaurants" className="text-[#0a7c78] underline underline-offset-2">how we build for restaurants</Link>.
            </p>
          </div>
        </section>

        {/* Payback */}
        <section id="payback" className="max-w-4xl mx-auto px-6 md:px-8 py-12 scroll-mt-24" aria-labelledby="payback-h">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">Payback period</span>
            <h2 id="payback-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              Does it pay for <span className="italic text-[#0a7c78]">itself?</span>
            </h2>
            <p className="mt-4 text-[#3a3733] font-body leading-7">
              Put in your own numbers. Nothing is filled in for you, because nobody else knows what your calls are worth.
            </p>
          </div>
          <ReceptionistPaybackCalculator />
        </section>

        {/* Where we fit */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 py-12">
          <div className="pop-card-yellow p-7 md:p-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0b3b44] font-mono font-bold mb-4 block">Where we fit</span>
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-4">Built for you instead of set up by you</h2>
            <p className="text-[#0b3b44]/85 text-sm md:text-base font-body leading-7 mb-4">
              The self-serve plans above are the right call when you will configure and maintain the agent yourself. We build the receptionist for you, around your services, service area, prices and booking rules, test it on real calls and hand it over, and changes to what we built are included. Set package price, quoted after a free discovery call.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/voice-agents" className={pop.cta}>See Our Voice Agents</Link>
              <BookCallLink source="seo:/ai-receptionist-cost:built-for-you" className={pop.ctaAlt}>Book a Discovery Call</BookCallLink>
            </div>
          </div>
        </section>

        <HearItAnswers
          source="seo:/ai-receptionist-cost:before-faq"
          heading="Hear what yours would sound like."
          lede="The fastest way to decide is a real call. Drop your number, tell him your trade, and he answers the way your own receptionist would."
        />

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 py-16">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-4 block">FAQ</span>
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              Cost <span className="italic text-[#0a7c78]">questions</span>
            </h2>
          </div>
          <div className="space-y-3">
            {costFaqs.map((item) => (
              <details key={item.q} className="pop-card p-6 group cursor-pointer">
                <summary className="flex justify-between items-start gap-4 list-none">
                  <h3 className="font-display text-base md:text-lg font-black text-[#0b3b44] tracking-tight">{item.q}</h3>
                  <span className="text-[#0a7c78] text-2xl font-black flex-shrink-0 transition-transform group-open:rotate-45 leading-none">+</span>
                </summary>
                <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mt-4">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Sources */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 pb-12">
          <div className="pop-card p-6 md:p-8">
            <h2 className="font-display text-xl font-black text-[#0b3b44] tracking-tight mb-3">Sources and method</h2>
            <p className="text-[#3a3733] text-sm font-body leading-7 mb-3">
              Modern Mustard Seed wrote this guide and is one of the options in it. Every price for another company was read from that company&apos;s own pricing page on {formatChecked(CHECKED)}. Where a company publishes no price, the table says so.
            </p>
            <ul className="text-sm font-body leading-7 list-disc pl-5">
              {vendors.filter((v) => !v.isUs).map((v) => (
                <li key={v.source.url}>
                  <a href={v.source.url} target="_blank" rel="noopener noreferrer" className="text-[#0a7c78] underline underline-offset-2">{v.source.label}</a>
                </li>
              ))}
              <li>
                <a href={BLS_RECEPTIONIST.url} target="_blank" rel="noopener noreferrer" className="text-[#0a7c78] underline underline-offset-2">US Bureau of Labor Statistics, Receptionists</a>
              </li>
            </ul>
          </div>
        </section>

        {/* Related */}
        <section className="max-w-6xl mx-auto px-6 md:px-8 pb-24">
          <h2 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-6 text-center">Keep comparing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/compare/ai-receptionist-vs-answering-service" className="pop-card p-5 hover:-translate-y-1 transition-transform duration-300">
              <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] block mb-2">Comparison</span>
              <span className="font-display text-base font-black text-[#0b3b44] leading-snug">AI receptionist vs a live answering service</span>
            </Link>
            <Link href="/compare/ai-receptionist-vs-voicemail" className="pop-card p-5 hover:-translate-y-1 transition-transform duration-300">
              <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] block mb-2">Comparison</span>
              <span className="font-display text-base font-black text-[#0b3b44] leading-snug">AI receptionist vs voicemail</span>
            </Link>
            <Link href="/best/ai-receptionists-for-contractors" className="pop-card-yellow p-5 hover:-translate-y-1 transition-transform duration-300">
              <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0b3b44] block mb-2">Buyer&apos;s guide</span>
              <span className="font-display text-base font-black text-[#0b3b44] leading-snug">The best AI receptionists for contractors</span>
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
