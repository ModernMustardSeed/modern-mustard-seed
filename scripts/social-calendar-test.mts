/**
 * THE SOCIAL CALENDAR, pinned.
 *
 *   pnpm social:test
 *
 * Pins lib/social-calendar.ts, the pure half of /admin/social:
 *
 *  1. Today is Mountain Time, not UTC: 11pm in Kalispell is still today.
 *  2. The agenda pins today, orders later days, keeps only the last seven
 *     days, sorts each day by time, and sends unscheduled and undated rows
 *     to the backlog instead of a day.
 *  3. The counts strip: today, today plus six, and the backlog.
 *  4. The PATCH validator moves status and ref only.
 *  5. An import never walks a posted row back to planned.
 *
 * Runs on Node's own runner (no bundler: native addons are blocked here).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDays,
  applyFilters,
  buildAgenda,
  idsToPrune,
  isRowId,
  isUrl,
  mergeImported,
  mtDate,
  parsePatch,
  timeKey,
  type SocialPost,
} from '../lib/social-calendar.ts';

function row(p: Partial<SocialPost> & { id: string }): SocialPost {
  return {
    date: null,
    time_mt: null,
    platform: 'facebook',
    account: null,
    series: null,
    title: null,
    kind: null,
    status: 'planned',
    ref: null,
    caption: null,
    cover_url: null,
    source: null,
    ...p,
  };
}

test('today is Mountain Time', () => {
  // 2026-10-11 05:00 UTC is 23:00 on 2026-10-10 in Denver (MDT, UTC-6).
  assert.equal(mtDate(new Date('2026-10-11T05:00:00Z')), '2026-10-10');
  assert.equal(mtDate(new Date('2026-10-11T06:30:00Z')), '2026-10-11');
});

test('addDays crosses months and years', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-10-03', -7), '2026-09-26');
});

test('timeKey reads 24 hour and am/pm, unknown sorts last', () => {
  assert.ok(timeKey('9:05') < timeKey('10:30'));
  assert.equal(timeKey('4:15 PM'), timeKey('16:15'));
  assert.equal(timeKey('12:00 am'), 0);
  assert.ok(timeKey(null) > timeKey('23:59'));
});

test('agenda groups, orders and windows the rows', () => {
  const today = '2026-10-10';
  const rows = [
    row({ id: 'a', date: today, time_mt: '18:00', platform: 'x' }),
    row({ id: 'b', date: today, time_mt: '10:30', platform: 'instagram', status: 'posted' }),
    row({ id: 'c', date: '2026-10-12', time_mt: '10:30' }),
    row({ id: 'd', date: '2026-10-11', time_mt: '10:30' }),
    row({ id: 'e', date: '2026-10-09', time_mt: '10:30', status: 'posted' }),
    row({ id: 'f', date: '2026-10-02', time_mt: '10:30' }),
    row({ id: 'g', date: '2026-10-01', time_mt: '10:30' }),
    row({ id: 'h', status: 'unscheduled' }),
    row({ id: 'i', date: '2026-10-20', status: 'unscheduled' }),
  ];
  const a = buildAgenda(rows, today);
  assert.deepEqual(a.today.posts.map((p) => p.id), ['b', 'a']);
  // The unscheduled row on 10-20 is a missed slot: backlog, not a day section.
  assert.deepEqual(a.upcoming.map((d) => d.date), ['2026-10-11', '2026-10-12']);
  // The window is the seven days before today: 10-03 through 10-09.
  assert.deepEqual(a.past.map((d) => d.date), ['2026-10-09']);
  assert.ok(!a.past.some((d) => d.date === '2026-10-02'), 'eight days back is outside the window');
  assert.deepEqual(a.backlog.map((p) => p.id), ['i', 'h'], 'dated backlog first, oldest first, undated last');
  assert.deepEqual(a.counts, { today: 2, week: 4, backlog: 2, postedToday: 1 });
});

test('agenda with nothing today still pins an empty today', () => {
  const a = buildAgenda([row({ id: 'x', date: '2026-10-15' })], '2026-10-10');
  assert.equal(a.today.date, '2026-10-10');
  assert.equal(a.today.posts.length, 0);
  assert.equal(a.upcoming.length, 1);
});

test('filters combine', () => {
  const rows = [
    row({ id: '1', platform: 'x', series: 'Office Hours', status: 'posted' }),
    row({ id: '2', platform: 'x', series: 'Trade Secrets' }),
    row({ id: '3', platform: 'tiktok', series: 'Office Hours' }),
  ];
  assert.deepEqual(applyFilters(rows, { platform: 'x' }).map((r) => r.id), ['1', '2']);
  assert.deepEqual(applyFilters(rows, { platform: 'x', series: 'Office Hours' }).map((r) => r.id), ['1']);
  assert.deepEqual(applyFilters(rows, { status: 'planned' }).map((r) => r.id), ['2', '3']);
  assert.equal(applyFilters(rows, {}).length, 3);
});

test('patch validator moves status and ref only', () => {
  assert.deepEqual(parsePatch({ status: 'posted', ref: ' https://x.com/a/1 ' }), {
    ok: true,
    patch: { status: 'posted', ref: 'https://x.com/a/1' },
  });
  assert.deepEqual(parsePatch({ ref: '' }), { ok: true, patch: { ref: null } });
  assert.equal(parsePatch({ status: 'done' }).ok, false);
  assert.equal(parsePatch({ caption: 'x' }).ok, false);
  assert.equal(parsePatch({}).ok, false);
  assert.equal(parsePatch(null).ok, false);
  assert.equal(parsePatch([]).ok, false);
  assert.equal(parsePatch({ ref: 7 }).ok, false);
  assert.equal(parsePatch({ ref: 'a'.repeat(2001) }).ok, false);
});

test('row ids and urls', () => {
  assert.ok(isRowId('oh-01-instagram'));
  assert.ok(!isRowId('../etc'));
  assert.ok(!isRowId(''));
  assert.ok(isUrl('https://www.tiktok.com/@modernmustardseed/video/1'));
  assert.ok(!isUrl('18012345678'));
  assert.ok(!isUrl('javascript:alert(1)'));
  assert.ok(!isUrl(null));
});

test('an import never walks a posted row back', () => {
  const incoming = { id: 'a', status: 'planned', ref: null, title: 'New title' };
  const kept = mergeImported(incoming, { status: 'posted', ref: 'https://fb.com/p/1' });
  assert.equal(kept.status, 'posted');
  assert.equal(kept.ref, 'https://fb.com/p/1');
  assert.equal(kept.title, 'New title');
  assert.deepEqual(mergeImported(incoming, { status: 'planned', ref: null }), incoming);
  assert.deepEqual(mergeImported(incoming, undefined), incoming);
  const posted = { id: 'a', status: 'posted', ref: 'https://new' };
  assert.deepEqual(mergeImported(posted, { status: 'posted', ref: 'https://old' }), posted);
});

test('rows gone from the file are pruned, an empty file prunes nothing', () => {
  assert.deepEqual(idsToPrune(['a', 'b', 'c'], ['a', 'c', 'd']), ['b']);
  assert.deepEqual(idsToPrune(['a', 'b'], ['a', 'b']), []);
  assert.deepEqual(idsToPrune(['a', 'b'], []), []);
});
