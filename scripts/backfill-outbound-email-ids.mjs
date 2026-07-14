/**
 * Give the outbound cockpit's EXISTING sends their proof back.
 *
 * Until now, sendOutboundEmail wrote the thread row without the Resend message
 * id, so a lead's history said "Sent an intro email." and nothing could check
 * that claim. The Sent store (`emails`) did keep the id, the html, and the
 * delivery status for the same message. This script re-links the two: for every
 * outbound email on an outbound lead's thread that has no external_id, it finds
 * the Sent row with the same recipient and subject sent within a couple of
 * minutes, and stamps that Resend id (and its status) onto the message.
 *
 * After this, "View the email" and the live delivery check work on the mail
 * Sarah already sent, not just on new sends.
 *
 * Run: node scripts/backfill-outbound-email-ids.mjs [--apply]
 * Dry-run by default. Idempotent: it only ever fills a NULL external_id.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!SUPABASE_URL || !KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const WINDOW_MS = 120_000; // the message row is written right after the send
const norm = (a) => (a || '').trim().toLowerCase();

async function rest(path, init) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const msgs = await rest(
  'messages?select=id,outbound_lead_id,to_addr,subject,occurred_at,external_id,status' +
    '&outbound_lead_id=not.is.null&direction=eq.outbound&channel=eq.email&external_id=is.null&order=occurred_at.desc',
);
const sent = await rest(
  'emails?select=provider_message_id,to_addrs,subject,status,occurred_at' +
    '&folder=eq.sent&provider=eq.resend&provider_message_id=not.is.null&order=occurred_at.desc&limit=1000',
);

// An id already on a thread must never be claimed by a second message.
const taken = new Set(
  (await rest('messages?select=external_id&external_id=not.is.null')).map((m) => m.external_id),
);

let matched = 0;
const plan = [];
for (const m of msgs) {
  const when = Date.parse(m.occurred_at);
  const candidates = sent
    .filter(
      (e) =>
        !taken.has(e.provider_message_id) &&
        norm(e.to_addrs) === norm(m.to_addr) &&
        norm(e.subject) === norm(m.subject) &&
        Math.abs(Date.parse(e.occurred_at) - when) <= WINDOW_MS,
    )
    .sort((a, b) => Math.abs(Date.parse(a.occurred_at) - when) - Math.abs(Date.parse(b.occurred_at) - when));

  const hit = candidates[0];
  if (!hit) {
    console.log(`  no match: ${m.occurred_at}  ${m.to_addr}  "${String(m.subject).slice(0, 42)}"`);
    continue;
  }
  taken.add(hit.provider_message_id);
  matched++;
  plan.push({ id: m.id, external_id: hit.provider_message_id, status: hit.status || 'sent' });
  console.log(`  match:    ${m.to_addr.padEnd(32)} -> ${hit.provider_message_id}  (${hit.status || 'sent'})`);
}

console.log(`\n${matched}/${msgs.length} thread emails matched to a Resend id.`);

if (!APPLY) {
  console.log('Dry run. Re-run with --apply to write them.');
  process.exit(0);
}

for (const p of plan) {
  await rest(`messages?id=eq.${p.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ external_id: p.external_id, status: p.status }),
  });
}
console.log(`Wrote ${plan.length} message rows.`);
