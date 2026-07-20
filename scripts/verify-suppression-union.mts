/**
 * Proves the two suppression lists are unioned, so an UNSUBSCRIBE actually
 * blocks future sends. Before 2026-07-20 the `suppression` table (written by
 * every unsubscribe route) was read by no send path at all.
 *
 * Writes a throwaway row to `suppression`, asserts the send path refuses that
 * address, then removes the row. Uses a reserved .invalid domain (RFC 2606) so
 * no real address can ever be touched. Sends nothing.
 *
 * Run: npx tsx scripts/verify-suppression-union.mts
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

const { activeSuppressions } = await import('../lib/email-log');
const { sendViaResend, unsubHeaders } = await import('../lib/send-email');
const { getSupabase } = await import('../lib/supabase');

let fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail && !cond ? `  (${detail})` : ''}`);
  if (!cond) fail++;
};

console.log('--- RFC 8058 headers ---');
const h = unsubHeaders('https://example.com/u?c=a%40b.test');
ok('List-Unsubscribe is angle-bracketed', h?.['List-Unsubscribe'] === '<https://example.com/u?c=a%40b.test>');
ok('one-click POST is declared', h?.['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click');
ok('transactional mail gets NO headers', unsubHeaders(undefined) === undefined);

const sb = getSupabase();
if (!sb) {
  console.log('\nSKIP  Supabase not configured; cannot prove the union.');
  process.exit(fail === 0 ? 0 : 1);
}

// RFC 2606 reserved TLD. Cannot route anywhere, ever.
const VICTIM = `drip-optout-probe@modernmustardseed.invalid`;

console.log('\n--- the union (unsubscribe must block a send) ---');
try {
  const before = await activeSuppressions([VICTIM]);
  ok('address is not suppressed before the test', !before.has(VICTIM));

  const sendBefore = await sendViaResend({
    from: 'Test <sarah@modernmustardseed.com>',
    to: VICTIM,
    subject: 'probe',
    html: '<p>probe</p>',
  });
  // It must fail for SOME reason, but specifically NOT for being suppressed.
  ok('pre-test send is not blocked by suppression', !('suppressed' in sendBefore && sendBefore.suppressed?.length));

  // Simulate a real unsubscribe click: this is exactly what
  // /api/outreach/unsubscribe writes.
  await sb.from('suppression').upsert({ contact: VICTIM, reason: 'unsubscribe link' }, { onConflict: 'contact' });

  const after = await activeSuppressions([VICTIM]);
  ok('unsubscribe row IS seen by activeSuppressions', after.has(VICTIM), 'the union is not wired');
  ok('reason is reported', (after.get(VICTIM)?.reason ?? '') === 'unsubscribe link');
  ok('detail explains opt-outs are permanent', (after.get(VICTIM)?.detail ?? '').includes('permanent'));

  const sendAfter = await sendViaResend({
    from: 'Test <sarah@modernmustardseed.com>',
    to: VICTIM,
    subject: 'probe',
    html: '<p>probe</p>',
  });
  ok('send is REFUSED after unsubscribe', sendAfter.ok === false);
  ok(
    'refusal names suppression, not a generic failure',
    sendAfter.ok === false && Array.isArray(sendAfter.suppressed) && sendAfter.suppressed.includes(VICTIM),
    sendAfter.ok === false ? sendAfter.error.slice(0, 120) : '',
  );
} finally {
  await sb.from('suppression').delete().eq('contact', VICTIM);
  const cleaned = await activeSuppressions([VICTIM]);
  ok('probe row cleaned up', !cleaned.has(VICTIM));
}

console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : `${fail} CHECK(S) FAILED`}`);
process.exit(fail === 0 ? 0 : 1);
