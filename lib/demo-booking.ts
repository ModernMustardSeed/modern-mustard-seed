/**
 * THE BUILT DEMO AGENT CAN BOOK THE JOB.
 *
 * Every demo is sold on one sentence: "I answer your phone and I book your
 * jobs." The second half was not true inside the demo itself. The persona
 * prompt already told the agent to "capture the job details and book the
 * appointment" and no booking tool was ever attached, so the model improvised.
 * On 2026-08-25 a tester asked three built agents for an appointment and got
 * "let me get the owner to confirm that slot" from all three, at the exact
 * moment the demo was supposed to prove its whole value.
 *
 * ── IT USES THE PRODUCT'S OWN CALENDAR MATHS ─────────────────────────────────
 * `slotsFrom` in lib/front-office/calendar.ts is shared with the paying front
 * office: inside posted hours, past a two hour lead time, never on top of an
 * existing booking. A demo that offers times the real product would never offer
 * is a demo that lies about the product.
 *
 * ── BUT NOT THE PRODUCT'S TABLE ──────────────────────────────────────────────
 * Demo bookings live in `demo_appointments`, never `fo_appointments`. A
 * roleplay must not land in a paying client's calendar, fire their
 * notifications, or move their numbers.
 *
 * ── THE ONE THING THAT MAKES IT FEEL REAL ────────────────────────────────────
 * The times are honest. A slot the agent offers is a slot nobody else has, and
 * booking it takes it off the board for the rest of the demo. A prospect who
 * calls back to show their partner hears a different opening, and that is the
 * moment the demo stops looking like a script.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { slotsFrom, sayable, parseDayHours, type Slot, type Busy } from '@/lib/front-office/calendar';

/** How long a demo job is held. Same generous default the real product uses. */
const DEMO_MINUTES = 60;

/**
 * What a demo business is open, when nobody told us.
 *
 * ⚠️ A demo has no posted hours. the run's `hours` is free text a visitor
 * typed, and on an outbound build it is usually empty entirely, because we
 * scraped the business rather than asking it. The real product treats an
 * unreadable day as CLOSED, which is right for a paying office (offering a 3am
 * Sunday visit is worse than offering nothing) and exactly wrong here: it would
 * hand back zero slots and the agent would deflect to the owner again, which is
 * the bug this file exists to kill.
 *
 * So a demo with no readable hours gets a plainly reasonable trade schedule
 * instead of nothing. Saturday is open because the trades this sells to work
 * Saturdays, and a caller with a leak on a Friday night who is offered Monday
 * has just been shown the product being unhelpful.
 */
export const DEMO_DEFAULT_HOURS: Record<string, string> = {
  monday: '8:00 am - 6:00 pm',
  tuesday: '8:00 am - 6:00 pm',
  wednesday: '8:00 am - 6:00 pm',
  thursday: '8:00 am - 6:00 pm',
  friday: '8:00 am - 6:00 pm',
  saturday: '9:00 am - 2:00 pm',
  sunday: 'closed',
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DAY_ALIASES: Record<string, string> = {
  sun: 'sunday', sunday: 'sunday',
  mon: 'monday', monday: 'monday',
  tue: 'tuesday', tues: 'tuesday', tuesday: 'tuesday',
  wed: 'wednesday', weds: 'wednesday', wednesday: 'wednesday',
  thu: 'thursday', thur: 'thursday', thurs: 'thursday', thursday: 'thursday',
  fri: 'friday', friday: 'friday',
  sat: 'saturday', saturday: 'saturday',
};

/**
 * Turn whatever they typed into a day map the calendar can read.
 *
 * Handles the shapes people actually write on a build form:
 *   "Mon-Fri 8-5"                    a range plus one window
 *   "Monday through Friday 7am-6pm, Saturday 8-12"
 *   "24/7"                            parseDayHours already understands this
 *   ""                                falls through to the demo default
 *
 * Anything it cannot read falls back to DEMO_DEFAULT_HOURS rather than to
 * nothing, for the reason written above that constant. Returns the default for
 * any day the text did not mention, so "Saturday 9-1" does not accidentally
 * close the business for the rest of the week.
 */
export function demoHoursFrom(raw: string | null | undefined): Record<string, string> {
  const text = String(raw ?? '').trim();
  if (!text) return { ...DEMO_DEFAULT_HOURS };

  // "24/7" and friends apply to every day at once.
  if (/24\s*\/?\s*7|24 hours|always open|any ?time/i.test(text)) {
    return Object.fromEntries(DAY_NAMES.map((d) => [d, '24 hours']));
  }

  const found: Record<string, string> = {};
  /* Each clause is "<days> <window>". Days can be a range ("mon-fri",
   * "monday through friday") or a single day. The window is handed to
   * parseDayHours, which is the same reader the paying product uses, so any
   * format it understands is understood here too. */
  const clause =
    /(sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)[a-z]*\s*(?:-|–|—|to|through|thru)?\s*(sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)?[a-z]*\s*:?\s*([0-9][^,;|]*)/gi;

  for (const m of text.matchAll(clause)) {
    const from = DAY_ALIASES[m[1].toLowerCase()];
    const to = m[2] ? DAY_ALIASES[m[2].toLowerCase()] : from;
    const window = m[3].trim();
    if (!from || !to || !parseDayHours(window)) continue;

    // Walk forward from the first day to the last, wrapping the week, so
    // "sat-sun" and "thu-mon" both behave.
    let i = DAY_NAMES.indexOf(from);
    const end = DAY_NAMES.indexOf(to);
    for (let guard = 0; guard < 7; guard++) {
      found[DAY_NAMES[i]] = window;
      if (i === end) break;
      i = (i + 1) % 7;
    }
  }

  if (!Object.keys(found).length) return { ...DEMO_DEFAULT_HOURS };
  // Days the text never mentioned keep the sensible default rather than closing.
  return { ...DEMO_DEFAULT_HOURS, ...found };
}

export type DemoRun = {
  id: string;
  business: string;
  city: string | null;
  hours: string | null;
};

/** The times this demo can honestly offer right now. */
export async function demoSlots(
  db: SupabaseClient,
  run: DemoRun,
  timezone: string,
  opts: { limit?: number; now?: Date } = {},
): Promise<Slot[]> {
  const now = opts.now ?? new Date();
  const horizon = new Date(now.getTime() + 10 * 24 * 3600_000);

  const { data: taken } = await db
    .from('demo_appointments')
    .select('starts_at, ends_at')
    .eq('run_id', run.id)
    .in('status', ['booked', 'confirmed'])
    .gte('starts_at', now.toISOString())
    .lte('starts_at', horizon.toISOString());

  const busy: Busy[] = (taken ?? []).map((t) => ({
    from: Date.parse(t.starts_at as string),
    to: Date.parse(t.ends_at as string),
  }));

  return slotsFrom(demoHoursFrom(run.hours), timezone, busy, {
    limit: opts.limit ?? 4,
    minutes: DEMO_MINUTES,
    now,
  });
}

export type DemoBookResult =
  | { ok: true; label: string; appointmentId: string }
  | { ok: false; reason: 'taken' | 'closed' | 'past' | 'invalid' | 'error'; message: string };

/** Take the slot. The unique index is the arbiter, not this code. */
export async function bookDemoSlot(
  db: SupabaseClient,
  run: DemoRun,
  timezone: string,
  args: {
    startsAt: string;
    customerName?: string | null;
    customerPhone?: string | null;
    service?: string | null;
    address?: string | null;
    notes?: string | null;
    callId?: string | null;
    now?: Date;
  },
): Promise<DemoBookResult> {
  const start = new Date(args.startsAt);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, reason: 'invalid', message: 'That is not a real time.' };
  }

  const now = args.now ?? new Date();
  if (start.getTime() < now.getTime()) {
    return { ok: false, reason: 'past', message: 'That time has already gone by.' };
  }

  const hours = demoHoursFrom(run.hours);
  if (!parseDayHours(hours[DAY_NAMES[start.getDay()]])) {
    return { ok: false, reason: 'closed', message: 'They are closed that day.' };
  }

  const end = new Date(start.getTime() + DEMO_MINUTES * 60_000);
  const { data, error } = await db
    .from('demo_appointments')
    .insert({
      run_id: run.id,
      vapi_call_id: args.callId ?? null,
      customer_name: args.customerName ?? null,
      customer_phone: args.customerPhone ?? null,
      service: args.service ?? null,
      address: args.address ?? null,
      notes: args.notes ?? null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: 'booked',
    })
    .select('id')
    .maybeSingle();

  if (error || !data) {
    /* Losing this race is EXPECTED, not exceptional: the unique index just told
     * us somebody else took the slot while this caller was deciding. The agent
     * offers a different time; it does not apologise for an error. */
    if (error && /duplicate|unique|conflict/i.test(error.message)) {
      return { ok: false, reason: 'taken', message: 'Somebody just took that time.' };
    }
    console.error('demo booking insert failed:', error?.message);
    return { ok: false, reason: 'error', message: 'The booking did not save.' };
  }

  return { ok: true, appointmentId: data.id as string, label: sayable(start, timezone) };
}

/** What the agent booked on this demo, newest first. Read by the hub. */
export async function demoAppointmentsFor(
  db: SupabaseClient,
  runId: string,
  limit = 10,
): Promise<
  Array<{
    id: string;
    customer_name: string | null;
    customer_phone: string | null;
    service: string | null;
    starts_at: string;
    created_at: string;
  }>
> {
  const { data } = await db
    .from('demo_appointments')
    .select('id, customer_name, customer_phone, service, starts_at, created_at')
    .eq('run_id', runId)
    .in('status', ['booked', 'confirmed'])
    .order('starts_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as Array<{
    id: string;
    customer_name: string | null;
    customer_phone: string | null;
    service: string | null;
    starts_at: string;
    created_at: string;
  }>;
}
