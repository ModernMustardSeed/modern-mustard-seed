/**
 * Verification for lib/hundredfold-drip.ts. Read-only and SEND-FREE.
 *
 * Part 1: the guards (who is mailable, what fails closed).
 * Part 2: the copy, rendered from the REAL Whitaker Med Spa deep roadmap, so
 *         the assertions prove the letters actually quote that member's own
 *         document rather than a template.
 * Part 3: the real drip against the real database with dryRun, which queries
 *         and counts but never sends. This is what proves the exclusions work
 *         on live rows, including that the demo member is never mailed.
 *
 * Run: npx tsx scripts/verify-hundredfold-drip.mts
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

const {
  mailable,
  personalise,
  roadmapDripEmail,
  interviewDripEmail,
  hundredfoldDrip,
  ROADMAP_TOUCHES,
  INTERVIEW_TOUCHES,
} = await import('../lib/hundredfold-drip');
const { getSupabase } = await import('../lib/supabase');
const { priceSentence } = await import('../lib/hundredfold');

let fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail && !cond ? `  (${detail})` : ''}`);
  if (!cond) fail++;
};

/* ------------------------------------------------------------------ */
console.log('--- 1. who may be mailed ---');
ok('accepts a normal address', mailable('owner@acmeplumbing.com'));
ok('rejects the .demo demo subject', !mailable('dana@whitakermedspa.demo'));
ok('rejects .test', !mailable('dana@whitakermedspa.test'));
ok('rejects .invalid', !mailable('nobody@nowhere.invalid'));
ok('rejects our own domain', !mailable('sarah@modernmustardseed.com'));
ok('rejects the CXC domain', !mailable('hello@crossandcovenant.co'));
ok('rejects the owner gmail', !mailable('makeourcitypretty@gmail.com'));
ok('rejects the muted teammate', !mailable('easton12parrot@gmail.com'));
ok('rejects null', !mailable(null));
ok('rejects a malformed address', !mailable('not-an-address'));

/* ------------------------------------------------------------------ */
console.log('\n--- 2. personalisation fails CLOSED ---');
ok('null report yields nothing to write', personalise(null) === null);
ok('empty report yields nothing to write', personalise({} as never) === null);
ok(
  'a report with a constraint type but no first move is refused',
  personalise({ constraint: { type: 'leads', title: 'Thin top of funnel', first_move: '' } } as never) === null
);
ok(
  'a report with a constraint but no title is refused',
  personalise({ constraint: { type: 'leads', title: '', first_move: 'Call the list' } } as never) === null
);

/* ------------------------------------------------------------------ */
console.log('\n--- 3. copy, rendered from the real demo roadmap ---');
const sb = getSupabase();
if (!sb) {
  ok('Supabase configured', false, 'no supabase_url / service role key');
} else {
  const DEMO_ID = 'b9348c43-ea37-4c84-9820-24727756b70b';
  const { data: member } = await sb
    .from('hundredfold_members')
    .select('id, email, name, business_name, status, deep_roadmap, offer, roadmap_slug')
    .eq('id', DEMO_ID)
    .maybeSingle();

  ok('the demo member exists to render from', !!member);

  const p = personalise((member?.deep_roadmap as never) ?? null, member?.business_name ?? null);
  ok('the demo deep roadmap is writable', !!p);

  if (p && member) {
    const all: { label: string; subject: string; html: string }[] = [];
    for (let step = 0; step < ROADMAP_TOUCHES; step += 1) {
      const m = roadmapDripEmail(p, step, {
        reportUrl: 'https://modernmustardseed.com/scaling-roadmap/r/demo',
        firstName: 'Dana',
      });
      all.push({ label: `roadmap touch ${step + 1}`, subject: m.subject, html: m.html });
    }
    for (let step = 0; step < INTERVIEW_TOUCHES; step += 1) {
      const m = interviewDripEmail(p, step, {
        firstName: 'Dana',
        offer: (member.offer as never) ?? null,
        roadmapUrl: null,
      });
      all.push({ label: `interview touch ${step + 1}`, subject: m.subject, html: m.html });
    }

    ok('every touch renders', all.length === ROADMAP_TOUCHES + INTERVIEW_TOUCHES);

    for (const t of all) {
      ok(`${t.label}: has a subject`, t.subject.trim().length > 8);
      // Sarah's rule, everywhere, forever.
      ok(`${t.label}: no em dashes`, !/[—–]/.test(t.html + t.subject));
      ok(`${t.label}: no unresolved template holes`, !/undefined|\[object Object\]|null<|>null/.test(t.html));
      ok(`${t.label}: carries a link back to us`, t.html.includes('modernmustardseed.com'));
    }

    // The whole point of the module: the letters are THEIRS.
    const roadmapBodies = all.filter((t) => t.label.startsWith('roadmap')).map((t) => t.html).join('');
    const interviewBodies = all.filter((t) => t.label.startsWith('interview')).map((t) => t.html).join('');
    ok('roadmap sequence names their business', roadmapBodies.includes(p.business));
    ok('roadmap touch 1 quotes their own first move', all[0].html.includes(p.firstMove.slice(0, 40)));
    ok('roadmap sequence names their constraint', roadmapBodies.includes(p.constraintTitle.slice(0, 30)));
    ok('interview touch 1 quotes their headline', !p.headline || all[4].html.includes(p.headline.slice(0, 40)));
    ok('interview sequence names their constraint', interviewBodies.includes(p.constraintTitle.slice(0, 30)));

    // Price is derived, never retyped (mms-price-single-source).
    ok('the close quotes the single-source price', all[3].html.includes(priceSentence()));
    ok('the interview close quotes the single-source price', all[6].html.includes(priceSentence()));

    // Nothing before the final touch should be talking money.
    const early = [all[0], all[1], all[4]].map((t) => t.html).join('');
    ok('early touches do not lead with price', !early.includes(priceSentence()));

    if (process.argv.includes('--print')) {
      for (const t of all) console.log(`\n=== ${t.label} ===\n${t.subject}\n`);
    }
  }

  /* ---------------------------------------------------------------- */
  console.log('\n--- 4. dry run against live data (sends nothing) ---');
  const report = await hundredfoldDrip(sb, { dryRun: true });
  console.log(JSON.stringify(report, null, 2));
  ok('roadmap pass is a dry run', report.roadmap.dryRun === true);
  ok('interview pass is a dry run', report.interview.dryRun === true);
  ok('nothing was sent', report.roadmap.sent === 0 && report.interview.sent === 0);
  ok(
    'the demo member is never in the mail path',
    !JSON.stringify(report).includes('whitakermedspa.demo') && !JSON.stringify(report).includes('whitakermedspa.test')
  );
}

console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : `${fail} CHECK(S) FAILED`}`);
process.exitCode = fail === 0 ? 0 : 1;
