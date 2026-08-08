/**
 * Run the BUILD FACTORY for real, against the Whitaker Med Spa demo member.
 *
 * This is not a mock. It calls fal, calls Claude, renders a real PDF, uploads
 * to real storage, publishes a real URL, and writes real lines to the credit
 * ledger. That is the point: the factory's failure modes (a malformed document,
 * a fal 402, a PDF font that cannot draw a curly quote) only ever show up when
 * something actually runs.
 *
 *   npx tsx scripts/hundredfold-factory-test.mts --kind tool
 *   npx tsx scripts/hundredfold-factory-test.mts --kind pdf --kind images
 *   npx tsx scripts/hundredfold-factory-test.mts --guards        (spends nothing)
 *
 * ⚠️ COSTS REAL MONEY per kind (a few cents), and every run is charged to the
 * demo member's cycle so the meter is exercised too. `--guards` runs only the
 * refusal paths and spends nothing.
 */
import { readFileSync } from 'node:fs';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=("?)(.*)\2\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
  }
} catch {
  /* rely on the environment */
}

const args = process.argv.slice(2);
const kinds = args.reduce<string[]>((acc, a, i) => (a === '--kind' && args[i + 1] ? [...acc, args[i + 1]] : acc), []);
const guardsOnly = args.includes('--guards');

const DEMO_ID = 'b9348c43-ea37-4c84-9820-24727756b70b';

const { getSupabase } = await import('../lib/supabase');
const { getMemberById } = await import('../lib/hundredfold-store');
const { runBuild, estimateCents } = await import('../lib/hundredfold-factory');
const { readMeter, cycleStart, claudeCostCents } = await import('../lib/hundredfold-credit');
const { needsApproval } = await import('../lib/hundredfold-coach');
const { HUNDREDFOLD } = await import('../lib/hundredfold');

let fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!cond) fail++;
};

const sb = getSupabase();
if (!sb) {
  console.error('No Supabase. Set supabase_url / supabase_service_role_key.');
  process.exitCode = 1;
} else {
  const member = await getMemberById(DEMO_ID);
  ok('demo member loads', !!member);
  if (!member) throw new Error('no demo member');

  /* -------------------------------------------------------------- */
  console.log('\n--- 1. the guards, in isolation ---');
  ok('video needs approval', needsApproval('video'));
  ok('ad-campaign needs approval', needsApproval('ad-campaign'));
  ok('tool does NOT need approval', !needsApproval('tool'));
  ok('pdf does NOT need approval', !needsApproval('pdf'));
  ok('images do NOT need approval', !needsApproval('images'));
  ok('an unrecognised kind FAILS CLOSED', needsApproval('billing + onboarding automation'));
  ok('an empty kind FAILS CLOSED', needsApproval(''));

  console.log('\n--- 2. the meter arithmetic ---');
  ok(
    'a sub-cent Claude call still costs a cent',
    claudeCostCents('claude-opus-5', { input_tokens: 10, output_tokens: 1 }) === 1
  );
  ok(
    'an unknown model is charged at the top rate',
    claudeCostCents('who-knows', { input_tokens: 1_000_000, output_tokens: 0 }) === 500
  );
  ok(
    'opus input is $5/M',
    claudeCostCents('claude-opus-5', { input_tokens: 1_000_000, output_tokens: 0 }) === 500
  );
  ok(
    'opus output is $25/M',
    claudeCostCents('claude-opus-5', { input_tokens: 0, output_tokens: 1_000_000 }) === 2500
  );
  ok(
    'cache reads are a tenth of input',
    claudeCostCents('claude-opus-5', { input_tokens: 0, cache_read_input_tokens: 1_000_000 }) === 50
  );
  // A 31st anchor: on Feb 28 the live cycle still started Jan 31; by Mar 1 it
  // has rolled to Feb 28, clamped. The bug this pins is a stepped-back Date
  // rolling FORWARD off a 31st and handing out a second allowance.
  const feb = cycleStart('2026-01-31T12:00:00Z', new Date('2026-02-28T00:00:00Z'));
  ok('a 31st anchor holds its January cycle through February', feb.toISOString().startsWith('2026-01-31'), feb.toISOString());
  const mar = cycleStart('2026-01-31T12:00:00Z', new Date('2026-03-01T00:00:00Z'));
  ok('and clamps to Feb 28 once March starts', mar.toISOString().startsWith('2026-02-28'), mar.toISOString());
  const jan = cycleStart('2025-12-31T12:00:00Z', new Date('2026-01-15T00:00:00Z'));
  ok('and crosses the year boundary correctly', jan.toISOString().startsWith('2025-12-31'), jan.toISOString());
  const midCycle = cycleStart('2026-08-07T22:47:00Z', new Date('2026-09-06T00:00:00Z'));
  ok('mid-cycle resolves to the current window', midCycle.toISOString().startsWith('2026-08-07'), midCycle.toISOString());
  ok(
    'a cycle never predates the member',
    cycleStart('2026-08-07T22:47:00Z', new Date('2026-08-08T00:00:00Z')).toISOString().startsWith('2026-08-07')
  );

  const meter = await readMeter(sb, member);
  ok('the meter reads', !meter.unreadable);
  console.log(
    `      cap ${HUNDREDFOLD.monthlyAiCreditCents}c · spent ${meter.spentCents}c · remaining ${meter.remainingCents}c · resets ${meter.cycleEnd.slice(0, 10)}`
  );

  console.log('\n--- 3. a spending build is REFUSED without approval ---');
  const { data: vid } = await sb
    .from('hundredfold_systems')
    .insert({
      member_id: DEMO_ID,
      name: 'TEST: a video that should never run',
      kind: 'video',
      window_no: 1,
      summary: 'Guard test row.',
      status: 'proposed',
    })
    .select('*')
    .single();
  const refusal = await runBuild(sb, member, vid);
  ok('the factory refuses an unapproved video', !refusal.ok);
  ok('and it stays proposed', !refusal.ok && refusal.status === 'proposed', JSON.stringify(refusal).slice(0, 120));
  ok(
    'and it says nothing was charged',
    !refusal.ok && /nothing has been charged|nothing has run/i.test(refusal.reason)
  );
  const { data: after } = await sb.from('hundredfold_systems').select('spend_cents, status').eq('id', vid.id).single();
  ok('and it spent nothing', after.spend_cents === 0, `spend=${after.spend_cents}`);
  await sb.from('hundredfold_systems').delete().eq('id', vid.id);

  console.log('\n--- 4. an unknown prose kind is refused too ---');
  const { data: prose } = await sb
    .from('hundredfold_systems')
    .insert({
      member_id: DEMO_ID,
      name: 'TEST: billing automation',
      kind: 'billing + onboarding automation',
      window_no: 2,
      status: 'queued',
    })
    .select('*')
    .single();
  const proseOut = await runBuild(sb, member, prose);
  ok('a synthesis-written prose kind does not reach a generator', !proseOut.ok);
  await sb.from('hundredfold_systems').delete().eq('id', prose.id);

  /* -------------------------------------------------------------- */
  if (!guardsOnly && kinds.length) {
    console.log(`\n--- 5. REAL BUILDS: ${kinds.join(', ')} ---`);
    for (const kind of kinds) {
      console.log(`\n  >> ${kind} (estimate ${estimateCents(kind)}c)`);
      const { data: row, error } = await sb
        .from('hundredfold_systems')
        .insert({
          member_id: DEMO_ID,
          name:
            kind === 'tool'
              ? 'The Treatment Price Estimator'
              : kind === 'pdf'
                ? 'The First Visit Guide'
                : kind === 'page'
                  ? 'The Membership Page'
                  : `TEST: ${kind}`,
          kind,
          window_no: 1,
          summary:
            kind === 'tool'
              ? 'A price estimator a visitor fills in on our site so they stop calling to ask what things cost.'
              : kind === 'pdf'
                ? 'A guide we hand to anyone who is nervous about a first appointment.'
                : 'Built by the factory test.',
          gives_back: 'The pricing questions that eat the front desk.',
          status: 'queued',
        })
        .select('*')
        .single();
      if (error) {
        ok(`${kind}: row created`, false, error.message);
        continue;
      }

      const started = Date.now();
      const out = await runBuild(sb, member, row);
      const secs = Math.round((Date.now() - started) / 1000);

      ok(`${kind}: build succeeded (${secs}s)`, out.ok, out.ok ? '' : out.reason);
      if (out.ok) {
        ok(`${kind}: produced at least one asset`, out.assets.length > 0);
        ok(`${kind}: charged something`, out.spentCents > 0, `${out.spentCents}c`);
        for (const a of out.assets) {
          console.log(`      · ${a.kind}: ${a.title}${a.url ? ` -> ${a.url}` : ''}`);
        }
        if (out.url) {
          const res = await fetch(out.url);
          ok(`${kind}: the published URL serves 200`, res.ok, `${res.status}`);
          // ⚠️ Only assert on the BODY when the fetch actually succeeded. A 404
          // from this route is the site's own not-found page: a real HTML
          // document, tens of KB, with no external script src, which sails
          // through every check below and reports a passing build that never
          // deployed. Caught here before it could ever say so.
          if (res.ok) {
            const html = await res.text();
            ok(`${kind}: it is a real document`, /<html/i.test(html) && html.length > 2000, `${html.length} bytes`);
            ok(`${kind}: it is self-contained`, !/<script[^>]+src=["']https?:/i.test(html));
            ok(`${kind}: no em dashes`, !/[—–]/.test(html.replace(/<style[\s\S]*?<\/style>/gi, '')));
            if (kind === 'tool') {
              ok(`tool: it posts to the real capture endpoint`, html.includes('/api/built/') && html.includes('/submit'));
            }
          } else {
            console.log(`      (route not deployed yet, so the body checks were skipped rather than run on a 404 page)`);
          }
        }
        const fileAsset = out.assets.find((a) => a.kind === 'file');
        if (fileAsset?.url) {
          const res = await fetch(fileAsset.url);
          const buf = Buffer.from(await res.arrayBuffer());
          ok(`${kind}: the stored PDF downloads`, res.ok, `${res.status}`);
          ok(`${kind}: it is a real PDF`, buf.subarray(0, 4).toString() === '%PDF', `${buf.length} bytes`);
        }
      }

      const { data: ledger } = await sb
        .from('hundredfold_spend')
        .select('cents, source')
        .eq('system_id', row.id);
      ok(`${kind}: the ledger recorded the run`, (ledger ?? []).length > 0, JSON.stringify(ledger));

      if (args.includes('--keep')) console.log(`      kept row ${row.id}`);
      else {
        await sb.from('hundredfold_spend').delete().eq('system_id', row.id);
        await sb.from('hundredfold_systems').delete().eq('id', row.id);
        console.log('      cleaned up (pass --keep to leave it in the arsenal)');
      }
    }
  } else if (!guardsOnly) {
    console.log('\n(no --kind given, so no real builds ran. Try: --kind tool --kind pdf --kind images)');
  }
}

console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : `${fail} CHECK(S) FAILED`}`);
process.exitCode = fail === 0 ? 0 : 1;
