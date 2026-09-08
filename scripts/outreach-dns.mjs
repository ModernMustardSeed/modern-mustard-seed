#!/usr/bin/env node
/*
 * The outreach sending domain, at Porkbun.
 *
 * Cold outreach and drips send from outreach.modernmustardseed.com, never from
 * the root domain, so the address Sarah reads and replies from keeps its own
 * reputation. Resend signs the subdomain with its own DKIM key and uses
 * send.outreach as the bounce domain. These three records are what Resend
 * asked for when the domain was added on 2026-09-08 (domain id 254f67bb).
 *
 *   node scripts/outreach-dns.mjs
 *
 * Idempotent. Credentials from PORKBUN_API_KEY / PORKBUN_SECRET_KEY, or from
 * ~/.porkbun/credentials.env. Never print them.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DOMAIN = 'modernmustardseed.com';
const API = 'https://api.porkbun.com/api/json/v3';
const records = JSON.parse(readFileSync(process.env.OUTREACH_RECORDS || join(process.env.TEMP || '/tmp', 'outreach-records.json'), 'utf8'));
const RECORDS = records.map((r) => ({
  type: r.type,
  name: r.name,
  content: String(r.value),
  ttl: '600',
  ...(r.priority ? { prio: String(r.priority) } : {}),
}));

function credentials() {
  const fromEnv = { key: process.env.PORKBUN_API_KEY, secret: process.env.PORKBUN_SECRET_KEY };
  if (fromEnv.key && fromEnv.secret) return fromEnv;
  const path = join(homedir(), '.porkbun', 'credentials.env');
  let key = fromEnv.key;
  let secret = fromEnv.secret;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*(PORKBUN_[A-Z_]+)\s*=\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    if (m[1] === 'PORKBUN_API_KEY') key ||= m[2];
    if (m[1] === 'PORKBUN_SECRET_KEY') secret ||= m[2];
  }
  return { key, secret };
}
const { key, secret } = credentials();
async function call(path, body = {}) {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ apikey: key, secretapikey: secret, ...body }) });
  const json = await res.json();
  if (json.status !== 'SUCCESS') throw new Error(`${path}: ${json.message || JSON.stringify(json)}`);
  return json;
}
await call('/ping');
const existing = (await call(`/dns/retrieve/${DOMAIN}`)).records;
const fqdn = (name) => `${name}.${DOMAIN}`;
for (const record of RECORDS) {
  const here = existing.filter((e) => e.name === fqdn(record.name) && e.type === record.type);
  if (here.some((e) => e.content === record.content)) { console.log(`skip    ${record.type} ${fqdn(record.name)}`); continue; }
  for (const wrong of here) { await call(`/dns/delete/${DOMAIN}/${wrong.id}`); console.log(`removed ${wrong.type} ${wrong.name}`); }
  await call(`/dns/create/${DOMAIN}`, { name: record.name, type: record.type, content: record.content, ttl: record.ttl, ...(record.prio ? { prio: record.prio } : {}) });
  console.log(`added   ${record.type} ${fqdn(record.name)} -> ${record.content.slice(0, 60)}${record.prio ? ` (prio ${record.prio})` : ''}`);
}
console.log('done');
