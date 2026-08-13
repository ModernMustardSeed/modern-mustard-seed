/**
 * WHY IS THE ADMIN LOGIN NOT WORKING?
 *
 *   npx tsx scripts/acq-login-check.mts
 *
 * Answers the question without ever printing a password. Admin sign-in is a
 * password check against env vars plus a signed JWT cookie (lib/admin-auth.ts),
 * so a failed login is nearly always one of four things: the email is not the
 * one configured, the password env var is a Vercel [SENSITIVE] placeholder, the
 * session secret is missing so the cookie cannot be signed, or the deployment
 * being visited simply has different env vars from the one expected.
 */
import { readFileSync } from 'node:fs';

const env: Record<string, string> = {};
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const placeholder = (v: string | undefined) => !v || /^\[SENSITIVE\]$/i.test(v);
const describe = (k: string) => {
  const v = env[k];
  if (v === undefined) return 'NOT PRESENT in .env.local';
  if (placeholder(v)) return 'PLACEHOLDER ([SENSITIVE] or empty) — this is the problem';
  return `set, ${v.length} characters`;
};

console.log('\nADMIN SIGN-IN, LOCALLY\n');
console.log(`  ADMIN_EMAIL           ${env.ADMIN_EMAIL ?? '(not present)'}`);
console.log(`  ADMIN_PASSWORD        ${describe('ADMIN_PASSWORD')}`);
console.log(`  ADMIN_SESSION_SECRET  ${describe('ADMIN_SESSION_SECRET')}`);
console.log(`  ADMIN_TEAM            ${describe('ADMIN_TEAM')}`);

const teamEmails = placeholder(env.ADMIN_TEAM)
  ? []
  : env.ADMIN_TEAM.split(/;;|\n/).map((row) => row.split('|')[0]?.trim()).filter(Boolean);
if (teamEmails.length) console.log(`  team logins           ${teamEmails.join(', ')}`);

const ok = !placeholder(env.ADMIN_PASSWORD) && !placeholder(env.ADMIN_SESSION_SECRET) && Boolean(env.ADMIN_EMAIL);
console.log(
  ok
    ? `\n  Local sign-in WILL work at http://localhost:3010/admin/login with ${env.ADMIN_EMAIL} and the password stored in .env.local.\n`
    : '\n  Local sign-in will NOT work until the placeholder above is replaced with the real value.\n',
);

console.log('  Note: a Vercel PREVIEW deployment reads the Preview environment variables,');
console.log('  which are a different set from Production. A password that works on the live');
console.log('  site can legitimately fail on a preview URL, and a preview is also behind');
console.log("  Vercel's own SSO before the MMS login is ever reached.\n");
