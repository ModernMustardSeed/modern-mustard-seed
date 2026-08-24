/**
 * ⚠️ THE GUARD THAT KEEPS THE DATABASE ANSWERING.
 *
 * On 2026-08-24 at 16:00 UTC the production Postgres stopped answering and
 * every admin screen rendered empty. Nothing was deleted. Three crons fired in
 * the same minute (outreach-cadence, celebrate-drip, and the every-20-minutes
 * acquisition sweep), a fourth (deliver) fired on the same hour boundary, and
 * two production deploys landed at 16:00 and 16:06 warming every route. The box
 * went to 92% CPU and 92% memory and Cloudflare returned 522 on everything.
 *
 * The compute was raised Micro to Small the same day, which buys headroom. This
 * file is the part that keeps the headroom from being spent again, because a
 * cron added six months from now on a round number is invisible in review: the
 * schedule reads fine on its own line and only collides when you lay all
 * nineteen of them on one clock.
 *
 * The invariant: no two cron jobs may fire in the same minute.
 *
 * The acquisition sweep owns :00, :20 and :40 of every hour it runs, deliver
 * owns :10 and front-office owns :15, so a new hourly job has :05, :25, :30,
 * :35, :45, :50 and :55 to land on. Pick one nothing else uses at that hour.
 *
 * Exits non-zero on any collision so it can gate a build.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// PowerShell redirection on this workspace's machines writes a UTF-8 BOM, and a
// BOM in front of the brace makes JSON.parse throw something unreadable.
const config = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8').replace(/^﻿/, ''));
const crons = config.crons ?? [];

const problems = [];

/**
 * Expand one cron field into the explicit values it matches. Handles a bare
 * star, `a,b,c`, `a-b` and step syntax, which covers everything Vercel accepts
 * and everything this file has ever used.
 */
function expand(field, min, max) {
  const values = new Set();
  for (const part of field.split(',')) {
    const [range, stepRaw] = part.split('/');
    const step = stepRaw ? Number(stepRaw) : 1;
    if (!Number.isInteger(step) || step < 1) return null;
    let lo;
    let hi;
    if (range === '*') {
      lo = min;
      hi = max;
    } else if (range.includes('-')) {
      const [a, b] = range.split('-').map(Number);
      lo = a;
      hi = b;
    } else {
      lo = Number(range);
      hi = lo;
    }
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < min || hi > max || lo > hi) return null;
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  return values;
}

/** Every (day of week, hour, minute) this schedule fires at. */
function slots(schedule, path) {
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) {
    problems.push(`MALFORMED  ${path} has "${schedule}", which is not five cron fields.`);
    return [];
  }
  const [minuteField, hourField, domField, monthField, dowField] = fields;
  if (domField !== '*' || monthField !== '*') {
    problems.push(
      `UNCHECKABLE  ${path} restricts day-of-month or month ("${schedule}").\n` +
      '             This checker compares on day-of-week, hour and minute only.\n' +
      '             Teach it the other two fields before shipping this schedule.'
    );
    return [];
  }
  const minutes = expand(minuteField, 0, 59);
  const hours = expand(hourField, 0, 23);
  const days = expand(dowField, 0, 7);
  if (!minutes || !hours || !days) {
    problems.push(`MALFORMED  ${path} has "${schedule}", which this checker cannot expand.`);
    return [];
  }
  // Cron accepts both 0 and 7 for Sunday. Normalise so they collide with each other.
  const normalisedDays = new Set([...days].map((d) => (d === 7 ? 0 : d)));
  const out = [];
  for (const d of normalisedDays) for (const h of hours) for (const m of minutes) out.push(`${d}:${h}:${m}`);
  return out;
}

/** slot -> the paths that fire in it. */
const occupancy = new Map();
for (const { path, schedule } of crons) {
  for (const slot of slots(schedule, path)) {
    if (!occupancy.has(slot)) occupancy.set(slot, []);
    occupancy.get(slot).push(path);
  }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const collisions = new Map();
for (const [slot, paths] of occupancy) {
  if (paths.length < 2) continue;
  // Report one line per colliding set, not one per slot, or an hourly pair
  // would print 168 identical findings.
  const key = [...paths].sort().join(' + ');
  const [d, h, m] = slot.split(':').map(Number);
  const when = `${DAYS[d]} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} UTC`;
  if (!collisions.has(key)) collisions.set(key, { paths, first: when, count: 0 });
  collisions.get(key).count += 1;
}

for (const [key, { first, count }] of collisions) {
  problems.push(
    `COLLISION  ${key}\n` +
    `           fire in the same minute, first at ${first}` +
    (count > 1 ? `, and ${count - 1} more time${count === 2 ? '' : 's'} a week.` : '.') + '\n' +
    '           Move one of them. No two crons may share a minute.'
  );
}

if (problems.length === 0) {
  const busiest = [...occupancy.values()].reduce((n, paths) => Math.max(n, paths.length), 0);
  console.log(
    `\nCron collisions: OK. ${crons.length} jobs, at most ${busiest} in any one minute.\n`
  );
} else {
  console.error('\nCRON COLLISION CHECK FAILED\n');
  for (const p of problems) console.error(`  ${p}\n`);
  console.error(
    'Crons stacked in one minute took production down on 2026-08-24. Fix the above.\n'
  );
  process.exitCode = 1;
}
