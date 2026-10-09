import { BOOTCAMP, OPERATOR, bootcampDays, getBootcampTier, operatorWeeks } from '@/data/bootcamp';

/**
 * EVERY LIVE MOMENT OF THE LAUNCH, and who may walk into it.
 *
 * The room, the stage desk, the morning-of letters and the replay letters all
 * read this list, so a session is defined once: its key, its clock, its
 * length and the tiers that hold a seat in it. Dates come from
 * data/bootcamp.ts, so moving a day moves the room with it.
 *
 * Three audiences. The masterclass is open to every registration. The kickoff
 * and the three days belong to ticket holders and cohort seats (an Operator
 * seat includes the bootcamp). The eight Tuesday sessions and eight Thursday
 * labs belong to the cohort alone.
 *
 * Pure: no database, no clock read without a `now` argument, so the test can
 * pin every rule at a fixed instant.
 */

export type Audience = 'everyone' | 'ticket' | 'operator';

export type SessionKey =
  | 'masterclass'
  | 'kickoff'
  | 'day1'
  | 'day2'
  | 'day3'
  | `op${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `lab${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export type BootcampSession = {
  key: SessionKey;
  /** "Day 1", "Week 3", "Lab 3", "Masterclass". */
  label: string;
  title: string;
  startsAt: string;
  minutes: number;
  audience: Audience;
  /** 1 to 3 for the bootcamp days; attendance on these is what the guarantee reads. */
  dayN?: 1 | 2 | 3;
};

const H = 60 * 60 * 1000;
const DAY = 24 * H;
const MIN = 60 * 1000;

/** The room opens this long before the hour, the way the letters promise ("ten to the hour"). */
export const DOORS_OPEN_MS = 15 * MIN;
/** And stays live this long past the scheduled end, because Q&A runs over. */
export const OVERRUN_MS = 30 * MIN;
/** The masterclass replay is public until enrollment closes. */
export const MASTERCLASS_REPLAY_UNTIL = BOOTCAMP.dates.close;

const shift = (iso: string, ms: number) => new Date(new Date(iso).getTime() + ms).toISOString();

/**
 * The room's clock. On Vercel it is always the real time. On this machine,
 * BOOTCAMP_CLOCK (an ISO instant) pins it, so the live room, the replay and
 * the offer can be rendered and checked months before January, under
 * `next start` as well as `next dev`.
 */
export function clockPinned(): boolean {
  return !process.env.VERCEL && Boolean(process.env.BOOTCAMP_CLOCK);
}

export function roomNow(): number {
  if (clockPinned()) {
    const pinned = new Date(process.env.BOOTCAMP_CLOCK ?? '').getTime();
    if (Number.isFinite(pinned)) return pinned;
  }
  return Date.now();
}

export function bootcampSessions(): BootcampSession[] {
  const D = BOOTCAMP.dates;
  const days = bootcampDays.map(
    (d): BootcampSession => ({
      key: d.dateKey,
      label: `Day ${d.n}`,
      title: d.title,
      startsAt: D[d.dateKey],
      minutes: 90,
      audience: 'ticket',
      dayN: d.n,
    }),
  );
  const weeks = operatorWeeks.flatMap((w): BootcampSession[] => {
    const tuesday = shift(D.operatorStart, (w.n - 1) * 7 * DAY);
    return [
      { key: `op${w.n}` as SessionKey, label: `Week ${w.n}`, title: w.title, startsAt: tuesday, minutes: 90, audience: 'operator' },
      { key: `lab${w.n}` as SessionKey, label: `Lab ${w.n}`, title: `Build lab: ${w.title}`, startsAt: shift(tuesday, 2 * DAY), minutes: 90, audience: 'operator' },
    ];
  });
  return [
    { key: 'masterclass', label: 'Masterclass', title: 'Inside a company run by one person and a crew', startsAt: D.masterclass, minutes: 60, audience: 'everyone' },
    { key: 'kickoff', label: 'Kickoff', title: 'Setup together, so Day 1 starts at speed', startsAt: D.kickoff, minutes: 90, audience: 'ticket' },
    ...days,
    ...weeks,
  ];
}

export const SESSION_KEYS: SessionKey[] = bootcampSessions().map((s) => s.key);

export function isSessionKey(v: unknown): v is SessionKey {
  return typeof v === 'string' && (SESSION_KEYS as string[]).includes(v);
}

export function getSession(key: string): BootcampSession | undefined {
  return bootcampSessions().find((s) => s.key === key);
}

export const sessionEnd = (s: BootcampSession) => new Date(s.startsAt).getTime() + s.minutes * MIN;

/** Doors open fifteen minutes early and the room stays live thirty minutes past the end. */
export function isLive(s: BootcampSession, now: number): boolean {
  const start = new Date(s.startsAt).getTime();
  return now >= start - DOORS_OPEN_MS && now < sessionEnd(s) + OVERRUN_MS;
}

/** The session live right now, if any. Sessions never overlap, so there is at most one. */
export function liveSession(now: number, sessions = bootcampSessions()): BootcampSession | null {
  return sessions.find((s) => isLive(s, now)) ?? null;
}

/** The next session that has not ended, for a given set of sessions. */
export function nextSession(now: number, sessions: BootcampSession[]): BootcampSession | null {
  return sessions.find((s) => sessionEnd(s) + OVERRUN_MS > now) ?? null;
}

/**
 * Which session a question belongs to. During a session it is that session;
 * between sessions it queues for the next one this person has a seat in, which
 * is where Sarah answers it; after the last one it lands on the last.
 */
export function questionSession(tier: string, now: number): BootcampSession | null {
  const mine = bootcampSessions().filter((s) => canAttend(tier, s));
  const live = mine.find((s) => isLive(s, now));
  if (live) return live;
  return nextSession(now, mine) ?? mine[mine.length - 1] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Seats                                                                       */
/* -------------------------------------------------------------------------- */

const TICKET_TIERS = new Set(['ga', 'vip', 'platinum', 'operator']);

/** Does this tier hold a seat in this session at all. */
export function canAttend(tier: string, s: BootcampSession): boolean {
  if (s.audience === 'everyone') return true;
  if (s.audience === 'ticket') return TICKET_TIERS.has(tier);
  return tier === 'operator';
}

export function sessionsFor(tier: string): BootcampSession[] {
  return bootcampSessions().filter((s) => canAttend(tier, s));
}

/**
 * When this person's replays close.
 *
 * Ticket holders: replay_until as fulfillment wrote it (Day 3 plus the
 * tier's days), or the same sum from the tier when the column is empty.
 * Cohort seats: six months past the last session. Masterclass seats: the
 * masterclass replay only, until enrollment closes.
 */
export function replayCloses(reg: { tier: string; replay_until: string | null }): number {
  if (reg.tier === 'operator') return new Date(BOOTCAMP.dates.operatorEnd).getTime() + 182 * DAY;
  if (reg.tier === 'masterclass') return new Date(MASTERCLASS_REPLAY_UNTIL).getTime();
  if (reg.replay_until) return new Date(reg.replay_until).getTime();
  const days = getBootcampTier(reg.tier)?.replayDays ?? 30;
  return new Date(BOOTCAMP.dates.day3).getTime() + days * DAY;
}

/** A ticket's replay window never shuts the masterclass replay early, and never opens one for a session it had no seat in. */
export function canWatchReplay(reg: { tier: string; replay_until: string | null }, s: BootcampSession, now: number): boolean {
  if (!canAttend(reg.tier, s)) return false;
  if (now < sessionEnd(s)) return false;
  const closes = s.key === 'masterclass' ? Math.max(replayCloses(reg), new Date(MASTERCLASS_REPLAY_UNTIL).getTime()) : replayCloses(reg);
  return now < closes;
}

/** VIP and up get transcripts and class notes after every session (data/bootcamp.ts, the VIP card). */
export function getsTranscripts(tier: string): boolean {
  return tier === 'vip' || tier === 'platinum' || tier === 'operator';
}

/** The cohort and its program description, for the room's header line. */
export const COHORT_LINE = `${OPERATOR.weeks} weeks, Tuesdays ${BOOTCAMP.sessionTime}, with a Thursday build lab every week`;

/* -------------------------------------------------------------------------- */
/* Players                                                                     */
/* -------------------------------------------------------------------------- */

export type Player = { kind: 'youtube' | 'vimeo'; src: string } | { kind: 'link'; href: string };

/**
 * A stage URL becomes something the room can show. YouTube and Vimeo embed
 * in the page (YouTube through the no-cookie host). Anything else, a Zoom
 * webinar, a Zoho Meeting, a StreamYard page, is a door the attendee walks
 * through in a new tab. Anything that is not https is refused.
 */
export function playerFor(raw: string | null | undefined, opts: { autoplay?: boolean } = {}): Player | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const auto = opts.autoplay ? '1' : '0';

  let yt: string | null = null;
  if (host === 'youtu.be') yt = url.pathname.slice(1).split('/')[0] || null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') yt = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(?:live|embed|shorts)\/([\w-]{6,})/);
      yt = m ? m[1] : null;
    }
  }
  if (yt && /^[\w-]{6,20}$/.test(yt)) {
    return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=${auto}&rel=0&modestbranding=1&playsinline=1` };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = url.pathname.match(/(?:\/video|\/event)?\/(\d{5,})(?:\/([\da-f]{6,}))?/);
    if (m) {
      const isEvent = url.pathname.includes('/event/');
      const hash = m[2] ? `&h=${m[2]}` : url.searchParams.get('h') ? `&h=${url.searchParams.get('h')}` : '';
      const src = isEvent
        ? `https://vimeo.com/event/${m[1]}/embed?autoplay=${auto}`
        : `https://player.vimeo.com/video/${m[1]}?autoplay=${auto}&dnt=1${hash}`;
      return { kind: 'vimeo', src };
    }
  }

  return { kind: 'link', href: url.toString() };
}
