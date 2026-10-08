/**
 * The bootcamp drip has a clock, and the clock has a test.
 *
 * Every reminder is due inside a six-hour window after its moment and never
 * again. Three fixture registrations at fixed instants prove the lanes keep
 * to their own steps (a ticket holder never gets the masterclass offer, an
 * Operator seat never gets the Operator pitch), that a sent step is not sent
 * twice, and that an unsubscribed row is silent.
 *
 * Run:  pnpm exec tsx --test scripts/bootcamp-drip-test.mts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOTCAMP } from '../data/bootcamp';
import { dripSchedule, dueSteps, pickStep, laneOf, WINDOW_MS } from '../lib/bootcamp/drip';

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
  assert.deepEqual(dueSteps(ticket, mcReplay), []);
  // Day 1 reminders go to ticket holders only.
  const d1 = stepAt('day1-24h');
  assert.deepEqual(dueSteps(ticket, d1), ['day1-24h']);
  assert.deepEqual(dueSteps(masterclass, d1), []);
  // The Operator pitch never goes to a seat already in the cohort.
  const op2 = stepAt('op-2');
  assert.ok(dueSteps(ticket, op2).includes('op-2'));
  assert.deepEqual(dueSteps(operator, op2), []);
  const opStart = stepAt('op-start-24h');
  assert.deepEqual(dueSteps(operator, opStart), ['op-start-24h']);
  assert.deepEqual(dueSteps(ticket, opStart), []);
});

test('one letter per person per run, the rest dropped', () => {
  // The replay lands four hours after the masterclass, while the one-hour
  // reminder's six-hour window is still open: the replay goes, the reminder is dropped.
  const replay = stepAt('mc-replay');
  const pick = pickStep(masterclass, replay);
  assert.ok(pick, 'a step is picked');
  assert.equal(pick.send, 'mc-replay');
  assert.ok(pick.drop.includes('mc-1h'));
  // A day later the 24-hour reminder's window is long closed: nothing stale goes out.
  assert.deepEqual(dueSteps(ticket, stepAt('day1-1h')), ['day1-1h']);
});
