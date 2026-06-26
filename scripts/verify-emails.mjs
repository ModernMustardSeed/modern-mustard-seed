/**
 * Verify every prospect email with Hunter's verifier so we only ever send to
 * good addresses (bounces wreck sender reputation). Undeliverable emails are
 * CLEARED (the lead keeps its website + phone, so it is still callable) and the
 * reason is noted; risky/unknown are kept but flagged. Additive: never touches
 * audits, status, or links.
 *
 * Run:  HUNTER_API_KEY=xxx node scripts/verify-emails.mjs           (preview)
 *       HUNTER_API_KEY=xxx node scripts/verify-emails.mjs --apply   (write)
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const get = (k) => { for (const l of env.split(/\r?\n/)) { if (l.toLowerCase().startsWith(k.toLowerCase() + '=')) { let v = l.slice(k.length + 1).trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return v; } } return ''; };
const HUNTER = process.env.HUNTER_API_KEY || get('HUNTER_API_KEY');
if (!HUNTER) throw new Error('HUNTER_API_KEY required (env or .env.local)');
const sb = createClient(get('supabase_url'), get('supabase_service_role_key'), { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function verify(email) {
  try {
    const res = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (res.status === 429) { await sleep(2000); return verify(email); }
    if (!res.ok) return { result: 'unknown' };
    const j = await res.json();
    return { result: j.data?.result ?? 'unknown', status: j.data?.status ?? '' };
  } catch { return { result: 'unknown' }; }
}

const { data: rows } = await sb.from('rep_prospects').select('id,email,notes').not('email', 'is', null).order('created_at');
console.log(`verifying ${rows.length} emails${APPLY ? '' : ' (PREVIEW)'}...`);
const tally = { deliverable: 0, risky: 0, undeliverable: 0, unknown: 0 };
let cleared = 0, done = 0;
for (const r of rows) {
  const { result } = await verify(r.email);
  tally[result] = (tally[result] ?? 0) + 1;
  if (result === 'undeliverable') {
    cleared++;
    if (APPLY) {
      const note = `${r.notes ? r.notes + '\n' : ''}[email ${r.email} cleared: undeliverable ${new Date().toISOString().slice(0, 10)}]`.slice(0, 2000);
      await sb.from('rep_prospects').update({ email: null, notes: note, updated_at: new Date().toISOString() }).eq('id', r.id);
    }
  } else if (result === 'risky' && APPLY) {
    const note = `${r.notes ? r.notes + '\n' : ''}[email risky per verifier, double-check before sending]`.slice(0, 2000);
    await sb.from('rep_prospects').update({ notes: note }).eq('id', r.id);
  }
  done++;
  if (done % 40 === 0) console.log(`...${done}/${rows.length} | deliverable ${tally.deliverable} risky ${tally.risky} undeliverable ${tally.undeliverable}`);
  await sleep(250);
}
console.log(`\nDONE. ${JSON.stringify(tally)}`);
console.log(APPLY ? `cleared ${cleared} undeliverable emails (leads kept, still callable).` : `would clear ${cleared} undeliverable. Re-run with --apply.`);
