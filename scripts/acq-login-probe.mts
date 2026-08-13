/**
 * Prove the local admin sign-in works, end to end, without printing the password.
 *
 *   npx tsx scripts/acq-login-probe.mts [http://localhost:3010]
 */
import { readFileSync } from 'node:fs';

const env: Record<string, string> = {};
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const base = process.argv[2] ?? 'http://localhost:3010';
const res = await fetch(`${base}/api/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
  redirect: 'manual',
});
const body = await res.text();
const cookie = res.headers.get('set-cookie');

console.log(`\nPOST ${base}/api/admin/login  ->  ${res.status}`);
console.log(`  session cookie issued: ${cookie ? 'YES' : 'no'}`);
console.log(`  body: ${body.slice(0, 200)}`);

if (cookie) {
  const jar = cookie.split(';')[0];
  const page = await fetch(`${base}/admin/acquisition`, { headers: { cookie: jar }, redirect: 'manual' });
  console.log(`  GET /admin/acquisition with that cookie -> ${page.status}`);
  const factory = await fetch(`${base}/api/admin/acquisition/factory`, { headers: { cookie: jar } });
  console.log(`  GET /api/admin/acquisition/factory      -> ${factory.status}`);
  console.log(
    res.status === 200 && page.status === 200
      ? `\n  Sign in at ${base}/admin/login as ${env.ADMIN_EMAIL} with the password already in .env.local.\n`
      : '\n  Something is still wrong above.\n',
  );
}
