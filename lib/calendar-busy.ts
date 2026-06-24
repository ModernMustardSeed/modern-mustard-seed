/**
 * Google Calendar free/busy for the booking engine.
 *
 * Reads Sarah's real calendar via its secret iCal URL (env GOOGLE_CALENDAR_ICS_URL,
 * from Google Calendar > Settings > "Secret address in iCal format") and returns
 * the busy intervals so the booker never offers a slot that collides with a real
 * meeting, not just with other site bookings.
 *
 * Read-only and best-effort. If the URL is unset, or the fetch/parse fails, it
 * returns no busy intervals and booking behaves exactly as before (the Supabase
 * double-booking guard still applies). Timed events only: all-day events are
 * ignored on purpose (use availability.blackoutRanges for full-day blocks, so a
 * "birthday" or "holiday" all-day entry never wipes a whole day of slots).
 * Results are cached briefly so we do not refetch on every slot request.
 */

import { availability } from '@/data/availability';

export type BusyInterval = { start: number; end: number };

const CACHE_MS = 60_000;
const FETCH_TIMEOUT_MS = 6_000;
let cache: { at: number; intervals: BusyInterval[] } | null = null;

/**
 * Pure parser (testable): turn an iCal string into busy intervals within
 * [winStart, winEnd] (epoch ms). Expands recurring events and honors exceptions
 * and overrides. `ical` is the node-ical module, injected so this stays pure.
 */
export function parseIcsToBusy(
  ics: string,
  winStart: number,
  winEnd: number,
  ical: { sync?: { parseICS: (s: string) => Record<string, unknown> }; parseICS?: (s: string) => Record<string, unknown> }
): BusyInterval[] {
  const parse = ical.sync?.parseICS ?? ical.parseICS;
  if (!parse) return [];
  const data = parse(ics) as Record<string, Record<string, unknown>>;
  const out: BusyInterval[] = [];

  for (const key of Object.keys(data)) {
    const ev = data[key] as Record<string, unknown>;
    if (!ev || ev.type !== 'VEVENT') continue;
    if (ev.status === 'CANCELLED') continue;
    if (ev.transparency === 'TRANSPARENT') continue; // explicitly "free"
    if (ev.datetype === 'date') continue; // all-day: handled by blackoutRanges

    const start = ev.start as Date | undefined;
    if (!(start instanceof Date) || isNaN(start.getTime())) continue;
    const end = ev.end instanceof Date ? (ev.end as Date) : new Date(start.getTime() + 30 * 60_000);
    const duration = Math.max(0, end.getTime() - start.getTime());

    const rrule = ev.rrule as { between?: (a: Date, b: Date, inc: boolean) => Date[] } | undefined;
    if (rrule?.between) {
      let occ: Date[] = [];
      try {
        occ = rrule.between(new Date(winStart), new Date(winEnd), true);
      } catch {
        occ = [];
      }
      const recurrences = (ev.recurrences as Record<string, Record<string, unknown>>) || {};
      const exdate = (ev.exdate as Record<string, Date>) || {};
      const exTimes = new Set(
        Object.values(exdate).map((d) => (d instanceof Date ? d.getTime() : new Date(d).getTime()))
      );
      for (const d of occ) {
        if (exTimes.has(d.getTime())) continue;
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const ov = recurrences[dayKey];
        if (ov) {
          if (ov.status === 'CANCELLED') continue;
          const os = ov.start instanceof Date ? (ov.start as Date) : d;
          const oe = ov.end instanceof Date ? (ov.end as Date) : new Date(os.getTime() + duration);
          out.push({ start: os.getTime(), end: oe.getTime() });
        } else {
          out.push({ start: d.getTime(), end: d.getTime() + duration });
        }
      }
    } else if (end.getTime() > winStart && start.getTime() < winEnd) {
      out.push({ start: start.getTime(), end: end.getTime() });
    }
  }
  return out;
}

async function fetchIcsText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'mms-booking' } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Busy intervals from Sarah's calendar, cached. Empty when unconfigured. */
export async function getBusyIntervals(): Promise<BusyInterval[]> {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL;
  if (!url) return [];

  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.intervals;

  const text = await fetchIcsText(url);
  if (text == null) return cache?.intervals ?? []; // transient failure: keep last known

  let intervals: BusyInterval[] = [];
  try {
    const mod = (await import('node-ical')) as Record<string, unknown>;
    const def = mod.default as Record<string, unknown> | undefined;
    const ical = (def && (def.sync || def.parseICS) ? def : mod) as Parameters<typeof parseIcsToBusy>[3];
    const winStart = now - 3_600_000;
    const winEnd = now + (availability.maxLookaheadDays + 1) * 86_400_000;
    intervals = parseIcsToBusy(text, winStart, winEnd, ical);
  } catch (e) {
    console.error('calendar-busy parse failed:', (e as Error)?.message);
    intervals = cache?.intervals ?? [];
  }
  cache = { at: now, intervals };
  return intervals;
}

/** True if [startMs, endMs) overlaps any busy interval. */
export function overlapsBusy(startMs: number, endMs: number, busy: BusyInterval[]): boolean {
  for (const b of busy) {
    if (startMs < b.end && endMs > b.start) return true;
  }
  return false;
}
