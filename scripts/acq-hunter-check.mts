/**
 * Is the Hunter key live, and what does it actually buy us?
 *
 *   npx tsx scripts/acq-hunter-check.mts
 *
 * Prints the account, the credit position, and a single real verification so
 * the key is proven rather than assumed. Never prints the key.
 */
import { readFileSync } from 'node:fs';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const key = process.env.HUNTER_API_KEY;
if (!key || /^\[SENSITIVE\]$/i.test(key)) {
  console.error('HUNTER_API_KEY is not set.');
  process.exit(1);
}

const get = async (path: string) => {
  const res = await fetch(`https://api.hunter.io/v2/${path}${path.includes('?') ? '&' : '?'}api_key=${key}`);
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
};

console.log('\nHUNTER.IO\n');

const account = await get('account');
if (account.status !== 200) {
  console.error(`  account -> ${account.status}. The key was refused.`);
  console.error(`  ${JSON.stringify(account.json).slice(0, 300)}`);
  process.exit(1);
}
const d = (account.json.data ?? {}) as Record<string, unknown>;
const req = (d.requests ?? {}) as Record<string, { used?: number; available?: number }>;
console.log(`  plan:          ${d.plan_name ?? '?'} (${d.plan_level ?? '?'})`);
console.log(`  team:          ${d.team_id ?? '?'}  reset ${d.reset_date ?? '?'}`);
for (const [name, r] of Object.entries(req)) {
  console.log(`  ${name.padEnd(14)} ${r.used ?? 0} used of ${r.available ?? 0}`);
}

// One real verification, on an address we already hold, so the key is proven
// against the endpoint the Lead Finder actually calls.
const probe = await get('email-verifier?email=sales@askmoss.com');
const v = (probe.json.data ?? {}) as Record<string, unknown>;
console.log(`\n  verifier probe -> ${probe.status}`);
if (probe.status === 200) {
  console.log(`    result ${v.result} · score ${v.score} · smtp_check ${v.smtp_check} · accept_all ${v.accept_all}`);
  console.log('\n  The verifier is live, so every future sourcing run grades emails as');
  console.log('  verified or undeliverable instead of guessing from provenance alone.\n');
} else {
  console.log(`    ${JSON.stringify(probe.json).slice(0, 300)}`);
  console.log('\n  The account reads but the verifier did not answer. Check the plan level.\n');
}
