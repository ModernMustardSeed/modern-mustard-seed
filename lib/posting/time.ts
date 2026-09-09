/**
 * Mountain time without a library. Every client we post for is in Montana, and
 * "9 AM" means 9 AM on their clock whatever the date, so the offset is looked
 * up per day rather than assumed.
 */
const ZONE = 'America/Denver';

/** The UTC offset, in minutes, that the zone had at `at`. */
function offsetMinutes(at: Date, zone = ZONE): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** `YYYY-MM-DD` at `hour` o'clock Mountain, as a UTC instant. */
export function mountainToUtc(dateStr: string, hour: number, minute = 0): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  const off = offsetMinutes(guess);
  const first = new Date(guess.getTime() - off * 60_000);
  // A DST edge can change the offset between the guess and the answer; one correction settles it.
  const off2 = offsetMinutes(first);
  return off2 === off ? first : new Date(guess.getTime() - off2 * 60_000);
}

/** Today's date in Mountain time, `YYYY-MM-DD`. */
export function mountainDate(at = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The hour (0 to 23) it is right now in Mountain time. */
export function mountainHour(at = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', hourCycle: 'h23' }).format(at));
}

/** Day of week in Mountain time, 0 = Sunday. */
export function mountainWeekday(at = new Date()): number {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short' }).format(at);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(s);
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "Thursday, September 10" for a `YYYY-MM-DD`. */
export function prettyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** "9:00 AM" for a post hour. */
export function prettyHour(hour: number): string {
  const h = ((hour + 11) % 12) + 1;
  return `${h}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}

/** "9:14 AM" in Mountain time for an ISO instant. */
export function prettyMountainTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' });
}
