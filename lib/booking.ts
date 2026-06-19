/**
 * Booking core. Slot generation + Supabase double-booking guard.
 *
 * Slot times are computed in Mountain Time using Intl (DST-correct) and
 * stored in UTC. The runtime is Node (server-side only).
 */

import { availability } from '@/data/availability';
import { getSupabase } from './supabase';

export type Slot = {
  /** Canonical: UTC start, ISO 8601 with Z. */
  startIso: string;
  /** Canonical: UTC end, ISO 8601 with Z. */
  endIso: string;
  /** Pretty display in Mountain Time, e.g. "Tuesday, June 10, 9:00 AM MT". */
  display: string;
  /** Short label for inline chat. */
  shortLabel: string;
  /** Day only, e.g. "Tuesday, June 10". Lets the UI group times under a day. */
  dayLabel: string;
  /** Time only in Mountain Time, e.g. "9:00 AM". */
  timeLabel: string;
};

const MT_ZONE = 'America/Denver';

/** Number of UTC ms that, when added to a UTC instant, gives the Mountain
 * Time instant. Positive during DST (-6 → -360min). Computed via Intl. */
function mtOffsetMinutes(at: Date): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_ZONE,
    timeZoneName: 'shortOffset',
  });
  // shortOffset emits like "GMT-6" or "GMT-7"
  const part = fmt.formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-7';
  const m = /GMT([+-]\d{1,2})(?::?(\d{2}))?/.exec(part);
  if (!m) return -420;
  const hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

/** Build a UTC Date representing "year/month/day hh:mm Mountain Time". */
function mtToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Construct the wall-clock instant as if it were UTC, then shift by the
  // Mountain Time offset so the resulting UTC Date represents Mountain wall clock.
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMin = mtOffsetMinutes(new Date(naiveUtc));
  return new Date(naiveUtc - offsetMin * 60 * 1000);
}

function inBlackout(dateStr: string): boolean {
  return availability.blackoutRanges.some(({ fromDate, toDate }) => dateStr >= fromDate && dateStr <= toDate);
}

function formatMt(start: Date): { display: string; shortLabel: string; dayLabel: string; timeLabel: string } {
  const long = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);
  const dayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(start);
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);
  return { display: `${long} MT`, shortLabel: `${short} MT`, dayLabel, timeLabel };
}

/** Generate the universe of candidate slots within the lookahead. */
function candidateSlots(now: Date): Slot[] {
  const slots: Slot[] = [];
  const minStart = new Date(now.getTime() + availability.minLeadHours * 3600 * 1000);
  const horizon = new Date(now.getTime() + availability.maxLookaheadDays * 86400 * 1000);

  // Walk each Mountain-Time day from today through the horizon.
  for (let dayOffset = 0; dayOffset <= availability.maxLookaheadDays; dayOffset++) {
    const probeUtc = new Date(now.getTime() + dayOffset * 86400 * 1000);
    // Year/month/day in Mountain Time for this probe
    const mtParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: MT_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: 'numeric',
      weekday: 'short',
    }).formatToParts(probeUtc);
    const get = (t: string) => mtParts.find((p) => p.type === t)?.value ?? '';
    const y = parseInt(get('year'), 10);
    const m = parseInt(get('month'), 10);
    const d = parseInt(get('day'), 10);
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (inBlackout(dateStr)) continue;

    // weekday: short like "Mon"
    const wkMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dow = wkMap[get('weekday')] ?? 0;
    if (!(availability.workingWeekdays as readonly number[]).includes(dow)) continue;

    // Build slots from startHour through endHour in Mountain Time.
    for (let hr = availability.startHour; hr < availability.endHour; hr++) {
      for (let min = 0; min < 60; min += availability.slotMinutes) {
        const start = mtToUtc(y, m, d, hr, min);
        if (start < minStart) continue;
        if (start > horizon) continue;
        const end = new Date(start.getTime() + availability.slotMinutes * 60 * 1000);
        const fmt = formatMt(start);
        slots.push({
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          display: fmt.display,
          shortLabel: fmt.shortLabel,
          dayLabel: fmt.dayLabel,
          timeLabel: fmt.timeLabel,
        });
      }
    }
  }
  return slots;
}

/** Pull booked slots from Supabase so we never propose what's taken. */
async function bookedStartTimes(): Promise<Set<string>> {
  const client = getSupabase();
  if (!client) return new Set();
  try {
    const since = new Date(Date.now() - 3600 * 1000).toISOString();
    const { data, error } = await client
      .from('leads')
      .select('timeline')
      .eq('source', 'mustard-seed-booking')
      .eq('status', 'booked')
      .gte('timeline', since);
    if (error || !data) return new Set();
    return new Set(data.map((r) => r.timeline as string).filter(Boolean));
  } catch {
    return new Set();
  }
}

/**
 * Pick up to `n` times from one day's open slots.
 *
 * The day is split into `n` even buckets (e.g. a morning half and an afternoon
 * half) and one time is taken from each, so the offer always spans the day. The
 * pick inside each bucket is rotated by `dayIndex`, so consecutive days surface
 * different times (Tue 9:00, Wed 9:30, Thu 10:00) rather than the same bookends
 * every day. Together with the fixed count, that means the visitor sees a
 * natural, varied handful that never reveals how many slots are actually open.
 */
function pickForDay<T>(items: T[], n: number, dayIndex: number): T[] {
  if (n <= 0) return [];
  if (items.length <= n) return items;
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.floor((i * items.length) / n);
    const end = Math.floor(((i + 1) * items.length) / n) - 1; // inclusive
    const span = end - start;
    const idx = start + (span > 0 ? dayIndex % (span + 1) : 0);
    out.push(items[idx]);
  }
  return out;
}

/**
 * A curated spread of open slots: up to `proposePerDay` times on each of the
 * next `proposeDays` days that have any availability, deduped against existing
 * bookings.
 *
 * We deliberately do NOT return every open slot. The shape is always the same
 * (a couple of times across a few days) whether the week is wide open or nearly
 * full, so the spread never reveals how booked Sarah's calendar is, while still
 * giving the visitor a genuine choice of both day and time.
 */
export async function getNextAvailableSlots(): Promise<Slot[]> {
  if (!availability.enabled) return [];
  const candidates = candidateSlots(new Date());
  const booked = await bookedStartTimes();
  const open = candidates.filter((s) => !booked.has(s.startIso));

  // Group by Mountain-Time day (open is already chronological, and dayLabel is
  // unique per calendar day within the lookahead window).
  const byDay = new Map<string, Slot[]>();
  for (const s of open) {
    const list = byDay.get(s.dayLabel);
    if (list) list.push(s);
    else byDay.set(s.dayLabel, [s]);
  }

  const result: Slot[] = [];
  let days = 0;
  for (const daySlots of byDay.values()) {
    if (days >= availability.proposeDays) break;
    result.push(...pickForDay(daySlots, availability.proposePerDay, days));
    days++;
  }
  return result;
}

/** Confirm a specific slot is still available. */
export async function isSlotAvailable(startIso: string): Promise<boolean> {
  if (!availability.enabled) return false;
  const slotStart = new Date(startIso);
  if (isNaN(slotStart.getTime())) return false;
  // Within working window?
  const candidates = candidateSlots(new Date());
  if (!candidates.some((c) => c.startIso === startIso)) return false;
  const booked = await bookedStartTimes();
  return !booked.has(startIso);
}

/** Format a stored ISO string back to its Mountain display label. */
export function displayForIso(startIso: string): { display: string; shortLabel: string } {
  return formatMt(new Date(startIso));
}

/**
 * UTC bounds [startUtc, endUtc] for the current Mountain-Time calendar day.
 * DST-correct (offset comes from Intl, not a hardcoded number). Used by the
 * day-of reminder cron to scope "today's" appointments.
 */
export function mtDayBoundsUtc(now: Date = new Date()): { startUtc: string; endUtc: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MT_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const y = parseInt(get('year'), 10);
  const m = parseInt(get('month'), 10);
  const d = parseInt(get('day'), 10);
  const start = mtToUtc(y, m, d, 0, 0);
  // 23:59 MT, pushed to :59.999 so the very last slot of the day is inclusive.
  const end = new Date(mtToUtc(y, m, d, 23, 59).getTime() + 59_999);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}
