/**
 * PROVE THE SEND PATH, ON ONE INBOX THAT BELONGS TO US.
 *
 *   npx tsx scripts/acq-test-send.mts sarah@modernmustardseed.com
 *
 * Creates one real prospect against the given address, walks it through the
 * ACTUAL path a stranger would take (governor, sender, acq_sends, the event
 * timeline), sends the real bytes, then deletes everything it made.
 *
 * Nobody else is emailed. The address must be one of ours, and the script
 * refuses anything that is not, because "just testing" is how a stranger ends
 * up receiving a cold email nobody meant to send.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const to = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
if (!to.endsWith('@modernmustardseed.com')) {
  console.error(`Refusing to send to ${to || '(nothing)'}. This script only mails a modernmustardseed.com address.`);
  process.exit(1);
}

const { getCampaign, updateAcqSettings, getAcqSettings } = await import('../lib/acq/settings');
const { sendCampaignEmail } = await import('../lib/acq/send');
const { keysFor } = await import('../lib/acq/dedupe');
const { authorize } = await import('../lib/acq/governor');

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

const campaign = await getCampaign();
if (!campaign) throw new Error('No campaign row.');
const before = await getAcqSettings();

console.log(`\nPROVING THE SEND PATH  ->  ${to}\n`);

// A prospect shaped like the ones this campaign actually mails, so the
// personalized variant has something true to say.
const keys = keysFor({ business_name: 'Bigfork Heating & Air', city: 'Bigfork', state: 'MT', phone: '(406) 555-0177', email: to });
const { data: lead, error } = await db
  .from('outbound_leads')
  .insert({
    business_name: 'Bigfork Heating & Air',
    contact_name: 'Sarah Scarano',
    phone: '(406) 555-0177',
    email: to,
    website: 'https://modernmustardseed.com',
    niche: 'home_service',
    trade: 'hvac',
    city: 'Bigfork',
    state: 'MT',
    review_count: 214,
    rating: 4.9,
    emergency_service: true,
    hours: { monday: '8:00 am - 5:00 pm', tuesday: '8:00 am - 5:00 pm', wednesday: '8:00 am - 5:00 pm', thursday: '8:00 am - 5:00 pm', friday: '8:00 am - 5:00 pm' },
    email_status: 'verified',
    email_confidence: 95,
    email_source: 'send-path-proof',
    lead_score: 90,
    status: 'new',
    source: 'acq-send-proof',
    acq_campaign_id: campaign.id,
    acq_stage: 'prospect',
    acq_eligible: true,
    reservoir_state: 'ready',
    notes: 'Created by scripts/acq-test-send.mts to prove the send path. Deleted at the end of the run.',
    ...keys,
  })
  .select('*')
  .single();
if (error || !lead) throw new Error(`Could not create the proof prospect: ${error?.message}`);

const cleanup = async () => {
  await db.from('acq_sends').delete().eq('lead_id', lead.id);
  await db.from('acq_events').delete().eq('lead_id', lead.id);
  await db.from('acq_queue').delete().eq('lead_id', lead.id);
  await db.from('outbound_leads').delete().eq('id', lead.id);
};

try {
  // The engine ships paused, and this proof does not get to change that for
  // anybody else. Unpause, send exactly one, put it straight back.
  await updateAcqSettings({ master_paused: false, email_enabled: true, paused_reason: null });
  await db.from('acq_campaigns').update({ status: 'live' }).eq('id', campaign.id);

  const decision = await authorize({ db, lead, kind: 'campaign', campaign: { ...campaign, status: 'live' } });
  console.log('  GOVERNOR');
  for (const c of decision.checks) console.log(`    ${c.passed ? 'pass' : 'STOP'}  ${c.label}: ${c.detail}`);
  console.log(`\n  verdict: ${decision.allowed ? 'ALLOWED' : `REFUSED (${decision.reason})`}\n`);

  if (decision.allowed) {
    const sent = await sendCampaignEmail(db, { ...campaign, status: 'live' }, lead, 1);
    if (sent.ok) {
      console.log(`  SENT. subject: ${sent.subject}`);
      console.log(`  message id: ${sent.messageId}`);
      const { data: row } = await db.from('acq_sends').select('status,to_email,subject').eq('lead_id', lead.id).maybeSingle();
      console.log(`  recorded in acq_sends: ${row ? `${row.status} -> ${row.to_email}` : 'MISSING'}`);
      const { data: ev } = await db.from('acq_events').select('type,label').eq('lead_id', lead.id);
      console.log(`  timeline: ${(ev ?? []).map((e) => e.type).join(', ') || 'empty'}`);
      console.log(`\n  Check ${to}. That is exactly what a prospect receives.\n`);
    } else {
      console.log(`  NOT SENT: ${sent.error}\n`);
    }
  }
} finally {
  await updateAcqSettings({
    master_paused: before.master_paused,
    email_enabled: before.email_enabled,
    paused_reason: before.paused_reason,
  });
  await db.from('acq_campaigns').update({ status: 'draft' }).eq('id', campaign.id);
  await cleanup();
  const { count } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).eq('id', lead.id);
  console.log(`  cleaned up: ${count === 0 ? 'yes' : 'NO, check lead ' + lead.id}`);
  console.log(`  engine put back to: ${before.master_paused ? 'PAUSED' : 'running'}, campaign back to draft\n`);
}
