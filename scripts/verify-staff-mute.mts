/**
 * Proves the staff notification mute (lib/send-email.ts): Easton receives
 * NOTHING except sign-in links, enforced at the one choke point all outbound
 * mail passes through. Sends nothing real: the fully-muted probe short-circuits
 * before any provider call, and the exemption probe runs under a deliberately
 * invalid API key so Resend rejects it at the door.
 *
 * Run: npx tsx scripts/verify-staff-mute.mts
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

const { applyMute, sendViaResend } = await import('../lib/send-email');
const { listAdminUsers } = await import('../lib/admin-auth');
const { getSupabase } = await import('../lib/supabase');

const MUTED = 'easton12parrot@gmail.com';
let fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${!cond && detail ? `  (${detail})` : ''}`);
  if (!cond) fail++;
};

console.log('--- applyMute unit behavior ---');
const plain = 'Pipeline: 38 unanswered, 7 follow-ups due';
const adminLink = 'Tap to sign in: https://modernmustardseed.com/admin/magic?token=abc';
const portalLink = 'https://modernmustardseed.com/api/portal/verify?token=abc&next=/partners/hq';

let r = applyMute([MUTED], plain);
ok('solo muted recipient is stripped from a plain notification', r.kept.length === 0 && r.muted[0] === MUTED);

r = applyMute(['sarah@modernmustardseed.com', MUTED, 'thompsonpolly71@gmail.com'], plain);
ok('mixed send keeps everyone else', r.kept.length === 2 && !r.kept.includes(MUTED));
ok('mixed send reports the muted address', r.muted.length === 1 && r.muted[0] === MUTED);

r = applyMute([MUTED], adminLink);
ok('admin magic-link email is EXEMPT (he can always sign in)', r.kept.length === 1 && r.muted.length === 0);

r = applyMute([MUTED], portalLink);
ok('partner portal magic-link email is EXEMPT', r.kept.length === 1 && r.muted.length === 0);

r = applyMute(['EASTON12PARROT@GMAIL.COM'], plain);
ok('mute matches case-insensitively', r.kept.length === 0 && r.muted.length === 1);

r = applyMute(['someone-else@gmail.com'], plain);
ok('non-muted addresses are untouched', r.kept.length === 1 && r.muted.length === 0);

console.log('\n--- sendViaResend short-circuit (no provider call, honest record) ---');
const PROBE_SUBJECT = `staff-mute probe ${Date.now()}`;
const res = await sendViaResend({
  from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
  to: MUTED,
  subject: PROBE_SUBJECT,
  text: 'If this ever lands in an inbox, the mute is broken.',
});
ok('fully muted send returns ok with id "muted"', res.ok === true && 'id' in res && res.id === 'muted', JSON.stringify(res));

const sb = getSupabase();
if (sb) {
  const { data: rows } = await sb
    .from('emails')
    .select('id,status,status_detail,to_addrs')
    .eq('subject', PROBE_SUBJECT);
  const row = rows?.[0] as { id: string; status: string; status_detail: string | null; to_addrs: string } | undefined;
  ok('drop is recorded as status=suppressed', row?.status === 'suppressed');
  ok('record names the mute as the reason', (row?.status_detail || '').includes('muted'));
  if (rows?.length) await sb.from('emails').delete().in('id', rows.map((x: { id: string }) => x.id));
} else {
  console.log('SKIP  Supabase not configured; cannot check the proof row.');
}

console.log('\n--- login-link exemption reaches the provider (bogus key, nothing sends) ---');
const realKey = process.env.RESEND_API_KEY;
process.env.RESEND_API_KEY = 're_invalid_probe_key';
const loginRes = await sendViaResend({
  from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
  to: MUTED,
  subject: 'Your sign-in link',
  html: `<a href="https://modernmustardseed.com/admin/magic?token=probe">Sign in</a>`,
});
process.env.RESEND_API_KEY = realKey;
ok(
  'sign-in link is NOT muted (fails at the provider, not the mute)',
  loginRes.ok === false && !('id' in loginRes),
  JSON.stringify(loginRes),
);

console.log('\n--- digest recipients: staff are out ---');
const admins = listAdminUsers();
const easton = admins.find((u) => u.email === MUTED);
ok('Easton is in ADMIN_TEAM as staff (mute still needed for other sends)', easton?.role === 'staff', JSON.stringify(easton));
const owners = admins.filter((u) => u.role === 'owner').map((u) => u.email);
ok('owner-only filter excludes Easton', !owners.includes(MUTED));
ok('owner-only filter still has owners in it', owners.length >= 1, JSON.stringify(owners));

console.log(fail === 0 ? '\nALL CHECKS PASSED' : `\n${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
