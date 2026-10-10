/**
 * THE OFFICE, MEASURED.
 *
 *   pnpm routines:test
 *
 * Pins lib/routines.ts, the pure half of the routine heartbeat, the eval intake,
 * the keep-or-toss links, the watchdog and the public scoreboard:
 *
 *  1. The keep and toss links verify only with the exact routine, date, verdict
 *     and secret they were signed with.
 *  2. The Bearer check refuses a wrong, missing or placeholder secret.
 *  3. The watchdog expects nothing inside a run's window and everything past it.
 *  4. The scoreboard carries counts and statuses only, never report text.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bearerOk,
  buildScoreboard,
  dayOf,
  expectedRuns,
  missingRuns,
  parseEvals,
  parseHeartbeat,
  routinesSecret,
  verdictSig,
  verdictSigOk,
  verdictUrl,
} from '../lib/routines';
import { mountainToUtc } from '../lib/posting/time';
import type { Routine } from '../data/routines';

const SECRET = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);

test('a verdict signature verifies only for its own fields and secret', () => {
  const sig = verdictSig(SECRET, 'morning-brief', '2026-10-12', 'keep');
  assert.match(sig, /^[a-f0-9]{64}$/);
  assert.equal(verdictSigOk(SECRET, 'morning-brief', '2026-10-12', 'keep', sig), true);
  assert.equal(verdictSigOk(SECRET, 'morning-brief', '2026-10-12', 'keep', sig.toUpperCase()), true);
  assert.equal(verdictSigOk(SECRET, 'morning-brief', '2026-10-12', 'toss', sig), false, 'keep sig cannot record toss');
  assert.equal(verdictSigOk(SECRET, 'pipeline', '2026-10-12', 'keep', sig), false, 'other routine');
  assert.equal(verdictSigOk(SECRET, 'morning-brief', '2026-10-13', 'keep', sig), false, 'other day');
  assert.equal(verdictSigOk(OTHER, 'morning-brief', '2026-10-12', 'keep', sig), false, 'other secret');
  assert.equal(verdictSigOk(SECRET, 'morning-brief', '2026-10-12', 'keep', sig.slice(0, 63)), false, 'short sig');
  assert.equal(verdictSigOk(SECRET, 'morning-brief', '2026-10-12', 'keep', ''), false, 'empty sig');
});

test('the verdict URL carries a signature that verifies', () => {
  const u = new URL(verdictUrl(SECRET, 'truth-audit', '2026-10-15', 'toss'));
  assert.equal(u.origin + u.pathname, 'https://modernmustardseed.com/api/routines/verdict');
  const p = u.searchParams;
  assert.equal(verdictSigOk(SECRET, p.get('r')!, p.get('d')!, p.get('v')!, p.get('s')!), true);
});

test('the Bearer check refuses anything but the exact secret', () => {
  assert.equal(bearerOk(`Bearer ${SECRET}`, SECRET), true);
  assert.equal(bearerOk(`bearer  ${SECRET} `, SECRET), true);
  assert.equal(bearerOk(`Bearer ${OTHER}`, SECRET), false);
  assert.equal(bearerOk(`Bearer ${SECRET.slice(1)}`, SECRET), false);
  assert.equal(bearerOk(SECRET, SECRET), false, 'no scheme');
  assert.equal(bearerOk(null, SECRET), false);
  assert.equal(bearerOk('', SECRET), false);
});

test('a missing, placeholder, BOM or short secret switches the endpoints off', () => {
  assert.equal(routinesSecret(undefined), null);
  assert.equal(routinesSecret(''), null);
  assert.equal(routinesSecret('[SENSITIVE]'), null);
  assert.equal(routinesSecret('short'), null);
  assert.equal(routinesSecret(`﻿${SECRET}\n`), SECRET);
});

test('heartbeat bodies are validated', () => {
  const good = parseHeartbeat({ routine: 'morning-brief', agent: 'chief-of-staff', run_date: '2026-10-12', status: 'ok', summary: 'x'.repeat(900), report_chars: 4200 });
  assert.equal(good.ok, true);
  if (good.ok) assert.equal(good.value.summary!.length, 600, 'summary capped');
  assert.equal(parseHeartbeat({ routine: 'Morning Brief', agent: 'a-b', run_date: '2026-10-12', status: 'ok' }).ok, false);
  assert.equal(parseHeartbeat({ routine: 'pipeline', agent: 'pipeline-steward', run_date: '2026-02-30', status: 'ok' }).ok, false);
  assert.equal(parseHeartbeat({ routine: 'pipeline', agent: 'pipeline-steward', run_date: '2026-10-12', status: 'done' }).ok, false);
  assert.equal(parseHeartbeat({ routine: 'pipeline', agent: 'pipeline-steward', run_date: '2026-10-12', status: 'ok', report_chars: -1 }).ok, false);
  assert.equal(parseHeartbeat(null).ok, false);
});

test('eval bodies are validated', () => {
  const ok = parseEvals({ run_id: '2026-10-10T15-04-00Z', results: [{ agent: 'proposal-closer', case_id: 'tier-map-1', passed: true, score: 0.9, checks: [{ name: 'no hourly', passed: true }] }] });
  assert.equal(ok.ok, true);
  assert.equal(parseEvals({ run_id: '2026-10-10', results: [{ agent: 'proposal-closer', case_id: 'x', passed: true, score: 1.2 }] }).ok, false);
  assert.equal(parseEvals({ run_id: '2026-10-10', results: [] }).ok, false);
  assert.equal(parseEvals({ run_id: 'bad id!', results: [{ agent: 'a-b', case_id: 'x', passed: true, score: 1 }] }).ok, false);
});

const ONE: Routine[] = [{ name: 'pipeline', agent: 'pipeline-steward', time: '06:35', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], chrome: false, minutes: 30 }];

test('the watchdog waits out a run window and then expects it', () => {
  assert.equal(dayOf('2026-10-12'), 'Mon');
  // Monday 7:04 AM Mountain: started 6:35, timeout 30 min, so not due until 7:05.
  assert.deepEqual(expectedRuns(mountainToUtc('2026-10-12', 7, 4), ONE, '2026-10-01'), []);
  const due = expectedRuns(mountainToUtc('2026-10-12', 7, 5), ONE, '2026-10-01');
  assert.equal(due.length, 1);
  assert.equal(due[0].run_date, '2026-10-12');
  // Tuesday morning before the window: Monday's run is still expected.
  const tue = expectedRuns(mountainToUtc('2026-10-13', 6, 0), ONE, '2026-10-01');
  assert.deepEqual(tue.map((e) => e.run_date), ['2026-10-12']);
  // Sunday expects nothing from a weekday routine.
  assert.deepEqual(expectedRuns(mountainToUtc('2026-10-11', 12, 0), ONE, '2026-10-01').filter((e) => e.run_date === '2026-10-11'), []);
});

test('the watchdog expects nothing before the day heartbeats began', () => {
  assert.deepEqual(expectedRuns(mountainToUtc('2026-10-13', 12, 0), ONE, '2026-10-13').map((e) => e.run_date), ['2026-10-13']);
});

test('only an ok row clears an expected run', () => {
  const exp = expectedRuns(mountainToUtc('2026-10-13', 12, 0), ONE, '2026-10-01');
  const miss = missingRuns(exp, [
    { routine: 'pipeline', run_date: '2026-10-12', status: 'ok' },
    { routine: 'pipeline', run_date: '2026-10-13', status: 'running' },
  ]);
  assert.deepEqual(miss.map((m) => [m.run_date, m.status]), [['2026-10-13', 'running']]);
});

test('the scoreboard has its shape and never carries text', () => {
  const now = mountainToUtc('2026-10-13', 12, 0);
  const board = buildScoreboard({
    now,
    routines: ONE,
    runs: [
      { routine: 'pipeline', run_date: '2026-10-12', status: 'ok', summary: 'Call Dana at Acme Roofing' } as never,
      { routine: 'pipeline', run_date: '2026-10-13', status: 'timeout' },
      { routine: 'smoke-test', run_date: '2026-10-13', status: 'ok' },
    ],
    verdicts: [
      { routine: 'pipeline', run_date: '2026-10-12', verdict: 'keep' },
      { routine: 'pipeline', run_date: '2026-10-13', verdict: 'toss' },
    ],
    evals: [
      { run_id: 'old', agent: 'proposal-closer', case_id: 'a', passed: false, created_at: '2026-10-01T00:00:00Z' },
      { run_id: 'new', agent: 'proposal-closer', case_id: 'a', passed: true, created_at: '2026-10-13T00:00:00Z' },
      { run_id: 'new', agent: 'proposal-closer', case_id: 'b', passed: false, created_at: '2026-10-13T00:00:01Z' },
      { run_id: 'new', agent: 'truth-auditor', case_id: 'a', passed: true, created_at: '2026-10-13T00:00:02Z' },
    ],
  });
  assert.deepEqual(Object.keys(board).sort(), ['evals', 'generated_at', 'routines', 'totals']);
  assert.equal(board.routines.length, 1);
  const r = board.routines[0];
  assert.equal(r.days.length, 14);
  assert.equal(r.days[13].date, '2026-10-13');
  assert.equal(r.days[13].status, 'timeout');
  assert.equal(r.last_run_date, '2026-10-13');
  assert.equal(r.last_status, 'timeout');
  assert.equal(r.keep, 1);
  assert.equal(r.toss, 1);
  assert.deepEqual(board.totals, { runs_14d: 2, ok_14d: 1, keep_rate: 0.5 }, 'unknown routines are not counted');
  assert.ok(board.evals);
  assert.equal(board.evals!.run_id, 'new');
  assert.equal(board.evals!.cases, 3);
  assert.equal(board.evals!.passed, 2);
  assert.equal(board.evals!.agents_tested, 2);
  assert.equal(board.evals!.pass_rate, 0.667);
  assert.deepEqual(board.evals!.by_agent.map((a) => a.agent), ['proposal-closer', 'truth-auditor']);
  assert.ok(!JSON.stringify(board).includes('Acme'), 'no report text on the public board');
});

test('an empty office still has a valid board', () => {
  const board = buildScoreboard({ now: new Date('2026-10-13T18:00:00Z'), runs: [], verdicts: [], evals: [] });
  assert.equal(board.evals, null);
  assert.equal(board.routines.length, 10);
  assert.equal(board.totals.keep_rate, null);
});
