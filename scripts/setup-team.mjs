/**
 * Stand up the unified team identity:
 *   1. Apply migration 045_team_members.sql (Supabase Management API).
 *   2. Seed the four teammates, each linked to their partner code + outbound rep.
 *   3. Print the login credentials (for the welcome email / Sarah).
 *
 * Passwords are scrypt-hashed in the SAME "salt:hash" hex format that
 * lib/team-members.ts verifies. Sarah keeps her existing env owner login
 * (password_hash stays null), her row exists only to link her code + rep.
 *
 * Token: SUPABASE_ACCESS_TOKEN env, else ~/.supabase/access-token.
 * Run: node scripts/setup-team.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { scryptSync, randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

const REF = 'qqvohlvhynmtavdbvkha';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {}

function findToken() {
  if (env.SUPABASE_ACCESS_TOKEN) return env.SUPABASE_ACCESS_TOKEN.trim();
  const p = path.join(os.homedir(), '.supabase', 'access-token');
  if (existsSync(p)) return readFileSync(p, 'utf8').trim();
  return null;
}

function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}
function genPassword(first) {
  return `${first.toLowerCase()}-mustard-${randomBytes(4).toString('hex')}`;
}

const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.supabase_url;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.supabase_service_role_key;
const token = findToken();
if (!token) { console.error('No Supabase access token (~/.supabase/access-token or SUPABASE_ACCESS_TOKEN).'); process.exit(1); }
if (!url || !key) { console.error('No Supabase URL / service key in env.'); process.exit(1); }

// 1) migration
const sql = readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '045_team_members.sql'), 'utf8');
console.log('Applying 045_team_members.sql ...');
const mres = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
if (!mres.ok) { console.error('Migration FAILED:', mres.status, (await mres.text()).slice(0, 500)); process.exit(1); }
console.log('Migration applied.');

// 2) seed. Sarah keeps her env owner login (no hash). The other three get a
//    fresh unified password.
const people = [
  { email: 'sarah@modernmustardseed.com', name: 'Sarah Scarano', role: 'owner', title: 'Founder', affiliate_code: 'MAKEOURCITY', rep_name: 'Sarah', notify_email: 'makeourcitypretty@gmail.com', password: null },
  { email: 'polly.thompson@modernmustardseed.com', name: 'Polly Thompson', role: 'owner', title: 'Partner + Sales', affiliate_code: 'POLLY', rep_name: 'Polly', notify_email: null, password: genPassword('polly') },
  { email: 'easton12parrot@icloud.com', name: 'Easton Parker', role: 'staff', title: 'Partner + Caller', affiliate_code: 'EASTON', rep_name: 'Easton', notify_email: null, password: genPassword('easton') },
  { email: 'bizyai2023@gmail.com', name: 'Anthony Scarano', role: 'owner', title: 'Partner', affiliate_code: 'ANTH6YSR', rep_name: 'Anthony', notify_email: null, password: genPassword('anthony') },
];

const rows = people.map((p) => ({
  email: p.email,
  name: p.name,
  role: p.role,
  title: p.title,
  affiliate_code: p.affiliate_code,
  rep_name: p.rep_name,
  notify_email: p.notify_email,
  active: true,
  password_hash: p.password ? hashPassword(p.password) : null,
}));

const sres = await fetch(`${url}/rest/v1/team_members?on_conflict=email`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify(rows),
});
if (!sres.ok) { console.error('Seed FAILED:', sres.status, (await sres.text()).slice(0, 600)); process.exit(1); }
const seeded = await sres.json();
console.log(`Seeded ${seeded.length} team members.`);

// 3) credentials
console.log('\n=== LOGIN CREDENTIALS (share via the welcome email) ===');
for (const p of people) {
  console.log(`  ${p.name.padEnd(16)} ${p.email.padEnd(38)} ${p.password ? 'pw: ' + p.password : '(keeps existing owner login)'}`);
}
console.log('\nLogin at https://modernmustardseed.com/admin/login');
