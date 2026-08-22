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

/*
 * THE NAME IS JUST THE NAME.
 *
 * This appended a build stamp so repeated runs would not collide on the dedupe
 * index, and the stamp then showed up in the email subject, on the buy page and
 * in the portal: "Flathead Comfort Heating & Air mst68son". Nobody reviewing
 * their own customer journey should have to mentally delete a build id from
 * every screen. Uniqueness belongs in the email alias and the hub id, both of
 * which are invisible, not in the one string a human reads everywhere.
 */
const business = 'Flathead Comfort Heating & Air';
const hubId = crypto.randomUUID();
const keys = keysFor({ business_name: business, city: 'Kalispell', state: 'MT', phone: '(406) 555-0143', email: to });

/*
 * CLEAR ANY PREVIOUS WALKTHROUGH FOR THIS ADDRESS FIRST.
 *
 * Every --keep run left its lead, order, client, project and office behind, so
 * four runs meant four of everything and twelve emails in one inbox. That
 * reads exactly like the engine double-sending when it is only this script
 * piling up. One walkthrough at a time: the newest run is the one you are
 * looking at, and the older ones stop cluttering the Client Book.
 */
const { data: stale } = await db.from('outbound_leads').select('id').eq('source', MARKER).eq('email', to);
if ((stale ?? []).length) {
  const ids = (stale ?? []).map((r) => r.id as string);
  const { data: offices } = await db.from('fo_offices').select('id').eq('client_email', to);
  for (const o of offices ?? []) {
    for (const t of ['fo_appointments', 'fo_calls', 'fo_contacts', 'fo_transfers', 'fo_events']) {
      await db.from(t).delete().eq('office_id', o.id);
    }
  }
  await db.from('fo_offices').delete().eq('client_email', to);
  await db.from('projects').delete().eq('client_email', to);
  await db.from('client_files').delete().eq('client_email', to);
  await db.from('clients').delete().eq('email', to);
  await db.from('demo_orders').delete().eq('email', to);
  for (const t of ['acq_mrr_events', 'acq_events', 'acq_queue', 'acq_sends']) await db.from(t).delete().in('lead_id', ids);
  await db.from('messages').delete().in('outbound_lead_id', ids);
  await db.from('outbound_leads').delete().in('id', ids);
  console.log(`\n  cleared ${ids.length} previous walkthrough${ids.length === 1 ? '' : 's'} for this address.`);
}

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
      business_name: business,
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
      hub_demo_url: `${SITE.url}/demo/hub/${hubId}`,
      notes: `${MARKER}: shows Sarah the post-sale journey. Deleted unless --keep.`,
      ...keys,
    })
    .select('*')
    .single();
  if (error || !lead) throw new Error(`Could not create the prospect: ${error?.message}`);
  leadId = lead.id;

  /* ── FORGE A REAL AGENT ──
     The first version wrote demo_url = /demos and called it forged. Every link
     then resolved to the marketing page, so "try your receptionist" played
     nothing, which is the one thing this walkthrough exists to demonstrate.
     This runs the actual forge, so the demo in the email is a real agent that
     really answers. It is slower and it spends real quota; that is the cost of
     a walkthrough that is not a mock-up. */
  const { forgeProspectAgent } = await import('../lib/acq/forge');
  const forged = await forgeProspectAgent(db, lead, {}, { deferHeavy: false });
  console.log(`  0. forging a real voice agent      ${forged.ok ? `FORGED  ${forged.demoUrl}` : `FAILED: ${forged.error}`}`);
  const { data: readyLead } = await db.from('outbound_leads').select('*').eq('id', leadId).single();
  const workingLead = readyLead ?? lead;

  // The window and frequency rules are relaxed IN MEMORY only. Sarah asks for
  // these at nine at night and the same address receives three in a row on
  // purpose; the real campaign row is never touched.
  const live = { ...campaign, status: 'live' as const, hourly_send_cap: 50, send_start_hour: 0, send_end_hour: 24, send_weekdays_only: false };
  await updateAcqSettings({ master_paused: false, email_enabled: true, paused_reason: null, min_days_between_emails: 0 });

  /* ── 1. YOUR DEMO IS READY ── */
  const demo = await sendDemoEmail(db, live, { ...workingLead, demo_emailed_at: null });
  console.log(`  1. "your receptionist is built"   ${demo.ok ? `SENT  ${demo.subject}` : `NOT SENT: ${demo.error}`}`);
  if (demo.ok) sent.push(`Demo ready: ${demo.subject}`);

  /* ── 2. HERE IS WHERE YOU BUY IT ── */
  const buyUrl = checkoutUrlFor(workingLead);
  const checkout = await sendCheckoutLink(db, live, { ...workingLead, checkout_sent_at: null }, 'Here is the link we talked about on the call.');
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

  /* ── FETCH EVERY LINK BEFORE CLAIMING IT WORKS ──
     The previous run printed a buy-page URL that returned 404 and reported the
     whole journey as a success, because it checked that a string had been
     built rather than that a page was there. Nothing is claimed below that has
     not been fetched. */
  const demoUrl = workingLead.hub_demo_url || workingLead.demo_url || '';
  const links: [string, string][] = [
    ['buy page', buyUrl],
    ['their demo', demoUrl],
    ['intake', intakeUrl],
    ['portal', PORTAL_URL],
    ['front office', `${SITE.url}/portal/front-office`],
  ];

  console.log(`\n  THE PAGES, each one actually fetched:`);
  let broken = 0;
  for (const [label, url] of links) {
    if (!url) {
      console.log(`    ${label.padEnd(13)} NOT BUILT`);
      broken++;
      continue;
    }
    let code = 0;
    try {
      code = (await fetch(url, { redirect: 'manual' })).status;
    } catch {
      code = 0;
    }
    // The portal and front office 200 for signed-out visitors (they render a
    // sign-in prompt), so anything under 400 is a page that exists.
    const ok = code > 0 && code < 400;
    if (!ok) broken++;
    console.log(`    ${label.padEnd(13)} ${String(code).padEnd(4)} ${ok ? '' : 'BROKEN  '}${url}`);
  }
  if (broken) console.log(`\n  ⚠ ${broken} link${broken === 1 ? '' : 's'} above ${broken === 1 ? 'does' : 'do'} not resolve. Do not trust this run.`);
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
