/**
 * The paid lane, checked without spending anything.
 *
 * Every assertion here is about the lane REFUSING to run: no key, a bad
 * ceiling, a key that is really just whitespace. That is the half worth an
 * automatic check, because it is the half that protects the bill, and because
 * the other half cannot be proved without buying tokens on every CI run.
 *
 * Run: pnpm exec tsx scripts/cc-paid-lane-check.ts
 */
import { paidLaneConfigured, paidSpend } from '../lib/llm-paid';

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails += 1;
};

const KEY = 'CC_PAID_ANTHROPIC_KEY';
const CAP = 'CC_PAID_MONTHLY_CENTS';
const FAKE = 'not-a-real-key-and-never-sent-anywhere';

async function main() {
  delete process.env[KEY];
  delete process.env[CAP];

  ok('no key means the lane is not configured', paidLaneConfigured() === false);

  const closed = await paidSpend(null);
  ok('with no key the lane reports closed', closed.open === false);
  ok('the default ceiling is $20', closed.ceilingCents === 2_000);
  ok('a closed lane still reports a month', /^\d{4}-\d{2}$/.test(closed.month));

  process.env[KEY] = FAKE;
  ok('a key makes the lane configured', paidLaneConfigured() === true);

  const open = await paidSpend(null);
  ok('a key with no spend opens the lane', open.open === true);
  ok('spend starts at zero', open.cents === 0 && open.calls === 0);

  process.env[KEY] = '   ';
  ok('a whitespace-only key is no key', paidLaneConfigured() === false);
  process.env[KEY] = FAKE;

  process.env[CAP] = '0';
  ok('a zero ceiling falls back to the default, never to locked-shut', (await paidSpend(null)).ceilingCents === 2_000);

  process.env[CAP] = 'banana';
  ok('an unparseable ceiling falls back to the default', (await paidSpend(null)).ceilingCents === 2_000);

  process.env[CAP] = '500';
  ok('a real ceiling is honoured', (await paidSpend(null)).ceilingCents === 500);

  console.log(fails ? `\n${fails} FAILED` : '\nThe paid lane is dormant and its ceiling holds.');
  process.exit(fails ? 1 : 0);
}

void main();
