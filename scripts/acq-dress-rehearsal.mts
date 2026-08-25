/**
 * DRIVE THE WHOLE FUNNEL, END TO END, WITH A PRETEND CUSTOMER.
 *
 * The nightly rehearsal (acq-rehearsal.mts) proves each guard holds. This
 * proves the CHAIN holds: that a stranger can go all the way from a sourced
 * prospect to a paying customer with a working receptionist, and that every
 * link actually hands off to the next one.
 *
 *   sourced -> enrolled -> emailed -> clicked -> consented -> called
 *   -> built -> demo sent -> checkout -> PAID -> client -> project
 *   -> Front Office -> agent built -> tested -> line bought -> live
 *
 * ── WHAT IS REAL AND WHAT IS PRETEND ─────────────────────────────────────────
 * REAL: every database write, every state machine, the governor's decisions,
 * provisioning, the agent compiler, the calendar, the readiness gate. These are
 * the parts that break.
 *
 * PRETEND: no email leaves the building, no phone rings, no card is charged,
 * and no phone number is purchased. Those are stubbed at their boundary and
 * the stub is stated at every step, so nobody can read a green run as proof
 * that Stripe works.
 *
 * ── IT CLEANS UP AFTER ITSELF, ALWAYS ────────────────────────────────────────
 * Everything is created behind one marker and deleted in a finally. A dress
 * rehearsal that leaves a fake client in the Client Book is worse than no
 * dress rehearsal, because somebody will eventually try to invoice it.
 *
 *   npm run acq:dress
 *   npm run acq:dress -- --keep     # leave it all in place to inspect
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const KEEP = argv.includes('--keep');
const MARKER = 'dress-rehearsal';
const STAMP = Date.now().toString(36);
const EMAIL = `${MARKER}+${STAMP}@modernmustardseed.com`;

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

type Step = { n: number; name: string; ok: boolean; detail: string };
const steps: Step[] = [];
let n = 0;

function step(name: string, ok: boolean, detail = ''): boolean {
  steps.push({ n: ++n, name, ok, detail });
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${String(n).padStart(2)}. ${name}${detail ? `  —  ${detail}` : ''}`);
  return ok;
}

let leadId: string | null = null;
let orderId: string | null = null;
let officeId: string | null = null;
let projectId: string | null = null;

async function run() {
  const { getCampaign } = await import('../lib/acq/settings');
  const campaign = await getCampaign();
  if (!campaign) return void step('a campaign exists', false, 'none');

  console.log(`\nDRESS REHEARSAL  ${EMAIL}`);
  console.log('Nothing is emailed, dialled, charged, or purchased. Every database write is real.\n');

  /* ── 1. SOURCED ── */
  const { keysFor } = await import('../lib/acq/dedupe');
  const business = `Dress Rehearsal Heating ${STAMP}`;
  const keys = keysFor({ business_name: business, city: 'Kalispell', state: 'MT', phone: '(406) 555-0188', email: EMAIL });

  const { data: lead, error: leadErr } = await db
    .from('outbound_leads')
    .insert({
      business_name: business,
      contact_name: 'Dale Rehearsal',
      contact_title: 'Owner',
      phone: '(406) 555-0188',
      email: EMAIL,
      website: 'https://example.com',
      address: '100 Rehearsal Way, Kalispell, MT 59901',
      city: 'Kalispell',
      state: 'MT',
      niche: 'home_service',
      trade: 'hvac',
      review_count: 214,
      rating: 4.8,
      emergency_service: true,
      service_area: 'Flathead Valley',
      hours: { monday: '8:00 am - 5:00 pm', tuesday: '8:00 am - 5:00 pm', wednesday: '8:00 am - 5:00 pm', thursday: '8:00 am - 5:00 pm', friday: '8:00 am - 5:00 pm' },
      email_status: 'verified',
      email_confidence: 95,
      lead_score: 88,
      status: 'new',
      source: MARKER,
      is_test: true,
      reservoir_state: 'discovered',
      ...keys,
    })
    .select('*')
    .single();
  if (!step('a prospect is sourced and banked', !leadErr, leadErr?.message ?? business)) return;
  leadId = lead.id;

  /* ── 2. GRADED INTO THE RESERVOIR ──
     is_test keeps it out of real inventory, so this asserts the guard rather
     than the promotion: a test prospect must NEVER become mailable. */
  const { evaluate } = await import('../lib/acq/eligibility');
  const { suppressedAddresses } = await import('../lib/acq/server');
  const verdict = evaluate(lead, { suppressed: await suppressedAddresses(db), minLeadScore: 35 });
  step('a test prospect is refused enrolment, as it must be', !verdict.eligible, verdict.reason ?? '');

  /* ── 3. THE EMAIL THAT WOULD GO OUT ── */
  const { buildCampaignEmail } = await import('../lib/acq/campaign');
  const { getVariants, pickVariant } = await import('../lib/acq/settings');
  const variants = await getVariants(campaign.id);
  const arm = pickVariant(variants, 1, lead.id);
  const built = arm
    ? buildCampaignEmail({ lead, variant: arm, step: 1, fromName: campaign.from_name, fromEmail: campaign.from_email, replyTo: campaign.reply_to })
    : null;
  step('email one renders, with the opt-out and a tracked link', Boolean(built && /unsubscribe here/i.test(built.html) && /api\/acq\/click/.test(built.html)), built?.subject ?? 'did not build');

  const { estimateFor } = await import('../lib/acq/personalize');
  const est = estimateFor(lead);
  step('the calculator does its arithmetic from their real numbers', est.personalizable && est.monthlyLeakCents > 0, est.hook ?? 'not personalizable');

  /* ── 4. THEY ASK FOR THE CALL ── */
  await db.from('outbound_leads').update({ email_stage: 1, last_campaign_email_at: new Date().toISOString(), acq_stage: 'emailed' }).eq('id', leadId);
  const { data: consent, error: consentErr } = await db
    .from('acq_consents')
    .insert({
      lead_id: leadId,
      // The real column names. The first draft guessed "phone" and "source",
      // which the consent record does not have, and the whole point of a
      // consent row is that it stores exactly what the person saw and typed.
      phone_e164: '+14065550188',
      phone_as_typed: '(406) 555-0188',
      business_name: business,
      contact_name: 'Dale Rehearsal',
      seller: 'Modern Mustard Seed',
      consent_text: 'Dress rehearsal consent record. Nobody was called.',
      consent_version: 'v1',
      checkbox_checked: true,
      ip: '127.0.0.1',
      user_agent: MARKER,
      source_campaign: MARKER,
    })
    .select('id')
    .maybeSingle();
  await db.from('outbound_leads').update({ consent_status: 'granted', acq_stage: 'consented', reservoir_state: 'consented' }).eq('id', leadId);
  step('consent is recorded before anything dials', Boolean(consent) && !consentErr, consentErr?.message ?? 'written to acq_consents');

  /* ── 5. MR. MUSTARD CALLS (pretend) ── */
  const { buildBriefing } = await import('../lib/acq/call');
  const { data: freshLead } = await db.from('outbound_leads').select('*').eq('id', leadId).single();
  const briefing = buildBriefing(freshLead);
  step('his briefing names only what we actually know', !/undefined|null|\[object/.test(briefing), `${briefing.length} chars`);
  await db.from('outbound_leads').update({ acq_stage: 'called', call_attempts: 1 }).eq('id', leadId);

  /* ── 6. THE SALE ── */
  const { OFFER } = await import('../lib/acq/types');
  const { data: order, error: orderErr } = await db
    .from('demo_orders')
    .insert({
      outbound_lead_id: leadId,
      business_name: business,
      email: EMAIL,
      name: 'Dale Rehearsal',
      phone: '(406) 555-0188',
      products: ['voice'],
      setup_cents: OFFER.setupCents,
      monthly_cents: OFFER.monthlyCents,
      status: 'pending',
      // hub_demo_id is a uuid, not a slug. A generated one keeps this order
      // unlinked to any real built demo.
      hub_demo_id: crypto.randomUUID(),
      stripe_session_id: `cs_test_${MARKER}_${STAMP}`,
    })
    .select('*')
    .single();
  if (!step('a checkout order is opened', !orderErr, orderErr?.message ?? `${OFFER.line}`)) return;
  orderId = order.id;

  /* ── 7. THEY PAY (the card is pretend; everything after it is real) ──
     This is the exact update the Stripe webhook performs, including the
     pending -> paid lock that makes a replayed event a no-op. */
  const { data: paid } = await db
    .from('demo_orders')
    .update({ status: 'paid', stripe_subscription_id: `sub_${MARKER}_${STAMP}` })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  step('the pending to paid lock takes the payment exactly once', Boolean(paid), 'stub: no card was charged');

  const { data: replay } = await db.from('demo_orders').update({ status: 'paid' }).eq('id', orderId).eq('status', 'pending').select('id').maybeSingle();
  step('a replayed Stripe event changes nothing', !replay, replay ? 'PROCESSED TWICE' : 'no-op, as designed');

  /* ── 8. THE PROSPECT BECOMES A CUSTOMER ── */
  await db
    .from('outbound_leads')
    .update({ status: 'won', client_status: 'client', acq_stage: 'client', payment_status: 'paid', won_at: new Date().toISOString(), acq_eligible: false, acq_ineligible_reason: 'They bought.' })
    .eq('id', leadId);
  const { cancelPendingFor } = await import('../lib/acq/queue');
  await cancelPendingFor(db, leadId, 'They bought.');

  const { data: stillQueued } = await db.from('acq_queue').select('id').eq('lead_id', leadId).eq('status', 'pending');
  step('every queued prospecting email is cancelled', (stillQueued ?? []).length === 0, `${(stillQueued ?? []).length} left`);

  const { dueForStep } = await import('../lib/acq/eligibility');
  const { data: wonLead } = await db.from('outbound_leads').select('*').eq('id', leadId).single();
  step('the sequence refuses to email a customer', dueForStep(wonLead, new Date(), campaign.step_after_days) === null, 'no next step');

  /* ── 9. MRR IS COUNTED, ONCE ── */
  const key = `dress:${orderId}`;
  await db.from('acq_mrr_events').insert({ lead_id: leadId, type: 'new', mrr_delta_cents: OFFER.monthlyCents, setup_cents: OFFER.setupCents, product: 'voice', reason: key });
  const { data: mrr } = await db.from('acq_mrr_events').select('id, mrr_delta_cents').eq('reason', key);
  step('net new MRR is recorded', (mrr ?? []).length === 1, `$${OFFER.monthlyUsd}/mo`);

  /* ── 10. THE PORTAL OPENS ── */
  const { provisionDemoOrder } = await import('../lib/demo-provision');
  const prov = await provisionDemoOrder(db, { ...order, status: 'paid' });
  if (!step('a client and a project are created', prov.ok, prov.ok ? prov.projectId : prov.error)) return;
  projectId = prov.ok ? prov.projectId : null;

  const { data: client } = await db.from('clients').select('email, company').eq('email', EMAIL).maybeSingle();
  step('they exist in the Client Book', Boolean(client), client?.company ?? 'missing');

  /* ── 11. THE FRONT OFFICE IS BUILT ── */
  const { provisionFrontOffice } = await import('../lib/front-office/provision');
  const office = await provisionFrontOffice(db, {
    clientEmail: EMAIL,
    businessName: business,
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
  if (!step('their Front Office is built', office.ok, office.ok ? office.officeId : office.error)) return;
  officeId = office.officeId;

  await db.from('fo_offices').update({ billing_status: 'active', stripe_subscription_id: `sub_${MARKER}_${STAMP}` }).eq('id', officeId);

  const { data: o } = await db.from('fo_offices').select('*').eq('id', officeId).maybeSingle();
  step('it knows the business it answers for', Boolean(o?.website && o?.address && o?.city && o?.review_count), `${o?.city}, ${o?.state} · ${o?.review_count} reviews · ${o?.website}`);
  step('it carries their chosen voice', o?.voice_gender === 'female' && Boolean(o?.voice_id), `${o?.voice_gender}/${o?.voice_id}`);

  /* ── 12. THE AGENT COMPILES ── */
  const { buildInstructions, assistantConfig } = await import('../lib/front-office/agent');
  const instructions = buildInstructions(o, []);
  step('the agent discloses it is an AI', /You are an AI assistant/.test(instructions), 'disclosure present');
  step('the agent can answer where they are based', /Kalispell|100 Rehearsal Way/.test(instructions), 'address in the prompt');
  step("the trade's hard rule is in force", /never diagnose/i.test(instructions), 'HVAC rule present');
  const cfg = JSON.stringify(assistantConfig(o, []));
  step('no credential is uploaded with the assistant', !/api[_-]?key|service_role|password/i.test(cfg), 'clean');

  /* ── 13. THE CALENDAR WORKS ── */
  const { availableSlots, bookSlot } = await import('../lib/front-office/calendar');
  const slots = await availableSlots(db, o, { limit: 3 });
  step('real openings are offered', slots.length > 0, slots[0]?.label ?? 'none');
  if (slots.length) {
    const booked = await bookSlot(db, o, { startsAt: slots[0].startsAt, title: 'Dress rehearsal job' });
    step('a customer can be booked in', booked.ok, booked.ok ? booked.label : booked.message);
    const dupe = await bookSlot(db, o, { startsAt: slots[0].startsAt, title: 'Dress rehearsal double' });
    step('the same slot cannot be double-booked', !dupe.ok, dupe.ok ? 'DOUBLE BOOKED' : dupe.reason);
  }

  /* ── 14. THE GATE BEFORE ANY MONEY IS SPENT ── */
  const { readiness } = await import('../lib/front-office/readiness');
  const { data: o2 } = await db.from('fo_offices').select('*').eq('id', officeId).maybeSingle();
  const beforeTest = readiness(o2);
  step('paid but untested cannot buy a line', !beforeTest.canBuyNumber.ok, beforeTest.canBuyNumber.blockers.join('; '));

  await db.from('fo_offices').update({ vapi_assistant_id: `asst_${MARKER}_${STAMP}`, agent_synced_at: new Date().toISOString() }).eq('id', officeId);
  await db.from('fo_offices').update({ test_call_at: new Date().toISOString(), test_call_passed: true, test_call_by: MARKER }).eq('id', officeId);

  const { data: o3 } = await db.from('fo_offices').select('*').eq('id', officeId).maybeSingle();
  const afterTest = readiness(o3);
  step('paid AND tested opens the gate', afterTest.canBuyNumber.ok, afterTest.canBuyNumber.blockers.join('; ') || 'allowed to buy');

  /* ── 15. THE LINE, AND GOING LIVE (purchase stubbed) ── */
  await db.from('fo_offices').update({ agent_phone: '(406) 555-0199', vapi_phone_number_id: `pn_${MARKER}`, phone_purchased_at: new Date().toISOString(), agent_phone_provider: 'stub' }).eq('id', officeId);
  const { data: o4 } = await db.from('fo_offices').select('*').eq('id', officeId).maybeSingle();
  const live = readiness(o4);
  step('with a line and forwarding it may go live', live.canGoLive.ok, live.canGoLive.blockers.join('; ') || 'ready');

  if (live.canGoLive.ok) {
    await db.from('fo_offices').update({ status: 'live', live_at: new Date().toISOString() }).eq('id', officeId);
    const { data: o5 } = await db.from('fo_offices').select('status').eq('id', officeId).maybeSingle();
    step('DELIVERED: their receptionist is answering', o5?.status === 'live', 'stub: no number was actually purchased');
  }

  /* ── 16. A CALL COMES IN, AND THE OWNER IS TOLD ── */
  const { upsertContact } = await import('../lib/front-office/provision');
  const contactId = await upsertContact(db, officeId, { name: 'Angry Customer', phone: '(406) 555-0111' });
  const { data: call } = await db
    .from('fo_calls')
    .insert({ office_id: officeId, contact_id: contactId, vapi_call_id: `call_${MARKER}_${STAMP}`, direction: 'inbound', from_number: '(406) 555-0111', urgency: 'emergency', needs_human: true, summary: 'No heat, baby in the house.', started_at: new Date().toISOString() })
    .select('id')
    .single();
  step('the call lands in their CRM', Boolean(call), 'emergency logged');

  const { shouldNotify, smsBodyFor, subjectFor } = await import('../lib/front-office/notify');
  const officeForNotice = { id: officeId, business_name: business, client_email: EMAIL, notify_email: EMAIL, notify_sms: null, notify_on: o4.notify_on ?? [], timezone: 'America/Denver' };
  const callForNotice = { ...call, office_id: officeId, vapi_call_id: null, from_number: '(406) 555-0111', started_at: new Date().toISOString(), intent: null, urgency: 'emergency', summary: 'No heat, baby in the house.', booked: false, transferred: false, needs_human: true, notified_at: null };
  step('an emergency clears the notification bar', shouldNotify(officeForNotice, callForNotice), (o4.notify_on ?? []).join(', '));
  step('the alert reads as an emergency', /EMERGENCY/.test(subjectFor(officeForNotice, callForNotice)) && /EMERGENCY/.test(smsBodyFor(officeForNotice, callForNotice)), 'email and text');

  const { data: claimed } = await db.from('fo_calls').update({ notified_at: new Date().toISOString() }).eq('id', call.id).is('notified_at', null).select('id').maybeSingle();
  const { data: second } = await db.from('fo_calls').update({ notified_at: new Date().toISOString() }).eq('id', call.id).is('notified_at', null).select('id').maybeSingle();
  step('the owner is told exactly once', Boolean(claimed) && !second, 'stub: no email or text left the building');
}

async function cleanup() {
  if (KEEP) {
    console.log(`\n--keep: leaving lead ${leadId}, order ${orderId}, office ${officeId}, client ${EMAIL} in place.`);
    return;
  }
  try {
    if (officeId) {
      await db.from('fo_appointments').delete().eq('office_id', officeId);
      await db.from('fo_calls').delete().eq('office_id', officeId);
      await db.from('fo_contacts').delete().eq('office_id', officeId);
      await db.from('fo_transfers').delete().eq('office_id', officeId);
      await db.from('fo_events').delete().eq('office_id', officeId);
      await db.from('fo_offices').delete().eq('id', officeId);
    }
    if (projectId) await db.from('projects').delete().eq('id', projectId);
    await db.from('client_files').delete().eq('client_email', EMAIL);
    await db.from('clients').delete().eq('email', EMAIL);
    if (orderId) await db.from('demo_orders').delete().eq('id', orderId);
    if (leadId) {
      await db.from('acq_mrr_events').delete().eq('lead_id', leadId);
      await db.from('acq_consents').delete().eq('lead_id', leadId);
      await db.from('acq_events').delete().eq('lead_id', leadId);
      await db.from('acq_queue').delete().eq('lead_id', leadId);
      await db.from('acq_sends').delete().eq('lead_id', leadId);
      await db.from('messages').delete().eq('outbound_lead_id', leadId);
      await db.from('outbound_leads').delete().eq('id', leadId);
    }
    await db.from('outbound_leads').delete().eq('source', MARKER);
    console.log('\nCleaned up. Nothing this rehearsal created is left behind.');
  } catch (e) {
    console.error('CLEANUP FAILED, something fake may be on the floor:', e instanceof Error ? e.message : e);
  }
}

try {
  await run();
} catch (e) {
  step('the rehearsal ran to completion', false, e instanceof Error ? e.message : String(e));
} finally {
  await cleanup();
}

const failed = steps.filter((s) => !s.ok);
console.log(`\n${steps.length - failed.length}/${steps.length} steps passed.`);
if (failed.length) {
  console.log('\nBROKEN LINKS:');
  for (const f of failed) console.log(`  ${f.n}. ${f.name}  —  ${f.detail}`);
}
console.log('\nStubbed, and therefore NOT proven by this run: Stripe charging a real card,');
console.log('Resend delivering an email, Vapi dialling a phone, Twilio sending a text,');
console.log('and buying a real phone number.\n');
process.exit(failed.length ? 1 : 0);
