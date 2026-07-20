/**
 * Verification for lib/sidekick-drip.ts. Read-only and send-free.
 *
 * Part 1 exercises the pure functions (token extraction + rendered copy).
 * Part 2 runs the real drip against the real database with dryRun, which
 * queries and counts but never sends, so it proves the query matches real rows.
 *
 * Run: npx tsx scripts/verify-sidekick-drip.mts
 */
import { readFileSync } from 'node:fs';

// Light .env.local loader, matching scripts/backfill-audits.mts (no dotenv dep).
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=("?)(.*)\2\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
  }
} catch {
  /* no .env.local, rely on the environment */
}

const { runIdFromNotes, sidekickDripEmail, sidekickDrip, staleUnstarted } = await import('../lib/sidekick-drip');
const { getSupabase } = await import('../lib/supabase');
const { sidekickTiers, sidekickUsd } = await import('../data/sidekick');

let fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail && !cond ? `  (${detail})` : ''}`);
  if (!cond) fail++;
};

console.log('--- 1. run token extraction ---');
const RUN = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
ok('extracts a valid run id', runIdFromNotes(`run=${RUN} [sidekick] Acme`) === RUN);
ok('returns null with no token', runIdFromNotes('[sidekick] Acme · Plumbing') === null);
ok('returns null on malformed token', runIdFromNotes('run=not-a-uuid') === null);
ok('returns null on empty notes', runIdFromNotes(null) === null);

console.log('\n--- 2. rendered copy, all three touches ---');
const lead = {
  id: 'lead-1',
  email: 'owner@acmeplumbing.test',
  name: 'Dana Reeves',
  business_name: 'Acme Plumbing',
  company: 'Acme Plumbing',
  status: 'new',
  notes: `run=${RUN} [sidekick] Acme Plumbing`,
  created_at: new Date().toISOString(),
};

const monthly = sidekickUsd(sidekickTiers[0].monthlyCents);
const setup = sidekickUsd(sidekickTiers[0].setupCents);

for (const step of [0, 1, 2]) {
  const m = sidekickDripEmail(lead as never, step);
  ok(`step ${step} has a subject`, m.subject.length > 8, m.subject);
  ok(`step ${step} personalizes the business`, m.html.includes('Acme Plumbing'));
  ok(`step ${step} deep-links the real run`, m.html.includes(`/sidekick/demo/${RUN}`));
  ok(`step ${step} has no em dash`, !m.html.includes('—'));
  ok(`step ${step} has no unreplaced placeholder`, !/\[first name\]|\[their/.test(m.html));
}

const t2 = sidekickDripEmail(lead as never, 1);
ok(`touch 2 quotes the CURRENT monthly ($${monthly})`, t2.html.includes(`$${monthly} a month`), t2.html.slice(0, 0));
ok(`touch 2 quotes the CURRENT setup ($${setup})`, t2.html.includes(`$${setup} to set up`));
ok('touch 2 does NOT contain the retired $197', !t2.html.includes('$197'));

const noRun = sidekickDripEmail({ ...lead, notes: '[sidekick] legacy lead' } as never, 0);
ok('legacy lead falls back to /sidekick, no broken URL', noRun.html.includes('/sidekick') && !noRun.html.includes('/sidekick/demo/null'));

const noName = sidekickDripEmail({ ...lead, name: null, business_name: null, company: null } as never, 0);
ok('missing name degrades to "Hi there,"', noName.html.includes('Hi there,'));
ok('missing business degrades gracefully', noName.html.includes('your business'));

console.log('\n--- 3. live dry run against the real database ---');
const sb = getSupabase();
if (!sb) {
  console.log('SKIP  Supabase not configured locally, cannot dry-run.');
} else {
  const { count } = await sb
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'sidekick-forge');
  console.log(`      sidekick-forge leads in the table (all time): ${count ?? 'unknown'}`);

  const { data: rows } = await sb
    .from('leads')
    .select('business_name, status, created_at, notes')
    .eq('source', 'sidekick-forge')
    .order('created_at', { ascending: false });
  for (const r of rows ?? []) {
    const ageDays = ((Date.now() - new Date(r.created_at as string).getTime()) / 86400000).toFixed(1);
    const hasToken = /run=[0-9a-f-]{36}/i.test((r.notes as string) ?? '');
    console.log(`      ${ageDays}d old | ${r.business_name ?? '(no business_name)'} | status=${r.status} | runToken=${hasToken}`);
  }

  const res = await sidekickDrip(sb, { dryRun: true });
  console.log(`      dry run result: ${JSON.stringify(res)}`);
  ok('dry run completed without throwing', typeof res.due === 'number');
  ok('dry run sent nothing', res.sent === 0);

  const stale = await staleUnstarted(sb);
  console.log(`      stale unstarted forgers (for a human): ${JSON.stringify(stale.leads)}`);
  ok('stale forgers are surfaced, not silently dropped', typeof stale.count === 'number');

  const ages = (rows ?? []).map((r) => (Date.now() - new Date(r.created_at as string).getTime()) / 3600000);
  const oldOnes = ages.filter((h) => h > 96).length;
  ok(
    'no sequence cold-starts on a lead older than 96h',
    res.due + oldOnes <= ages.length && res.due === ages.filter((h) => h >= 20 && h <= 96).length,
    `due=${res.due} expected=${ages.filter((h) => h >= 20 && h <= 96).length}`,
  );
}

console.log('\n--- 4. age-aware copy (no false "yesterday") ---');
const old = { ...lead, created_at: new Date(Date.now() - 3 * 86400000).toISOString() };
const y = sidekickDripEmail(lead as never, 0);
const o = sidekickDripEmail(old as never, 0);
ok('a 1-day-old forge says "Yesterday"', y.html.includes('Yesterday you'));
ok('a 3-day-old forge does NOT claim yesterday', !o.html.includes('Yesterday you'));
ok('a 3-day-old forge stays truthful', o.html.includes('A few days ago you'));

console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : `${fail} CHECK(S) FAILED`}`);
process.exit(fail === 0 ? 0 : 1);
