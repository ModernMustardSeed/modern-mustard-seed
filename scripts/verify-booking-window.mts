/**
 * Proves the booking window opens months out (2026-07-21: was 14 days, felt
 * like one week because the curated spread only surfaced the next 3 open days).
 * Exercises lib/booking against real prod data (Supabase bookings + the ICS
 * busy feed), read-only. Books nothing, sends nothing.
 *
 * Run: npx tsx scripts/verify-booking-window.mts
 */
import { readFileSync } from 'node:fs';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=("?)(.*)\2\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
  }
} catch {
  /* rely on the environment */
}

const { getNextAvailableSlots, isSlotAvailable, bookingWindow } = await import('../lib/booking');
const { availability } = await import('../data/availability');

let fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${!cond && detail ? `  (${detail})` : ''}`);
  if (!cond) fail++;
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);

console.log('--- the window ---');
const win = bookingWindow();
ok('window is ~4 months (120 days)', win.maxLookaheadDays === 120, JSON.stringify(win));
ok('last bookable date is ~120 days out', Math.abs(Date.parse(win.lastDateStr) - (Date.now() + 120 * 864e5)) < 3 * 864e5, win.lastDateStr);

console.log('\n--- soonest spread (default callers unchanged) ---');
const t0 = Date.now();
const soonest = await getNextAvailableSlots();
const soonestMs = Date.now() - t0;
ok('soonest spread returns slots', soonest.length > 0);
ok(`fast enough with hoisted formatters (${soonestMs}ms)`, soonestMs < 2500);
const dayCount = new Set(soonest.map((s) => s.dayLabel)).size;
ok(`curated shape holds (${dayCount} days, ${soonest.length} slots)`, dayCount <= availability.proposeDays && soonest.length <= availability.proposeDays * availability.proposePerDay);
if (soonest[0]) {
  const leadDays = (Date.parse(soonest[0].startIso) - Date.now()) / 864e5;
  ok(`first offer is near-term (${leadDays.toFixed(1)}d out)`, leadDays < 14);
}

console.log('\n--- booking two months out (the new capability) ---');
const from60 = ymd(new Date(Date.now() + 60 * 864e5));
const far = await getNextAvailableSlots(from60);
ok(`from=${from60} returns slots`, far.length > 0);
ok('every far slot is on/after the asked date', far.every((s) => s.startIso >= new Date(Date.now() + 59 * 864e5).toISOString()), far[0]?.startIso ?? 'none');
if (far[0]) {
  const bookable = await isSlotAvailable(far[0].startIso);
  ok('a two-months-out slot passes isSlotAvailable (bookable end to end)', bookable, far[0].display);
}

console.log('\n--- edges ---');
const beyond = await getNextAvailableSlots(ymd(new Date(Date.now() + 200 * 864e5)));
ok('a date past the window yields no slots (callers explain the window)', beyond.length === 0);
const junk = await getNextAvailableSlots('not-a-date');
ok('garbage from-date behaves like default', junk.length === soonest.length && junk[0]?.startIso === soonest[0]?.startIso);
const from90 = ymd(new Date(Date.now() + 90 * 864e5));
const far90 = await getNextAvailableSlots(from90);
ok(`from=${from90} (three months) still returns slots`, far90.length > 0);

console.log(fail === 0 ? '\nALL CHECKS PASSED' : `\n${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
