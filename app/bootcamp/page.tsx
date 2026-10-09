import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, ORG_ID, PERSON_ID, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import {
  BOOTCAMP,
  BOOTCAMP_PROOF,
  HOSTS,
  OPERATOR,
  bootcampDays,
  bootcampFaq,
  bootcampTiers,
  enrollmentOpen,
  fmtMountain,
  fmtMountainTime,
  tradeRooms,
  usd,
} from '@/data/bootcamp';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import TierCards from '@/components/bootcamp/TierCards';
import Countdown from '@/components/bootcamp/Countdown';
import RoomTabs from '@/components/bootcamp/RoomTabs';
import FaqList from '@/components/bootcamp/FaqList';
import DoorRow from '@/components/bootcamp/DoorRow';
import TheOffice from '@/components/bootcamp/office/TheOffice';
import { Check, Kicker, btn, h2Cls, h2SmCls, leadCls } from '@/components/bootcamp/ui';

/**
 * THE OFFER PAGE. Every word, price and date comes from data/bootcamp.ts.
 * Revalidates every hour so the countdown's first paint and the enrollment gate
 * are never more than an hour behind the clock.
 */
export const revalidate = 3600;

export const metadata = buildMetadata({
  title: BOOTCAMP.metaTitle,
  description: BOOTCAMP.metaDescription,
  path: '/bootcamp',
});

const ART_ALT =
  'Cut-paper diorama: one person at a desk on a harbor pier directing a crew of small paper agents at little desks around them, the sea behind';

const ROOMS_ALT =
  'Cut-paper diorama: four paper rooms on a quay, one per trade. A builder with a house frame under a mustard awning, a clinic chair under a coral awning, a service van under a Tiffany blue awning, and an agency easel under a lagoon green awning.';

const ga = bootcampTiers[0];

const DIRECTOR = [
  {
    title: 'Decide what should exist',
    body: 'The one job no agent takes. You look at the business and name the thing that is missing: the follow-up nobody sends, the report nobody writes, the product you have described at dinner for a year.',
  },
  {
    title: 'Brief the crew',
    body: 'A brief is a page: what it does, what done looks like, what it must never do. Written in your words. An agent that has the brief does not need you in the room.',
  },
  {
    title: 'Say yes',
    body: 'The crew brings back the draft, the fix, the three ideas. Your mornings become fifteen minutes of yes, no and not yet. That is the whole job, and it is a good one.',
  },
];

export default function BootcampPage() {
  const now = Date.now();
  const open = enrollmentOpen(now);
  const day1 = bootcampDays[0];
  const day3 = bootcampDays[2];

  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationEvent',
    '@id': `${SITE.url}/bootcamp#event`,
    name: BOOTCAMP.name,
    description: BOOTCAMP.metaDescription,
    url: `${SITE.url}/bootcamp`,
    image: `${SITE.url}/bootcamp/opengraph-image`,
    startDate: BOOTCAMP.dates.day1,
    endDate: BOOTCAMP.dates.day3,
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: { '@type': 'VirtualLocation', url: `${SITE.url}/bootcamp` },
    organizer: { '@id': ORG_ID },
    performer: { '@id': PERSON_ID },
    inLanguage: 'en-US',
    offers: bootcampTiers.map((t) => ({
      '@type': 'Offer',
      name: `${t.name}: ${BOOTCAMP.short}`,
      description: t.pitch,
      price: (t.priceCents / 100).toFixed(2),
      priceCurrency: 'USD',
      url: `${SITE.url}/bootcamp#tiers`,
      availability: open ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      validThrough: BOOTCAMP.dates.close,
      seller: { '@id': ORG_ID },
    })),
  };

  return (
    <div id="top" className="bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
      <JsonLd data={[eventJsonLd, faqJsonLd(bootcampFaq), breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: BOOTCAMP.short, url: '/bootcamp' }])]} />

      <PopPageHero
        eyebrow={<span>{BOOTCAMP.name}</span>}
        title={<>Run your business on a <em>crew of agents.</em></>}
        titleId="bootcamp-heading"
        art={{ src: '/art/bootcamp/hero', alt: ART_ALT, caption: 'One desk. A whole crew.' }}
        sticker="Live"
        issue={{ no: '3', lines: ['live sessions', 'Feb 2 to 9'] }}
        marquee={['Three live sessions', 'February 2, 4 and 9', 'Two agents you keep', 'Four trade rooms', `${usd(ga.priceCents)} a seat`, 'Taught live by Sarah Scarano']}
      >
        <p>{BOOTCAMP.promise}</p>
        <div className={pop.actions}>
          <a href="#tiers" className={pop.cta}>Take a seat, <span>{usd(ga.priceCents)}</span></a>
          <Link href="/bootcamp/masterclass" className={pop.ctaAlt}>Free masterclass, <span>Jan 26</span></Link>
        </div>
        <p className={pop.note}>
          {day1.dateLabel}, {bootcampDays[1].dateLabel} and {day3.dateLabel}, 2027. {BOOTCAMP.sessionTime}. {BOOTCAMP.ownerLine}
        </p>
      </PopPageHero>

      {/* THE PROOF */}
      <section className="bg-[#0b3b44]" aria-label="How the studio runs">
        <div className="max-w-5xl mx-auto px-5 py-8 md:py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-7">
            {BOOTCAMP_PROOF.map((p) => (
              <div key={p.label} className="text-center">
                <p className="font-display text-3xl md:text-4xl font-black text-[#f5b700] tracking-tight leading-none">{p.n}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#fbf5ea]/70 mt-2 leading-snug">{p.label}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#fbf5ea]/50 text-center mt-7">Counted from the setup that runs Modern Mustard Seed today. You see all of it on Day 1.</p>
        </div>
      </section>

      {/* THE OFFICE: the real crew, and a console to hand it a job */}
      <TheOffice />

      {/* THE THESIS */}
      <section className="py-16 md:py-24" aria-labelledby="thesis-heading">
        <div className="max-w-5xl mx-auto px-5">
          <div className="max-w-3xl">
            <Kicker>The idea</Kicker>
            <h2 id="thesis-heading" className={h2Cls}>We are all directors <em>of ideas now.</em></h2>
            <p className={leadCls}>{BOOTCAMP.thesis}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {DIRECTOR.map((d, i) => (
              <div key={d.title} className="rounded-2xl border-2 border-[#0b3b44] bg-white p-6 shadow-[6px_6px_0_0_#0b3b44]">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#0a7c78] font-bold">What a director does · {i + 1}</p>
                <h3 className="font-display text-xl font-black mt-3">{d.title}</h3>
                <p className="font-body text-[15px] text-[#0b3b44]/75 leading-relaxed mt-2">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE THREE DAYS */}
      <section id="days" className="py-16 md:py-20 bg-[#d8f3f0] border-y-2 border-[#0b3b44] scroll-mt-24" aria-labelledby="days-heading">
        <div className="max-w-5xl mx-auto px-5">
          <Kicker>Three live sessions</Kicker>
          <h2 id="days-heading" className={h2Cls}>Watch it run. Then <em>build your own.</em></h2>
          <p className={leadCls}>{BOOTCAMP.sessionTime}, every session. Kickoff is {fmtMountain(BOOTCAMP.dates.kickoff)}: setup done together, so Day 1 starts at speed.</p>
          <ol className="mt-12 relative">
            <span aria-hidden="true" className="absolute left-[22px] sm:left-[30px] top-6 bottom-6 w-0.5 bg-[#0b3b44]/20" />
            {bootcampDays.map((d) => (
              <li key={d.n} className="relative pl-16 sm:pl-24 pb-12 last:pb-0">
                <span aria-hidden="true" className="absolute left-0 top-0 grid place-items-center w-11 h-11 sm:w-[60px] sm:h-[60px] rounded-full bg-[#f5b700] border-2 border-[#0b3b44] shadow-[3px_3px_0_0_#0b3b44] font-display font-black text-base sm:text-xl">
                  {d.n}
                </span>
                <div className="rounded-2xl border-2 border-[#0b3b44] bg-[#fbf5ea] p-6 sm:p-8 shadow-[6px_6px_0_0_#0b3b44]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#0a7c78] font-bold">Day {d.n} · {d.dateLabel} · {fmtMountainTime(BOOTCAMP.dates[d.dateKey])} {BOOTCAMP.tzLabel}</p>
                  <h3 className="font-display text-2xl sm:text-3xl font-black mt-3 leading-tight">{d.title}</h3>
                  <p className="font-body text-[17px] text-[#0b3b44]/80 leading-relaxed mt-3">{d.lead}</p>
                  <ul className="mt-5 space-y-2.5">
                    {d.beats.map((b) => <Check key={b}>{b}</Check>)}
                  </ul>
                  <div className="mt-6 rounded-xl bg-[#0b3b44] text-[#fbf5ea] p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#81d8d0] font-bold">You leave with</p>
                    <p className="font-body text-[16px] leading-relaxed mt-2">{d.leaveWith}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* THE ROOMS */}
      <section className="py-16 md:py-24" aria-labelledby="rooms-heading">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-8 lg:gap-12 items-center">
            <div>
              <Kicker>Day 2 splits by trade</Kicker>
              <h2 id="rooms-heading" className={h2Cls}>Four rooms. Yours is <em>one of them.</em></h2>
              <p className={leadCls}>
                {tradeRooms.map((r) => r.name).join(', ')}: each room works on the real businesses in it, with its own host. Pick your trade when you register and the room is set.
              </p>
            </div>
            <figure className="m-0 rounded-[22px] bg-white p-2.5 shadow-[0_30px_60px_-30px_#0b3b4466,0_0_0_1px_#0b3b4414]">
              <picture>
                <source type="image/avif" srcSet="/art/bootcamp/rooms-960.avif 960w, /art/bootcamp/rooms-1600.avif 1600w" sizes="(min-width: 1024px) 42vw, 90vw" />
                <source type="image/webp" srcSet="/art/bootcamp/rooms-960.webp 960w, /art/bootcamp/rooms-1600.webp 1600w" sizes="(min-width: 1024px) 42vw, 90vw" />
                <img
                  src="/art/bootcamp/rooms-960.webp"
                  alt={ROOMS_ALT}
                  width={1600}
                  height={1067}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto aspect-[3/2] object-cover rounded-[14px]"
                />
              </picture>
              <figcaption className="pt-2.5 text-center font-body italic text-[15px] text-[#0b3b44]">Four rooms on the quay. Yours is one of them.</figcaption>
            </figure>
          </div>
          <RoomTabs />
        </div>
      </section>

      {/* THE SEATS */}
      <section id="tiers" className="py-16 md:py-24 bg-[#fbf5ea] border-t-2 border-[#0b3b44] scroll-mt-24" aria-labelledby="tiers-heading">
        <div className="max-w-6xl mx-auto px-5">
          <Kicker>Take a seat</Kicker>
          <h2 id="tiers-heading" className={h2Cls}>Three seats. <em>One price each.</em></h2>
          <p className={leadCls}>
            Every seat is a set package. Enrollment closes {fmtMountain(BOOTCAMP.dates.close, { month: 'long', day: 'numeric' })} at 11:59 PM {BOOTCAMP.tzLabel}, the night of Day 1.
            {!open && ' Enrollment for this run is closed; the masterclass replay and the next run go to the list first.'}
          </p>
          <TierCards open={open} />
          <p className="font-body text-sm text-[#0b3b44]/60 mt-8 max-w-2xl">
            Promotion codes work at checkout. Every seat includes the first month of SeedSide; after that it is month to month, cancel any time.
          </p>
        </div>
      </section>

      <Countdown serverNow={now} />

      {/* THE GUARANTEE */}
      <section className="py-16 md:py-20" aria-labelledby="guarantee-heading">
        <div className="max-w-4xl mx-auto px-5">
          <div className="relative rounded-2xl border-2 border-[#0b3b44] bg-white p-7 sm:p-10 shadow-[8px_8px_0_0_#81d8d0]">
            <span aria-hidden="true" className="absolute -top-4 right-6 sm:right-10 rotate-[-6deg] rounded-md border-[3px] border-[#ff6f59] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#ff6f59] bg-white">
              Day 1 guarantee
            </span>
            <Kicker>The guarantee</Kicker>
            <h2 id="guarantee-heading" className={h2SmCls}>Day 1 pays for the ticket, <em>or you do not.</em></h2>
            <p className="font-body text-[17px] text-[#0b3b44]/80 leading-relaxed mt-4">{BOOTCAMP.guarantee}</p>
          </div>
        </div>
      </section>

      {/* THE DOORS */}
      <section className="py-16 md:py-20 border-t-2 border-[#0b3b44]" aria-labelledby="doors-heading">
        <div className="max-w-5xl mx-auto px-5">
          <Kicker>After Day 3</Kicker>
          <h2 id="doors-heading" className={h2Cls}>Three doors out. <em>You pick.</em></h2>
          <p className={leadCls}>We say this up front because we would rather you choose with your eyes open. The sessions are the product. Most people take the first door, and that is a good outcome.</p>
          <DoorRow />
        </div>
      </section>

      {/* HOST A ROOM */}
      <section className="bg-[#0a7c78] text-[#fbf5ea] border-y-2 border-[#0b3b44]" aria-labelledby="host-heading">
        <div className="max-w-5xl mx-auto px-5 py-14 md:py-16 grid md:grid-cols-[1.2fr_auto] gap-8 items-center">
          <div>
            <Kicker dark>{HOSTS.name} · Founding hosts: {HOSTS.foundingHosts}</Kicker>
            <h2 id="host-heading" className="font-display text-3xl md:text-4xl font-black tracking-tight leading-[1.06]">Have an audience? Keep <em>every ticket.</em></h2>
            <p className="font-body text-[#fbf5ea]/85 leading-relaxed mt-4 max-w-2xl">{HOSTS.pitch}</p>
          </div>
          <Link href="/bootcamp/host" className={`${btn.gold} md:min-w-[220px]`}>{HOSTS.cta}</Link>
        </div>
      </section>

      {/* THE OPERATOR PROGRAM */}
      <section className="py-16 md:py-24" aria-labelledby="operator-heading">
        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-[1fr_1fr] gap-8 md:gap-12 items-center">
          <div>
            <Kicker>Door two, in full</Kicker>
            <h2 id="operator-heading" className={h2Cls}>{OPERATOR.name}: <em>eight weeks, live.</em></h2>
            <p className={leadCls}>{OPERATOR.pitch}</p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/bootcamp/operator" className={btn.dark}>See the program</Link>
              <span className="inline-flex items-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#0b3b44]/60 font-bold">
                {usd(OPERATOR.priceCents)} · {OPERATOR.seats} seats · starts {OPERATOR.starts}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-[#0b3b44] bg-[#0b3b44] text-[#fbf5ea] p-6 sm:p-8 shadow-[8px_8px_0_0_#f5b700]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#81d8d0] font-bold">The promise</p>
            <p className="font-body text-[17px] leading-relaxed mt-3">{OPERATOR.promise}</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 border-t-2 border-[#0b3b44]" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-5">
          <Kicker>Straight answers</Kicker>
          <h2 id="faq-heading" className={h2SmCls}>Before you take a seat.</h2>
          <FaqList items={bootcampFaq} />
        </div>
      </section>

      {/* CLOSING */}
      <section className="bg-[#0b3b44] text-[#fbf5ea] halftone-ink" aria-labelledby="close-heading">
        <div className="max-w-4xl mx-auto px-5 py-16 md:py-24 text-center">
          <Kicker dark className="justify-center">{day1.dateLabel} · {BOOTCAMP.sessionTime}</Kicker>
          <h2 id="close-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">One desk. <em>A whole crew.</em></h2>
          <p className="font-body text-[#fbf5ea]/80 leading-relaxed mt-5 max-w-xl mx-auto">Two working agents for the business you already run, built with you in the room, for {usd(ga.priceCents)}. Or come to the free masterclass first and decide after.</p>
          <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
            <a href="#tiers" className={btn.onDark}>Take a seat, {usd(ga.priceCents)}</a>
            <Link href="/bootcamp/masterclass" className={btn.white}>Free masterclass, Jan 26</Link>
          </div>
          <p className="font-body text-xs text-[#fbf5ea]/50 mt-10">Claude is a product of Anthropic. Modern Mustard Seed is an independent studio and is not affiliated with or endorsed by Anthropic.</p>
        </div>
      </section>
    </div>
  );
}
