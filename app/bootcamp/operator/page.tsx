import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, ORG_ID, PERSON_ID, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { BOOTCAMP, DONE_FOR_YOU_SEATS, OPERATOR, bootcampFaq, enrollmentOpen, operatorWeeks, usd } from '@/data/bootcamp';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import CheckoutButton from '@/components/bootcamp/CheckoutButton';
import FaqList from '@/components/bootcamp/FaqList';
import { Check, Kicker, btn, h2Cls, h2SmCls, leadCls } from '@/components/bootcamp/ui';

/** THE OPERATOR PROGRAM. Eight weeks, one price, from data/bootcamp.ts. */
export const revalidate = 3600;

export const metadata = buildMetadata({
  title: `${OPERATOR.name}: Eight Weeks to Your Own Agentic Office`,
  description: `${OPERATOR.pitch} ${usd(OPERATOR.priceCents)}, cohort of ${OPERATOR.seats}, starts ${OPERATOR.starts}.`,
  path: '/bootcamp/operator',
});

const OPERATOR_FAQ = [
  { q: 'Who is the Operator Program for?', a: 'Owners who finished the bootcamp, or who already run a working business, and want to run it on a crew they built themselves. You do not need to code. You need to know your business and show up Tuesdays and Thursdays for eight weeks.' },
  { q: 'What does it cost, and is there anything else?', a: `${usd(OPERATOR.priceCents)}, one set package, ${OPERATOR.seats} seats. Your SeedSide office is included for the length of the program. Your Claude subscription is billed by Anthropic, in your name. Nothing is added later and nothing is negotiated.` },
  { q: 'When does it run?', a: `Starts ${OPERATOR.starts}. Eight weekly live sessions with Sarah on Tuesdays, 1:00 to 2:30 PM Mountain, plus a Thursday build lab every week. Replays go up the same evening.` },
  { q: 'What if I would rather have it built for me?', a: `That is the third door: Claude Operator and Agentic Native. We build the crew, hand you every key and teach you to run it. ${DONE_FOR_YOU_SEATS} seats this launch, scoped and quoted in the conversation.` },
  bootcampFaq.find((f) => f.q === 'Are you affiliated with Anthropic?')!,
];

export default function OperatorPage() {
  const now = Date.now();
  const open = enrollmentOpen(now) || now < new Date(BOOTCAMP.dates.operatorStart).getTime();

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${SITE.url}/bootcamp/operator#course`,
    name: OPERATOR.name,
    description: OPERATOR.pitch,
    url: `${SITE.url}/bootcamp/operator`,
    image: `${SITE.url}/bootcamp/opengraph-image`,
    provider: { '@id': ORG_ID },
    instructor: { '@id': PERSON_ID },
    inLanguage: 'en-US',
    numberOfCredits: undefined,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      courseWorkload: 'PT3H',
      startDate: BOOTCAMP.dates.operatorStart,
      endDate: BOOTCAMP.dates.operatorEnd,
      instructor: { '@id': PERSON_ID },
      location: { '@type': 'VirtualLocation', url: `${SITE.url}/bootcamp/operator` },
      maximumAttendeeCapacity: OPERATOR.seats,
    },
    offers: {
      '@type': 'Offer',
      price: (OPERATOR.priceCents / 100).toFixed(2),
      priceCurrency: 'USD',
      url: `${SITE.url}/bootcamp/operator`,
      availability: open ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      category: 'Paid',
      seller: { '@id': ORG_ID },
    },
  };

  return (
    <div className="bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
      <JsonLd data={[courseJsonLd, faqJsonLd(OPERATOR_FAQ), breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: BOOTCAMP.short, url: '/bootcamp' }, { name: OPERATOR.name, url: '/bootcamp/operator' }])]} />

      <PopPageHero
        eyebrow={<span>{OPERATOR.name} · {OPERATOR.chip}</span>}
        title={<>Eight weeks. Then you run it <em>yourself.</em></>}
        titleId="op-heading"
        art={{ src: '/art/bootcamp/hero', alt: 'Cut-paper diorama: one person at a desk on a harbor pier directing a crew of small paper agents at little desks around them, the sea behind', caption: 'Your desk, your crew, your office.' }}
        sticker="Cohort"
        issue={{ no: String(OPERATOR.weeks), lines: ['weeks live', `starts Feb 16`] }}
      >
        <p>{OPERATOR.pitch}</p>
        <div className={pop.actions}>
          <a href="#enroll" className={pop.cta}>{OPERATOR.cta}, <span>{usd(OPERATOR.priceCents)}</span></a>
          <a href="#ladder" className={pop.ctaAlt}>The eight weeks</a>
        </div>
        <p className={pop.note}>Starts {OPERATOR.starts}. Tuesdays 1:00 to 2:30 PM Mountain, plus a Thursday build lab. {OPERATOR.seats} seats.</p>
      </PopPageHero>

      {/* THE PROMISE */}
      <section className="bg-[#0b3b44] text-[#fbf5ea]" aria-labelledby="promise-heading">
        <div className="max-w-5xl mx-auto px-5 py-12 md:py-16 grid md:grid-cols-[auto_1fr] gap-6 md:gap-12 items-center">
          <Kicker dark className="mb-0 md:[writing-mode:vertical-rl] md:rotate-180">The promise</Kicker>
          <h2 id="promise-heading" className="font-display text-2xl md:text-4xl font-black tracking-tight leading-[1.1]">{OPERATOR.promise}</h2>
        </div>
      </section>

      {/* THE LADDER */}
      <section id="ladder" className="py-16 md:py-24 scroll-mt-24" aria-labelledby="ladder-heading">
        <div className="max-w-5xl mx-auto px-5">
          <Kicker>Week by week</Kicker>
          <h2 id="ladder-heading" className={h2Cls}>Eight rungs. <em>One office at the top.</em></h2>
          <p className={leadCls}>Each week ends with something running that was not running the week before. By week four your crew is doing real recurring work. Week seven, you ship.</p>
          <ol className="mt-10 grid md:grid-cols-2 gap-4">
            {operatorWeeks.map((w) => (
              <li key={w.n} className="flex gap-5 rounded-2xl border-2 border-[#0b3b44] bg-white p-5 sm:p-6 shadow-[5px_5px_0_0_#0b3b44]">
                <span aria-hidden="true" className="font-display text-4xl sm:text-5xl font-black text-[#f5b700] leading-none w-10 sm:w-14 shrink-0">{w.n}</span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a7c78] font-bold">Week {w.n}</p>
                  <h3 className="font-display text-xl font-black mt-1">{w.title}</h3>
                  <p className="font-body text-[15px] text-[#0b3b44]/75 leading-relaxed mt-2">{w.outcome}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ENROLL */}
      <section id="enroll" className="py-16 md:py-24 bg-[#d8f3f0] border-y-2 border-[#0b3b44] scroll-mt-24" aria-labelledby="enroll-heading">
        <div className="max-w-5xl mx-auto px-5 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
          <div>
            <Kicker>What is included</Kicker>
            <h2 id="enroll-heading" className={h2Cls}>Everything the office needs <em>to run without us.</em></h2>
            <ul className="mt-8 space-y-3">
              {OPERATOR.includes.map((line) => <Check key={line}>{line}</Check>)}
            </ul>
          </div>
          <article aria-labelledby="op-card-heading" className="rounded-2xl border-2 border-[#0b3b44] bg-[#0b3b44] text-[#fbf5ea] p-6 sm:p-8 shadow-[8px_8px_0_0_#f5b700] lg:sticky lg:top-28">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-[#81d8d0]">{OPERATOR.chip}</p>
            <h3 id="op-card-heading" className="font-display text-2xl font-black mt-3">{OPERATOR.name}</h3>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-5xl sm:text-6xl font-black tracking-tight leading-none text-[#f5b700]">{usd(OPERATOR.priceCents)}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#fbf5ea]/60">one seat</span>
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3 font-body text-sm">
              <div className="rounded-xl bg-[#0e4b56] p-3"><dt className="text-[#fbf5ea]/60 text-xs">Seats</dt><dd className="font-display font-black text-xl mt-0.5">{OPERATOR.seats}</dd></div>
              <div className="rounded-xl bg-[#0e4b56] p-3"><dt className="text-[#fbf5ea]/60 text-xs">Starts</dt><dd className="font-display font-black text-base mt-1 leading-tight">{OPERATOR.starts.replace(', 2027', '')}</dd></div>
            </dl>
            <CheckoutButton tier="operator" label={OPERATOR.cta} open={open} className={btn.onDark} closedLabel="This cohort has started" />
            <p className="mt-3 text-center font-body text-xs text-[#fbf5ea]/55">A set package. Card or bank, through Stripe. Promotion codes work at checkout.</p>
          </article>
        </div>
      </section>

      {/* HAVE US BUILD IT */}
      <section className="py-16 md:py-20" aria-labelledby="built-heading">
        <div className="max-w-5xl mx-auto px-5">
          <div className="rounded-2xl border-2 border-[#0b3b44] bg-white p-7 sm:p-10 shadow-[6px_6px_0_0_#81d8d0] grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <Kicker>Door three</Kicker>
              <h2 id="built-heading" className={h2SmCls}>Would rather <em>have us build it?</em></h2>
              <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-4 max-w-2xl">Claude Operator and Agentic Native: we build the crew in your accounts, hand you every key and teach you to run it. {DONE_FOR_YOU_SEATS} seats this launch, scoped and quoted in the conversation.</p>
            </div>
            <Link href="/claude" className={`${btn.dark} md:min-w-[220px]`}>See Claude Operator</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 border-t-2 border-[#0b3b44]" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-5">
          <Kicker>Straight answers</Kicker>
          <h2 id="faq-heading" className={h2SmCls}>Before you take the seat.</h2>
          <FaqList items={OPERATOR_FAQ} />
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a href="#enroll" className={btn.gold}>{OPERATOR.cta}</a>
            <Link href="/bootcamp" className={btn.white}>Back to the bootcamp</Link>
          </div>
          <p className="font-body text-xs text-[#0b3b44]/55 mt-8">Claude is a product of Anthropic. Modern Mustard Seed is an independent studio and is not affiliated with or endorsed by Anthropic.</p>
        </div>
      </section>
    </div>
  );
}
