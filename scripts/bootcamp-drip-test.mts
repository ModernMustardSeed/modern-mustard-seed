/**
 * The bootcamp drip has a clock, and the clock has a test.
 *
 * Every reminder is due inside its window after its moment and never again.
 * Three fixture registrations at fixed instants prove the lanes keep to their
 * own steps (a ticket holder never gets the masterclass offer, an Operator
 * seat never gets the Operator pitch), that a sent step is not sent twice,
 * that an unsubscribed row is silent, that a replay letter waits for its
 * replay, and that no two letters in one lane are ever due at once except
 * where the newer one is meant to replace the older.
 *
 * Run:  pnpm exec tsx --test scripts/bootcamp-drip-test.mts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOTCAMP } from '../data/bootcamp';
import { dripSchedule, dueSteps, pickStep, laneOf, WINDOW_MS, MORNING_OF_MS, type Lane } from '../lib/bootcamp/drip';

const H = 60 * 60 * 1000;
const D = 24 * H;
const at = (iso: string) => new Date(iso).getTime();
const schedule = dripSchedule();
const stepAt = (name: string) => {
  const s = schedule.find((x) => x.step === name);
  assert.ok(s, `schedule has ${name}`);
  return s.at;
};

const masterclass = { tier: 'masterclass', sent_steps: [] as string[], unsubscribed_at: null };
const ticket = { tier: 'vip', sent_steps: [] as string[], unsubscribed_at: null };
const operator = { tier: 'operator', sent_steps: [] as string[], unsubscribed_at: null };

test('lanes', () => {
  assert.equal(laneOf('masterclass'), 'masterclass');
  for (const t of ['ga', 'vip', 'platinum']) assert.equal(laneOf(t), 'paid');
  assert.equal(laneOf('operator'), 'operator');
  assert.equal(laneOf('nonsense'), null);
});

test('the schedule is anchored to the dated moments', () => {
  assert.equal(stepAt('mc-24h'), at(BOOTCAMP.dates.masterclass) - D);
  assert.equal(stepAt('mc-1h'), at(BOOTCAMP.dates.masterclass) - H);
  assert.equal(stepAt('day1-1h'), at(BOOTCAMP.dates.day1) - H);
  assert.equal(stepAt('op-start-24h'), at(BOOTCAMP.dates.operatorStart) - D);
  const names = schedule.map((s) => s.step);
  assert.equal(new Set(names).size, names.length, 'no step is listed twice');
});

test('the morning-of letter goes at 8:00 AM Mountain', () => {
  for (const [step, key] of [['mc-live', 'masterclass'], ['kickoff-live', 'kickoff'], ['day1-live', 'day1'], ['day2-live', 'day2'], ['day3-live', 'day3']] as const) {
    const when = stepAt(step);
    assert.equal(when, at(BOOTCAMP.dates[key]) - MORNING_OF_MS);
    const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', hour12: false }).format(new Date(when));
    assert.equal(Number(hour), 8, `${step} lands at 8 AM Mountain`);
  }
});

test('a step is due inside its window and gone after it', () => {
  const t0 = stepAt('mc-24h');
  assert.deepEqual(dueSteps(masterclass, t0 - 1), []);
  assert.deepEqual(dueSteps(masterclass, t0), ['mc-24h']);
  assert.deepEqual(dueSteps(masterclass, t0 + WINDOW_MS - 1), ['mc-24h']);
  assert.deepEqual(dueSteps(masterclass, t0 + WINDOW_MS), []);
});

test('a sent step never repeats, and an unsubscribed row is silent', () => {
  const t0 = stepAt('mc-24h');
  assert.deepEqual(dueSteps({ ...masterclass, sent_steps: ['mc-24h'] }, t0), []);
  assert.equal(pickStep({ ...masterclass, unsubscribed_at: new Date().toISOString() }, t0), null);
});

test('lanes keep to their own steps', () => {
  // The masterclass replay carries the ticket offer; a ticket holder must never see it.
  const mcReplay = stepAt('mc-replay');
  assert.ok(dueSteps(masterclass, mcReplay).includes('mc-replay'));
  assert.ok(!dueSteps(ticket, mcReplay).includes('mc-replay'));
  // Day 1 reminders go to ticket holders only.
  const d1 = stepAt('day1-24h');
  assert.deepEqual(dueSteps(ticket, d1), ['day1-24h']);
  assert.deepEqual(dueSteps(masterclass, d1), []);
  // The Operator pitch never goes to a seat already in the cohort.
  const op2 = stepAt('op-2');
  assert.ok(dueSteps(ticket, op2).includes('op-2'));
  assert.ok(!dueSteps(operator, op2).includes('op-2'));
  // The cohort gets its own Day 3 replay letter, without the pitch.
  const d3r = stepAt('day3-replay');
  assert.deepEqual(dueSteps(ticket, d3r), ['day3-replay']);
  assert.deepEqual(dueSteps(operator, d3r), ['day3-replay-op']);
  const opStart = stepAt('op-start-24h');
  assert.deepEqual(dueSteps(operator, opStart), ['op-start-24h']);
  assert.deepEqual(dueSteps(ticket, opStart), []);
  // The morning of the masterclass reaches every lane: ticket holders have a seat in it too.
  const mcLive = stepAt('mc-live');
  for (const reg of [masterclass, ticket, operator]) assert.ok(dueSteps(reg, mcLive).includes('mc-live'));
});

test('one letter per person per run, the rest dropped', () => {
  // A "starts in an hour" letter closes when the session starts, so it can
  // never land after the session, and the replay four hours later goes alone.
  assert.deepEqual(dueSteps(masterclass, at(BOOTCAMP.dates.masterclass)), []);
  const pick = pickStep(masterclass, stepAt('mc-replay'));
  assert.ok(pick, 'a step is picked');
  assert.equal(pick.send, 'mc-replay');
  assert.deepEqual(pick.drop, []);
  // An hour out, the morning letter (unsent) is replaced by the hour letter, which carries the same room link.
  const d1h = pickStep(ticket, stepAt('day1-1h'));
  assert.ok(d1h);
  assert.equal(d1h.send, 'day1-1h');
  assert.deepEqual(d1h.drop, ['day1-live']);
  // A day later the 24-hour reminder's window is long closed: nothing stale goes out.
  assert.ok(!dueSteps(ticket, stepAt('day1-1h')).includes('day1-24h'));
});

test('a replay letter waits for its replay', () => {
  const held = dripSchedule(BOOTCAMP.dates, { replayReady: () => false });
  const names = held.map((s) => s.step);
  for (const r of ['mc-replay', 'day1-replay', 'day2-replay', 'day3-replay', 'day3-replay-op']) assert.ok(!names.includes(r as never), `${r} is held`);
  // Held is not dropped: the offer letters still run on their own clock.
  assert.ok(names.includes('mc-offer-2'));
  const t = stepAt('mc-replay');
  assert.deepEqual(dueSteps(masterclass, t, held), []);
  // Posted the next morning, inside its window, it goes.
  const ready = dripSchedule(BOOTCAMP.dates, { replayReady: (k) => k === 'masterclass' });
  assert.deepEqual(dueSteps(masterclass, t + 18 * H, ready), ['mc-replay']);
});

test('the worksheet reaches a late buyer and never collides with masterclass day', () => {
  const w = schedule.find((s) => s.step === 'worksheet');
  assert.ok(w);
  // Bought the night before kickoff's reminder: still gets the pre-work.
  assert.deepEqual(dueSteps(ticket, at(BOOTCAMP.dates.kickoff) - D - H), ['worksheet']);
  // Bought during the masterclass pitch: the worksheet has not opened yet, so it is not dropped by mc-live.
  assert.ok(!dueSteps(ticket, at(BOOTCAMP.dates.masterclass) + 30 * 60 * 1000).includes('worksheet'));
});

test('no letter is silently dropped by a neighbour it was never meant to yield to', () => {
  // The only planned overlaps are a morning-of or hour-before letter giving way to a
  // newer letter for the same session, and the masterclass hour letter giving way to its replay.
  const planned = new Set(['day1-live>day1-1h', 'day2-live>day2-1h', 'day3-live>day3-1h', 'mc-live>mc-1h']);
  for (const lane of ['masterclass', 'paid', 'operator'] as Lane[]) {
    const steps = schedule.filter((s) => s.lanes.includes(lane)).sort((a, b) => a.at - b.at);
    for (let i = 0; i < steps.length; i += 1) {
      for (let j = i + 1; j < steps.length; j += 1) {
        const a = steps[i];
        const b = steps[j];
        const overlap = b.at < a.at + (a.window ?? WINDOW_MS);
        if (overlap) assert.ok(planned.has(`${a.step}>${b.step}`), `${lane}: ${a.step} would be dropped by ${b.step}`);
      }
    }
  }
});
