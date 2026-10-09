import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { getSupabase } from '@/lib/supabase';
import { BOOTCAMP, OPERATOR, tradeRooms, bootcampTiers, deliverablesFor, deliverablesReleased, enrollmentOpen, fmtMountain, fmtMountainTime, getBootcampTier, usd } from '@/data/bootcamp';
import { deliverableHref, fmtBytes, readManifest } from '@/lib/bootcamp/deliverables';
import { WORKSHEET_MINUTES, WORKSHEET_NAME } from '@/data/bootcamp-worksheet';
import { roomRegistration } from '@/lib/bootcamp/room-auth';
import { getStage, loadWorksheet, EMPTY_STAGE, type StageState } from '@/lib/bootcamp/stage';
import {
  DOORS_OPEN_MS,
  canWatchReplay,
  getsTranscripts,
  isLive,
  nextSession,
  playerFor,
  replayCloses,
  sessionEnd,
  roomNow,
  sessionsFor,
  type BootcampSession,
} from '@/lib/bootcamp/sessions';
import { inviteUrl } from '@/lib/bootcamp/ics';
import { unsubscribeLink } from '@/lib/bootcamp/key';
import { firstNameOf, type RegistrationRow } from '@/lib/bootcamp/store';
import RoomLive, { type LiveView, type NextView, type TradeRoomLink } from '@/components/bootcamp/room/RoomLive';
import Schedule, { type ScheduleItem, type ScheduleStatus } from '@/components/bootcamp/room/Schedule';
import Worksheet from '@/components/bootcamp/room/Worksheet';
import Deliverables, { type DeliverableView } from '@/components/bootcamp/room/Deliverables';
import RoomLinkForm from '@/components/bootcamp/room/RoomLinkForm';
import TierCards from '@/components/bootcamp/TierCards';
import DoorRow from '@/components/bootcamp/DoorRow';
import { Kicker, h2SmCls, leadCls } from '@/components/bootcamp/ui';

/**
 * A PERSON'S OWN ROOM. One signed link, the same in every letter and every
 * calendar file: the live stream when a session is on, the questions box, the
 * replays their ticket covers, the transcripts their tier includes, the Idea
 * Director worksheet, and the next door. Never indexed, never cached.
 *
 * The stage (links, the offer switch) is set on /admin/bootcamp, Stage tab.
 * The room re-renders itself when the stage moves, through RoomLive's pulse.
 */
export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: `Your Room: ${BOOTCAMP.short}`,
  description: 'Your live sessions, your replays, your questions and your worksheet, in one place.',
  path: '/bootcamp/room',
  noindex: true,
});

const TIER_NAME: Record<string, string> = {
  masterclass: 'Free masterclass seat',
  ga: 'General Admission',
  vip: 'VIP',
  platinum: 'Platinum',
  operator: OPERATOR.name,
};

const whenLine = (iso: string) => `${fmtMountain(iso)}, ${fmtMountainTime(iso)} ${BOOTCAMP.tzLabel}`;
const dateOnly = (ms: number) => fmtMountain(new Date(ms).toISOString(), { weekday: undefined, year: 'numeric' });

/** This person's calendar file for a session, with their room inside it. Relative, for an in-page link. */
const calFor = (s: BootcampSession, regId: string): string => inviteUrl(s.key, regId, '');

function statusOf(reg: RegistrationRow, s: BootcampSession, stage: StageState, now: number): ScheduleStatus {
  if (isLive(s, now)) return 'live';
  if (now < sessionEnd(s)) return 'upcoming';
  if (!canWatchReplay(reg, s, now)) return 'closed';
  return stage.sessions[s.key]?.replayUrl ? 'replay' : 'processing';
}

function NotFound() {
  return (
    <div className="bg-[#fcfaf3] text-[#141210] min-h-[70vh]">
      <section className="halftone-bg border-b-2 border-[#141210]">
        <div className="max-w-2xl mx-auto px-5 pt-28 pb-14 md:pt-36 md:pb-16 text-center">
          <Kicker className="justify-center">{BOOTCAMP.short}</Kicker>
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.02]">This link does not <em>open a room.</em></h1>
          <p className="font-body text-[#141210]/70 mt-5 max-w-lg mx-auto leading-relaxed">
            Room links are personal and come in every email we send you. If the link was cut off by your mail app, or you cannot find the email, we will send it again.
          </p>
        </div>
      </section>
      <section className="py-14">
        <div className="max-w-xl mx-auto px-5">
          <div className="rounded-[4px] border-2 border-[#141210] bg-white p-6 sm:p-8">
            <RoomLinkForm />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 text-center">
            <Link href="/bootcamp/masterclass" className="font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0f4c47] underline underline-offset-4">Not registered? The free masterclass</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function RoomPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const id = typeof sp.id === 'string' ? sp.id : '';
  const k = typeof sp.k === 'string' ? sp.k : '';
  const fresh = sp.new === '1';

  const sb = getSupabase();
  let reg: RegistrationRow | null = null;
  try {
    reg = await roomRegistration(sb, id, k);
  } catch (err) {
    console.error('bootcamp room: registration read failed', err instanceof Error ? err.message : err);
  }
  if (!reg) return <NotFound />;

  let stage: StageState = EMPTY_STAGE;
  let stageDown = false;
  try {
    stage = await getStage(sb);
  } catch (err) {
    stageDown = true;
    console.error('bootcamp room: stage read failed', err instanceof Error ? err.message : err);
  }

  const now = roomNow();
  const tier = reg.tier;
  const isTicket = tier !== 'masterclass';
  const mine = sessionsFor(tier);
  const liveS = mine.find((s) => isLive(s, now)) ?? null;
  const nextS = liveS ? null : nextSession(now, mine);

  let worksheet: { answers: Record<string, string>; at: string } | null = null;
  if (isTicket) {
    try {
      worksheet = await loadWorksheet(sb, reg.id);
    } catch (err) {
      console.error('bootcamp room: worksheet read failed', err instanceof Error ? err.message : err);
    }
  }

  // The tier deliverables: VIP holds the deck, Platinum and the cohort hold all three.
  const owned = deliverablesFor(tier);
  const released = deliverablesReleased(now);
  const manifest = owned.length && released ? await readManifest() : {};
  const kit: DeliverableView[] = owned.map((d) => ({
    ...d,
    files: d.files.map((f) => ({ ...f, href: deliverableHref(f.name, reg.id, k), size: fmtBytes(manifest[f.name]?.bytes) })),
  }));

  const first = reg.first_name ?? firstNameOf(reg.name);
  const ticket = getBootcampTier(tier);
  const closes = replayCloses(reg);
  const open = enrollmentOpen(now);
  const day3Done = now >= sessionEnd(mine.find((s) => s.key === 'day3') ?? mine[mine.length - 1]);
  const mute = unsubscribeLink(SITE.url, reg.id);

  const live: LiveView | null = liveS
    ? { key: liveS.key, label: liveS.label, title: liveS.title, startsAt: liveS.startsAt, endsAt: new Date(sessionEnd(liveS)).toISOString() }
    : null;
  const livePlayer = liveS ? playerFor(stage.sessions[liveS.key]?.liveUrl, { autoplay: true }) : null;
  const liveRooms = liveS ? stage.sessions[liveS.key]?.rooms : undefined;
  const rooms: TradeRoomLink[] = liveRooms
    ? tradeRooms
        .filter((r) => liveRooms[r.slug])
        .map((r) => ({ slug: r.slug, name: r.name, href: liveRooms[r.slug] as string, mine: r.slug === reg.trade }))
        .sort((a, b) => Number(b.mine) - Number(a.mine))
    : [];
  const doorsOpen = liveS ? fmtMountainTime(new Date(new Date(liveS.startsAt).getTime() - DOORS_OPEN_MS).toISOString()) : null;
  const next: NextView | null = nextS
    ? { key: nextS.key, label: nextS.label, title: nextS.title, startsAt: nextS.startsAt, when: whenLine(nextS.startsAt), cal: calFor(nextS, reg.id) }
    : null;

  // The pitch: a free seat sees the three tickets under the stream when Sarah
  // turns the offer on, and under the countdown once the masterclass is over.
  const masterclassOver = now >= new Date(BOOTCAMP.dates.masterclass).getTime();
  const showOffer = tier === 'masterclass' && open && (stage.offer.open || (masterclassOver && !liveS));

  const items: ScheduleItem[] = mine.map((s) => ({
    key: s.key,
    label: s.label,
    title: s.title,
    when: whenLine(s.startsAt),
    status: statusOf(reg, s, stage, now),
    cal: calFor(s, reg.id),
    replay: canWatchReplay(reg, s, now) ? playerFor(stage.sessions[s.key]?.replayUrl) : null,
    transcriptUrl: getsTranscripts(tier) ? stage.sessions[s.key]?.transcriptUrl ?? null : null,
    group: s.audience === 'operator' ? OPERATOR.name : s.key === 'masterclass' ? 'The free masterclass' : 'The bootcamp',
  }));

  const tierLine =
    tier === 'masterclass'
      ? `Your seat is free. The replay stays here until ${dateOnly(closes)}.`
      : `Replays of every session stay here until ${dateOnly(closes)}.${getsTranscripts(tier) ? ' Transcripts and class notes go up with them.' : ''}`;

  return (
    <div className="bg-[#fcfaf3] text-[#141210] overflow-x-clip">
      <section className="halftone-bg border-b-2 border-[#141210]">
        <div className="max-w-5xl mx-auto px-5 pt-28 pb-10 md:pt-36 md:pb-14">
          <Kicker>Your room · {TIER_NAME[tier] ?? tier}</Kicker>
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.02]">
            {first ? `${first}, this is` : 'This is'} <em>your room.</em>
          </h1>
          <p className={leadCls}>
            {fresh ? 'You are in, and this page is yours. ' : ''}The live sessions play here, your questions go in from here, and the replays your seat covers wait here. One link, the same in every email. {tierLine}
          </p>
          {stageDown && (
            <p role="status" className="mt-5 rounded-lg border-2 border-[#ff6f59] bg-[#FDECEA] px-4 py-3 font-body text-sm text-[#8a1c10] max-w-2xl">
              The stage is slow to answer right now. If a session is on and the stream does not appear within a minute, reply to any of our emails and we will send the link directly.
            </p>
          )}
        </div>
      </section>

      <section id="stage" className="scroll-mt-24 py-10 md:py-14" aria-label="The stage">
        <div className="max-w-5xl mx-auto px-5">
          <RoomLive
            id={reg.id}
            k={k}
            rev={stage.rev}
            live={live}
            livePlayer={livePlayer}
            next={next}
            doorsOpen={doorsOpen}
            rooms={rooms}
            offer={{ show: showOffer && Boolean(liveS), open, email: reg.email, host: reg.host_slug }}
            serverNow={now}
            done={
              tier === 'masterclass'
                ? { kicker: 'The masterclass is over', title: open ? 'The replay is below, and so is your seat for February.' : 'The replay is below.' }
                : undefined
            }
          />
        </div>
      </section>

      <section className="py-10 md:py-14 border-t-2 border-[#141210]/10" aria-labelledby="sessions-heading">
        <div className="max-w-5xl mx-auto px-5">
          <Kicker>Every session in your seat</Kicker>
          <h2 id="sessions-heading" className={h2SmCls}>Live, then <em>on replay.</em></h2>
          <p className={leadCls}>Each session opens here fifteen minutes before the hour. The replay goes up the same evening.</p>
          <div className="mt-8">
            <Schedule items={items} />
          </div>
        </div>
      </section>

      {isTicket && (
        <section id="worksheet" className="scroll-mt-24 py-10 md:py-14 bg-[#e8ecd0]/50 border-y-2 border-[#141210]" aria-labelledby="ws-heading">
          <div className="max-w-3xl mx-auto px-5">
            <Kicker>Pre-work · about {WORKSHEET_MINUTES} minutes</Kicker>
            <h2 id="ws-heading" className={h2SmCls}>{WORKSHEET_NAME}</h2>
            <p className={leadCls}>
              Seven questions that turn one idea into a brief an agent can build from. Sarah reads every one before Day 2 and the front row is picked from them. On Day 3, the brief at the bottom is the first thing your agent reads.
            </p>
            <div className="mt-8">
              <Worksheet id={reg.id} k={k} initial={worksheet?.answers ?? {}} savedAt={worksheet?.at ?? null} who={{ name: reg.name, business: reg.business }} />
            </div>
          </div>
        </section>
      )}

      {kit.length > 0 && (
        <section id="kit" className="scroll-mt-24 py-10 md:py-14 border-t-2 border-[#141210]/10" aria-labelledby="kit-heading">
          <div className="max-w-6xl mx-auto px-5">
            <Kicker>In your seat</Kicker>
            <h2 id="kit-heading" className={h2SmCls}>{kit.length === 1 ? 'Your deck.' : 'Your deck, your kit,'} <em>{kit.length === 1 ? 'Forty cards.' : 'your playbook.'}</em></h2>
            <p className={leadCls}>
              {released
                ? 'Everything your seat includes, ready to download. The links work only from this room; keep this page.'
                : `Your ${TIER_NAME[tier] ?? ''} seat includes ${kit.length === 1 ? 'this' : 'these'}. ${kit.length === 1 ? 'It opens' : 'They open'} right here when Day 3 ends, ${whenLine(BOOTCAMP.dates.deliverables)}, and we email you the moment ${kit.length === 1 ? 'it does' : 'they do'}.`}
            </p>
            <div className="mt-8">
              <Deliverables items={kit} released={released} opensOn={fmtMountain(BOOTCAMP.dates.deliverables)} />
            </div>
          </div>
        </section>
      )}

      {showOffer && !liveS && (
        <section className="py-12 md:py-16" aria-labelledby="seat-heading">
          <div className="max-w-6xl mx-auto px-5">
            <Kicker>If you want the rest</Kicker>
            <h2 id="seat-heading" className={h2SmCls}>Three live sessions. Two agents <em>you keep.</em></h2>
            <p className={leadCls}>
              {BOOTCAMP.promise} From {usd(bootcampTiers[0].priceCents)}. {BOOTCAMP.guarantee} Enrollment closes {whenLine(BOOTCAMP.dates.close)}.
            </p>
            <TierCards open={open} email={reg.email} host={reg.host_slug} />
          </div>
        </section>
      )}

      {tier === 'masterclass' && !masterclassOver && (
        <section className="py-12 md:py-14" aria-labelledby="bring-heading">
          <div className="max-w-3xl mx-auto px-5">
            <div className="rounded-[4px] border-2 border-[#141210] bg-white p-6 sm:p-8">
              <Kicker>Before {fmtMountain(BOOTCAMP.dates.masterclass, { weekday: undefined })}</Kicker>
              <h2 id="bring-heading" className="font-display text-2xl sm:text-3xl font-black leading-tight">Bring one idea.</h2>
              <p className="font-body text-[15px] text-[#141210]/75 leading-relaxed mt-3">
                The job in your business you would hand to an agent tomorrow if you could. Have your website open in another tab; Sarah asks the room what each business&apos;s first agent should be, and yours is a better answer if you can see your own front door.
              </p>
              <Link href="/bootcamp" className="mt-5 inline-flex font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0f4c47] underline underline-offset-4">
                What the bootcamp is
              </Link>
            </div>
          </div>
        </section>
      )}

      {isTicket && ticket && day3Done && (
        <section className="py-12 md:py-16 border-t-2 border-[#141210]/10" aria-labelledby="doors-heading">
          <div className="max-w-6xl mx-auto px-5">
            <Kicker>After Day 3</Kicker>
            <h2 id="doors-heading" className={h2SmCls}>Three doors <em>out.</em></h2>
            <p className={leadCls}>Your two agents are working. Here is what comes next, if anything does.</p>
            <DoorRow />
          </div>
        </section>
      )}

      <section className="py-10 border-t-2 border-[#141210]/10">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="font-body text-[13px] text-[#141210]/60">
            Trouble with the room? Reply to any of our emails or write <a href="mailto:sarah@modernmustardseed.com" className="font-semibold underline underline-offset-2">sarah@modernmustardseed.com</a>.
          </p>
          {mute && !reg.unsubscribed_at && (
            <a href={mute} className="font-body text-[12px] text-[#141210]/50 underline underline-offset-2">Mute the reminder emails</a>
          )}
          {reg.unsubscribed_at && <p className="font-body text-[12px] text-[#141210]/50">Reminder emails are muted. This room still works.</p>}
        </div>
      </section>
    </div>
  );
}
