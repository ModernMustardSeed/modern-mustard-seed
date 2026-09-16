// Re-read the registry and mail records for every domain a client owns.
// The Monday cron does the same; this is for the day you add domains and
// want the expiry on the card now.
//
//   node scripts/refresh-domains.mjs builtbyshan@gmail.com
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const email = process.argv[2];
if (!email) {
  console.error('usage: node scripts/refresh-domains.mjs <client email>');
  process.exit(1);
}
const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; ModernMustardSeed/1.0)', accept: 'application/rdap+json, application/json' };

function rdapBase(domain) {
  const tld = domain.split('.').pop();
  if (tld === 'us') return 'https://rdap.nic.us/domain/';
  if (tld === 'com' || tld === 'net') return 'https://rdap.verisign.com/com/v1/domain/';
  return 'https://rdap.org/domain/';
}
async function registry(domain) {
  try {
    const r = await fetch(rdapBase(domain) + domain, { headers: UA, signal: AbortSignal.timeout(12_000) });
    if (r.status === 404) return { found: false };
    if (!r.ok) return { found: true };
    const j = await r.json();
    const reg = (j.entities ?? []).find((e) => (e.roles ?? []).includes('registrar'));
    const fn = reg?.vcardArray?.[1]?.find((x) => x[0] === 'fn')?.[3] ?? reg?.handle ?? null;
    const exp = (j.events ?? []).find((e) => e.eventAction === 'expiration')?.eventDate ?? null;
    return { found: true, registrar: fn ? String(fn).replace(/,?\s*(Inc|LLC)\.?$/i, '') : null, expiresOn: exp ? exp.slice(0, 10) : null };
  } catch {
    return { found: true };
  }
}
async function mx(domain) {
  try {
    const j = await (await fetch(`https://dns.google/resolve?name=${domain}&type=MX`, { signal: AbortSignal.timeout(8_000) })).json();
    const hosts = (j.Answer ?? []).map((a) => a.data.replace(/^\d+\s+/, '').replace(/\.$/, '').toLowerCase()).sort();
    return hosts.length ? hosts.join(', ') : null;
  } catch {
    return null;
  }
}

const { data: rows, error } = await sb.from('client_domains').select('id, domain, status').eq('client_email', email).order('domain');
if (error) {
  console.error(error.message);
  process.exit(1);
}
for (const row of rows) {
  const [reg, m] = await Promise.all([registry(row.domain), mx(row.domain)]);
  const patch = { checked_at: new Date().toISOString(), updated_at: new Date().toISOString(), mx: m };
  if (reg.registrar) patch.registrar = reg.registrar;
  if (reg.expiresOn) patch.expires_on = reg.expiresOn;
  if (!reg.found) patch.status = 'released';
  else if (reg.expiresOn && Date.parse(reg.expiresOn) < Date.now()) patch.status = 'expired';
  else if (row.status === 'expired' || row.status === 'released') patch.status = 'active';
  await sb.from('client_domains').update(patch).eq('id', row.id);
  console.log(row.domain.padEnd(28), (patch.registrar ?? '-').padEnd(12), patch.expires_on ?? (reg.found ? 'no expiry read' : 'NOT REGISTERED'), m ? `mail: ${m.split(',')[0]}` : '');
}
console.log(`${rows.length} domains read for ${email}`);
