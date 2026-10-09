import { getSupabase } from '@/lib/supabase';

/**
 * A white label receptionist's consultation calendar, for demo desks.
 *
 * The receptionist offers real openings (inside the office's hours, never
 * invented) and books the one the caller picks. On a demo desk the calendar
 * is ours, kept in app_state under `white-label:bookings:<client id>`, and the
 * booking shows on the client's front desk. When a client goes live this is
 * where their own calendar (Google, Outlook, Clio) plugs in instead.
 *
 * Openings: weekdays, 9:00 to 3:30 Mountain on the half hour, never over lunch, from three
 * hours out, ten business days ahead. About a third of them read as already
 * taken, the same ones every time, so the calendar looks like a working
 * office's and not an empty one.
 */

const TZ = 'America/Denver';
const FIRST = 9 * 60; // 9:00
const LAST = 15 * 60 + 30; // 3:30
const STEP = 30;
const DAYS = 10;

export type DeskBooking = {
  startsAt: string;
  label: string;
  name: string;
  phone: string | null;
  matter: string | null;
  callId: string | null;
  bookedAt: string;
};

export type Slot = { startsAt: string; label: string };

const stateKey = (clientId: string) => `white-label:bookings:${clientId}`;

/** Minutes the zone is behind UTC at this instant (Denver: 360 or 420). */
function offsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-7';
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!m) return 420;
  const mins = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === '-' ? mins : -mins;
}

/** A wall-clock time in Denver, as a real instant. */
function denver(y: number, mo: number, d: number, minutes: number): Date {
  const guess = new Date(Date.UTC(y, mo, d, Math.floor(minutes / 60), minutes % 60));
  return new Date(guess.getTime() + offsetMinutes(guess) * 60_000);
}

function parts(at: Date) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(at);
  const g = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  return { y: Number(g('year')), mo: Number(g('month')) - 1, d: Number(g('day')), weekday: g('weekday') };
}

export function slotLabel(at: Date): string {
  const day = at.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' });
  const time = at.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
}

/** Same answer for the same slot every time, so "taken" never flickers between calls. */
function lookedTaken(iso: string): boolean {
  // FNV-1a with a final mix: neighbouring times hash far apart, so the busy
  // slots scatter through a day instead of clumping into whole mornings.
  let h = 0x811c9dc5;
  for (const c of iso) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b) >>> 0;
  h ^= h >>> 16;
  return h % 3 === 0;
}

/** Every opening in the window, ignoring what is booked. */
function window(now = new Date()): Slot[] {
  const out: Slot[] = [];
  const earliest = now.getTime() + 3 * 3_600_000;
  const start = parts(now);
  let day = 0;
  let business = 0;
  while (business < DAYS && day < DAYS * 2) {
    const probe = denver(start.y, start.mo, start.d + day, 12 * 60);
    const p = parts(probe);
    day += 1;
    if (p.weekday === 'Sat' || p.weekday === 'Sun') continue;
    business += 1;
    for (let m = FIRST; m <= LAST; m += STEP) {
      if (m >= 12 * 60 && m < 13 * 60) continue; // lunch
      const at = denver(p.y, p.mo, p.d, m);
      if (at.getTime() < earliest) continue;
      const iso = at.toISOString();
      if (lookedTaken(iso)) continue;
      out.push({ startsAt: iso, label: slotLabel(at) });
    }
  }
  return out;
}

export async function listBookings(clientId: string): Promise<DeskBooking[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await db.from('app_state').select('value').eq('key', stateKey(clientId)).maybeSingle();
  const list = ((data?.value as { bookings?: DeskBooking[] } | null)?.bookings ?? []).filter((b) => b && b.startsAt);
  return list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Bookings from an hour ago on, for the desk. */
export async function upcomingBookings(clientId: string): Promise<DeskBooking[]> {
  const since = Date.now() - 3_600_000;
  return (await listBookings(clientId)).filter((b) => Date.parse(b.startsAt) > since);
}

/**
 * Open times for the receptionist to offer. `date` (YYYY-MM-DD, Mountain) and
 * `part` (morning or afternoon) narrow it when the caller asked for something;
 * with nothing on that day the nearest later openings come back instead.
 */
export async function openSlots(clientId: string, opts: { date?: string | null; part?: string | null; limit?: number } = {}): Promise<Slot[]> {
  const taken = new Set((await listBookings(clientId)).map((b) => b.startsAt));
  let free = window().filter((s) => !taken.has(s.startsAt));
  const part = (opts.part ?? '').toLowerCase();
  if (part.startsWith('morn')) free = free.filter((s) => / AM$/.test(s.label));
  else if (part.startsWith('after')) free = free.filter((s) => / PM$/.test(s.label));
  if (opts.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
    const sameDay = free.filter((s) => parts(new Date(s.startsAt)).d === Number(opts.date!.slice(8)) && parts(new Date(s.startsAt)).mo === Number(opts.date!.slice(5, 7)) - 1);
    if (sameDay.length) free = sameDay;
    else free = free.filter((s) => s.startsAt.slice(0, 10) >= opts.date!);
  }
  return free.slice(0, opts.limit ?? 4);
}

export type BookResult = { ok: true; label: string } | { ok: false; reason: 'invalid' | 'taken'; next: Slot[] };

export async function bookSlot(
  clientId: string,
  input: { startsAt: string; name: string; phone?: string | null; matter?: string | null; callId?: string | null },
  opts: { dryRun?: boolean } = {},
): Promise<BookResult> {
  const db = getSupabase();
  const valid = window().find((s) => s.startsAt === input.startsAt);
  const current = await listBookings(clientId);
  if (!valid) return { ok: false, reason: 'invalid', next: await openSlots(clientId, { limit: 2 }) };
  if (current.some((b) => b.startsAt === input.startsAt)) return { ok: false, reason: 'taken', next: await openSlots(clientId, { limit: 2 }) };
  const booking: DeskBooking = {
    startsAt: valid.startsAt,
    label: valid.label,
    name: input.name,
    phone: input.phone ?? null,
    matter: input.matter ?? null,
    callId: input.callId ?? null,
    bookedAt: new Date().toISOString(),
  };
  // Past bookings fall off after two weeks so the row never grows without end.
  const keep = current.filter((b) => Date.parse(b.startsAt) > Date.now() - 14 * 86_400_000);
  if (db && !opts.dryRun) {
    await db.from('app_state').upsert({ key: stateKey(clientId), value: { bookings: [...keep, booking] }, updated_at: new Date().toISOString() });
  }
  return { ok: true, label: valid.label };
}
