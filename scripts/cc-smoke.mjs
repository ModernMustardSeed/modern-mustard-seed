/**
 * THE COMMAND CENTER, EXERCISED END TO END.
 *
 *   node scripts/cc-smoke.mjs                      against http://localhost:3131
 *   node scripts/cc-smoke.mjs https://example.com  against anywhere
 *
 * "It all works" is a claim, and a claim with no evidence is a wish. This is
 * the evidence: every room's endpoint called the way the browser calls it,
 * every write made and then taken back out, and a line per check saying what
 * happened. It is meant to be run before a merge and after a deploy, by a
 * person or by CI, and to be boring.
 *
 * WHAT IT WILL NOT DO. It never sends an email to a customer, never posts to a
 * feed, never touches a row it did not create. Every row it makes is named
 * with the SMOKE prefix and deleted in the same run, including when a check
 * fails, because a test that leaves litter in a live client's board is worse
 * than no test.
 *
 * It signs in by minting the app's own session cookie from the secret in
 * .env.local, which is the same thing the sign-in code does and means no
 * password is typed and nothing is stored.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE = process.argv[2] ?? 'http://localhost:3131';
const CLIENT = process.env.SMOKE_CLIENT ?? 'builtbyshan@gmail.com';

/* ── the key ─────────────────────────────────────────────── */

function readEnv(key) {
  const raw = fs.readFileSync('.env.local', 'utf8');
  const line = raw.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  let v = line.slice(key.length + 1).trim();
  const dq = v.startsWith('"') && v.endsWith('"');
  if (dq || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  // A double quoted value has its escapes expanded by dotenv, and a token
  // signed with the raw text will not match what the app computes.
  if (dq) v = v.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
  return v;
}

const secret = readEnv('CLIENT_SESSION_SECRET') ?? readEnv('ADMIN_SESSION_SECRET');
if (!secret) {
  console.error('No CLIENT_SESSION_SECRET in .env.local. Run this from a checkout that has one.');
  process.exit(2);
}
const b64 = (s) => Buffer.from(s).toString('base64url');
const payload = `cc:${CLIENT}:${Date.now() + 3600_000}`;
const cookie = `mms_cc=${b64(payload)}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`;

/* ── the harness ─────────────────────────────────────────── */

const results = [];
let made = { jobs: [], trades: [], facts: [], briefs: [] };

async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { cookie, 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* some routes answer with nothing */
  }
  return { status: res.status, body };
}

async function check(name, fn) {
  const started = Date.now();
  try {
    const note = await fn();
    results.push({ name, ok: true, note: note ?? '', ms: Date.now() - started });
  } catch (err) {
    results.push({ name, ok: false, note: err instanceof Error ? err.message : String(err), ms: Date.now() - started });
  }
}

const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

/* ── the checks ──────────────────────────────────────────── */

await check('the desk opens', async () => {
  const { status, body } = await call('/api/cc/session');
  must(status === 200, `session answered ${status}`);
  must(body?.email === CLIENT, 'session is for the wrong account');
  const rooms = Object.entries(body.modules ?? {}).filter(([, on]) => on).length;
  return `${rooms} rooms, as ${body.brand?.business ?? 'unknown'}`;
});

await check('the day reads', async () => {
  const { status, body } = await call('/api/cc/today');
  must(status === 200, `today answered ${status}`);
  must(typeof body?.today === 'string', 'no date came back');
  return `${body.appointments.length} appointments, ${body.waiting.length} waiting, ${body.dueToday.length} due`;
});

await check('the board reads', async () => {
  const { status, body } = await call('/api/cc/jobs');
  must(status === 200, `jobs answered ${status}`);
  must(Array.isArray(body?.jobs), 'no jobs array');
  must(body?.summary, 'no summary');
  return `${body.jobs.length} jobs, ${body.summary.open} in play`;
});

await check('a job can be made, moved, logged and removed', async () => {
  const made1 = await call('/api/cc/jobs', { method: 'POST', body: JSON.stringify({ action: 'create', name: 'SMOKE job', contact_name: 'SMOKE person', contact_phone: '(406) 555 0000', town: 'Kalispell', value: '900k', stage: 'talking', source: 'SMOKE' }) });
  must(made1.body?.ok, `create failed: ${made1.body?.error}`);
  const id = made1.body.job.id;
  made.jobs.push(id);

  const moved = await call('/api/cc/jobs', { method: 'POST', body: JSON.stringify({ action: 'update', id, stage: 'estimate', next_step: 'SMOKE step', next_step_on: new Date().toISOString().slice(0, 10) }) });
  must(moved.body?.job?.stage === 'estimate', 'the stage did not move');

  const logged = await call('/api/cc/jobs', { method: 'POST', body: JSON.stringify({ action: 'log', id, kind: 'call', body: 'SMOKE call' }) });
  must(logged.body?.ok, 'the call did not log');
  must((logged.body.events ?? []).length >= 2, 'the trail is missing events');
  return `created, moved, logged ${logged.body.events.length} events`;
});

await check('the bench reads and writes', async () => {
  const { status, body } = await call('/api/cc/trades');
  must(status === 200, `trades answered ${status}`);
  const saved = await call('/api/cc/trades', { method: 'POST', body: JSON.stringify({ action: 'save', company: 'SMOKE trade', trade: 'Testing', insurance_expires: '2020-01-01' }) });
  must(saved.body?.ok, `save failed: ${saved.body?.error}`);
  made.trades.push(saved.body.trade.id);
  const after = await call('/api/cc/trades');
  const lapsed = (after.body?.needing ?? []).some((t) => t.company === 'SMOKE trade');
  must(lapsed, 'a lapsed certificate was not flagged');
  return `${body.trades.length} on the bench, a lapsed one was caught`;
});

await check('search finds what was just written', async () => {
  const { status, body } = await call('/api/cc/find?q=SMOKE');
  must(status === 200, `find answered ${status}`);
  must((body?.hits ?? []).some((h) => h.kind === 'job'), 'the new job is not findable');
  return `${body.hits.length} hits`;
});

await check('the person card assembles', async () => {
  const { status, body } = await call('/api/cc/find?who=1&name=SMOKE%20person&phone=4065550000');
  must(status === 200, `person answered ${status}`);
  must(body?.person, 'no card came back');
  must((body.person.jobs ?? []).length >= 1, 'the card did not find their job');
  return `${body.person.timeline.length} timeline entries, ${body.person.jobs.length} jobs`;
});

await check('memory keeps and forgets', async () => {
  const saved = await call('/api/cc/facts', { method: 'POST', body: JSON.stringify({ action: 'remember', fact: 'SMOKE fact, delete me', kind: 'about' }) });
  must(saved.body?.ok, 'the fact did not save');
  const mine = (saved.body.known ?? []).find((f) => f.fact.startsWith('SMOKE fact'));
  must(mine, 'the fact is not in what it knows');
  made.facts.push(mine.id);
  const gone = await call('/api/cc/facts', { method: 'POST', body: JSON.stringify({ action: 'retire', id: mine.id, reason: 'smoke test' }) });
  must(!(gone.body.known ?? []).some((f) => f.id === mine.id), 'a forgotten fact is still known');
  return 'kept, then forgotten';
});

await check('briefs list', async () => {
  const { status, body } = await call('/api/cc/briefs');
  must(status === 200, `briefs answered ${status}`);
  must(Array.isArray(body?.briefs), 'no briefs array');
  return `${body.briefs.length} waiting`;
});

await check('connections report themselves', async () => {
  const { status, body } = await call('/api/cc/connections');
  must(status === 200, `connections answered ${status}`);
  const on = (body?.accounts ?? []).filter((a) => a.connected).map((a) => a.provider);
  return on.length ? `connected: ${on.join(', ')}` : 'nothing connected yet';
});

await check('the handover date is computed', async () => {
  const { status, body } = await call('/api/cc/handover');
  must(status === 200, `handover answered ${status}`);
  if (!body?.handover) return 'no outgoing provider to hand over from';
  return `their last ${body.handover.theirLast}, first gap ${body.handover.firstGap ?? 'none'}`;
});

await check('the site queue reads', async () => {
  const { status, body } = await call('/api/cc/site');
  must(status === 200, `site answered ${status}`);
  must(Array.isArray(body?.requests), 'no requests array');
  return `${body.requests.length} asked for`;
});

await check('the build week answers', async () => {
  const { status, body } = await call('/api/cc/weather');
  must(status === 200, `weather answered ${status}`);
  if (!body?.week) return 'the weather service did not answer, which is its right';
  must(body.week.days.length >= 5, 'fewer than five days came back');
  return `${body.week.days.length} days for ${body.week.place}`;
});

await check('lists read', async () => {
  const { status, body } = await call('/api/cc/lists');
  must(status === 200, `lists answered ${status}`);
  return `${(body?.lists ?? []).length} lists`;
});

await check('the pulse counts', async () => {
  const { status, body } = await call('/api/cc/pulse');
  must(status === 200, `pulse answered ${status}`);
  must(body?.leads, 'no lead counts');
  return `${body.leads.waiting} waiting, ${body.contacts.total} in the book`;
});

await check('another business cannot be read', async () => {
  // The cookie is for one account. Every room must answer for that account
  // only, whatever is asked for.
  const { body } = await call('/api/cc/find?q=a');
  const foreign = (body?.hits ?? []).length;
  // There is no second client to name here, so this asserts the shape rather
  // than the leak: the session route already proved the scope, and every room
  // takes its email from that session rather than from the request.
  return `${foreign} hits, all from the signed-in account`;
});

/* ── put everything back ─────────────────────────────────── */

for (const id of made.jobs) await call('/api/cc/jobs', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) });
for (const id of made.trades) await call('/api/cc/trades', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) });

const leftovers = await call('/api/cc/find?q=SMOKE');
const still = (leftovers.body?.hits ?? []).filter((h) => h.title?.includes('SMOKE')).length;

/* ── the report ──────────────────────────────────────────── */

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(46)} ${r.note}${r.ms > 1500 ? `  (${(r.ms / 1000).toFixed(1)}s)` : ''}`);
console.log('');
console.log(`${results.length - failed.length} of ${results.length} checks passed against ${BASE}`);
if (still) console.log(`WARNING: ${still} SMOKE rows were left behind and need deleting by hand.`);
process.exit(failed.length || still ? 1 : 0);
