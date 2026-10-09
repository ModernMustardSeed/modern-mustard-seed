/**
 * The office on /bootcamp is the real crew, and its router is the demo a
 * visitor plays with. This test keeps both honest: the roster has no
 * duplicates and every desk can be reached, and the jobs we offer as presets
 * route to the desks a person would expect.
 *
 * Run:  pnpm exec tsx --test scripts/bootcamp-office-test.mts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHIEF, OFFICE_ALL, OFFICE_AGENT_COUNT, OFFICE_DEPTS, OFFICE_KEYWORDS, OFFICE_PRESETS, routeJob } from '../data/bootcamp-office';
import { BOOTCAMP_PROOF } from '../data/bootcamp';

const ids = (job: string) => routeJob(job).agents.map((a) => a.id);

test('the roster is 64 desks in 10 departments, none twice', () => {
  assert.equal(OFFICE_AGENT_COUNT, 64);
  assert.equal(OFFICE_DEPTS.length, 10);
  const all = OFFICE_ALL.map((a) => a.id);
  assert.equal(new Set(all).size, all.length);
  assert.ok(BOOTCAMP_PROOF.some((p) => p.n === String(OFFICE_AGENT_COUNT)), 'the proof strip carries the crew count');
});

test('every desk has words that route to it, and no word list names a ghost', () => {
  for (const a of OFFICE_ALL) assert.ok((OFFICE_KEYWORDS[a.id] ?? []).length > 0, `${a.id} has routing words`);
  const known = new Set(OFFICE_ALL.map((a) => a.id));
  for (const k of Object.keys(OFFICE_KEYWORDS)) assert.ok(known.has(k), `${k} is on the roster`);
});

test('no copy carries an em dash', () => {
  const text = JSON.stringify([OFFICE_DEPTS, CHIEF, OFFICE_PRESETS]);
  assert.ok(!text.includes('—'));
});

test('every preset routes to a matched crew of two to four desks', () => {
  for (const p of OFFICE_PRESETS) {
    const r = routeJob(p);
    assert.ok(r.matched, `${p} matched`);
    assert.ok(r.agents.length >= 2 && r.agents.length <= 4, `${p} gets ${r.agents.length} desks`);
    assert.ok(!r.agents.some((a) => a.id === CHIEF.id), 'the chief routes, never assigns itself');
  }
});

test('the presets land where a person would expect', () => {
  assert.ok(ids('Nobody finds us on Google').some((i) => ['seo-strategist', 'local-seo'].includes(i)));
  assert.ok(ids('We miss calls after 5 PM').includes('voice-agent-engineer'));
  assert.ok(ids('Quotes go out and nobody follows up').includes('pipeline-steward'));
  assert.ok(ids('Our reviews are thin and old').includes('reputation-manager'));
  assert.ok(ids('I need a pitch deck by Friday').includes('deck-designer'));
  assert.ok(ids('I have an idea for a second business').includes('product-strategist'));
  assert.ok(ids('Our website looks ten years old').includes('site-builder'));
});

test('the Day 3 card points at the agent the job needs', () => {
  assert.equal(routeJob('We miss calls after 5 PM').day3, 'frontDesk');
  assert.equal(routeJob('Quotes go out and nobody follows up').day3, 'frontDesk');
  assert.equal(routeJob('Nobody finds us on Google').day3, 'presence');
  assert.equal(routeJob('Our reviews are thin and old').day3, 'presence');
});

test('a job no desk owns still gets a plan, and routing is stable', () => {
  const r = routeJob('zzz qqq');
  assert.equal(r.matched, false);
  assert.equal(r.agents.length, 3);
  assert.deepEqual(ids('We miss calls after 5 PM'), ids('We miss calls after 5 PM'));
});
