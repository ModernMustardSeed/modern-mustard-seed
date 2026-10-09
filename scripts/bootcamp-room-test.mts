/**
 * The room's rules, pinned.
 *
 * Who holds a seat in which session, when a session is live, how long a
 * replay stays open for each seat, which stage links play in the page and
 * which open a new tab, where a question queues between sessions, what the
 * worksheet brief says, and that every letter the drip can send renders with
 * the person's own room link and their own calendar file, in house style.
 *
 * Run:  pnpm exec tsx --test scripts/bootcamp-room-test.mts
 */
process.env.ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'test-secret-for-the-room-suite-0123456789';

import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOTCAMP } from '../data/bootcamp';
import {
  DOORS_OPEN_MS,
  OVERRUN_MS,
  bootcampSessions,
  canAttend,
  canWatchReplay,
  getSession,
  getsTranscripts,
  isLive,
  liveSession,
  playerFor,
  questionSession,
  replayCloses,
  sessionEnd,
} from '../lib/bootcamp/sessions';
import { buildBrief, worksheetProgress, worksheetQuestions } from '../data/bootcamp-worksheet';
import { STEP_TEMPLATES, masterclassConfirm, operatorWelcome, roomLinkLetter, ticketWelcome, type StepName } from '../lib/bootcamp/emails';
import { regKeyValid, roomLink } from '../lib/bootcamp/key';
import { inviteSpec, inviteUrl, isInviteWhich } from '../lib/bootcamp/ics';

const H = 60 * 60 * 1000;
const DAY = 24 * H;
const at = (iso: string) => new Date(iso).getTime();
const REG = '3f2b8a51-7c1d-4e2a-9b6f-0d4c8e1a2b3c';

test('the registry: every launch moment and sixteen cohort sessions, in order, never overlapping', () => {
  const all = bootcampSessions();
  assert.equal(all.length, 5 + 16);
  for (let i = 1; i < all.length; i += 1) {
    assert.ok(at(all[i].startsAt) > sessionEnd(all[i - 1]) + OVERRUN_MS, `${all[i - 1].key} ends before ${all[i].key} opens`);
  }
  assert.equal(getSession('op1')?.startsAt, BOOTCAMP.dates.operatorStart);
  assert.equal(at(getSession('lab1')!.startsAt), at(BOOTCAMP.dates.operatorStart) + 2 * DAY);
  assert.equal(at(getSession('op8')!.startsAt), at(BOOTCAMP.dates.operatorStart) + 7 * 7 * DAY);
});

test('seats: a free seat sees the masterclass only, a ticket adds the bootcamp, the cohort adds its weeks', () => {
  const mc = getSession('masterclass')!;
  const d1 = getSession('day1')!;
  const op3 = getSession('op3')!;
  assert.ok(canAttend('masterclass', mc));
  assert.ok(!canAttend('masterclass', d1));
  for (const t of ['ga', 'vip', 'platinum']) {
    assert.ok(canAttend(t, d1));
    assert.ok(!canAttend(t, op3));
  }
  assert.ok(canAttend('operator', d1), 'an Operator seat includes the bootcamp');
  assert.ok(canAttend('operator', op3));
});

test('live: doors open fifteen minutes early and the room stays live thirty past the end', () => {
  const d1 = getSession('day1')!;
  const start = at(d1.startsAt);
  assert.ok(!isLive(d1, start - DOORS_OPEN_MS - 1));
  assert.ok(isLive(d1, start - DOORS_OPEN_MS));
  assert.ok(isLive(d1, sessionEnd(d1) + OVERRUN_MS - 1));
  assert.ok(!isLive(d1, sessionEnd(d1) + OVERRUN_MS));
  assert.equal(liveSession(start)?.key, 'day1');
  assert.equal(liveSession(start - 12 * H), null);
});

test('replays: each seat gets its own window, and never a session it had no seat in', () => {
  const d2 = getSession('day2')!;
  const mc = getSession('masterclass')!;
  const after = sessionEnd(d2) + H;
  const ga = { tier: 'ga', replay_until: null };
  const vip = { tier: 'vip', replay_until: null };
  const free = { tier: 'masterclass', replay_until: null };
  assert.ok(!canWatchReplay(ga, d2, sessionEnd(d2) - 1), 'no replay before the session ends');
  assert.ok(canWatchReplay(ga, d2, after));
  assert.equal(replayCloses(ga), at(BOOTCAMP.dates.day3) + 30 * DAY);
  assert.equal(replayCloses(vip), at(BOOTCAMP.dates.day3) + 90 * DAY);
  assert.ok(!canWatchReplay(ga, d2, at(BOOTCAMP.dates.day3) + 31 * DAY));
  assert.ok(canWatchReplay(vip, d2, at(BOOTCAMP.dates.day3) + 31 * DAY));
  assert.ok(!canWatchReplay(free, d2, after), 'a free seat never gets a paid replay');
  assert.ok(canWatchReplay(free, mc, sessionEnd(mc) + H));
  assert.ok(!canWatchReplay(free, mc, at(BOOTCAMP.dates.close) + 1), 'the free replay closes with enrollment');
  // A ticket bought later never shuts the masterclass replay before enrollment closes.
  assert.ok(canWatchReplay({ tier: 'ga', replay_until: new Date(at(BOOTCAMP.dates.masterclass) + H).toISOString() }, mc, sessionEnd(mc) + 2 * H));
  // replay_until written by fulfillment wins over the tier default.
  const custom = new Date(at(BOOTCAMP.dates.day3) + 5 * DAY).toISOString();
  assert.equal(replayCloses({ tier: 'platinum', replay_until: custom }), at(custom));
  assert.ok(getsTranscripts('vip') && getsTranscripts('platinum') && getsTranscripts('operator'));
  assert.ok(!getsTranscripts('ga') && !getsTranscripts('masterclass'));
});

test('players: YouTube and Vimeo embed, everything else is a door, and only https', () => {
  const yt = (u: string) => {
    const p = playerFor(u);
    assert.ok(p && p.kind === 'youtube', u);
    return p.src;
  };
  assert.match(yt('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
  assert.match(yt('https://youtu.be/dQw4w9WgXcQ?t=10'), /embed\/dQw4w9WgXcQ/);
  assert.match(yt('https://youtube.com/live/abcDEF12345'), /embed\/abcDEF12345/);
  assert.match(yt('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), /embed\/dQw4w9WgXcQ/);
  const vimeo = playerFor('https://vimeo.com/123456789/abcdef1234');
  assert.ok(vimeo && vimeo.kind === 'vimeo');
  assert.match(vimeo.src, /player\.vimeo\.com\/video\/123456789\?.*h=abcdef1234/);
  const ev = playerFor('https://vimeo.com/event/4567890');
  assert.ok(ev && ev.kind === 'vimeo' && ev.src.startsWith('https://vimeo.com/event/4567890/embed'));
  const zoom = playerFor('https://us06web.zoom.us/j/81234567890?pwd=abc');
  assert.deepEqual(zoom, { kind: 'link', href: 'https://us06web.zoom.us/j/81234567890?pwd=abc' });
  assert.equal(playerFor('http://youtube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(playerFor('javascript:alert(1)'), null);
  assert.equal(playerFor(''), null);
  assert.match(playerFor('https://youtu.be/dQw4w9WgXcQ', { autoplay: true })!.kind === 'youtube' ? (playerFor('https://youtu.be/dQw4w9WgXcQ', { autoplay: true }) as { src: string }).src : '', /autoplay=1/);
});

test('questions queue for the session the person is headed to', () => {
  const d1 = at(BOOTCAMP.dates.day1);
  assert.equal(questionSession('ga', d1)?.key, 'day1', 'live: that session');
  assert.equal(questionSession('ga', d1 - 3 * DAY)?.key, 'kickoff', 'between: the next seat');
  assert.equal(questionSession('masterclass', d1)?.key, 'masterclass', 'after the last: the last');
  assert.equal(questionSession('operator', at(BOOTCAMP.dates.day3) + DAY)?.key, 'op1');
});

test('the worksheet brief reads as an instruction and skips what is blank', () => {
  assert.equal(worksheetProgress({}), 0);
  const answers = { business: 'We build custom homes.', job: 'Follow up on plan requests.', never: 'Never quote a price.' };
  assert.equal(worksheetProgress(answers), 3);
  const brief = buildBrief(answers, { name: 'Pat', business: 'Pat Builds' });
  assert.match(brief, /^BRIEF: Pat Builds, from Pat/);
  assert.match(brief, /Your job: Follow up on plan requests\./);
  assert.match(brief, /You must never: Never quote a price\.\nIf a task would cross one of these lines, stop and ask me instead\./);
  assert.ok(!brief.includes('You work in'), 'a blank answer leaves no empty line');
  assert.equal(worksheetQuestions.length, 7);
});

test('room keys: signed, specific to the registration, and the calendar file carries the room', () => {
  const link = roomLink('https://modernmustardseed.com', REG);
  assert.ok(link);
  const k = new URL(link).searchParams.get('k');
  assert.ok(regKeyValid(REG, k));
  assert.ok(!regKeyValid('00000000-0000-4000-8000-000000000000', k));
  assert.match(inviteUrl('day2', REG), /which=day2&id=3f2b8a51-.*&k=/);
  assert.equal(inviteUrl('day2'), 'https://modernmustardseed.com/api/bootcamp/invite.ics?which=day2');
  assert.ok(inviteSpec('day2', link).description.includes(link));
  for (const key of ['masterclass', 'op5', 'lab8', 'operator']) assert.ok(isInviteWhich(key), key);
  assert.equal(inviteSpec('op5').startIso, getSession('op5')!.startsAt);
});

test('every letter renders with the room link and the house rules', () => {
  const who = { firstName: 'Pat', email: 'pat@example.com', regId: REG };
  const room = roomLink('https://modernmustardseed.com', REG)!;
  const ctx = { ...who, tier: 'vip', unsubscribeUrl: 'https://modernmustardseed.com/api/bootcamp/unsubscribe?id=x&k=y' };
  const letters = [
    ...(Object.keys(STEP_TEMPLATES) as StepName[]).map((s) => ({ name: s, l: STEP_TEMPLATES[s](ctx) })),
    { name: 'masterclassConfirm', l: masterclassConfirm(who) },
    { name: 'ticketWelcome', l: ticketWelcome('vip', who) },
    { name: 'operatorWelcome', l: operatorWelcome(who) },
    { name: 'roomLinkLetter', l: roomLinkLetter(who) },
  ];
  const withoutRoom = new Set<string>(['mc-offer-2', 'mc-offer-3', 'op-2', 'op-3']);
  for (const { name, l } of letters) {
    assert.ok(!/[–—]/.test(l.subject + l.text), `${name}: no em or en dashes`);
    assert.ok(!/private room invite|arrives in this inbox the morning of|live link is in the email/i.test(l.text), `${name}: no stale room promise`);
    if (!withoutRoom.has(name)) assert.ok(l.text.includes(room), `${name}: carries the room link`);
    assert.ok(!/invite\.ics\?which=[a-z0-9]+(?!&id=)(\s|\)|$)/.test(l.text), `${name}: every calendar link is the person's own`);
  }
  // Without a registration behind it (a desk preview), a letter still renders and points at the morning-of email.
  const preview = STEP_TEMPLATES['day1-24h']({ firstName: null, email: 'x@example.com', tier: 'ga', unsubscribeUrl: 'https://x.test/u' });
  assert.match(preview.text, /Your room link lands in this inbox the morning of/);
});

test('the tier deliverables: who holds what, and when the door opens', async () => {
  const { deliverablesFor, deliverableForFile, deliverablesReleased, bootcampDeliverables } = await import('../data/bootcamp');
  const { gate, deliverableHref } = await import('../lib/bootcamp/deliverables');
  const slugs = (tier: string) => deliverablesFor(tier).map((d) => d.slug);
  assert.deepEqual(slugs('masterclass'), []);
  assert.deepEqual(slugs('ga'), []);
  assert.deepEqual(slugs('vip'), ['deck']);
  assert.deepEqual(slugs('platinum'), ['deck', 'kit', 'playbook']);
  assert.deepEqual(slugs('operator'), ['deck', 'kit', 'playbook']);

  const open = new Date(BOOTCAMP.dates.deliverables).getTime();
  assert.ok(open >= sessionEnd(getSession('day3')!), 'opens when Day 3 ends, not before');
  assert.equal(deliverablesReleased(open - 1), false);
  assert.equal(deliverablesReleased(open), true);

  assert.equal(gate('vip', 'directors-deck.pdf', open), 'ok');
  assert.equal(gate('vip', 'directors-deck-files.zip', open), 'ok');
  assert.equal(gate('vip', 'studio-kit.zip', open), 'not-yours');
  assert.equal(gate('ga', 'directors-deck.pdf', open), 'not-yours');
  assert.equal(gate('platinum', 'operators-playbook.pdf', open - 1), 'not-yet');
  assert.equal(gate('operator', 'studio-kit.zip', open), 'ok');
  assert.equal(gate('platinum', '../.env.local', open), 'unknown');
  assert.equal(gate('platinum', 'manifest.json', open), 'unknown');
  assert.equal(deliverableForFile('..%2F.env'), undefined);

  // Every file a deliverable names is actually built.
  const { existsSync } = await import('node:fs');
  for (const d of bootcampDeliverables) for (const f of d.files) assert.ok(existsSync(`private/bootcamp/dist/${f.name}`), `${f.name} is built`);

  assert.equal(deliverableHref('studio-kit.zip', REG, 'abc'), `/api/bootcamp/kit/studio-kit.zip?id=${REG}&k=abc`);
});
