import Link from 'next/link';
import { cookies } from 'next/headers';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, ORG_ID, PERSON_ID, breadcrumbJsonLd } from '@/lib/jsonld';
import { BOOTCAMP, bootcampDays, bootcampTiers, fmtMountain, fmtMountainTime, usd } from '@/data/bootcamp';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import MasterclassForm from '@/components/bootcamp/MasterclassForm';
import { Check, Kicker, h2Cls, leadCls } from '@/components/bootcamp/ui';
import RoomLinkForm from '@/components/bootcamp/room/RoomLinkForm';
import Player from '@/components/bootcamp/room/Player';
import { getSupabase } from '@/lib/supabase';
import { getStage } from '@/lib/bootcamp/stage';
import { MASTERCLASS_REPLAY_UNTIL, getSession, isLive, playerFor, roomNow, sessionEnd } from '@/lib/bootcamp/sessions';

/**
 * THE FREE SEAT. Reads ?via= or the host cookie on the server so the form can
 * carry the host's code without a client round trip.
 *
 * While the masterclass is on, the page opens with a live door: registered
 * people get their room link sent again, and anyone else registers below and
 * walks straight into the room. After it ends, the replay plays here for
 * everyone until enrollment closes, because the replay is the best sales page
 * we will ever have.
 */
export const dynamic = 'force-dynamic';

const WHEN = `${fmtMountain(BOOTCAMP.dates.masterclass)}, ${fmtMountainTime(BOOTCAMP.dates.masterclass)} ${BOOTCAMP.tzLabel}`;

export const metadata = buildMetadata({
  title: `Free Masterclass, January 26: Inside a Company Run by One Person and a Crew of Agents`,
  description: `Sixty minutes, free, live. ${BOOTCAMP.promise} ${WHEN}.`,
  path: '/bootcamp/masterclass',
});

const SLUG_OK = /^[a-z0-9-]{1,48}$/;

export default async function MasterclassPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const viaParam = typeof sp.via === 'string' ? sp.via.trim().toLowerCase() : '';
  const jar = await cookies();
  const viaCookie = (jar.get('mms_bc_ref')?.value || '').trim().toLowerCase();
  const via = SLUG_OK.test(viaParam) ? viaParam : SLUG_OK.test(viaCookie) ? viaCookie : '';

  const day1 = bootcampDays[0];
  const ga = bootcampTiers[0];
  const endIso = new Date(new Date(BOOTCAMP.dates.masterclass).getTime() + 60 * 60 * 1000).toISOString();

  const now = roomNow();
  const mc = getSession('masterclass');
  const liveNow = mc ? isLive(mc, now) : false;
  let replay: ReturnType<typeof playerFor> = null;
  if (mc && now >= sessionEnd(mc) && now < new Date(MASTERCLASS_REPLAY_UNTIL).getTime()) {
    try {
      replay = playerFor((await getStage(getSupabase())).sessions.masterclass?.replayUrl);
    } catch (err) {
      console.error('masterclass page: stage read failed', err instanceof Error ? err.message : err);
    }
  }

  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationEvent',
    '@id': `${SITE.url}/bootcamp/masterclass#event`,
    name: `${BOOTCAMP.short} free masterclass`,
    description: `A free sixty-minute live session: ${day1.title.toLowerCase()}. ${day1.lead}`,
    url: `${SITE.url}/bootcamp/masterclass`,
    image: `${SITE.url}/bootcamp/opengraph-image`,
    startDate: BOOTCAMP.dates.masterclass,
    endDate: endIso,
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    isAccessibleForFree: true,
    location: { '@type': 'VirtualLocation', url: `${SITE.url}/bootcamp/masterclass` },
    organizer: { '@id': ORG_ID },
    performer: { '@id': PERSON_ID },
    offers: { '@type': 'Offer', price: '0.00', priceCurrency: 'USD', url: `${SITE.url}/bootcamp/masterclass`, availability: 'https://schema.org/InStock' },
  };

  return (
    <div className="bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
      <JsonLd data={[eventJsonLd, breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: BOOTCAMP.short, url: '/bootcamp' }, { name: 'Free masterclass', url: '/bootcamp/masterclass' }])]} />

      <PopPageHero
        eyebrow={<span>Free masterclass · {fmtMountain(BOOTCAMP.dates.masterclass, { month: 'long', day: 'numeric' })}</span>}
        title={<>The whole studio on screen, <em>in sixty minutes.</em></>}
        titleId="mc-heading"
        art={{ src: '/art/bootcamp/hero', alt: 'Cut-paper diorama: one person at a desk on a harbor pier directing a crew of small paper agents at little desks around them, the sea behind', caption: 'Pull up a chair. It is free.' }}
        sticker="Free"
        issue={{ no: '60', lines: ['minutes', 'Jan 26'] }}
      >
        <p>Watch one person run an AI product studio on a crew of Claude agents: the phone agent answering live, the org chart, the laws, the memory and the morning briefing. Free, live, with questions at the end.</p>
        <div className={pop.actions}>
          <a href="#register" className={pop.cta}>Save my free seat</a>
          <Link href="/bootcamp" className={pop.ctaAlt}>The full bootcamp, <span>{usd(ga.priceCents)}</span></Link>
        </div>
        <p className={pop.note}>{WHEN}. 60 minutes. Replay to everyone registered the same evening.</p>
      </PopPageHero>

      {liveNow && (
        <section className="bg-[#0b3b44] text-[#fbf5ea] border-b-2 border-[#0b3b44]" aria-labelledby="live-heading">
          <div className="max-w-4xl mx-auto px-5 py-10 md:py-12 grid md:grid-cols-[1fr_1.1fr] gap-8 items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border-2 border-[#fbf5ea] bg-[#c2261a] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
                <span className="h-2 w-2 rounded-full bg-[#fbf5ea] motion-safe:animate-pulse" aria-hidden="true" /> Live now
              </p>
              <h2 id="live-heading" className="font-display text-3xl md:text-4xl font-black leading-tight mt-4">We are on the air.</h2>
              <p className="font-body text-[#fbf5ea]/80 leading-relaxed mt-3">Registered? Your room link is in your inbox; we will send it again in a second. Not yet? Save your seat below and you walk straight in.</p>
            </div>
            <div className="rounded-2xl border-2 border-[#81d8d0] bg-[#0f4a55] p-5 sm:p-6">
              <RoomLinkForm dark />
              <a href="#register" className="mt-4 inline-flex font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#f5b700] underline underline-offset-4">Not registered: take a free seat</a>
            </div>
          </div>
        </section>
      )}

      {replay && (
        <section className="py-14 md:py-20 border-b-2 border-[#0b3b44]" aria-labelledby="replay-heading">
          <div className="max-w-5xl mx-auto px-5">
            <Kicker>The replay · up until {fmtMountain(MASTERCLASS_REPLAY_UNTIL, { weekday: undefined })}</Kicker>
            <h2 id="replay-heading" className={h2Cls}>Missed it? <em>Here is the hour.</em></h2>
            <p className={leadCls}>The whole masterclass, the live call to the phone agent included. If you want the two agents built for your own business, the seats are right under it.</p>
            <div className="mt-8">
              <Player player={replay} title="The masterclass replay" />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/bootcamp#tiers" className={pop.cta}>See the three seats</Link>
            </div>
          </div>
        </section>
      )}

      <section className="py-14 md:py-20" aria-labelledby="see-heading">
        <div className="max-w-5xl mx-auto px-5 grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-start">
          <div>
            <Kicker>What you will see</Kicker>
            <h2 id="see-heading" className={h2Cls}>Not slides. <em>The actual office.</em></h2>
            <p className={leadCls}>The masterclass is the first forty minutes of Day 1, free, so you can decide about the ticket with your own eyes.</p>
            <ul className="mt-7 space-y-3">
              {day1.beats.slice(0, 5).map((b) => <Check key={b}>{b}</Check>)}
            </ul>
            <div className="mt-8 rounded-2xl border-2 border-[#0b3b44] bg-white p-5 sm:p-6 shadow-[6px_6px_0_0_#81d8d0]">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#0a7c78] font-bold">Who it is for</p>
              <p className="font-body text-[15px] text-[#0b3b44]/80 leading-relaxed mt-2">Owners and operators who already run something that works and are still the bottleneck. Builders, clinics, home services and agencies get their own room in the bootcamp on Day 2.</p>
              <p className="font-body text-xs text-[#0b3b44]/55 mt-4">{BOOTCAMP.ownerLine}</p>
            </div>
          </div>

          <div id="register" className="scroll-mt-24 rounded-2xl border-2 border-[#0b3b44] bg-white p-6 md:p-10 shadow-[7px_7px_0_0_#0b3b44]">
            <div className="border-b-2 border-[#0b3b44] pb-5 mb-6">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.26em] text-[#0a7c78]">Free registration</p>
              <p className="mt-2 font-display text-2xl font-extrabold leading-none text-[#0b3b44]">Save your seat</p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5c554a]">{WHEN}</p>
            </div>
            <MasterclassForm via={via} />
          </div>
        </div>
      </section>

      <section className="bg-[#0b3b44] text-[#fbf5ea] border-t-2 border-[#0b3b44]" aria-labelledby="after-heading">
        <div className="max-w-4xl mx-auto px-5 py-14 md:py-16 text-center">
          <Kicker dark className="justify-center">Then, if you want the rest</Kicker>
          <h2 id="after-heading" className="font-display text-3xl md:text-4xl font-black tracking-tight leading-[1.06]">Three live sessions. Two agents <em>you keep.</em></h2>
          <p className="font-body text-[#fbf5ea]/80 leading-relaxed mt-4 max-w-xl mx-auto">{BOOTCAMP.promise} {day1.dateLabel} to {bootcampDays[2].dateLabel}, from {usd(ga.priceCents)}.</p>
          <Link href="/bootcamp#tiers" className="mt-8 inline-flex items-center justify-center rounded-full border-2 border-[#0b3b44] bg-[#f5b700] px-7 py-3.5 font-sans text-xs font-extrabold uppercase tracking-[0.18em] text-[#0b3b44] shadow-[4px_4px_0_0_#81d8d0]">See the three seats</Link>
        </div>
      </section>
    </div>
  );
}
