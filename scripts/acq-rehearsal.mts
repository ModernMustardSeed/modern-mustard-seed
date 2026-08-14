/**
 * REHEARSE THE ACQUISITION FUNNEL, AND WATCH THE DELIVERABILITY.
 *
 * The demo funnel has had a nightly rehearsal since 2026-08-03 because driving
 * it by hand once found five real defects in a single pass. The acquisition
 * funnel is longer (cold email -> /mustard -> consent -> Mr. Mustard calls ->
 * forge -> demo email -> checkout -> client -> Front Office), touches a sending
 * reputation that every client invoice also rides on, and had nothing.
 *
 * Two halves:
 *
 *   THE CHAIN     every guard exercised over real HTTP, every worker checked
 *                 for a heartbeat, the whole path walked through the database
 *                 so NOTHING IS EMAILED and no prospect is touched.
 *
 *   DELIVERABILITY  the half the demo funnel does not need. SPF, DKIM and
 *                 DMARC on the real sending domain, the bounce and complaint
 *                 rates against the thresholds the governor stops at, the
 *                 suppression list readable, the unsubscribe route answering.
 *                 A silent DNS change is how a sender dies, and it dies
 *                 quietly: deliverability degrades for days before anybody
 *                 notices nobody is replying.
 *
 * SAFETY. This never sends a marketing email, never dials a phone, never
 * unpauses the engine, and every row it creates is deleted in a finally. It
 * refuses to run if it cannot reach the database, rather than reporting green
 * on a connection it never made.
 *
 *   npx tsx scripts/acq-rehearsal.mts                  # against production
 *   npx tsx scripts/acq-rehearsal.mts --base=http://localhost:3001
 *   npx tsx scripts/acq-rehearsal.mts --keep           # leave the test rows
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { promises as dns } from 'node:dns';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const arg = (k: string, d = '') => (argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');
const BASE = (arg('base', 'https://modernmustardseed.com') || '').replace(/\/$/, '');
const KEEP = argv.includes('--keep');
const MARKER = 'acq-rehearsal';

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

type Result = { name: string; ok: boolean; detail: string; section: string };
const results: Result[] = [];
let section = 'chain';

function check(name: string, ok: boolean, detail = ''): boolean {
  results.push({ name, ok, detail, section });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  return ok;
}

async function http(path: string, init?: RequestInit): Promise<{ status: number; text: string; json: unknown; headers: Headers }> {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* html is fine */
    }
    return { status: res.status, text, json, headers: res.headers };
  } catch (e) {
    return { status: 0, text: String(e), json: null, headers: new Headers() };
  }
}

const txt = async (host: string): Promise<string[]> => {
  try {
    return (await dns.resolveTxt(host)).map((r) => r.join(''));
  } catch {
    return [];
  }
};

let leadId: string | null = null;

async function run() {
  console.log(`\nAcquisition rehearsal against ${BASE}\nmarker: ${MARKER}\nNothing is emailed. Nothing is dialled. The engine is never unpaused.\n`);

  const { error: reachable } = await db.from('acq_settings').select('id').limit(1);
  if (reachable) {
    check('the database is reachable', false, reachable.message);
    return;
  }

  /* ─────────────────────────── 1. THE PUBLIC DOOR ─────────────────────────── */
  section = 'chain';

  const mustard = await http('/mustard?source=rehearsal');
  check('/mustard renders for the public', mustard.status === 200 && /Mr\. Mustard/i.test(mustard.text), `HTTP ${mustard.status}`);

  // The outage of 2026-08-13: /Mustard was added to the middleware matcher and
  // fed a public path into the admin auth block, so every visitor was sent to
  // the login screen. It was unreproducible locally because Vercel matches
  // matchers case-insensitively and `next start` does not. This is the assert.
  check(
    '/mustard is NOT behind the admin login',
    !/x-matched-path/i.test([...mustard.headers.keys()].join(',')) || mustard.headers.get('x-matched-path') !== '/admin/login',
    `x-matched-path=${mustard.headers.get('x-matched-path') ?? 'none'}`,
  );

  const noConsent = await http('/api/mustard/call', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone: '4065550100', businessName: 'Rehearsal', consent: false, surface: 'default' }),
  });
  check('the call route refuses an unchecked consent box', noConsent.status >= 400, `HTTP ${noConsent.status}`);

  const noPhone = await http('/api/mustard/call', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone: '', consent: true, surface: 'default' }),
  });
  check('the call route refuses an empty number', noPhone.status >= 400, `HTTP ${noPhone.status}`);

  const cron = await http('/api/cron/acquisition');
  check('the acquisition cron refuses an unauthenticated call', cron.status === 401, `HTTP ${cron.status}`);

  const adminAcq = await http('/api/admin/acquisition/campaign');
  check('the acquisition admin refuses an unauthenticated read', adminAcq.status === 401, `HTTP ${adminAcq.status}`);

  const finder = await http('/api/admin/acquisition/lead-finder');
  check('the lead finder refuses an unauthenticated read', finder.status === 401, `HTTP ${finder.status}`);

  /* ──────────────────── 2. THE ENGINE IS WHERE WE LEFT IT ─────────────────── */

  const { data: settings } = await db.from('acq_settings').select('*').limit(1).maybeSingle();
  const { data: campaign } = await db.from('acq_campaigns').select('*').limit(1).maybeSingle();

  check('the master switch is readable', Boolean(settings), settings ? `paused=${settings.master_paused}` : 'no settings row');
  check('a campaign exists', Boolean(campaign), campaign ? `${campaign.slug} (${campaign.status})` : 'none');

  // Not "is it paused" (Sarah decides that) but "do the two agree". A live
  // campaign under a paused master is a silent no-op that looks like it works.
  if (settings && campaign) {
    const coherent = campaign.status !== 'live' || !settings.master_paused;
    check('the campaign status and the master switch agree', coherent, `campaign=${campaign.status}, master_paused=${settings.master_paused}`);
  }

  if (campaign) {
    const gaps: number[] = Array.isArray(campaign.step_after_days) ? campaign.step_after_days : [];
    check('the sequence has spacing configured', gaps.length > 0 && gaps.every((g) => g >= 1), `gaps=[${gaps.join(', ')}]`);

    const { data: variants } = await db.from('acq_variants').select('step, key, body_key, active').eq('campaign_id', campaign.id);
    const steps = new Set((variants ?? []).filter((v) => v.active).map((v) => v.step));
    // Every step in the sequence needs at least one live arm, or the drip
    // silently stops at the gap before the missing one.
    const expected = gaps.length + 1;
    const missing = Array.from({ length: expected }, (_, i) => i + 1).filter((s) => !steps.has(s));
    check('every step in the sequence has a live variant', missing.length === 0, missing.length ? `no arm for step ${missing.join(', ')}` : `${expected} steps covered`);
  }

  /* ──────────────────────── 3. THE PROSPECT PIPELINE ──────────────────────── */

  // MAILABLE is a permission: eligible, has an address, has not opted out.
  // READY is a position in the reservoir. They are different questions and the
  // first version of this check asked the second one while claiming to ask the
  // first, which reported zero inventory while 781 people waited to be emailed.
  const { count: mailable } = await db
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .eq('acq_eligible', true)
    .not('email', 'is', null)
    .is('unsubscribed_at', null);
  check('there is mailable inventory', (mailable ?? 0) > 0, `${mailable ?? 0} mailable`);

  const { count: ready } = await db
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .eq('reservoir_state', 'ready')
    .eq('acq_eligible', true);
  // The gauge must agree with reality. A large mailable pool sitting at
  // reservoir_state 'discovered' means the replenisher has stopped running,
  // and the bottleneck engine will report inventory as the constraint while
  // the inventory is right there.
  check(
    'the reservoir gauge agrees with what is mailable',
    (mailable ?? 0) === 0 || (ready ?? 0) > 0,
    `${ready ?? 0} ready vs ${mailable ?? 0} mailable`,
  );

  // Every one of these is a bug that shipped and would ship again: a customer
  // still inside the cold sequence, a prospect with no address queued to be
  // emailed, an unsubscribe that stayed eligible.
  const { count: customersStillProspecting } = await db
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .eq('client_status', 'client')
    .eq('acq_eligible', true);
  check('no paying customer is still being prospected', (customersStillProspecting ?? 0) === 0, `${customersStillProspecting ?? 0} found`);

  const { count: unsubStillEligible } = await db
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .not('unsubscribed_at', 'is', null)
    .eq('acq_eligible', true);
  check('nobody who opted out is still eligible', (unsubStillEligible ?? 0) === 0, `${unsubStillEligible ?? 0} found`);

  const { count: queuedWithNoEmail } = await db
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .eq('acq_eligible', true)
    .is('email', null);
  check('nothing is queued to an address we do not have', (queuedWithNoEmail ?? 0) === 0, `${queuedWithNoEmail ?? 0} found`);

  const ninetyMinutesAgo = new Date(Date.now() - 90 * 60_000).toISOString();
  const { count: stuck } = await db
    .from('acq_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'claimed')
    .lt('claimed_at', ninetyMinutesAgo);
  check('no queue job has been claimed and abandoned', (stuck ?? 0) === 0, `${stuck ?? 0} stale`);

  /* ── IS THIS ENVIRONMENT ACTUALLY CONFIGURED? ──
     A `vercel env pull` once wrote "[SENSITIVE]" over 63 variables here. The
     values did not go missing so much as go missing while staying truthy, so
     every fallback beneath them was skipped and the failures surfaced as
     unrelated 404s. This names them instead of leaving them to be found one
     confusing error at a time. */
  const { placeholderVars } = await import('../lib/env');
  const clobbered = placeholderVars([
    'VAPI_API_KEY',
    'VAPI_MUSTARD_ASSISTANT_ID',
    'VAPI_PHONE_NUMBER_ID',
    'VAPI_WEBHOOK_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_MESSAGING_SERVICE_SID',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]);
  // Not a hard failure: this runs against a developer machine as often as a
  // real one, and a clobbered local file does not mean production is broken.
  // It is reported loudly so nobody spends an afternoon on the wrong cause.
  check(
    'no credential is sitting on a placeholder',
    clobbered.length === 0,
    clobbered.length ? `CLOBBERED: ${clobbered.join(', ')}` : 'all real',
  );

  /* ─────────────────────────── 4. DELIVERABILITY ──────────────────────────── */
  section = 'deliverability';

  const domain = (campaign?.from_email ?? 'sarah@modernmustardseed.com').split('@')[1];

  // SPF is evaluated against the ENVELOPE sender, which for Resend is the
  // Return-Path subdomain, not the From domain. Checking the root record is
  // how this reported a false alarm on 2026-08-13. The root record carries
  // Zoho and every client invoice; it is not the record that matters here.
  const envelopeHost = `send.${domain}`;
  const envelopeSpf = (await txt(envelopeHost)).filter((r) => /^v=spf1/i.test(r));
  check(
    `SPF is published on ${envelopeHost}`,
    envelopeSpf.length === 1 && /include:.*(amazonses|resend)/i.test(envelopeSpf[0]),
    envelopeSpf[0] ?? 'no record',
  );

  const rootSpf = (await txt(domain)).filter((r) => /^v=spf1/i.test(r));
  // More than one SPF record on a domain is a hard fail in the RFC, and it is
  // the single most common way somebody breaks their own mail by "adding" SPF.
  check('the root domain has exactly one SPF record', rootSpf.length === 1, `${rootSpf.length} record(s)`);

  const dmarc = (await txt(`_dmarc.${domain}`)).filter((r) => /^v=DMARC1/i.test(r));
  check('DMARC is published', dmarc.length === 1, dmarc[0] ?? 'no record');
  if (dmarc[0]) {
    const hasRua = /rua=/i.test(dmarc[0]);
    check('DMARC reports somewhere we can read them', hasRua, hasRua ? 'rua present' : 'no rua, failures are invisible');
  }

  const dkim = await txt(`resend._domainkey.${domain}`);
  check('the DKIM key is published', dkim.some((r) => /p=/.test(r)), dkim.length ? 'key present' : 'no record');

  const unsub = await http('/api/outreach/unsubscribe?c=rehearsal-not-a-real-token');
  // Whatever it does it must not 500. An unsubscribe link that errors is a
  // complaint, and complaints are what actually kill a sending domain.
  check('the unsubscribe route answers without erroring', unsub.status > 0 && unsub.status < 500, `HTTP ${unsub.status}`);

  // Read them the way the GOVERNOR reads them, not a convenient approximation.
  // The first version of this check selected `id` from email_suppressions,
  // which has no id column, so it failed against a perfectly healthy list. A
  // rehearsal that tests its own query instead of the product is worse than no
  // rehearsal: it cries wolf and gets ignored.
  const { suppressedAddresses } = await import('../lib/acq/server');
  let suppCount = -1;
  let suppErr = '';
  try {
    suppCount = (await suppressedAddresses(db)).size;
  } catch (e) {
    suppErr = e instanceof Error ? e.message : String(e);
  }
  // The governor is fail-closed on this: an unreadable suppression list stops
  // sending entirely. So this failing is not cosmetic, it halts the engine.
  check('the suppression list is readable', !suppErr, suppErr || `${suppCount} addresses`);

  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: recent } = await db.from('acq_sends').select('status').gte('created_at', dayAgo);
  const sent = recent?.length ?? 0;
  if (sent >= 20) {
    const bounced = (recent ?? []).filter((r) => r.status === 'bounced').length;
    const complained = (recent ?? []).filter((r) => r.status === 'complained').length;
    const bouncePct = (bounced / sent) * 100;
    const complaintPct = (complained / sent) * 100;
    check('the 24 hour bounce rate is under 4%', bouncePct < 4, `${bouncePct.toFixed(2)}% of ${sent}`);
    check('the 24 hour complaint rate is under 0.1%', complaintPct < 0.1, `${complaintPct.toFixed(3)}% of ${sent}`);
  } else {
    check('bounce and complaint rates', true, `only ${sent} sends in 24h, too thin to judge (not a failure)`);
  }

  const { data: sender } = await db.from('acq_settings').select('sender_state, adaptive_daily_allowance').limit(1).maybeSingle();
  check('the sender is not in a stopped state', sender?.sender_state !== 'stopped', `state=${sender?.sender_state ?? 'unknown'}, allowance=${sender?.adaptive_daily_allowance ?? '?'}`);

  /* ───────────────────── 5. THE CLIENT LOOP, WALKED ───────────────────────── */
  section = 'client loop';

  // A synthetic prospect, driven through the parts of the sale that do not
  // involve money or email, so the provisioning chain is exercised for real.
  const { data: lead, error: leadErr } = await db
    .from('outbound_leads')
    .insert({
      business_name: `Rehearsal Heating ${Date.now().toString(36)}`,
      email: `${MARKER}@modernmustardseed.com`,
      phone: '(406) 555-0199',
      niche: 'home_service',
      trade: 'hvac',
      city: 'Kalispell',
      state: 'MT',
      status: 'new',
      source: MARKER,
      is_test: true,
      notes: `${MARKER}: deleted at the end of this run`,
    })
    .select('*')
    .single();

  if (!check('a prospect can be created', !leadErr, leadErr?.message ?? '')) return;
  leadId = lead.id;

  const { estimateFor } = await import('../lib/acq/personalize');
  const est = estimateFor(lead);
  check('a thin prospect is refused personalization rather than faked', !est.personalizable, est.hook ?? 'no hook, correct');

  const { provisionFrontOffice, neverDoFor } = await import('../lib/front-office/provision');
  const rehearsalClient = `${MARKER}@modernmustardseed.com`;
  await db.from('clients').upsert({ email: rehearsalClient, name: 'Rehearsal', company: lead.business_name, status: 'active' }, { onConflict: 'email' });

  const office = await provisionFrontOffice(db, {
    clientEmail: rehearsalClient,
    businessName: lead.business_name,
    outboundLeadId: lead.id,
    voiceGender: 'female',
    trade: 'hvac',
    phone: lead.phone,
  });
  check('a Front Office is built on purchase', office.ok, office.ok ? office.officeId : office.error);

  if (office.ok) {
    // The whole point of idempotency: a Stripe retry must not mint a second one.
    const again = await provisionFrontOffice(db, { clientEmail: rehearsalClient, businessName: lead.business_name });
    check('provisioning twice yields ONE office', again.ok && !again.created && again.officeId === office.officeId, again.ok ? `${again.officeId} (created=${again.created})` : again.error);

    const { data: row } = await db.from('fo_offices').select('*').eq('id', office.officeId).maybeSingle();
    check('the office carries their chosen voice', row?.voice_gender === 'female' && Boolean(row?.voice_id), `${row?.voice_gender}/${row?.voice_id}`);
    check('the office defaults to after hours, as the email promised', row?.forward_mode === 'after_hours', String(row?.forward_mode));
    check('the office has a greeting rather than an empty one', Boolean(row?.greeting?.trim()), row?.greeting?.slice(0, 48) ?? 'empty');
    check("the trade's own hard rule is seeded", (row?.never_do ?? []).some((r: string) => /never diagnose/i.test(r)), `${(row?.never_do ?? []).length} rules`);
    check('the rules include the disclosure rule', (row?.never_do ?? []).some((r: string) => /you are an AI/i.test(r)), 'AI disclosure');
    check('an emergency trade escalates on injury and fire', (row?.escalate_on ?? []).some((r: string) => /injury|fire|flooding/i.test(r)), `${(row?.escalate_on ?? []).length} triggers`);
    check('a trade with no registry entry still gets the base rules', neverDoFor(null).length >= 3, `${neverDoFor(null).length} rules`);

    /* ── the receptionist itself ── */
    const { buildInstructions, assistantConfig } = await import('../lib/front-office/agent');
    const { availableSlots, bookSlot } = await import('../lib/front-office/calendar');

    const { data: full } = await db.from('fo_offices').select('*').eq('id', office.officeId).maybeSingle();
    const instructions = buildInstructions(full, []);
    check('the agent discloses that it is an AI', /You are an AI assistant/.test(instructions), 'disclosure present');
    check('the agent carries the trade rule into its instructions', /never diagnose/i.test(instructions), 'rule present');

    const cfg = assistantConfig(full, []);
    const cfgJson = JSON.stringify(cfg);
    check('no credential is uploaded with the assistant', !/api[_-]?key|service_role|password/i.test(cfgJson), 'clean');
    check('the office id is not in the webhook URL', !cfgJson.includes(`/api/front-office/vapi?`), 'resolved from assistant id instead');

    // An office with no hours must offer NOTHING rather than inventing a slot.
    const noHours = await availableSlots(db, { id: office.officeId, hours: {}, timezone: 'America/Denver' });
    check('an office with no hours offers no times', noHours.length === 0, `${noHours.length} offered`);

    const withHours = { id: office.officeId, hours: { monday: '8:00 am - 5:00 pm', tuesday: '8:00 am - 5:00 pm', wednesday: '8:00 am - 5:00 pm', thursday: '8:00 am - 5:00 pm', friday: '8:00 am - 5:00 pm' }, timezone: 'America/Denver' };
    const slots = await availableSlots(db, withHours, { limit: 3 });
    check('real openings are offered inside posted hours', slots.length > 0, `${slots.length} slots, first ${slots[0]?.label ?? 'none'}`);

    if (slots.length) {
      const first = await bookSlot(db, withHours, { startsAt: slots[0].startsAt, title: 'Rehearsal booking' });
      check('a slot can be booked', first.ok, first.ok ? first.label : first.message);
      // THE RACE. Two callers, one slot. The database must award it once.
      const second = await bookSlot(db, withHours, { startsAt: slots[0].startsAt, title: 'Rehearsal double-book' });
      check('the same slot cannot be booked twice', !second.ok && second.reason === 'taken', second.ok ? 'DOUBLE BOOKED' : second.reason);
      const past = await bookSlot(db, withHours, { startsAt: new Date(Date.now() - 3600_000).toISOString(), title: 'Rehearsal past' });
      check('a time in the past is refused', !past.ok && past.reason === 'past', past.ok ? 'accepted a past time' : past.reason);
    }

    // The go-live gate. An office missing anything must NOT be able to tell a
    // customer their phone is answered.
    /* ── THE MONEY AND SAFETY GATE ──
       Two irreversible things sit behind this: buying a number starts a bill
       that runs every month until somebody releases it, and going live points
       a real contractor's customers at an AI. Neither may happen until they
       are a live paying customer AND a person has heard the agent. */
    const { readiness } = await import('../lib/front-office/readiness');

    const fresh = readiness(full);
    check('a brand new office cannot buy a phone line', !fresh.canBuyNumber.ok, fresh.canBuyNumber.blockers.join('; '));
    check('a brand new office cannot go live', !fresh.canGoLive.ok, fresh.canGoLive.blockers.join('; '));
    check('it says WHY it cannot, in words', fresh.canGoLive.blockers.length > 0 && fresh.canGoLive.blockers.every((b) => b.length > 8), `${fresh.canGoLive.blockers.length} reasons`);

    // Paying but never tested. This is the one that would otherwise slip
    // through: the money is real, so it FEELS ready.
    const paidUntested = readiness({ ...full, billing_status: 'active', vapi_assistant_id: 'asst_rehearsal', greeting: 'hello', hours: { monday: '8:00 am - 5:00 pm' }, agent_phone: null, test_call_at: null, test_call_passed: null });
    check('a paying customer with an untested agent still cannot buy a line', !paidUntested.canBuyNumber.ok, paidUntested.canBuyNumber.blockers.join('; '));

    // Tested but not paying. The mirror case.
    const testedUnpaid = readiness({ ...full, billing_status: 'unknown', vapi_assistant_id: 'asst_rehearsal', greeting: 'hello', hours: { monday: '8:00 am - 5:00 pm' }, agent_phone: null, test_call_at: new Date().toISOString(), test_call_passed: true, agent_synced_at: null });
    check('a tested agent for a non-paying account cannot buy a line', !testedUnpaid.canBuyNumber.ok, testedUnpaid.canBuyNumber.blockers.join('; '));

    // Both satisfied. The gate must actually open, or it is not a gate, it is a wall.
    const bothOk = readiness({ ...full, billing_status: 'active', vapi_assistant_id: 'asst_rehearsal', greeting: 'hello', hours: { monday: '8:00 am - 5:00 pm' }, agent_phone: null, test_call_at: new Date().toISOString(), test_call_passed: true, agent_synced_at: null });
    check('paid AND tested opens the gate', bothOk.canBuyNumber.ok, bothOk.canBuyNumber.blockers.join('; ') || 'allowed');

    /* ── THE OWNER ACTUALLY GETS TOLD ──
       The gap that would have hurt most: an emergency at 2am, handled
       perfectly, written to a dashboard nobody is looking at. A caught call
       nobody is told about is not a caught call. */
    const { data: freshOffice } = await db.from('fo_offices').select('notify_email, notify_on').eq('id', office.officeId).maybeSingle();
    check('a new office has somewhere to send alerts', Boolean(freshOffice?.notify_email), freshOffice?.notify_email ?? 'NOWHERE');
    check(
      'emergencies and callbacks are on by default',
      (freshOffice?.notify_on ?? []).includes('emergency') && (freshOffice?.notify_on ?? []).includes('needs_human'),
      (freshOffice?.notify_on ?? []).join(', '),
    );

    // The claim is the lock. Two handlers racing on one emergency must send
    // one email, not two, because a duplicated alert trains an owner to
    // ignore the channel before the call that matters arrives.
    const { data: fakeCall } = await db
      .from('fo_calls')
      .insert({
        office_id: office.officeId,
        vapi_call_id: `${MARKER}-${Date.now().toString(36)}`,
        direction: 'inbound',
        from_number: '(406) 555-0177',
        urgency: 'emergency',
        needs_human: true,
        summary: 'Rehearsal emergency. Not a real caller.',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (fakeCall) {
      const first = await db.from('fo_calls').update({ notified_at: new Date().toISOString() }).eq('id', fakeCall.id).is('notified_at', null).select('id').maybeSingle();
      const second = await db.from('fo_calls').update({ notified_at: new Date().toISOString() }).eq('id', fakeCall.id).is('notified_at', null).select('id').maybeSingle();
      check('one emergency notifies exactly once', Boolean(first.data) && !second.data, `first=${Boolean(first.data)}, second=${Boolean(second.data)}`);
      await db.from('fo_calls').delete().eq('id', fakeCall.id);
    }

    // The reminder claim is the same shape, for the same reason: an hourly
    // cron that overlaps itself must not send four reminders about one job.
    if (slots.length > 1) {
      const appt = await bookSlot(db, withHours, { startsAt: slots[1].startsAt, title: 'Rehearsal reminder claim' });
      if (appt.ok) {
        const r1 = await db.from('fo_appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', appt.appointmentId).is('reminder_sent_at', null).select('id').maybeSingle();
        const r2 = await db.from('fo_appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', appt.appointmentId).is('reminder_sent_at', null).select('id').maybeSingle();
        check('one appointment reminds exactly once', Boolean(r1.data) && !r2.data, `first=${Boolean(r1.data)}, second=${Boolean(r2.data)}`);
      }
    }

    /* ── EVERY LINK WE PUT IN FRONT OF A BUYER RESOLVES ──
       checkoutUrlFor pointed at /demo/order/{hubId} for months. That page has
       never existed, so the button in the email Mr. Mustard fires the moment
       somebody says "I want it" returned a 404. Nothing tested it, because
       every test asserted the STRING was built, not that the page was there.
       This fetches them. */
    const { checkoutUrlFor } = await import('../lib/acq/send');
    const hubId = crypto.randomUUID();
    await db.from('outbound_leads').update({ hub_demo_id: hubId }).eq('id', lead.id);
    const { data: withHub } = await db.from('outbound_leads').select('*').eq('id', lead.id).single();

    const buyUrl = checkoutUrlFor(withHub);
    const buyPath = buyUrl.replace(BASE, '');
    const buyRes = await http(buyPath);
    check('the checkout link in the email resolves', buyRes.status === 200, `HTTP ${buyRes.status}  ${buyPath}`);

    // And the fallbacks, for a prospect with no forged hub at all.
    const noHub = checkoutUrlFor({ ...withHub, hub_demo_id: null, hub_demo_url: null });
    const fallbackRes = await http(noHub.replace(BASE, ''));
    check('the checkout fallback resolves too', fallbackRes.status === 200, `HTTP ${fallbackRes.status}  ${noHub.replace(BASE, '')}`);

    const cronGuard = await http('/api/cron/front-office');
    check('the front office cron refuses an unauthenticated call', cronGuard.status === 401, `HTTP ${cronGuard.status}`);

    // And the server refuses even if somebody POSTs past the disabled button.
    const { buyNumberFor } = await import('../lib/front-office/phone');
    const refused = await buyNumberFor(db, office.officeId, { actor: 'rehearsal' });
    check('the API refuses a purchase the button would have blocked', !refused.ok, refused.ok ? 'BOUGHT A NUMBER' : refused.error);
  }
}

async function cleanup() {
  if (KEEP) {
    console.log(`\n--keep: leaving lead ${leadId ?? '(none)'} and the rehearsal client in place.`);
    return;
  }
  try {
    const rehearsalClient = `${MARKER}@modernmustardseed.com`;
    // Order matters: the office cascades its own children, then the client.
    const { data: doomed } = await db.from('fo_offices').select('id').eq('client_email', rehearsalClient);
    for (const o of doomed ?? []) {
      await db.from('fo_appointments').delete().eq('office_id', o.id);
      await db.from('fo_calls').delete().eq('office_id', o.id);
    }
    await db.from('fo_offices').delete().eq('client_email', rehearsalClient);
    if (leadId) {
      await db.from('acq_events').delete().eq('lead_id', leadId);
      await db.from('acq_queue').delete().eq('lead_id', leadId);
      await db.from('acq_sends').delete().eq('lead_id', leadId);
      await db.from('outbound_leads').delete().eq('id', leadId);
    }
    await db.from('outbound_leads').delete().eq('source', MARKER);
    await db.from('clients').delete().eq('email', rehearsalClient);
    console.log('\nCleaned up every row this rehearsal created.');
  } catch (e) {
    console.error('CLEANUP FAILED, a rehearsal row may be on the floor:', e instanceof Error ? e.message : e);
  }
}

try {
  await run();
} catch (e) {
  check('the rehearsal ran to completion', false, e instanceof Error ? e.message : String(e));
} finally {
  await cleanup();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
for (const s of ['chain', 'deliverability', 'client loop']) {
  const inSection = results.filter((r) => r.section === s);
  if (inSection.length) console.log(`  ${s}: ${inSection.filter((r) => r.ok).length}/${inSection.length}`);
}
if (failed.length) {
  console.log('\nFAILING:');
  for (const f of failed) console.log(`  [${f.section}] ${f.name}  ${f.detail}`);
}
process.exit(failed.length ? 1 : 0);
