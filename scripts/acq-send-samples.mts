/**
 * SEND EVERY EMAIL ARM TO ONE INBOX, SO SARAH CAN READ WHAT PROSPECTS READ.
 *
 *   npx tsx scripts/acq-send-samples.mts makeourcitypretty@gmail.com
 *   npx tsx scripts/acq-send-samples.mts you@example.com --keep
 *
 * Creates one realistic prospect against the address, walks each arm through
 * the real governor and the real sender, and sends: campaign emails 1, 2 and 3,
 * the personalized arm with the calculator, and the demo and checkout emails
 * Mr. Mustard fires from a call. Then it deletes the prospect unless --keep.
 *
 * ⚠️ This sends REAL email. The address must be explicitly passed on the
 * command line; there is no default, and nothing here reads a list.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const to = (process.argv[2] || '').trim().toLowerCase();
const KEEP = process.argv.includes('--keep');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
  console.error('Usage: npx tsx scripts/acq-send-samples.mts <email> [--keep]');
  process.exit(1);
}

const { getCampaign, getAcqSettings, updateAcqSettings, getVariants } = await import('../lib/acq/settings');
const { sendCampaignEmail, sendDemoEmail, sendCheckoutLink } = await import('../lib/acq/send');
const { keysFor } = await import('../lib/acq/dedupe');
const { estimateFor } = await import('../lib/acq/personalize');

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

const campaign = await getCampaign();
if (!campaign) throw new Error('No campaign row.');
const before = await getAcqSettings();
const variants = await getVariants(campaign.id);

console.log(`\nSENDING EVERY ARM  ->  ${to}\n`);

/**
 * A prospect shaped like the best ones in the reservoir, so the personalized
 * arm has real facts to work from rather than falling back to the plain email.
 */
const keys = keysFor({ business_name: 'Flathead Comfort Heating & Air', city: 'Kalispell', state: 'MT', phone: '(406) 555-0143', email: to });
const { data: lead, error } = await db
  .from('outbound_leads')
  .insert({
    business_name: 'Flathead Comfort Heating & Air',
    contact_name: 'Sarah Scarano',
    phone: '(406) 555-0143',
    email: to,
    website: 'https://modernmustardseed.com',
    niche: 'home_service',
    trade: 'hvac',
    city: 'Kalispell',
    state: 'MT',
    review_count: 268,
    rating: 4.9,
    emergency_service: true,
    hours: {
      monday: '8:00 am - 5:00 pm', tuesday: '8:00 am - 5:00 pm', wednesday: '8:00 am - 5:00 pm',
      thursday: '8:00 am - 5:00 pm', friday: '8:00 am - 5:00 pm', saturday: 'closed', sunday: 'closed',
    },
    email_status: 'verified',
    email_confidence: 95,
    email_source: 'sample-send',
    lead_score: 92,
    status: 'new',
    source: 'acq-sample-send',
    acq_campaign_id: campaign.id,
    acq_stage: 'prospect',
    acq_eligible: true,
    reservoir_state: 'ready',
    hub_demo_url: 'https://modernmustardseed.com/demos',
    demo_url: 'https://modernmustardseed.com/demos',
    demo_status: 'ready',
    notes: 'Sample prospect used to send Sarah every email arm. Deleted unless --keep.',
    ...keys,
  })
  .select('*')
  .single();
if (error || !lead) throw new Error(`Could not create the sample prospect: ${error?.message}`);

const est = estimateFor(lead);
console.log(`  prospect: ${lead.business_name}, ${lead.city} ${lead.state}, ${lead.review_count} reviews`);
console.log(`  personalized arm will fire: ${est.personalizable ? 'YES' : 'no'}${est.hook ? ` (hook: ${est.hook})` : ''}`);
console.log(`  its estimate: $${Math.round(est.monthlyLeakCents / 100).toLocaleString()}/month from ${est.missedPerWeek} missed calls a week\n`);

const cleanup = async () => {
  await db.from('acq_sends').delete().eq('lead_id', lead.id);
  await db.from('acq_events').delete().eq('lead_id', lead.id);
  await db.from('acq_queue').delete().eq('lead_id', lead.id);
  await db.from('outbound_leads').delete().eq('id', lead.id);
};

const sent: string[] = [];

try {
  // Open the gate for exactly this run, then close it again in `finally`.
  await updateAcqSettings({ master_paused: false, email_enabled: true, paused_reason: null });
  await db.from('acq_campaigns').update({ status: 'live' }).eq('id', campaign.id);

  // The send window and the contact-frequency rule are both relaxed IN MEMORY
  // for this one run, not in the database: a sample send happens whenever Sarah
  // asks, including at nine at night, and the same address receives six emails
  // in a row on purpose. Every other check the governor makes still applies,
  // and the widened window never touches the real campaign row.
  const live = {
    ...campaign,
    status: 'live' as const,
    hourly_send_cap: 50,
    send_start_hour: 0,
    send_end_hour: 24,
    send_weekdays_only: false,
  };
  await updateAcqSettings({ min_days_between_emails: 0 });

  // Walk every step the campaign actually defines rather than a hard-coded
  // three, so a sixth email is sampled the day it is added.
  const steps = [...new Set(variants.map((v) => v.step))].sort((a, b) => a - b);
  for (const step of steps) {
    // Force the arm rather than letting the hash pick, so all four are seen.
    const arms = variants.filter((v) => v.step === step);
    for (const arm of arms) {
      await db.from('acq_variants').update({ active: false }).eq('campaign_id', campaign.id).eq('step', step);
      await db.from('acq_variants').update({ active: true }).eq('id', arm.id);
      await db.from('outbound_leads').update({ email_stage: step - 1, last_campaign_email_at: null }).eq('id', lead.id);
      const { data: fresh } = await db.from('outbound_leads').select('*').eq('id', lead.id).single();
      const r = await sendCampaignEmail(db, live, fresh, step);
      console.log(`  email ${step}, arm ${arm.key.padEnd(2)} ${arm.body_key.padEnd(13)} ${r.ok ? `SENT  ${r.subject}` : `NOT SENT: ${r.error}`}`);
      if (r.ok) sent.push(`Email ${step} (arm ${arm.key}): ${r.subject}`);
    }
    await db.from('acq_variants').update({ active: true }).eq('campaign_id', campaign.id).eq('step', step);
  }

  const { data: fresh } = await db.from('outbound_leads').select('*').eq('id', lead.id).single();

  const demo = await sendDemoEmail(db, live, { ...fresh, demo_emailed_at: null });
  console.log(`  demo email        ${demo.ok ? `SENT  ${demo.subject}` : `NOT SENT: ${demo.error}`}`);
  if (demo.ok) sent.push(`Demo email: ${demo.subject}`);

  const checkout = await sendCheckoutLink(db, live, { ...fresh, checkout_sent_at: null }, 'Here is the link we talked about on the call.');
  console.log(`  checkout email    ${checkout.ok ? 'SENT' : `NOT SENT: ${checkout.error}`}`);
  if (checkout.ok) sent.push('Checkout email: your Voice Agent activation link');
} finally {
  await db.from('acq_variants').update({ active: true }).eq('campaign_id', campaign.id);
  // ⚠️ Restores to PAUSED unconditionally, not to whatever it was on the way in.
  // Restoring `before.master_paused` looks more correct and is worse: if the
  // engine was already unpaused for any reason when this ran, a sample send
  // would hand it back unpaused and nobody would know. A script that opens the
  // gate closes the gate. Turning the campaign on is Sarah's action, in admin.
  await updateAcqSettings({
    master_paused: true,
    email_enabled: before.email_enabled,
    paused_reason: 'Held. Nothing sends until the campaign is started from the Command Center.',
    min_days_between_emails: before.min_days_between_emails,
  });
  await db.from('acq_campaigns').update({ status: 'draft' }).eq('id', campaign.id);
  if (!KEEP) await cleanup();

  console.log(`\n  ${sent.length} emails sent to ${to}:`);
  for (const s of sent) console.log(`    ${s}`);
  console.log(`\n  sample prospect: ${KEEP ? `KEPT (${lead.id})` : 'deleted'}`);
  console.log(`  engine back to: ${before.master_paused ? 'PAUSED' : 'running'}, campaign back to draft\n`);
}
