/**
 * THE NATIVE CALENDAR.
 *
 * Booking is the difference between a receptionist and an answering machine, so
 * this is deliberately ours rather than a Google Calendar integration a customer
 * has to authorise before the product does anything. They can connect a calendar
 * later; they can never be blocked from using what they bought on day one.
 *
 * ── THE SLOT IS AWARDED BY THE DATABASE, NOT BY THIS CODE ────────────────────
 * Two callers can be on the line at the same moment, and an AI on each. A
 * check-then-insert has a race between the check and the insert wide enough to
 * double-book, and a business that shows up twice to one address and never to
 * the other has a worse problem than a missed call. The partial unique index in
 * migration 099 (office_id, starts_at, where status in booked/confirmed) is the
 * arbiter. This code EXPECTS to lose that race sometimes and handles losing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type Slot = { startsAt: string; endsAt: string; label: string };

/** How long a job is booked for when nobody said. Deliberately generous. */
const DEFAULT_MINUTES = 60;
/** Nothing is offered sooner than this: somebody has to physically get there. */
const LEAD_TIME_MINUTES = 120;

type Hours = Record<string, unknown>;

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Parse "8:00 am - 5:00 pm" into minutes from midnight.
 * Returns null for "closed", an empty value, or anything we cannot read, and
 * an unreadable day is treated as CLOSED rather than as open all hours: the
 * failure that offers a caller a 3am Sunday appointment is worse than the one
 * that offers nothing.
 */
export function parseDayHours(value: unknown): { open: number; close: number } | null {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s || /closed/.test(s)) return null;
  if (/24\s*\/?\s*7|24 hours|all day|always/.test(s)) return { open: 0, close: 24 * 60 };

  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|–|—)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;

  const to24 = (h: string, min: string | undefined, ap: string | undefined, fallbackAp?: string): number | null => {
    let hour = Number(h);
    if (!Number.isFinite(hour) || hour > 24) return null;
    const suffix = ap ?? fallbackAp;
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    return hour * 60 + Number(min ?? 0);
  };

  // "8 - 5" with a pm only on the close is the common way people write it.
  const close = to24(m[4], m[5], m[6]);
  const open = to24(m[1], m[2], m[3], m[6] === 'pm' && Number(m[1]) < Number(m[4]) ? 'am' : m[6]);
  if (open === null || close === null || close <= open) return null;
  return { open, close };
}

export type Busy = { from: number; to: number };

/**
 * THE TIME MATHS, WITH NO DATABASE IN IT.
 *
 * Pulled out of `availableSlots` so the built DEMO agents can offer real
 * openings using the exact same rules a paying office runs on: inside posted
 * hours, past the lead time, never on top of something already booked. There is
 * one implementation of "when could somebody actually come out" and both the
 * product and the demo of the product call it.
 *
 * That is not tidiness. A demo that invents times the product would never offer
 * is a demo that lies about the product, and two implementations drift the
 * moment one of them is fixed.
 */
export function slotsFrom(
  hours: Hours,
  timezone: string,
  busy: Busy[],
  opts: { days?: number; limit?: number; minutes?: number; now?: Date } = {},
): Slot[] {
  const days = opts.days ?? 10;
  const limit = opts.limit ?? 6;
  const minutes = opts.minutes ?? DEFAULT_MINUTES;
  const now = opts.now ?? new Date();
  const earliest = new Date(now.getTime() + LEAD_TIME_MINUTES * 60_000);

  const out: Slot[] = [];
  for (let d = 0; d < days && out.length < limit; d++) {
    const day = new Date(now.getTime() + d * 24 * 3600_000);
    const window = parseDayHours(hours[DAYS[day.getDay()]]);
    if (!window) continue;

    for (let m = window.open; m + minutes <= window.close && out.length < limit; m += minutes) {
      const start = new Date(day);
      start.setHours(Math.floor(m / 60), m % 60, 0, 0);
      if (start < earliest) continue;
      const end = new Date(start.getTime() + minutes * 60_000);
      const clash = busy.some((b) => start.getTime() < b.to && end.getTime() > b.from);
      if (clash) continue;
      out.push({ startsAt: start.toISOString(), endsAt: end.toISOString(), label: sayable(start, timezone) });
    }
  }
  return out;
}

/**
 * The next bookable slots.
 *
 * Real openings only: inside their posted hours, past the lead time, not
 * already taken. An agent must never invent a time, so if this returns nothing
 * the agent says it will have somebody call back rather than guessing.
 */
export async function availableSlots(
  db: SupabaseClient,
  office: { id: string; hours: Hours; timezone: string },
  opts: { days?: number; limit?: number; minutes?: number; now?: Date } = {},
): Promise<Slot[]> {
  const days = opts.days ?? 10;
  const now = opts.now ?? new Date();
  const horizon = new Date(now.getTime() + days * 24 * 3600_000);
  const { data: taken } = await db
    .from('fo_appointments')
    .select('starts_at, ends_at')
    .eq('office_id', office.id)
    .in('status', ['booked', 'confirmed'])
    .gte('starts_at', now.toISOString())
    .lte('starts_at', horizon.toISOString());

  const busy: Busy[] = (taken ?? []).map((t) => ({
    from: Date.parse(t.starts_at as string),
    to: Date.parse(t.ends_at as string),
  }));

  return slotsFrom(office.hours, office.timezone, busy, opts);
}

/** A time an agent can read out loud without sounding like a database. */
export function sayable(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(d);
}

export type BookResult =
  | { ok: true; appointmentId: string; label: string }
  | { ok: false; reason: 'taken' | 'closed' | 'past' | 'error'; message: string };

export async function bookSlot(
  db: SupabaseClient,
  office: { id: string; hours: Hours; timezone: string },
  args: {
    startsAt: string;
    minutes?: number;
    title: string;
    service?: string | null;
    address?: string | null;
    notes?: string | null;
    contactId?: string | null;
    callId?: string | null;
    now?: Date;
  },
): Promise<BookResult> {
  const start = new Date(args.startsAt);
  if (Number.isNaN(start.getTime())) return { ok: false, reason: 'error', message: 'That is not a real time.' };

  const now = args.now ?? new Date();
  if (start.getTime() < now.getTime()) return { ok: false, reason: 'past', message: 'That time has already passed.' };

  const window = parseDayHours(office.hours[DAYS[start.getDay()]]);
  if (!window) return { ok: false, reason: 'closed', message: 'They are closed that day.' };

  const minutes = args.minutes ?? DEFAULT_MINUTES;
  const end = new Date(start.getTime() + minutes * 60_000);

  const { data, error } = await db
    .from('fo_appointments')
    .insert({
      office_id: office.id,
      contact_id: args.contactId ?? null,
      call_id: args.callId ?? null,
      title: args.title,
      service: args.service ?? null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      address: args.address ?? null,
      notes: args.notes ?? null,
      status: 'booked',
      booked_by: 'agent',
    })
    .select('id')
    .maybeSingle();

  if (error || !data) {
    // Losing this race is EXPECTED, not exceptional: the unique index just told
    // us another caller took the slot while this one was deciding. The agent
    // should offer a different time, not apologise for an error.
    if (error && /duplicate|unique|conflict/i.test(error.message)) {
      return { ok: false, reason: 'taken', message: 'Somebody just took that time.' };
    }
    return { ok: false, reason: 'error', message: error?.message ?? 'The booking did not save.' };
  }

  return { ok: true, appointmentId: data.id, label: sayable(start, office.timezone) };
}
