/**
 * THE HOST OUTREACH ENGINE'S TESTS.
 *
 *   pnpm exec tsx --test scripts/bootcamp-outreach-test.mts
 *
 * The engine runs against an in-memory OutreachDb and a fake sender, so this
 * touches no database and no network and finishes in a second. The rules being
 * pinned are the ones that cost Sarah's address its reputation if they slip:
 * nothing sends while the switch is off, the day's allowance is shared across
 * the cron and the desk, a person who wrote back is never written to again,
 * and the letters stay inside their word caps with none of the phrases the
 * house voice bans.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  armOutreach,
  HARD_CEILING,
  markOutreach,
  mountainDayStart,
  nextAtAfter,
  normalizeState,
  outreachSummary,
  runBootcampOutreach,
  sendOutreachNow,
  type OutreachDb,
  type OutreachEvent,
  type OutreachRow,
  type OutreachState,
  type Sender,
} from '../lib/bootcamp/outreach';
import { countWords, handMessage, observationFrom, outreachEmail, WORD_CAP, type OutreachTarget } from '../lib/bootcamp/outreach-copy';

const DAY = 86_400_000;
/** A Tuesday at 8:38 AM Mountain, the cron's slot, in February standard time. */
const T0 = new Date('2026-10-13T15:38:00.000Z');

/* -------------------------------------------------------------------------- */
/* The in-memory database                                                      */
/* -------------------------------------------------------------------------- */

type Fake = OutreachDb & {
  rows: OutreachRow[];
  events: (OutreachEvent & { created_at: string })[];
  state: Partial<OutreachState> | null;
  inbound: Set<string>;
  blocked: Set<string>;
  clock: Date;
  suppressionBroken: boolean;
};

function fakeDb(rows: OutreachRow[], state: Partial<OutreachState> | null): Fake {
  const db: Fake = {
    rows,
    events: [],
    state,
    inbound: new Set(),
    blocked: new Set(),
    clock: T0,
    suppressionBroken: false,
    async getState() {
      return db.state;
    },
    async setState(s) {
      db.state = s;
    },
    async countSentSince(since) {
      return db.events.filter((e) => e.kind.startsWith('outreach:') && e.created_at >= since).length;
    },
    async listDue(nowIso, limit) {
      const tierRank = (t: string) => ({ A: 0, B: 1, C: 2 }[t] ?? 9);
      return db.rows
        .filter((r) => r.contact_type === 'email' && (r.status === 'queued' || r.status === 'sent') && r.step < 3 && (!r.next_at || r.next_at <= nowIso))
        .sort((a, b) => b.fit - a.fit || tierRank(a.tier) - tierRank(b.tier) || a.created_at.localeCompare(b.created_at))
        .slice(0, limit)
        .map((r) => ({ ...r }));
    },
    async listUnhanded() {
      return db.rows.filter((r) => r.contact_type !== 'email' && r.status === 'queued').map((r) => ({ ...r }));
    },
    async getRow(id) {
      const r = db.rows.find((x) => x.id === id);
      return r ? { ...r } : null;
    },
    async update(id, patch) {
      const r = db.rows.find((x) => x.id === id);
      if (!r) throw new Error(`no row ${id}`);
      Object.assign(r, patch, { updated_at: db.clock.toISOString() });
    },
    async hasInbound(email) {
      return db.inbound.has(email.toLowerCase());
    },
    async suppressed(emails) {
      if (db.suppressionBroken) throw new Error('Suppression list unreadable (fixture). Refusing to send.');
      return new Set(emails.filter((e) => db.blocked.has(e.toLowerCase())));
    },
    async recordEvent(ev) {
      db.events.push({ ...ev, created_at: db.clock.toISOString() });
    },
    async listAll() {
      return db.rows.map((r) => ({ status: r.status, vertical: r.vertical, step: r.step }));
    },
  };
  return db;
}

let seq = 0;
function row(over: Partial<OutreachRow> = {}): OutreachRow {
  seq++;
  const name = over.name ?? `Target ${seq}`;
  return {
    id: over.id ?? `id-${seq}`,
    name,
    brand: null,
    email: over.contact_type && over.contact_type !== 'email' ? null : `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    contact_path: null,
    contact_type: 'email',
    platforms: null,
    audience: null,
    audience_source: null,
    sells: null,
    evidence: null,
    hook: 'Your listeners already run a land business on their own; the bootcamp is the next step.',
    vertical: 'ai-business',
    fit: 4,
    tier: 'B',
    source_urls: [],
    status: 'queued',
    step: 0,
    next_at: null,
    last_sent_at: null,
    replied_at: null,
    host_slug: null,
    notes: null,
    created_at: new Date(T0.getTime() - seq * 1000).toISOString(),
    updated_at: T0.toISOString(),
    ...over,
  };
}

function fakeSender() {
  const sent: { to: string; subject: string; text: string; from: string; replyTo: string }[] = [];
  const send: Sender = async (msg) => {
    sent.push(msg);
    return { ok: true, id: `re_${sent.length}` };
  };
  return { sent, send };
}

const ARMED = { armed: true, dailyCap: 12, startedAt: T0.toISOString() };

/* -------------------------------------------------------------------------- */
/* The switch                                                                  */
/* -------------------------------------------------------------------------- */

test('not armed sends nothing and touches nothing', async () => {
  const db = fakeDb([row(), row(), row({ contact_type: 'form' })], { armed: false, dailyCap: 12 });
  const { sent, send } = fakeSender();
  const report = await runBootcampOutreach(null, { db, send, now: T0 });
  assert.equal(report.armed, false);
  assert.equal(report.sent, 0);
  assert.equal(sent.length, 0);
  assert.equal(report.items.length, 0);
  assert.ok(db.rows.every((r) => r.status === 'queued' && r.step === 0), 'nothing moved, not even the hand pass');
});

test('a missing state row reads as not armed with the default cap', () => {
  assert.deepEqual(normalizeState(null), { armed: false, dailyCap: 12, startedAt: null });
  assert.equal(normalizeState({ armed: true, dailyCap: 50 }).dailyCap, HARD_CEILING, 'a cap above the ceiling is clamped');
  assert.equal(normalizeState({ armed: true, dailyCap: 0 }).dailyCap, 12);
});

test('armOutreach stamps startedAt the first time and keeps it after', async () => {
  const db = fakeDb([], null);
  const on = await armOutreach(null, { armed: true, dailyCap: 6 }, { db, now: T0 });
  assert.deepEqual(on, { armed: true, dailyCap: 6, startedAt: T0.toISOString() });
  const off = await armOutreach(null, { armed: false }, { db, now: new Date(T0.getTime() + DAY) });
  assert.equal(off.armed, false);
  assert.equal(off.startedAt, T0.toISOString());
  const capped = await armOutreach(null, { dailyCap: 40 }, { db });
  assert.equal(capped.dailyCap, HARD_CEILING);
});

/* -------------------------------------------------------------------------- */
/* The allowance                                                               */
/* -------------------------------------------------------------------------- */

test('dailyCap is honored, counting sends already logged today by the desk', async () => {
  const db = fakeDb(Array.from({ length: 8 }, () => row()), { ...ARMED, dailyCap: 5 });
  // Three went out from the desk an hour ago, same Mountain day.
  for (let i = 0; i < 3; i++) db.events.push({ kind: 'outreach:1', outreach_id: `desk-${i}`, created_at: new Date(T0.getTime() - 3_600_000).toISOString() });
  // One yesterday evening Mountain (before midnight Denver), which must not count.
  db.events.push({ kind: 'outreach:1', outreach_id: 'yesterday', created_at: new Date(mountainDayStart(T0).getTime() - 60_000).toISOString() });
  const { sent, send } = fakeSender();
  const report = await runBootcampOutreach(null, { db, send, now: T0 });
  assert.equal(report.todaySent, 3);
  assert.equal(report.room, 2);
  assert.equal(report.sent, 2);
  assert.equal(sent.length, 2);
  assert.equal(db.rows.filter((r) => r.status === 'sent').length, 2);
});

test('never more than the hard ceiling in one run, whatever the cap or the list says', async () => {
  const db = fakeDb(Array.from({ length: 30 }, () => row()), { ...ARMED, dailyCap: 100 });
  const { sent, send } = fakeSender();
  const report = await runBootcampOutreach(null, { db, send, now: T0 });
  assert.equal(report.sent, HARD_CEILING);
  assert.equal(sent.length, 12);
  // A second run the same day finds the allowance spent.
  const again = await runBootcampOutreach(null, { db, send, now: new Date(T0.getTime() + 3_600_000) });
  assert.equal(again.todaySent, 12);
  assert.equal(again.room, 0);
  assert.equal(again.sent, 0);
});

test('limit lowers the room for a cautious morning and never raises it', async () => {
  const db = fakeDb(Array.from({ length: 10 }, () => row()), ARMED);
  const { send } = fakeSender();
  assert.equal((await runBootcampOutreach(null, { db, send, now: T0, limit: 3 })).sent, 3);
  const db2 = fakeDb(Array.from({ length: 20 }, () => row()), ARMED);
  assert.equal((await runBootcampOutreach(null, { db: db2, send, now: T0, limit: 50 })).sent, HARD_CEILING);
});

test('the best fit goes first: fit desc, then tier, then oldest', async () => {
  const db = fakeDb(
    [
      row({ name: 'B Three', fit: 3, tier: 'A' }),
      row({ name: 'A Five B', fit: 5, tier: 'B' }),
      row({ name: 'A Five A', fit: 5, tier: 'A' }),
    ],
    ARMED,
  );
  const { sent, send } = fakeSender();
  await runBootcampOutreach(null, { db, send, now: T0, limit: 2 });
  assert.deepEqual(sent.map((s) => s.to), ['a.five.a@example.com', 'a.five.b@example.com']);
});

/* -------------------------------------------------------------------------- */
/* Hand rows                                                                   */
/* -------------------------------------------------------------------------- */

test('form, booking and DM rows become hand on the first pass with no send', async () => {
  const db = fakeDb(
    [row({ contact_type: 'form', contact_path: 'https://example.com/contact' }), row({ contact_type: 'dm' }), row({ contact_type: 'booking' }), row()],
    ARMED,
  );
  const { sent, send } = fakeSender();
  const report = await runBootcampOutreach(null, { db, send, now: T0 });
  assert.equal(report.handed, 3);
  assert.equal(db.rows.filter((r) => r.status === 'hand').length, 3);
  assert.equal(sent.length, 1, 'only the email row was written to');
  // Send now refuses a hand row and points at the paste path.
  const hand = db.rows.find((r) => r.contact_type === 'form')!;
  const res = await sendOutreachNow(null, hand.id, { db, send, now: T0 });
  assert.equal(res.ok, false);
  assert.match(res.ok ? '' : res.error, /example\.com\/contact/);
});

test('a dry run reports and changes nothing', async () => {
  const db = fakeDb([row(), row({ contact_type: 'form' })], ARMED);
  const { sent, send } = fakeSender();
  const report = await runBootcampOutreach(null, { db, send, now: T0, dryRun: true });
  assert.equal(report.dryRun, true);
  assert.equal(report.sent, 1, 'the would-send still counts in the report');
  assert.equal(sent.length, 0);
  assert.equal(report.items.find((i) => i.action === 'would-send')?.subject, outreachEmail(1, db.rows[0]).subject);
  assert.ok(db.rows.every((r) => r.status === 'queued' && r.step === 0));
  assert.equal(db.events.length, 0);
});

/* -------------------------------------------------------------------------- */
/* Steps                                                                       */
/* -------------------------------------------------------------------------- */

test('step and next_at progression: +4 days, +9 days, then done', async () => {
  const db = fakeDb([row({ name: 'Anna Lozano' })], ARMED);
  const { sent, send } = fakeSender();
  const r = db.rows[0];

  const run1 = await runBootcampOutreach(null, { db, send, now: T0 });
  assert.equal(run1.sent, 1);
  assert.equal(r.step, 1);
  assert.equal(r.status, 'sent');
  assert.equal(r.last_sent_at, T0.toISOString());
  assert.equal(r.next_at, new Date(T0.getTime() + 4 * DAY).toISOString());
  assert.equal(db.events.filter((e) => e.kind === 'outreach:1').length, 1);

  // Too early: three days on, nothing is due.
  const early = new Date(T0.getTime() + 3 * DAY);
  db.clock = early;
  assert.equal((await runBootcampOutreach(null, { db, send, now: early })).sent, 0);

  const t2 = new Date(T0.getTime() + 4 * DAY);
  db.clock = t2;
  assert.equal((await runBootcampOutreach(null, { db, send, now: t2 })).sent, 1);
  assert.equal(r.step, 2);
  assert.equal(r.status, 'sent');
  assert.equal(r.next_at, new Date(t2.getTime() + 9 * DAY).toISOString());

  const t3 = new Date(t2.getTime() + 9 * DAY);
  db.clock = t3;
  assert.equal((await runBootcampOutreach(null, { db, send, now: t3 })).sent, 1);
  assert.equal(r.step, 3);
  assert.equal(r.status, 'done');
  assert.equal(r.next_at, null);

  const t4 = new Date(t3.getTime() + 30 * DAY);
  db.clock = t4;
  assert.equal((await runBootcampOutreach(null, { db, send, now: t4 })).sent, 0, 'three letters, never a fourth');
  assert.equal(sent.length, 3);
  assert.deepEqual(
    sent.map((s) => s.subject),
    [outreachEmail(1, r).subject, outreachEmail(2, r).subject, outreachEmail(3, r).subject],
  );
  assert.ok(sent.every((s) => s.from === 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>' && s.replyTo === 'sarah@modernmustardseed.com'));
});

test('nextAtAfter', () => {
  assert.equal(nextAtAfter(1, T0), new Date(T0.getTime() + 4 * DAY).toISOString());
  assert.equal(nextAtAfter(2, T0), new Date(T0.getTime() + 9 * DAY).toISOString());
  assert.equal(nextAtAfter(3, T0), null);
});

test('a failed send appends a note and leaves the step alone', async () => {
  const db = fakeDb([row()], ARMED);
  const send: Sender = async () => ({ ok: false, error: 'Resend returned no id.' });
  const report = await runBootcampOutreach(null, { db, send, now: T0 });
  assert.equal(report.failed, 1);
  assert.equal(report.sent, 0);
  assert.equal(db.rows[0].step, 0);
  assert.equal(db.rows[0].status, 'queued');
  assert.match(db.rows[0].notes || '', /step 1 failed: Resend returned no id\./);
  assert.equal(db.events.length, 0, 'a failure spends none of the allowance');
});

/* -------------------------------------------------------------------------- */
/* Replies and suppressions                                                    */
/* -------------------------------------------------------------------------- */

test('a replied address is marked replied, skipped, and spends no allowance', async () => {
  const db = fakeDb([row({ name: 'Wrote Back', step: 1, status: 'sent', next_at: T0.toISOString() }), row({ name: 'Quiet' })], ARMED);
  db.inbound.add('wrote.back@example.com');
  const { sent, send } = fakeSender();
  const report = await runBootcampOutreach(null, { db, send, now: T0 });
  const replied = db.rows[0];
  assert.equal(replied.status, 'replied');
  assert.equal(replied.replied_at, T0.toISOString());
  assert.equal(replied.next_at, null);
  assert.equal(replied.step, 1, 'the step does not move');
  assert.equal(report.replied, 1);
  assert.equal(report.sent, 1);
  assert.deepEqual(sent.map((s) => s.to), ['quiet@example.com']);
  assert.equal(await db.countSentSince(mountainDayStart(T0).toISOString()), 1, 'the reply event is not a send');
  // Send now on a replied row is refused too.
  const res = await sendOutreachNow(null, replied.id, { db, send, now: T0 });
  assert.equal(res.ok, false);
});

test('a suppressed address is marked bounced and never retried', async () => {
  const db = fakeDb([row({ name: 'Bounced Once' }), row()], ARMED);
  db.blocked.add('bounced.once@example.com');
  const { sent, send } = fakeSender();
  const report = await runBootcampOutreach(null, { db, send, now: T0 });
  assert.equal(report.bounced, 1);
  assert.equal(db.rows[0].status, 'bounced');
  assert.match(db.rows[0].notes || '', /suppressed/);
  assert.equal(sent.length, 1);
  assert.equal((await runBootcampOutreach(null, { db, send, now: new Date(T0.getTime() + DAY) })).items.filter((i) => i.id === db.rows[0].id).length, 0);
});

test('an unreadable suppression list fails closed: nothing sends, nothing is marked', async () => {
  const db = fakeDb([row()], ARMED);
  db.suppressionBroken = true;
  const { sent, send } = fakeSender();
  const report = await runBootcampOutreach(null, { db, send, now: T0 });
  assert.equal(sent.length, 0);
  assert.equal(report.failed, 1);
  assert.equal(db.rows[0].status, 'queued');
});

/* -------------------------------------------------------------------------- */
/* The desk                                                                    */
/* -------------------------------------------------------------------------- */

test('Send now ignores the switch but honors the cap and the checks', async () => {
  const db = fakeDb([row({ name: 'Hand Picked' }), row({ name: 'Second' })], { armed: false, dailyCap: 1 });
  const { sent, send } = fakeSender();
  const first = await sendOutreachNow(null, db.rows[0].id, { db, send, now: T0 });
  assert.equal(first.ok, true);
  assert.equal(sent.length, 1);
  assert.equal(db.rows[0].step, 1);
  const second = await sendOutreachNow(null, db.rows[1].id, { db, send, now: T0 });
  assert.equal(second.ok, false);
  assert.match(second.ok ? '' : second.error, /have gone/);
  assert.equal(sent.length, 1);
});

test('markOutreach flips status and stamps replied_at; requeue makes the row due now', async () => {
  const db = fakeDb([row({ step: 1, status: 'sent', next_at: new Date(T0.getTime() + 2 * DAY).toISOString() })], ARMED);
  const r = db.rows[0];
  await markOutreach(null, r.id, 'hosting', { db, now: T0, hostSlug: 'anna-lozano' });
  assert.equal(r.status, 'hosting');
  assert.equal(r.replied_at, T0.toISOString());
  assert.equal(r.host_slug, 'anna-lozano');
  assert.equal(r.next_at, null);
  await markOutreach(null, r.id, 'queued', { db, now: T0 });
  assert.equal(r.status, 'queued');
  assert.equal(r.next_at, T0.toISOString());
  assert.equal(r.step, 1, 'requeue keeps the step so letter two goes next');
  await assert.rejects(() => markOutreach(null, r.id, 'contacted' as never, { db }), /Unknown status/);
});

test('outreachSummary counts by status and vertical and reports the switch', async () => {
  const db = fakeDb(
    [row({ vertical: 'builders', status: 'replied' }), row({ vertical: 'builders' }), row({ vertical: 'ai-business', status: 'hosting' }), row({ contact_type: 'dm', status: 'hand' })],
    { ...ARMED, dailyCap: 8 },
  );
  db.events.push({ kind: 'outreach:1', outreach_id: 'x', created_at: T0.toISOString() });
  const s = await outreachSummary(null, { db, now: T0 });
  assert.equal(s.total, 4);
  assert.equal(s.byStatus.replied, 1);
  assert.equal(s.byStatus.hosting, 1);
  assert.equal(s.byStatus.queued, 1);
  assert.equal(s.byStatus.hand, 1);
  assert.deepEqual(s.byVertical, { builders: 2, 'ai-business': 2 });
  assert.deepEqual(s.repliedByVertical, { builders: 1, 'ai-business': 1 });
  assert.equal(s.todaySent, 1);
  assert.deepEqual(s.state, { armed: true, dailyCap: 8, startedAt: T0.toISOString() });
});

/* -------------------------------------------------------------------------- */
/* The letters                                                                 */
/* -------------------------------------------------------------------------- */

const BANNED = [/—/, /!/, /hope this finds you/i, /command center/i, /hourly|per hour|an hour\b/i];

function checkLetter(text: string, cap: number, label: string) {
  assert.ok(countWords(text) < cap, `${label} runs ${countWords(text)} words, cap ${cap}`);
  for (const re of BANNED) assert.ok(!re.test(text), `${label} contains ${re}`);
}

test('letters fit their caps, carry the terms, and sign as Sarah', () => {
  const t: OutreachTarget = { name: 'Anna Lozano', brand: 'The Prosperity Playground', hook: 'You already sent your founders to Callan through your Rootabl link; the bootcamp is the same buyer.' };
  const one = outreachEmail(1, t);
  checkLetter(one.text, WORD_CAP[1], 'step 1');
  assert.ok(one.text.startsWith('Hi Anna,\n\nYou already sent your founders to Callan through your Rootabl link.'), 'opens with the observation, pitch clause dropped');
  for (const must of ['February 2 to 9', '100% of every ticket', '$97 to $497', '20% of every Operator Program seat', '$999 a seat', 'Bring 100', 'January 26', 'Reply yes and it is yours the same day.', '\nSarah\n', 'Sarah Scarano, Modern Mustard Seed, Kalispell, Montana', 'https://modernmustardseed.com']) {
    assert.ok(one.text.includes(must), `step 1 is missing "${must}"`);
  }
  const two = outreachEmail(2, t);
  checkLetter(two.text, WORD_CAP[2], 'step 2');
  assert.match(two.text, /first 25 hosts are founding hosts/);
  assert.match(two.text, /all four 2027 launches/);
  assert.match(two.text, /: (20 laws|46 skills|10 hooks|321 memory|40\+ products)/, 'one proof number');
  const three = outreachEmail(3, t);
  checkLetter(three.text, WORD_CAP[3], 'step 3');
  assert.match(three.text, /https:\/\/modernmustardseed\.com\/bootcamp\/masterclass/);
  const hand = handMessage(t);
  assert.ok(countWords(hand) <= WORD_CAP.hand, `hand message runs ${countWords(hand)} words`);
  assert.ok(!hand.startsWith('Hi '), 'no greeting line on the paste version');
  assert.ok(!hand.includes('\n'));
});

test('the observation goes second person and survives a long hook', () => {
  assert.equal(observationFrom({ name: 'x', hook: 'His builders already trust him to show them a better way; the bootcamp is the same lesson.' }), 'Your builders already trust him to show them a better way.');
  assert.equal(observationFrom({ name: 'x', hook: '' }), 'Your audience already runs a business on their own.');
  const long = observationFrom({ name: 'x', hook: Array.from({ length: 60 }, (_, i) => (i === 20 ? 'word,' : 'word')).join(' ') });
  assert.ok(countWords(long) <= 34);
  assert.ok(long.endsWith('.'));
});

test('every row in the seed file renders inside the caps with no banned phrase', () => {
  const seed = JSON.parse(readFileSync(resolve('data/bootcamp-outreach.json'), 'utf8')) as OutreachTarget[];
  assert.ok(Array.isArray(seed));
  // Ends on a digit so a trailing comma or period after the figure is not part of it.
  const dollars = /\$[\d,.]*\d[KkMm]?/g;
  for (const t of seed) {
    const one = outreachEmail(1, t);
    checkLetter(one.text, WORD_CAP[1], `step 1 for ${t.name}`);
    // The only dollar figures a letter carries are the published host terms,
    // plus whatever their own hook already said about their own content.
    const allowed = new Set(['$97', '$497', '$999', ...((t.hook || '').match(dollars) ?? [])]);
    for (const d of one.text.match(dollars) ?? []) assert.ok(allowed.has(d), `${t.name}: step 1 carries ${d}`);
    // Their audience size never goes back to them in the letter.
    assert.ok(!/\b\d+[KkMm]\b|\b\d{1,3}(,\d{3})+\b/.test(one.text.replace(dollars, '')), `${t.name}: an audience number in the letter`);
    checkLetter(outreachEmail(2, t).text, WORD_CAP[2], `step 2 for ${t.name}`);
    checkLetter(outreachEmail(3, t).text, WORD_CAP[3], `step 3 for ${t.name}`);
    const hand = handMessage(t);
    assert.ok(countWords(hand) <= WORD_CAP.hand, `hand message for ${t.name} runs ${countWords(hand)} words`);
    for (const re of BANNED) assert.ok(!re.test(hand), `hand message for ${t.name} contains ${re}`);
  }
});
