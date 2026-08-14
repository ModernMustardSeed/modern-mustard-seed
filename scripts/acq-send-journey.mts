/**
 * SEND THE POST-SALE JOURNEY TO ONE INBOX, SO SARAH CAN SEE WHAT A BUYER SEES.
 *
 * acq-send-samples.mts covers the cold sequence, the emails that get somebody
 * to say yes. This covers what happens after: the demo is ready, here is where
 * you buy it, and here is your account now that you have.
 *
 *   npx tsx scripts/acq-send-journey.mts you@example.com
 *   npx tsx scripts/acq-send-journey.mts you@example.com --keep
 *
 * It creates a real prospect, a real paid order, a real client, a real project
 * and a real Front Office, sends the three emails those steps actually fire,
 * prints the buy page and portal URLs, and then deletes all of it.
 *
 * ⚠ SENDS REAL EMAIL to the address on the command line. No card is charged:
 * the order is marked paid directly, the way the Stripe webhook would.
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
  console.error('Usage: npx tsx scripts/acq-send-journey.mts <email> [--keep]');
  process.exit(1);
}

const MARKER = 'journey';
const STAMP = Date.now().toString(36);

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

const { getCampaign, getAcqSettings, updateAcqSettings } = await import('../lib/acq/settings');
const { sendDemoEmail, sendCheckoutLink, checkoutUrlFor } = await import('../lib/acq/send');
const { keysFor } = await import('../lib/acq/dedupe');
const { OFFER } = await import('../lib/acq/types');
const { SITE } = await import('../lib/seo');

const campaign = await getCampaign();
if (!campaign) throw new Error('No campaign row.');
const before = await getAcqSettings();

const business = `Flathead Comfort Heating & Air`;
const hubId = crypto.randomUUID();
const keys = keysFor({ business_name: `${business} ${STAMP}`, city: 'Kalispell', state: 'MT', phone: '(406) 555-0143', email: to });

console.log(`\nTHE BUYER'S JOURNEY  ->  ${to}\n`);

let leadId: string | null = null;
let orderId: string | null = null;
let officeId: string | null = null;
let projectId: string | null = null;
const sent: string[] = [];

try {
  /* ── the prospect, already demoed ── */
  const { data: lead, error } = await db
    .from('outbound_leads')
    .insert({
      business_name: `${business} ${STAMP}`,
      contact_name: 'Sarah Scarano',
      contact_title: 'Owner',
      phone: '(406) 555-0143',
      email: to,
      website: 'https://flatheadcomfort.example.com',
      address: '812 Second Street East, Kalispell, MT 59901',
      city: 'Kalispell',
      state: 'MT',
      niche: 'home_service',
      trade: 'hvac',
      review_count: 268,
      rating: 4.9,
      emergency_service: true,
      service_area: 'Flathead Valley and Whitefish',
      hours: { monday: '8:00 am - 5:00 pm', tuesday: '8:00 am - 5:00 pm', wednesday: '8:00 am - 5:00 pm', thursday: '8:00 am - 5:00 pm', friday: '8:00 am - 5:00 pm' },
      email_status: 'verified',
      email_confidence: 95,
      lead_score: 92,
      status: 'new',
      source: MARKER,
      acq_campaign_id: campaign.id,
      acq_stage: 'forged',
      acq_eligible: true,
      consent_status: 'granted',
      hub_demo_id: hubId,
      hub_demo_url: `${SITE.url}/demo/order/${hubId}`,
      demo_url: `${SITE.url}/demos`,
      demo_status: 'ready',
      notes: `${MARKER}: shows Sarah the post-sale journey. Deleted unless --keep.`,
      ...keys,
    })
    .select('*')
    .single();
  if (error || !lead) throw new Error(`Could not create the prospect: ${error?.message}`);
  leadId = lead.id;

  // The window and frequency rules are relaxed IN MEMORY only. Sarah asks for
  // these at nine at night and the same address receives three in a row on
  // purpose; the real campaign row is never touched.
  const live = { ...campaign, status: 'live' as const, hourly_send_cap: 50, send_start_hour: 0, send_end_hour: 24, send_weekdays_only: false };
  await updateAcqSettings({ master_paused: false, email_enabled: true, paused_reason: null, min_days_between_emails: 0 });

  /* ── 1. YOUR DEMO IS READY ── */
  const demo = await sendDemoEmail(db, live, { ...lead, demo_emailed_at: null });
  console.log(`  1. "your receptionist is built"   ${demo.ok ? `SENT  ${demo.subject}` : `NOT SENT: ${demo.error}`}`);
  if (demo.ok) sent.push(`Demo ready: ${demo.subject}`);

  /* ── 2. HERE IS WHERE YOU BUY IT ── */
  const buyUrl = checkoutUrlFor(lead);
  const checkout = await sendCheckoutLink(db, live, { ...lead, checkout_sent_at: null }, 'Here is the link we talked about on the call.');
  console.log(`  2. "your activation link"         ${checkout.ok ? 'SENT' : `NOT SENT: ${checkout.error}`}`);
  if (checkout.ok) sent.push('Checkout link: your Voice Agent activation link');

  /* ── 3. THEY BUY (no card charged; this is the webhook's own update) ── */
  const { data: order } = await db
    .from('demo_orders')
    .insert({
      outbound_lead_id: leadId,
      hub_demo_id: hubId,
      business_name: lead.business_name,
      email: to,
      name: 'Sarah Scarano',
      phone: lead.phone,
      products: ['voice'],
      setup_cents: OFFER.setupCents,
      monthly_cents: OFFER.monthlyCents,
      status: 'pending',
      stripe_session_id: `cs_${MARKER}_${STAMP}`,
    })
    .select('*')
    .single();
  orderId = order?.id ?? null;

  const { data: paid } = await db
    .from('demo_orders')
    .update({ status: 'paid', stripe_subscription_id: `sub_${MARKER}_${STAMP}` })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  console.log(`  3. payment                        ${paid ? 'MARKED PAID (no card was charged)' : 'FAILED'}`);

  /* ── 4. DELIVERY: the portal, and the welcome email it sends ── */
  const { provisionDemoOrder, portalWelcomeBody, PORTAL_URL } = await import('../lib/demo-provision');
  const prov = await provisionDemoOrder(db, { ...paid! });
  projectId = prov.ok ? prov.projectId : null;
  console.log(`  4. client + project + portal      ${prov.ok ? `CREATED  project ${prov.projectId}` : `FAILED: ${prov.error}`}`);

  const { provisionFrontOffice } = await import('../lib/front-office/provision');
  const office = await provisionFrontOffice(db, {
    clientEmail: to,
    businessName: lead.business_name,
    outboundLeadId: leadId,
    demoOrderId: orderId,
    projectId,
    voiceGender: 'female',
    trade: 'hvac',
    phone: lead.phone,
    hours: lead.hours,
    serviceArea: lead.service_area,
    website: lead.website,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    rating: lead.rating,
    reviewCount: lead.review_count,
    emergencyService: lead.emergency_service,
    contactName: lead.contact_name,
    contactTitle: lead.contact_title,
  });
  officeId = office.ok ? office.officeId : null;
  console.log(`  5. Front Office                   ${office.ok ? `BUILT  ${office.officeId}` : `FAILED: ${office.error}`}`);

  const intakeUrl = `${SITE.url}/demo/order/${hubId}/thanks?session_id=cs_${MARKER}_${STAMP}`;
  const welcome = portalWelcomeBody({ firstName: 'Sarah', business: lead.business_name, intakeUrl });
  const { resendClient } = await import('../lib/send-email');
  const { clientEmail } = await import('../lib/email');
  const resend = resendClient();
  if (resend) {
    const { error: werr } = await resend.emails.send({
      from: `Sarah at Modern Mustard Seed <${campaign.from_email}>`,
      to,
      replyTo: campaign.reply_to,
      subject: `Welcome aboard, ${lead.business_name}`,
      html: clientEmail({ preheader: 'Your portal is open. One thing to fill in.', greeting: welcome.greeting, body: welcome.body, cta: welcome.cta, signature: 'Sarah' }),
    });
    console.log(`  6. "welcome aboard" + intake      ${werr ? `NOT SENT: ${JSON.stringify(werr)}` : 'SENT'}`);
    if (!werr) sent.push('Welcome aboard, with the intake link');
  }

  console.log(`\n  THE PAGES, open these in a browser:`);
  console.log(`    buy page      ${buyUrl}`);
  console.log(`    intake        ${intakeUrl}`);
  console.log(`    their portal  ${PORTAL_URL}   (sign in as ${to})`);
  console.log(`    front office  ${SITE.url}/portal/front-office`);
} finally {
  await updateAcqSettings({
    master_paused: before.master_paused,
    email_enabled: before.email_enabled,
    paused_reason: before.paused_reason,
    min_days_between_emails: before.min_days_between_emails,
  });

  if (!KEEP) {
    if (officeId) {
      for (const t of ['fo_appointments', 'fo_calls', 'fo_contacts', 'fo_transfers', 'fo_events']) await db.from(t).delete().eq('office_id', officeId);
      await db.from('fo_offices').delete().eq('id', officeId);
    }
    if (projectId) await db.from('projects').delete().eq('id', projectId);
    await db.from('client_files').delete().eq('client_email', to);
    await db.from('clients').delete().eq('email', to);
    if (orderId) await db.from('demo_orders').delete().eq('id', orderId);
    if (leadId) {
      for (const t of ['acq_mrr_events', 'acq_events', 'acq_queue', 'acq_sends']) await db.from(t).delete().eq('lead_id', leadId);
      await db.from('messages').delete().eq('outbound_lead_id', leadId);
      await db.from('outbound_leads').delete().eq('id', leadId);
    }
    console.log('\n  Cleaned up. The emails stay in your inbox; nothing is left in the system.');
  } else {
    console.log(`\n  --keep: lead ${leadId}, order ${orderId}, office ${officeId} left in place.`);
  }

  console.log(`\n  ${sent.length} emails sent to ${to}:`);
  for (const s of sent) console.log(`    ${s}`);
  console.log(`\n  engine restored to: ${before.master_paused ? 'PAUSED' : 'running'}\n`);
}
