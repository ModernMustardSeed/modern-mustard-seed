/**
 * BOOKING A TIME WITH THE CLIENT, ON THE CLIENT'S OWN SITE.
 *
 * This is deliberately NOT lib/booking.ts. That one books Sarah: its slots come
 * from data/availability, its taken times come from `leads` where the source is
 * 'mustard-seed-booking', and its busy calendar is GOOGLE_CALENDAR_ICS_URL,
 * which is Sarah's. Ten routes depend on it. A client's visitor is booking
 * Carmen, against a different diary, so this module lives beside it and shares
 * only the iCal parser.
 *
 * ── WHY THE PROMISE CAN BE FIRM ──────────────────────────────────────────────
 * A slot is offered only when three things agree: no live row in
 * client_appointments holds it, no row in client_availability_blocks covers it,
 * and nothing in the client's own calendar overlaps it. The third source is a
 * SECRET iCAL ADDRESS, which is the one way a client can hand over true
 * availability without giving anyone a password or an OAuth grant. Carmen
 * pastes it once on the desk; it is encrypted at rest like the Buildertrend
 * token. Until she does, the first two carry the promise on their own, and they
 * are enough to stop two visitors taking the same minute.
 *
 * ── EVERYTHING IS MOUNTAIN TIME ──────────────────────────────────────────────
 * Montana is America/Denver and the offset moves twice a year, so nothing here
 * assumes a fixed one. `zonedToUtc` resolves the wall clock against the offset
 * the zone actually reports at that instant, which is the case a hardcoded
 * -0700 gets wrong for half the year.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseIcsToBusy, overlapsBusy, type BusyInterval } from '@/lib/calendar-busy';
import { decryptSecret } from '@/lib/crypto';

export const BOOKING_ZONE = 'America/Denver';
export type SlotKind = 'consult' | 'site-walk';

export type KindRule = {
  key: SlotKind;
  label: string;
  minutes: number;
  /** Local start times on a working day, 24h. */
  starts: string[];
  blurb: string;
  places: Array<{ key: string; label: string }>;
  /** Asked only when the meeting happens on the visitor's land. */
  needsAddress: boolean;
};

/**
 * What a visitor can book. Two things, because a builder's first step is a
 * conversation and the second is standing on the dirt. Offering a menu of five
 * would only make the choice harder.
 */
export const KINDS: Record<SlotKind, KindRule> = {
  consult: {
    key: 'consult',
    label: 'A first conversation',
    minutes: 30,
    starts: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'],
    blurb: 'Half an hour, on the phone or at our office in Eureka. We talk through your land, your plans and your timing, and you leave knowing what the next step costs you.',
    places: [
      { key: 'phone', label: 'On the phone' },
      { key: 'office', label: 'At our office in Eureka' },
    ],
    needsAddress: false,
  },
  'site-walk': {
    key: 'site-walk',
    label: 'A walk on your property',
    minutes: 90,
    starts: ['09:00', '10:30', '13:00', '14:30'],
    blurb: 'An hour and a half on the land itself. We look at access, slope, trees, views and utilities, and tell you what it will take to build what you are picturing there.',
    places: [{ key: 'property', label: 'At the property' }],
    needsAddress: true,
  },
};

/** Monday to Friday. 0 is Sunday. */
const WORKING_DAYS = [1, 2, 3, 4, 5];
/** Nothing sooner than this, so a booking never lands before anyone has read it. */
export const LEAD_HOURS = 24;
/** How far ahead a visitor may pick. */
export const HORIZON_DAYS = 28;

const ZONE_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: BOOKING_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short',
});
const TIME_FMT = new Intl.DateTimeFormat('en-US', { timeZone: BOOKING_ZONE, hour: 'numeric', minute: '2-digit', hour12: true });
const DAY_FMT = new Intl.DateTimeFormat('en-US', { timeZone: BOOKING_ZONE, weekday: 'long', month: 'long', day: 'numeric' });
const FULL_FMT = new Intl.DateTimeFormat('en-US', { timeZone: BOOKING_ZONE, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

function zoneFields(d: Date): Record<string, string> {
  const o: Record<string, string> = {};
  for (const p of ZONE_PARTS.formatToParts(d)) if (p.type !== 'literal') o[p.type] = p.value;
  return o;
}

/** The zone's offset from UTC, in minutes, at a given instant. */
function offsetMinutes(at: Date): number {
  const p = zoneFields(at);
  const hour = p.hour === '24' ? 0 : Number(p.hour);
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
  return (asUtc - at.getTime()) / 60000;
}

/**
 * A wall-clock time in Mountain Time to the real instant. Two passes, because
 * the offset needed depends on the answer: guess using the offset at the naive
 * instant, then correct once using the offset at the guess. That converges for
 * every real zone, including the two days a year it matters.
 */
export function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number): Date {
  const naive = Date.UTC(y, m - 1, d, hh, mm, 0);
  let guess = new Date(naive - offsetMinutes(new Date(naive)) * 60000);
  guess = new Date(naive - offsetMinutes(guess) * 60000);
  return guess;
}

export function ymdInZone(d: Date) {
  const p = zoneFields(d);
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), weekday: p.weekday };
}

/** "Thursday, September 18 at 2:00 PM" in the client's own time. */
export const describeSlot = (at: Date) => FULL_FMT.format(at).replace(/ at /, ' at ');
export const timeLabel = (at: Date) => TIME_FMT.format(at);
export const dayLabel = (at: Date) => DAY_FMT.format(at);

/** "MST" or "MDT", whichever is true on that date. */
export function zoneLabel(at: Date): string {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: BOOKING_ZONE, timeZoneName: 'short' })
    .formatToParts(at).find((x) => x.type === 'timeZoneName');
  return p?.value ?? 'MT';
}

/**
 * The client's own calendar, read from the secret iCal address they pasted.
 * Cached briefly per client: a visitor flipping between the two kinds should
 * not re-fetch an iCal file twice a second. A transient failure keeps the last
 * known answer rather than opening slots the client is busy in, and a client
 * who has not shared a calendar simply has no busy intervals.
 */
const busyCache = new Map<string, { at: number; intervals: BusyInterval[] }>();
const BUSY_CACHE_MS = 60_000;

export async function clientBusy(sb: SupabaseClient, clientEmail: string, now = new Date()): Promise<BusyInterval[]> {
  const hit = busyCache.get(clientEmail);
  if (hit && Date.now() - hit.at < BUSY_CACHE_MS) return hit.intervals;

  let url: string | null = null;
  try {
    const { data } = await sb
      .from('client_integrations')
      .select('access_ciphertext, access_iv, access_tag')
      .eq('client_email', clientEmail)
      .eq('provider', 'calendar-ics')
      .maybeSingle();
    if (data?.access_ciphertext) url = decryptSecret(data.access_ciphertext as string, data.access_iv as string, data.access_tag as string);
  } catch {
    url = null;
  }
  if (!url) {
    busyCache.set(clientEmail, { at: Date.now(), intervals: [] });
    return [];
  }

  let intervals: BusyInterval[] = hit?.intervals ?? [];
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      const mod = (await import('node-ical')) as Record<string, unknown>;
      const def = mod.default as Record<string, unknown> | undefined;
      const ical = (def && (def.sync || def.parseICS) ? def : mod) as Parameters<typeof parseIcsToBusy>[3];
      intervals = parseIcsToBusy(text, now.getTime() - 3_600_000, now.getTime() + (HORIZON_DAYS + 1) * 86_400_000, ical);
    }
  } catch {
    // keep whatever we knew; never widen availability because a fetch failed
  }
  busyCache.set(clientEmail, { at: Date.now(), intervals });
  return intervals;
}

/**
 * Can we see the diary at all? A missing table comes back as an error object,
 * not an exception, so without this check an unreadable diary reads as an empty
 * one and every slot looks free. Availability we cannot verify is not offered.
 */
export async function bookingReady(sb: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await sb.from('client_appointments').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export type OpenSlot = { at: string; label: string };
export type OpenDay = { date: string; label: string; slots: OpenSlot[] };

/**
 * Every slot of one kind that is genuinely open, grouped by day. Taken minutes,
 * blocked spans and the client's calendar are all subtracted here rather than
 * in the browser, so a time a visitor can see is a time they can have.
 */
export async function openDays(
  sb: SupabaseClient,
  opts: { project: string; clientEmail: string; kind: SlotKind; now?: Date }
): Promise<OpenDay[]> {
  const now = opts.now ?? new Date();
  if (!(await bookingReady(sb))) return [];
  const rule = KINDS[opts.kind];
  const from = new Date(now.getTime() + LEAD_HOURS * 3_600_000);
  const to = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);

  const [taken, blocks, busy] = await Promise.all([
    sb.from('client_appointments').select('starts_at, minutes').eq('project', opts.project).in('status', ['booked', 'done']).gte('starts_at', from.toISOString()).lte('starts_at', to.toISOString()),
    sb.from('client_availability_blocks').select('starts_at, ends_at').eq('project', opts.project).lte('starts_at', to.toISOString()).gte('ends_at', from.toISOString()),
    clientBusy(sb, opts.clientEmail, now),
  ]);

  // An appointment of any length closes every minute it covers, so a ninety
  // minute walk also closes the half-hour conversations inside it.
  const spans: BusyInterval[] = [
    ...(taken.data ?? []).map((t) => {
      const s = new Date(t.starts_at as string).getTime();
      return { start: s, end: s + (Number(t.minutes) || 30) * 60_000 };
    }),
    ...(blocks.data ?? []).map((b) => ({ start: new Date(b.starts_at as string).getTime(), end: new Date(b.ends_at as string).getTime() })),
    ...busy,
  ];

  const days: OpenDay[] = [];
  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const { y, m, d } = ymdInZone(new Date(now.getTime() + i * 86_400_000));
    if (!WORKING_DAYS.includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay())) continue;

    const slots: OpenSlot[] = [];
    for (const hhmm of rule.starts) {
      const [hh, mm] = hhmm.split(':').map(Number);
      const at = zonedToUtc(y, m, d, hh, mm);
      if (at < from || at > to) continue;
      if (overlapsBusy(at.getTime(), at.getTime() + rule.minutes * 60_000, spans)) continue;
      slots.push({ at: at.toISOString(), label: timeLabel(at) });
    }
    if (!slots.length) continue;
    days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, label: dayLabel(zonedToUtc(y, m, d, 12, 0)), slots });
  }
  return days;
}

/** Is this exact instant a real slot of this kind, and still free? */
export async function slotIsOpen(
  sb: SupabaseClient,
  opts: { project: string; clientEmail: string; kind: SlotKind; at: Date; now?: Date }
): Promise<{ ok: true } | { ok: false; why: string }> {
  if (Number.isNaN(opts.at.getTime())) return { ok: false, why: 'That is not a time we can read.' };
  const days = await openDays(sb, opts);
  const wanted = opts.at.toISOString();
  for (const day of days) for (const s of day.slots) if (s.at === wanted) return { ok: true };
  return { ok: false, why: 'That time has just been taken. Pick another and it is yours.' };
}

/**
 * A calendar file, so the time lands on the visitor's own calendar instead of
 * living only in an email they have to remember to look at again.
 */
export function icsFor(o: {
  uid: string; start: Date; minutes: number; title: string; description: string; location: string; organizer: string; organizerEmail: string;
}): string {
  const z = (d: Date) => `${d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`;
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  // Folded at 75 octets, which is what the spec asks for and what a strict
  // parser on a phone will hold us to.
  const fold = (line: string) => {
    if (line.length <= 73) return line;
    const out = [line.slice(0, 73)];
    let rest = line.slice(73);
    while (rest.length > 72) { out.push(` ${rest.slice(0, 72)}`); rest = rest.slice(72); }
    if (rest) out.push(` ${rest}`);
    return out.join('\r\n');
  };
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Modern Mustard Seed//Client Booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${o.uid}`,
    `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(o.start)}`,
    `DTEND:${z(new Date(o.start.getTime() + o.minutes * 60_000))}`,
    fold(`SUMMARY:${esc(o.title)}`),
    fold(`DESCRIPTION:${esc(o.description)}`),
    fold(`LOCATION:${esc(o.location)}`),
    fold(`ORGANIZER;CN=${esc(o.organizer)}:mailto:${o.organizerEmail}`),
    'STATUS:CONFIRMED',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
