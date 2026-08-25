/**
 * Proves the two pieces of the SMS stack that have no safe failure mode.
 *
 * Usage: pnpm exec tsx scripts/sms-selftest.ts
 *
 * 1. THE SIGNATURE. If verifyTwilio is wrong in the permissive direction, anyone
 *    who learns the webhook path can forge a customer reply onto a lead's thread
 *    or forge a STOP that permanently silences a real customer. If it is wrong
 *    in the strict direction, every real text is rejected and the whole feature
 *    is dead while looking like an attack. So it is cross-checked against
 *    `twilio.validateRequest` from the official SDK (already a dependency),
 *    which makes this a comparison against the authority rather than against
 *    ourselves. A test that only asserts our own output is a test that passes
 *    while the feature is broken.
 *
 * 2. THE KEYWORDS. "Stop by the shop at 4" is a normal reply from a normal
 *    customer. Treating it as an opt-out loses the conversation AND the lead,
 *    permanently, because nothing may text them again.
 */
import crypto from 'node:crypto';
import { validateRequest } from 'twilio';
import { verifyTwilio } from '../lib/twilio-signature';
import { keywordOf, lastTen } from '../lib/sms-thread';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${name}${ok ? '' : `   expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

/* ── 1. Against the official SDK ───────────────────────────────────────────── */
const TOKEN = '12345';
const URL_ = 'https://mycompany.com/myapp.php?foo=1&bar=2';
const PARAMS: Record<string, string> = {
  Digits: '1234',
  To: '+18005551212',
  From: '+14158675310',
  Caller: '+14158675310',
  CallSid: 'CA1234567890ABCDE',
};

// The SDK signs; we verify. If the two disagree about the payload construction
// at all, nothing below can pass.
const SIG = signWithSdk(TOKEN, URL_, PARAMS);

function signWithSdk(token: string, url: string, params: Record<string, string>): string {
  // validateRequest is a checker, not a signer, so the signature is recovered by
  // asking it to confirm a candidate we build the only way it accepts.
  let payload = url;
  for (const key of Object.keys(params).sort()) payload += key + params[key];
  const candidate = crypto.createHmac('sha1', token).update(Buffer.from(payload, 'utf8')).digest('base64');
  if (!validateRequest(token, candidate, url, params)) {
    throw new Error('The official Twilio SDK rejected the signature this test generated. Do not trust anything below.');
  }
  return candidate;
}

console.log('\nSignature (cross-checked against twilio.validateRequest)');
check('accepts what the SDK accepts', verifyTwilio(TOKEN, URL_, PARAMS, SIG), true);
check('SDK agrees this is valid', validateRequest(TOKEN, SIG, URL_, PARAMS), true);
check('rejects a tampered body', verifyTwilio(TOKEN, URL_, { ...PARAMS, Digits: '9999' }, SIG), false);
check('SDK also rejects the tampered body', validateRequest(TOKEN, SIG, URL_, { ...PARAMS, Digits: '9999' }), false);
check('rejects a different URL', verifyTwilio(TOKEN, 'https://evil.example/myapp.php', PARAMS, SIG), false);
check('rejects the wrong auth token', verifyTwilio('54321', URL_, PARAMS, SIG), false);
check('rejects an empty signature', verifyTwilio(TOKEN, URL_, PARAMS, ''), false);
check('rejects an empty token rather than passing', verifyTwilio('', URL_, PARAMS, SIG), false);
// A signature of a different length must not throw out of timingSafeEqual.
check('rejects a short signature without throwing', verifyTwilio(TOKEN, URL_, PARAMS, 'abc'), false);

// The real shape: a form-encoded inbound text, signed and checked end to end.
// The SID fixtures are deliberately NOT hex. A realistic-looking AC + 32 hex
// characters matches the Twilio Account SID pattern, and GitHub push protection
// blocks it on sight even when it is invented. Signing does not care what the
// characters are, so they spell out what they are instead.
const INBOUND = {
  MessageSid: 'SMnotarealmessagesidjustafixture0',
  AccountSid: 'ACnotarealaccountsidjustafixture0',
  From: '+14065551234',
  To: '+14065556789',
  Body: 'STOP',
  NumMedia: '0',
};
const HOOK_URL = 'https://modernmustardseed.com/api/hooks/sms';
const inboundSig = signWithSdk(TOKEN, HOOK_URL, INBOUND);
check('accepts a real inbound payload', verifyTwilio(TOKEN, HOOK_URL, INBOUND, inboundSig), true);
check('rejects that payload replayed at the status URL', verifyTwilio(TOKEN, `${HOOK_URL}/status`, INBOUND, inboundSig), false);

/* ── 2. Keywords ───────────────────────────────────────────────────────────── */
console.log('\nKeywords');
check('STOP', keywordOf('STOP'), 'stop');
check('stop lowercase', keywordOf('stop'), 'stop');
check('STOP with punctuation', keywordOf('Stop.'), 'stop');
check('STOP with whitespace', keywordOf('  STOP  '), 'stop');
check('unsubscribe', keywordOf('UNSUBSCRIBE'), 'stop');
check('cancel', keywordOf('cancel'), 'stop');
check('start', keywordOf('START'), 'start');
check('help', keywordOf('help'), 'help');

// The ones that must NOT opt anybody out. Each is a real thing a customer says.
check('"stop by the shop at 4" is a reply', keywordOf('Stop by the shop at 4'), null);
check('"please stop calling me" is a reply', keywordOf('please stop calling me'), null);
check('"can you help me with a quote" is a reply', keywordOf('can you help me with a quote'), null);
check('"yes please" is a reply', keywordOf('yes please'), null);
check('empty body is not a keyword', keywordOf(''), null);

/* ── 3. Thread matching key ────────────────────────────────────────────────── */
console.log('\nPhone matching');
check('E.164 to ten digits', lastTen('+14065551234'), '4065551234');
check('formatted to ten digits', lastTen('(406) 555-1234'), '4065551234');
check('dashed to ten digits', lastTen('406-555-1234'), '4065551234');
check('leading one to ten digits', lastTen('1 406 555 1234'), '4065551234');
check('junk yields something short, never a false match', lastTen('n/a').length < 10, true);

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
