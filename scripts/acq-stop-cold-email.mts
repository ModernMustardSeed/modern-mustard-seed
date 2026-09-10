/**
 * STOP COLD EMAIL.
 *
 *   pnpm exec tsx scripts/acq-stop-cold-email.mts           # dry run: what would stop
 *   pnpm exec tsx scripts/acq-stop-cold-email.mts --apply
 *
 * Sarah, 2026-09-10: "The acquisition campaign is killing my email address.
 * Lets terminate the campaign for now and pivot... no more cold email."
 *
 * WHY A SCRIPT AND NOT A SWITCH. The master switch was already off. It went off
 * on 2026-09-08 for this exact reason, and cold email kept going out anyway,
 * because there are three senders and only one of them asks the governor:
 *
 *   acq_queue          campaign and follow-up jobs. Governed. Already held.
 *   outbound_drips     the five email per-lead drip. NOT governed, on purpose:
 *                      `runOutboundDrips` skips authorize() so hand-worked
 *                      outbound survives an acquisition pause. That exemption
 *                      is why 27 leads were still being mailed daily at 18:05
 *                      UTC two days after the engine was stopped.
 *   the senders        a hand send from a card, which carries an override.
 *
 * So stopping cold email means stopping all three, at the data level, where it
 * takes effect on the next cron tick with no deploy:
 *   1. the campaign row goes to 'stopped'
 *   2. every active drip goes to 'stopped' with a reason
 *   3. every pending cold campaign job in acq_queue is cancelled
 *   4. follow-ups are switched off in settings
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH. A hand send from a prospect card still
 * works, because that is a person choosing one person, and the eight prospects
 * who asked for a demo are still owed the thing they asked for. Inbound, the
 * voice line, and anything a lead starts themselves are untouched.
 *
 * Reversible: nothing is deleted. Drips carry `stopped_reason`, queue jobs are
 * cancelled rather than removed, and the campaign row can go back to 'live'.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_CANDIDATES = ['.env.local', resolve('../../products/modern-mustard-seed/.env.local')];
const envFile = ENV_CANDIDATES.find((p) => existsSync(p));
if (!envFile) {
  console.error('No .env.local found. Looked in:\n  ' + ENV_CANDIDATES.join('\n  '));
  process.exit(1);
}
for (const l of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith('[')) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be real values in .env.local.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const apply = process.argv.includes('--apply');
const REASON = 'Cold email stopped 2026-09-10 by Sarah: it was putting her own mail in spam. Pivoting off cold email.';

/* ── 1. the campaign ── */
const { data: campaigns } = await db.from('acq_campaigns').select('id,name,status');
const live = (campaigns ?? []).filter((c) => c.status === 'live');
console.log(`\nCampaigns: ${(campaigns ?? []).map((c) => `${c.name}=${c.status}`).join(', ') || 'none'}`);
console.log(`  ${apply ? 'STOPPING' : 'would stop'} ${live.length}`);

/* ── 2. the drips, which are the ones actually still sending ── */
const { data: drips } = await db.from('outbound_drips').select('id,lead_id,step,next_at,status').eq('status', 'active').limit(5000);
const active = drips ?? [];
const leadIds = [...new Set(active.map((d) => d.lead_id))];
const names = new Map<string, string>();
for (let i = 0; i < leadIds.length; i += 40) {
  const { data } = await db.from('outbound_leads').select('id,business_name').in('id', leadIds.slice(i, i + 40));
  for (const l of (data ?? []) as { id: string; business_name: string }[]) names.set(l.id, l.business_name);
}
console.log(`\nActive drips: ${active.length}. ${apply ? 'Stopping' : 'Would stop'} all of them.`);
for (const d of active.sort((a, b) => (a.next_at ?? '').localeCompare(b.next_at ?? ''))) {
  console.log(`  step ${d.step}/5, next ${(d.next_at ?? '').slice(0, 10)}  ${names.get(d.lead_id) ?? d.lead_id}`);
}

/* ── 3. the queued cold campaign jobs ── */
const { data: pending } = await db.from('acq_queue').select('id,kind').eq('status', 'pending').in('kind', ['email', 'followup']).limit(5000);
const byKind: Record<string, number> = {};
for (const j of pending ?? []) byKind[j.kind] = (byKind[j.kind] ?? 0) + 1;
console.log(`\nQueued cold jobs: ${JSON.stringify(byKind)} (${(pending ?? []).length} total). ${apply ? 'Cancelling' : 'Would cancel'} them.`);

/* ── 4. settings ── */
const { data: st } = await db.from('acq_settings').select('*').limit(1);
const s = st?.[0] as Record<string, unknown> | undefined;
console.log(`\nSettings now: master_paused=${s?.master_paused} email_enabled=${s?.email_enabled} followups_enabled=${s?.followups_enabled}`);
console.log(`  ${apply ? 'SETTING' : 'would set'} master_paused=true, email_enabled=false, followups_enabled=false`);

if (!apply) {
  console.log('\nDry run. Add --apply to stop it.');
  process.exit(0);
}

let errs = 0;
const say = (what: string, error: { message: string } | null) => {
  if (error) { errs++; console.log(`  FAILED ${what}: ${error.message}`); }
  else console.log(`  done: ${what}`);
};

console.log('\nApplying:');
for (const c of live) {
  const { error } = await db.from('acq_campaigns').update({ status: 'stopped', paused_at: new Date().toISOString() }).eq('id', c.id);
  say(`campaign ${c.name} -> stopped`, error);
}
if (active.length) {
  const { error } = await db
    .from('outbound_drips')
    .update({ status: 'stopped', stopped_reason: REASON, updated_at: new Date().toISOString() })
    .eq('status', 'active');
  say(`${active.length} drips -> stopped`, error);
}
if ((pending ?? []).length) {
  const { error } = await db
    .from('acq_queue')
    .update({ status: 'cancelled', error: REASON })
    .eq('status', 'pending')
    .in('kind', ['email', 'followup']);
  say(`${(pending ?? []).length} queued cold jobs -> cancelled`, error);
}
if (s) {
  const { error } = await db
    .from('acq_settings')
    .update({ master_paused: true, email_enabled: false, followups_enabled: false, paused_reason: REASON, updated_at: new Date().toISOString() })
    .eq('id', s.id as string);
  say('settings -> paused, email off, follow-ups off', error);
}

console.log(errs ? `\n${errs} step(s) failed. Read them above.` : '\nCold email is stopped. A hand send from a prospect card still works.');
