/**
 * BACKFILL: Demo Station signups that never made it into the CRM pipeline.
 *
 * Self-serve signups used to land only on the dial floor (outbound_leads), so
 * the command center at /admin (which reads public.leads) never counted them.
 * lib/outbound-pipeline.ts now syncs them at signup; this catches the ones that
 * arrived before that shipped.
 *
 * Dry-run by default. Apply with --apply.
 * Internal test rows (our own addresses, "delete me" names) are skipped unless
 * you pass --include-tests, or they would pollute the owner's real lead counts.
 *
 *   node scripts/backfill-demo-station-pipeline.mjs
 *   node scripts/backfill-demo-station-pipeline.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const INCLUDE_TESTS = process.argv.includes('--include-tests');

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '').replace(/\\\$/g, '$')];
    }),
);
const pick = (...names) => names.map((n) => env[n] ?? env[n.toLowerCase()]).find(Boolean);
const sb = createClient(pick('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'), pick('SUPABASE_SERVICE_ROLE_KEY'));

/** Ours, not a prospect's. */
const INTERNAL = /(makeourcitypretty@gmail\.com|@modernmustardseed\.com|delete me|^TEST |TEST Roofing)/i;

const STATUS_MAP = { new: 'new', contacted: 'new', callback: 'new', demo_booked: 'booked', pilot_live: 'booked', won: 'won', lost: 'lost', dnc: 'archived' };
const phoneKey = (p) => (p ?? '').replace(/\D/g, '').slice(-10);

const { data: leads, error } = await sb
  .from('outbound_leads')
  .select('*')
  .eq('source', 'demo-station')
  .is('pipeline_lead_id', null)
  .order('created_at', { ascending: true });
if (error) throw new Error(error.message);

console.log(`${leads.length} demo-station lead(s) with no pipeline row.\n`);

let done = 0;
let skipped = 0;
for (const lead of leads) {
  const internal = INTERNAL.test(`${lead.email ?? ''} ${lead.business_name ?? ''}`);
  if (internal && !INCLUDE_TESTS) {
    console.log(`  skip (internal/test)  ${lead.business_name}  <${lead.email ?? 'no email'}>`);
    skipped++;
    continue;
  }
  if (!lead.email && !lead.phone) {
    console.log(`  skip (no contact)     ${lead.business_name}`);
    skipped++;
    continue;
  }

  const status = STATUS_MAP[lead.status] ?? 'new';
  const fields = {
    status,
    email: lead.email ?? '',
    phone: lead.phone,
    business_name: lead.business_name,
    name: lead.contact_name,
    audit_url: lead.website || lead.audit_url,
    audit_score: lead.audit_score,
    notes: lead.notes,
    follow_up_at: ['won', 'lost', 'archived'].includes(status) ? null : new Date(Date.now() + 2 * 86400000).toISOString(),
  };

  // Same dedupe as lib/outbound-pipeline.ts: email, then phone.
  let existingId = null;
  if (lead.email) {
    const { data } = await sb.from('leads').select('id').eq('email', lead.email).order('created_at', { ascending: false }).limit(1).maybeSingle();
    existingId = data?.id ?? null;
  }
  if (!existingId && lead.phone) {
    const { data } = await sb.from('leads').select('id, phone').not('phone', 'is', null).order('created_at', { ascending: false }).limit(500);
    const key = phoneKey(lead.phone);
    existingId = (data ?? []).find((l) => l.phone && phoneKey(l.phone) === key)?.id ?? null;
  }

  const action = existingId ? 'link to existing pipeline lead' : 'CREATE pipeline lead';
  console.log(`  ${APPLY ? 'apply' : 'would'}: ${action.padEnd(30)} ${lead.business_name}  <${lead.email ?? lead.phone}>  (${lead.created_at.slice(0, 10)})`);

  if (!APPLY) {
    done++;
    continue;
  }

  let pipelineId = existingId;
  if (existingId) {
    const { error: e } = await sb.from('leads').update(fields).eq('id', existingId);
    if (e) {
      console.error(`     failed: ${e.message}`);
      continue;
    }
  } else {
    const { data, error: e } = await sb.from('leads').insert({ type: 'contact', source: 'demo-station', ...fields }).select('id').single();
    if (e || !data) {
      console.error(`     failed: ${e?.message}`);
      continue;
    }
    pipelineId = data.id;
  }
  const { error: e2 } = await sb.from('outbound_leads').update({ pipeline_lead_id: pipelineId }).eq('id', lead.id);
  if (e2) console.error(`     link failed: ${e2.message}`);
  else done++;
}

console.log(`\n${APPLY ? 'Synced' : 'Would sync'} ${done}, skipped ${skipped}.`);
if (!APPLY && done) console.log('Re-run with --apply to write.');
