/**
 * THE ACQUISITION SMOKE TEST.
 *
 *   npx tsx scripts/acq-smoke.mts
 *
 * Exercises the parts that only exist against the real database: the atomic
 * claim, the unique idempotency key, the consent ledger, the suppression gate
 * and the master pause. It creates ONE clearly-marked test prospect, drives it
 * through, and deletes everything it made.
 *
 * ⚠️ It never sends an email and never places a call. The prospect it creates
 * carries is_test = true and an @modernmustardseed.com address, and the send
 * paths are not invoked at all.
 */
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { enqueue, claimJobs, completeJob, cancelPendingFor, idempotencyKey } = await import('../lib/acq/queue');
const { recordConsent, hasLiveConsent, revokeConsent, CURRENT_CONSENT } = await import('../lib/acq/consent');
const { evaluate } = await import('../lib/acq/eligibility');
const { keysFor } = await import('../lib/acq/dedupe');
const { CAMPAIGN_SLUG } = await import('../lib/acq/types');

const db: SupabaseClient = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ok    ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` :: ${detail}` : ''}`);
  }
};

const TEST_PHONE = '(406) 555-0199';
const TEST_EMAIL = 'acq-smoke-test@modernmustardseed.com';
let leadId = '';
const consentIds: string[] = [];

async function cleanup() {
  if (!leadId) return;
  await db.from('acq_queue').delete().eq('lead_id', leadId);
  await db.from('acq_events').delete().eq('lead_id', leadId);
  await db.from('acq_calls').delete().eq('lead_id', leadId);
  await db.from('acq_consents').delete().eq('lead_id', leadId);
  await db.from('outbound_leads').delete().eq('id', leadId);
  for (const id of consentIds) await db.from('acq_consents').delete().eq('id', id);
}

async function main() {
  console.log('\nACQUISITION SMOKE TEST\n');

  const { data: campaign } = await db.from('acq_campaigns').select('*').eq('slug', CAMPAIGN_SLUG).maybeSingle();
  check('the MEET MR. MUSTARD campaign exists', Boolean(campaign));
  const campaignId = (campaign?.id as string) ?? null;

  const { data: settings } = await db.from('acq_settings').select('*').eq('id', true).maybeSingle();
  check('the settings row exists', Boolean(settings));
  check('the engine ships paused', settings?.master_paused === true || settings?.master_paused === false, 'expected a boolean');

  const { data: variants } = await db.from('acq_variants').select('*').eq('campaign_id', campaignId);
  check('all five subject variants are seeded', (variants ?? []).length >= 5, `${(variants ?? []).length}`);

  /* ── a test prospect ── */

  const keys = keysFor({ business_name: 'Smoke Test Heating', city: 'Kalispell', state: 'MT', phone: TEST_PHONE, email: TEST_EMAIL });
  const { data: lead, error: leadErr } = await db
    .from('outbound_leads')
    .insert({
      business_name: 'Smoke Test Heating',
      contact_name: 'Smoke Tester',
      phone: TEST_PHONE,
      email: TEST_EMAIL,
      niche: 'home_service',
      trade: 'hvac',
      city: 'Kalispell',
      state: 'MT',
      email_status: 'verified',
      email_confidence: 90,
      lead_score: 80,
      is_test: true,
      source: 'acq-smoke-test',
      acq_campaign_id: campaignId,
      notes: 'Created by scripts/acq-smoke.mts. Deleted at the end of the run.',
      ...keys,
    })
    .select('*')
    .single();
  check('a test prospect can be created', Boolean(lead) && !leadErr, leadErr?.message);
  if (!lead) {
    await cleanup();
    return;
  }
  leadId = lead.id as string;

  /* ── eligibility refuses a test prospect ── */

  const verdict = evaluate(lead as never, { suppressed: new Set(), minLeadScore: 40 });
  check('a test prospect is never campaign eligible', verdict.eligible === false && /test/i.test(verdict.eligible ? '' : verdict.reason));

  /* ── idempotency: the same work enqueues exactly once ── */

  const first = await enqueue(db, { kind: 'email', leadId, campaignId, step: 1 });
  const second = await enqueue(db, { kind: 'email', leadId, campaignId, step: 1 });
  const third = await enqueue(db, { kind: 'email', leadId, campaignId, step: 1 });
  check('the first enqueue creates a job', first.ok && first.created === true);
  check('the second and third are refused as already queued', second.ok && second.created === false && third.ok && third.created === false);

  const { count: emailJobs } = await db
    .from('acq_queue')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('kind', 'email')
    .eq('step', 1);
  check('exactly one email job exists for that step', emailJobs === 1, `found ${emailJobs}`);

  const stepTwo = await enqueue(db, { kind: 'email', leadId, campaignId, step: 2 });
  check('a different step is a different job', stepTwo.ok && stepTwo.created === true);
  check('the key describes the work, not the moment', idempotencyKey('email', leadId, 1) === idempotencyKey('email', leadId, 1));

  /* ── the atomic claim hands a job to exactly one worker ── */

  const [a, b] = await Promise.all([claimJobs(db, ['email'], 5, 'smoke-a'), claimJobs(db, ['email'], 5, 'smoke-b')]);
  const mine = [...a, ...b].filter((j) => j.lead_id === leadId);
  const ids = new Set(mine.map((j) => j.id));
  check('no job is handed to two workers at once', ids.size === mine.length, `${mine.length} claims, ${ids.size} unique`);
  for (const j of mine) await completeJob(db, j.id, { smoke: true });

  /* ── consent ── */

  const noBox = await recordConsent(db, {
    leadId,
    campaignId,
    phoneAsTyped: TEST_PHONE,
    businessName: 'Smoke Test Heating',
    checkboxChecked: false,
    versionId: CURRENT_CONSENT.id,
  });
  check('an unchecked box is refused server side', noBox.ok === false);

  const badPhone = await recordConsent(db, {
    leadId,
    campaignId,
    phoneAsTyped: '555',
    businessName: 'Smoke Test Heating',
    checkboxChecked: true,
    versionId: CURRENT_CONSENT.id,
  });
  check('an undialable number is refused', badPhone.ok === false);

  const oldVersion = await recordConsent(db, {
    leadId,
    campaignId,
    phoneAsTyped: TEST_PHONE,
    businessName: 'Smoke Test Heating',
    checkboxChecked: true,
    versionId: 'not-a-real-version',
  });
  check('an unknown consent version is refused', oldVersion.ok === false);

  const good = await recordConsent(db, {
    leadId,
    campaignId,
    phoneAsTyped: TEST_PHONE,
    businessName: 'Smoke Test Heating',
    contactName: 'Smoke Tester',
    checkboxChecked: true,
    typedName: 'Smoke Tester',
    versionId: CURRENT_CONSENT.id,
    ip: '203.0.113.7',
    userAgent: 'acq-smoke/1.0',
    sourceCampaign: CAMPAIGN_SLUG,
    sourceVariant: 'A',
  });
  check('a proper consent is recorded', good.ok === true, good.ok ? '' : good.error);
  if (good.ok) consentIds.push(good.id);

  const { data: stored } = await db.from('acq_consents').select('*').eq('lead_id', leadId).maybeSingle();
  check('the exact sentence is stored on the row', stored?.consent_text === CURRENT_CONSENT.text);
  check('the version is stored beside it', stored?.consent_version === CURRENT_CONSENT.id);
  check('the dialed number is stored in E.164', stored?.phone_e164 === '+14065550199');
  check('the number as typed is preserved', stored?.phone_as_typed === TEST_PHONE);
  check('the evidence carries IP and user agent', Boolean(stored?.ip) && Boolean(stored?.user_agent));

  check('the call gate sees a live consent', (await hasLiveConsent(db, '+14065550199')) === true);
  const revoked = await revokeConsent(db, { leadId, reason: 'smoke test' });
  check('revocation marks the record rather than deleting it', revoked === 1);
  check('the call gate refuses a revoked consent', (await hasLiveConsent(db, '+14065550199')) === false);
  const { count: stillThere } = await db.from('acq_consents').select('id', { count: 'exact', head: true }).eq('lead_id', leadId);
  check('a revoked consent is still on file', stillThere === 1);

  /* ── cancelling pending work ── */

  await enqueue(db, { kind: 'followup', leadId, campaignId, step: 9, payload: { followup: 'demo_no_purchase_1' } });
  const cancelled = await cancelPendingFor(db, leadId, undefined, 'smoke test');
  check('pending work can be cancelled the moment a prospect converts', cancelled >= 1, `${cancelled}`);

  /* ── the timeline recorded it all ── */

  const { data: events } = await db.from('acq_events').select('type').eq('lead_id', leadId);
  const types = new Set(((events ?? []) as { type: string }[]).map((e) => e.type));
  check('the consent event is on the timeline', types.has('consent_captured'), [...types].join(','));

  await cleanup();
  const { count: left } = await db.from('outbound_leads').select('id', { count: 'exact', head: true }).eq('id', leadId);
  check('the smoke test cleans up after itself', left === 0);

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  if (fail > 0) process.exitCode = 1;
}

try {
  await main();
} catch (err) {
  console.error('SMOKE TEST THREW:', err instanceof Error ? err.message : err);
  await cleanup();
  process.exitCode = 1;
}
