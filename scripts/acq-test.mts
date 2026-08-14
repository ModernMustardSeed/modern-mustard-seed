/**
 * THE ACQUISITION ENGINE'S UNIT TESTS.
 *
 *   npx tsx --test scripts/acq-test.mts
 *
 * Pure functions only, no database and no network, so this runs in a second and
 * can be trusted in CI. The rules being pinned here are the ones where a
 * regression costs money or credibility: who is allowed to be emailed, how an
 * address is graded, whether the same work can be queued twice, and whether the
 * consent gate can be talked around.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { nameKey, domainKey, phoneDigits, emailKey, keysFor, checkDuplicate, claim, type DedupeIndex } from '../lib/acq/dedupe';
import { scoreLead, lastCloseHour } from '../lib/acq/score';
import { evaluate, dueForStep, businessDaysBetween, sequenceGaps, sequenceLength } from '../lib/acq/eligibility';

import { workerStatus } from '../app/api/admin/acquisition/lead-finder/route';
import { TRADE_DEFS, SOURCEABLE_TRADES, PROVEN_TRADES } from '../lib/acq/trades';
import { neverDoFor, escalateOnFor, defaultGreeting, callerKey } from '../lib/front-office/provision';
import { runwayDays } from '../lib/acq/reservoir';
import { buildInstructions, assistantConfig } from '../lib/front-office/agent';
import { frontOfficeTools } from '../lib/front-office/tools';
import { parseDayHours, sayable } from '../lib/front-office/calendar';
import { TRADE_LABELS, TRADE_SCENARIOS, TRADE_ROLEPLAY_NOTE } from '../lib/acq/types';

/** Four gaps, so a five email sequence. Mirrors the shipped campaign. */
const GAPS = [2, 4, 3, 4];
import { idempotencyKey } from '../lib/acq/queue';
import { CONSENT_VERSIONS, CURRENT_CONSENT, toE164, consentVersion } from '../lib/acq/consent';
import { greetingFor, firstNameOr, renderSubject, shortBusiness, buildCampaignEmail, permissionUrl } from '../lib/acq/campaign';
import { pickVariant } from '../lib/acq/settings';
import { normalizeObjection } from '../lib/acq/stats';
import { addBusinessDays, shouldStopFollowup } from '../lib/acq/runner';
import { cloudflareEmails, extractPhone, extractHours, extractServiceArea, parseOsmHours, matchesTrade, normalizePhone, decodeObfuscated, hostOf } from '../lib/acq/source';
import { tradeOf, buildBriefing, firstMessage, acquisitionTools } from '../lib/acq/call';
import { authorize, nextRampStep, backOffStep, tierFor } from '../lib/acq/governor';
import { goalLadder, forecast, monthsBetween, type FunnelRate } from '../lib/acq/factory';
import { estimateFor, calculatorBlock, personalOpener } from '../lib/acq/personalize';
import { readAttribution, labelSource } from '../lib/mustard/surface';
import { hashToken } from '../lib/mustard/links';
import { OFFER, isMailableEmailStatus } from '../lib/acq/types';
import type { AcqProspect, AcqVariant, AcqSettings, AcqCampaign } from '../lib/acq/types';

/* --------------------------------- helpers -------------------------------- */

const lead = (over: Partial<AcqProspect> = {}): AcqProspect =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    business_name: 'ABC Heating & Air LLC',
    contact_name: 'Dana Whitfield',
    contact_title: null,
    phone: '(602) 555-0134',
    email: 'office@abcheating.com',
    website: 'https://abcheating.com',
    niche: 'home_service',
    trade: 'hvac',
    city: 'Phoenix',
    state: 'AZ',
    address: null,
    postal_code: null,
    service_area: null,
    email_status: 'likely',
    email_confidence: 78,
    email_source: 'google-maps+website',
    email_source_url: 'https://abcheating.com/contact',
    contact_source_url: null,
    phone_type: null,
    rating: 4.8,
    review_count: 312,
    hours: null,
    open_24_7: false,
    emergency_service: true,
    call_volume_score: 60,
    missed_call_score: 55,
    lead_score: 72,
    score_reasons: [],
    priority: 1,
    source: 'acq-lead-finder',
    source_urls: null,
    acq_campaign_id: 'c0000000-0000-4000-8000-000000000000',
    acq_stage: 'prospect',
    acq_variant: null,
    acq_eligible: true,
    acq_ineligible_reason: null,
    email_stage: 0,
    last_campaign_email_at: null,
    reply_at: null,
    call_stage: null,
    call_attempts: 0,
    last_call_at: null,
    consent_status: null,
    consent_at: null,
    consent_id: null,
    demo_status: null,
    demo_emailed_at: null,
    checkout_sent_at: null,
    checkout_url: null,
    meeting_status: null,
    meeting_at: null,
    payment_status: null,
    client_status: null,
    won_at: null,
    setup_cents: null,
    mrr_cents: null,
    unsubscribed_at: null,
    suppression_reason: null,
    bounced: false,
    duplicate_of: null,
    is_test: false,
    assigned_to: null,
    last_researched_at: null,
    imported_at: null,
    needs_human: null,
    notes: null,
    rep_notes: null,
    demo_url: null,
    hub_demo_url: null,
    site_demo_url: null,
    site_demo_status: null,
    os_demo_url: null,
    dnc_checked: false,
    status: 'new',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    hub_demo_id: null,
    acq_cohort_id: null,
    reservoir_state: 'ready',
    email_tier: null,
    metro: null,
    last_enriched_at: null,
    enrichment_provider: null,
    enrichment_cost_cents: null,
    ...over,
  }) as AcqProspect;

const emptyIndex = (): DedupeIndex => ({
  names: new Set(),
  domains: new Set(),
  phones: new Set(),
  emails: new Set(),
  suppressed: new Set(),
  idByKey: new Map(),
  size: 0,
});

/* --------------------------------- dedupe --------------------------------- */

test('dedupe: legal suffixes and trade words collapse, real differences do not', () => {
  assert.equal(nameKey("Bob's Plumbing Services LLC", 'Mesa', 'AZ'), nameKey('Bobs Plumbing', 'Phoenix', 'AZ'));
  assert.notEqual(nameKey("Bob's Plumbing", null, 'AZ'), nameKey("Bill's Plumbing", null, 'AZ'));
  // Geography is part of identity: two Anderson plumbers in two states are two businesses.
  assert.notEqual(nameKey('Anderson Plumbing', 'Phoenix', 'AZ'), nameKey('Anderson Plumbing', 'Dallas', 'TX'));
});

test('dedupe: a shared free host is not an identity', () => {
  assert.equal(domainKey('https://joesroofing.wixsite.com/home'), '');
  assert.equal(domainKey('https://www.JoesRoofing.com/contact'), 'joesroofing.com');
  assert.equal(domainKey(''), '');
  assert.equal(domainKey('not a url'), '');
});

test('dedupe: phone and email keys reject anything that is not real', () => {
  assert.equal(phoneDigits('+1 (602) 555-0134'), '6025550134');
  assert.equal(phoneDigits('555-0134'), '');
  assert.equal(emailKey('  Office@ABCHeating.com '), 'office@abcheating.com');
  assert.equal(emailKey('nope'), '');
});

test('dedupe: blank keys never match blank keys', () => {
  const idx = emptyIndex();
  claim(idx, keysFor({ business_name: 'A Co', state: 'AZ' }));
  // A second business with no website, no phone and no email must not collide
  // with the first just because both are missing the same fields.
  const verdict = checkDuplicate(idx, keysFor({ business_name: 'B Co', state: 'AZ' }));
  assert.equal(verdict.duplicate, false);
});

test('dedupe: a suppressed address outranks every other signal', () => {
  const idx = emptyIndex();
  idx.suppressed.add('office@abcheating.com');
  const v = checkDuplicate(idx, keysFor({ business_name: 'Brand New Co', email: 'office@abcheating.com' }));
  assert.equal(v.duplicate, true);
  assert.equal(v.on, 'suppressed');
});

test('dedupe: domain, email, phone and name all catch a repeat', () => {
  for (const [field, first, second] of [
    ['website', { business_name: 'A', website: 'https://x.com' }, { business_name: 'Different', website: 'http://www.x.com/contact' }],
    ['email', { business_name: 'A', email: 'a@x.com' }, { business_name: 'Different', email: 'A@X.com' }],
    ['phone', { business_name: 'A', phone: '(602) 555-0134' }, { business_name: 'Different', phone: '+16025550134' }],
    ['name', { business_name: 'Acme Roofing LLC', state: 'AZ' }, { business_name: 'ACME Roofing', state: 'AZ' }],
  ] as const) {
    const idx = emptyIndex();
    claim(idx, keysFor(first));
    assert.equal(checkDuplicate(idx, keysFor(second)).duplicate, true, `${field} should have matched`);
  }
});

/* --------------------------------- scoring -------------------------------- */

test('scoring: a busy emergency contractor with a verified email outscores a quiet one', () => {
  const good = scoreLead({ business_name: 'Valley Air', trade: 'hvac', website: 'https://x.com', email_status: 'verified', phone: '6025550134', review_count: 420, rating: 4.8, emergency_service: true, city: 'Phoenix', state: 'AZ' });
  const meh = scoreLead({ business_name: 'Quiet Air', trade: 'hvac', website: null, email_status: 'unknown', phone: '6025550134', review_count: 2, city: 'Phoenix', state: 'AZ' });
  assert.ok(good.score > meh.score, `${good.score} should beat ${meh.score}`);
  assert.ok(good.score >= 70 && good.priority === 1);
  assert.ok(good.reasons.some((r) => /verified/i.test(r.label)));
});

test('scoring: a national franchise sinks even with perfect signals', () => {
  const chain = scoreLead({ business_name: 'Roto-Rooter Plumbing of Phoenix', trade: 'plumbing', website: 'https://x.com', email_status: 'verified', phone: '6025550134', review_count: 3000, rating: 4.6, emergency_service: true });
  assert.ok(chain.reasons.some((r) => r.points <= -70), 'a chain must take the chain penalty');
  assert.ok(chain.score < 60, `chains should not float to the top (got ${chain.score})`);
});

test('scoring: a closed business is worthless whatever else is true', () => {
  const closed = scoreLead({ business_name: 'Gone Plumbing', trade: 'plumbing', website: 'https://x.com', email_status: 'verified', phone: '6025550134', review_count: 800, permanently_closed: true });
  assert.equal(closed.score, 0);
});

test('scoring: closing early is a missed-call signal, 24/7 is a bigger one', () => {
  const early = scoreLead({ business_name: 'Nine To Five Air', trade: 'hvac', phone: '6025550134', email_status: 'likely', website: 'https://x.com', hours: { monday: '8:00 am - 5:00 pm', tuesday: '8:00 am - 5:00 pm', wednesday: '8:00 am - 5:00 pm', thursday: '8:00 am - 5:00 pm', friday: '8:00 am - 5:00 pm', saturday: 'closed', sunday: 'closed' } });
  const always = scoreLead({ business_name: 'Always Air', trade: 'hvac', phone: '6025550134', email_status: 'likely', website: 'https://x.com', open_24_7: true });
  assert.ok(early.missedCall >= 30, `an early closer has a real gap (got ${early.missedCall})`);
  assert.ok(always.missedCall >= 30, `an advertised 24/7 promise is the sharpest pitch (got ${always.missedCall})`);
  assert.ok(early.reasons.some((r) => /closes before 6pm/i.test(r.label)));
  assert.ok(always.reasons.some((r) => /24\/7/i.test(r.label)));
});

test('scoring: lastCloseHour reads the real closing time', () => {
  assert.equal(lastCloseHour('8:00 am - 5:00 pm'), 17);
  assert.equal(lastCloseHour('07:30-16:00'), 16);
  assert.equal(lastCloseHour('closed'), null);
  assert.equal(lastCloseHour('open 24 hours'), 24);
});

/* ------------------------------- eligibility ------------------------------ */

test('eligibility: the deny list is absolute', () => {
  const ctx = { suppressed: new Set<string>(), minLeadScore: 40 };
  const cases: [Partial<AcqProspect>, RegExp][] = [
    [{ is_test: true }, /test/i],
    [{ unsubscribed_at: new Date().toISOString() }, /unsubscribed/i],
    [{ bounced: true }, /bounced/i],
    [{ client_status: 'client' }, /already a client/i],
    [{ dnc_checked: true }, /do-not-contact/i],
    [{ email: null }, /no usable email/i],
    [{ email: 'noreply@abcheating.com' }, /unattended/i],
    [{ email: 'a@example.com' }, /disposable|test/i],
    [{ email_status: 'risky' }, /email status/i],
    [{ email_status: 'unknown' }, /email status/i],
    [{ phone: '555' }, /dialable/i],
    [{ lead_score: 10 }, /under the campaign minimum/i],
    [{ duplicate_of: 'x' }, /duplicate/i],
  ];
  for (const [over, expected] of cases) {
    const v = evaluate(lead(over), ctx);
    assert.equal(v.eligible, false, `${JSON.stringify(over)} should be refused`);
    if (!v.eligible) assert.match(v.reason, expected);
  }
});

test('eligibility: a clean prospect passes, and a suppressed one never does', () => {
  assert.equal(evaluate(lead(), { suppressed: new Set(), minLeadScore: 40 }).eligible, true);
  const v = evaluate(lead(), { suppressed: new Set(['office@abcheating.com']), minLeadScore: 40 });
  assert.equal(v.eligible, false);
});

test('eligibility: only verified, likely and publicly listed addresses are mailable', () => {
  assert.equal(isMailableEmailStatus('verified'), true);
  assert.equal(isMailableEmailStatus('likely'), true);
  assert.equal(isMailableEmailStatus('public'), true);
  assert.equal(isMailableEmailStatus('risky'), false);
  assert.equal(isMailableEmailStatus('invalid'), false);
  assert.equal(isMailableEmailStatus('unknown'), false);
  assert.equal(isMailableEmailStatus(null), false);
});

/* -------------------------------- sequencing ------------------------------ */

test('sequencing: the sequence stops dead the moment they convert', () => {
  const now = new Date('2026-08-20T16:00:00Z');
  assert.equal(dueForStep(lead({ email_stage: 0 }), now, GAPS), 1);
  assert.equal(dueForStep(lead({ consent_status: 'granted' }), now, GAPS), null);
  assert.equal(dueForStep(lead({ reply_at: now.toISOString() }), now, GAPS), null);
  assert.equal(dueForStep(lead({ acq_stage: 'called' }), now, GAPS), null);
  // Past the last email in the sequence. GAPS has four gaps, so five emails.
  assert.equal(dueForStep(lead({ email_stage: 5 }), now, GAPS), null);
  assert.equal(dueForStep(lead({ email_stage: 3 }), now, GAPS), 4);
});

test('sequencing: step two waits its business days', () => {
  const sent = new Date('2026-08-17T16:00:00Z'); // a Monday
  const oneDay = new Date('2026-08-18T16:00:00Z');
  const twoDays = new Date('2026-08-19T16:00:00Z');
  assert.equal(dueForStep(lead({ email_stage: 1, last_campaign_email_at: sent.toISOString() }), oneDay, GAPS), null);
  assert.equal(dueForStep(lead({ email_stage: 1, last_campaign_email_at: sent.toISOString() }), twoDays, GAPS), 2);
});

test('sequencing: weekends do not count as business days', () => {
  assert.equal(businessDaysBetween(new Date('2026-08-14T12:00:00Z'), new Date('2026-08-17T12:00:00Z')), 1);
  assert.equal(businessDaysBetween(new Date('2026-08-17T12:00:00Z'), new Date('2026-08-21T12:00:00Z')), 4);
  assert.equal(businessDaysBetween(new Date('2026-08-21T12:00:00Z'), new Date('2026-08-17T12:00:00Z')), 0);
});

test('sequencing: addBusinessDays never lands on a weekend or at 3am Mountain', () => {
  const out = addBusinessDays(new Date('2026-08-14T20:00:00Z'), 1); // Friday
  assert.ok(out.getUTCDay() >= 1 && out.getUTCDay() <= 5);
  assert.equal(out.getUTCHours(), 16);
});

test('follow-ups stop when the thing being chased already happened', () => {
  assert.match(String(shouldStopFollowup('demo_no_purchase_1', lead({ client_status: 'client' }))), /bought/i);
  assert.match(String(shouldStopFollowup('called_no_forge', lead({ demo_status: 'ready' }))), /already/i);
  assert.match(String(shouldStopFollowup('no_call_after_consent', lead({ call_stage: 'completed' }))), /happened/i);
  assert.equal(shouldStopFollowup('demo_no_purchase_1', lead()), null);
});

/* ------------------------------- idempotency ------------------------------ */

test('idempotency: the key describes the work, never the moment', async () => {
  const a = idempotencyKey('email', 'lead-1', 2);
  await new Promise((r) => setTimeout(r, 5));
  const b = idempotencyKey('email', 'lead-1', 2);
  assert.equal(a, b, 'the same work must produce the same key however long apart');
  assert.notEqual(a, idempotencyKey('email', 'lead-1', 3));
  assert.notEqual(a, idempotencyKey('call', 'lead-1', 2));
  assert.notEqual(a, idempotencyKey('email', 'lead-2', 2));
});

/* --------------------------------- consent -------------------------------- */

test('consent: versions are append-only and the current one is the last', () => {
  assert.ok(CONSENT_VERSIONS.length >= 1);
  assert.equal(CURRENT_CONSENT.id, CONSENT_VERSIONS[CONSENT_VERSIONS.length - 1].id);
  assert.equal(consentVersion('does-not-exist'), undefined);
});

test('consent: the text says the four things it has to say', () => {
  const t = CURRENT_CONSENT.text.toLowerCase();
  assert.match(t, /modern mustard seed/);
  assert.match(t, /artificial, prerecorded, or ai-generated voice/);
  assert.match(t, /not a condition of purchas/);
  assert.match(t, /revoke/);
});

test('consent: a phone number is dialed or refused, never guessed', () => {
  assert.equal(toE164('(602) 555-0134'), '+16025550134');
  assert.equal(toE164('16025550134'), '+16025550134');
  assert.equal(toE164('555-0134'), null);
  assert.equal(toE164('+44 20 7946 0958'), null);
  assert.equal(toE164(''), null);
});

/* -------------------------------- the emails ------------------------------ */

test('emails: never fake familiarity', () => {
  assert.equal(greetingFor(lead({ contact_name: 'Dana Whitfield' })), 'Hey Dana,');
  assert.equal(greetingFor(lead({ contact_name: null })), 'Hey there,');
  assert.equal(greetingFor(lead({ contact_name: 'Office' })), 'Hey there,');
  assert.equal(greetingFor(lead({ contact_name: 'ABC Heating LLC' })), 'Hey there,');
  assert.equal(firstNameOr(lead({ contact_name: null }), 'ABC Heating'), 'ABC Heating');
});

test('emails: the business name reads like a human wrote it', () => {
  assert.equal(shortBusiness('ABC Heating & Air LLC'), 'ABC Heating & Air');
  assert.equal(shortBusiness('Smith Roofing, Inc.'), 'Smith Roofing');
  assert.equal(shortBusiness(''), 'your business');
});

test('emails: a merge field always resolves to something honest', () => {
  const v: AcqVariant = { id: 'v', campaign_id: 'c', key: 'B', step: 1, subject: '{{first_name}}, this is easier to hear than explain', cta_label: 'YES', body_key: 'default', weight: 1, active: true };
  assert.equal(renderSubject(v, lead()), 'Dana, this is easier to hear than explain');
  assert.equal(renderSubject(v, lead({ contact_name: null })), 'ABC Heating & Air, this is easier to hear than explain');
  assert.ok(!renderSubject(v, lead({ contact_name: null })).includes('{{'));
});

test('emails: every campaign email carries the opt-out and the tracked CTA', () => {
  for (const step of [1, 2, 3, 4, 5] as const) {
    const built = buildCampaignEmail({
      lead: lead(),
      variant: { id: 'v', campaign_id: 'c', key: 'A', step, subject: 'S', cta_label: 'YES', body_key: 'default', weight: 1, active: true },
      step,
      fromName: 'Sarah at Modern Mustard Seed',
      fromEmail: 'sarah@modernmustardseed.com',
      replyTo: 'sarah@modernmustardseed.com',
    });
    assert.ok(built, `step ${step} should build`);
    assert.match(built!.html, /unsubscribe here/i, 'the compliance footer must be present');
    assert.match(built!.unsubscribeUrl, /\/api\/outreach\/unsubscribe\?c=/);
    assert.match(built!.html, /\/api\/acq\/click\?/, 'the CTA must be the tracked link');
    assert.equal(built!.to, 'office@abcheating.com');
  }
});

const office = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  business_name: 'Flathead Comfort Heating & Air',
  agent_name: 'the front desk',
  greeting: 'Thanks for calling Flathead Comfort. How can I help?',
  tone: 'warm',
  voice_gender: 'female',
  languages: ['en'],
  timezone: 'America/Denver',
  hours: { monday: '8:00 am - 5:00 pm', saturday: 'closed' },
  services: ['AC repair'],
  service_area: 'Flathead Valley',
  booking_enabled: true,
  transfers_enabled: true,
  never_do: ['Never diagnose the equipment.', 'Never claim to be a human. If asked, say plainly that you are an AI assistant.'],
  escalate_on: ['The caller asks for a human.'],
  after_hours_message: null,
  forward_mode: 'after_hours',
  vapi_assistant_id: null,
  settings: {},
  ...over,
});

test('agent: the instructions always disclose what it is, and never bend the hard rules', () => {
  const i = buildInstructions(office(), []);
  assert.match(i, /You are an AI assistant\. Say so plainly/);
  assert.match(i, /Never diagnose the equipment/);
  // The identity and the hard rules must come BEFORE the softer context. A
  // model that runs short on attention drops the middle of a prompt, and the
  // middle is not where "never claim to be human" belongs.
  assert.ok(i.indexOf('DO NOT BEND') < i.indexOf('HOW YOU SOUND'), 'rules must precede tone');
  assert.ok(i.indexOf('AI assistant') < i.length / 2, 'the disclosure belongs in the first half');
});

test('agent: a tool the office switched off is absent, not merely discouraged', () => {
  const withBooking = frontOfficeTools({ booking_enabled: true, transfers_enabled: true }).map((t) => t.function.name);
  assert.ok(withBooking.includes('book_appointment') && withBooking.includes('transfer_call'));

  // A model cannot misuse a tool it does not have. "Please do not use this"
  // is an instruction, not a control.
  const without = frontOfficeTools({ booking_enabled: false, transfers_enabled: false }).map((t) => t.function.name);
  assert.ok(!without.includes('book_appointment'), 'booking off means the tool is gone');
  assert.ok(!without.includes('transfer_call'), 'transfers off means the tool is gone');
  // log_call and take_message are never optional: an office that records
  // nothing is an answering machine with extra steps.
  assert.ok(without.includes('log_call') && without.includes('take_message'));
});

test('agent: nothing uploaded to Vapi carries a secret or an office id as authority', () => {
  const OFFICE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const cfg = assistantConfig(office({ id: OFFICE_ID }), []);
  const json = JSON.stringify(cfg);
  assert.ok(!/api[_-]?key|bearer |service_role|password/i.test(json), 'no credential may travel with an assistant');
  // The server URL must NOT carry the office id: the webhook resolves the
  // office from the assistant id instead, so a guessed URL writes nothing.
  const serverUrl = String((cfg.server as { url: string }).url);
  assert.ok(!serverUrl.includes(OFFICE_ID), 'the office id must never be in the callback URL');
  assert.match(serverUrl, /\/api\/front-office\/vapi$/);
});

test('agent: Spanish is only promised when the owner turned it on', () => {
  assert.ok(!/Spanish/i.test(buildInstructions(office(), [])));
  assert.match(buildInstructions(office({ languages: ['en', 'es'] }), []), /switch to Spanish/i);
});

test('calendar: hours that cannot be read are treated as CLOSED, never as open', () => {
  assert.deepEqual(parseDayHours('8:00 am - 5:00 pm'), { open: 480, close: 1020 });
  assert.deepEqual(parseDayHours('9am-6pm'), { open: 540, close: 1080 });
  assert.deepEqual(parseDayHours('24/7'), { open: 0, close: 1440 });
  assert.equal(parseDayHours('closed'), null);
  assert.equal(parseDayHours(''), null);
  assert.equal(parseDayHours(undefined), null);
  // The failure that offers a caller a 3am Sunday appointment is worse than
  // the one that offers nothing at all.
  assert.equal(parseDayHours('by appointment'), null);
  assert.equal(parseDayHours('sunrise to sunset'), null);
  // A close that is not after the open is nonsense, not a 23-hour day.
  assert.equal(parseDayHours('5pm - 8am'), null);
});

test('calendar: a spoken time is readable, not a timestamp', () => {
  const said = sayable(new Date('2026-08-20T15:00:00Z'), 'America/Denver');
  assert.match(said, /Thursday/);
  assert.match(said, /9:00\s?AM/i, 'converted into the office timezone, not left in UTC');
  // "never read an ISO string to a caller". Checking for a bare 'T' would
  // fail on the word Thursday, so this looks for the actual shape.
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(said), 'never read an ISO timestamp to a caller');
});

test('front office: the rules seeded for a trade carry its own hard rule and the disclosure', () => {
  const hvac = neverDoFor('hvac');
  assert.ok(hvac.some((r) => /never diagnose the equipment/i.test(r)), 'the trade rule must be lifted out of the roleplay note');
  assert.ok(hvac.some((r) => /you are an AI/i.test(r)), 'an agent must always be able to say what it is');
  assert.ok(hvac.some((r) => /never quote a firm price/i.test(r)));

  // A business we banked without pinning the trade still gets the base rules
  // rather than an empty list, which would be an agent with no limits at all.
  assert.ok(neverDoFor(null).length >= 3);
  assert.ok(neverDoFor('other').length >= 3);

  // Emergency trades escalate on the things that hurt people; a flooring
  // company does not need a fire clause and should not get one.
  assert.ok(escalateOnFor('restoration').some((r) => /flooding|fire|injury/i.test(r)));
  assert.ok(!escalateOnFor('flooring').some((r) => /flooding|fire/i.test(r)));
  // Every trade escalates when a human is asked for. That one is universal.
  for (const t of SOURCEABLE_TRADES) {
    assert.ok(escalateOnFor(t).some((r) => /asks for a human/i.test(r)), `${t} must escalate on request`);
  }
});

test('front office: a greeting always names the business and never ships empty', () => {
  const g = defaultGreeting('Flathead Comfort Heating & Air');
  assert.match(g, /Flathead Comfort Heating & Air/);
  assert.ok(g.length > 40);
  // The fallback for a missing name must still be a sentence, not "Thanks for
  // calling ." which is what an empty string would produce.
  assert.ok(!defaultGreeting('').includes('calling .'));
});

test('front office: one caller is one contact however the number was written', () => {
  const forms = ['(406) 555-0143', '406-555-0143', '4065550143', '+1 406 555 0143', '1-406-555-0143'];
  const keys = new Set(forms.map((f) => callerKey(f)));
  assert.equal(keys.size, 1, 'every format of the same number must collapse to one key');
  assert.equal([...keys][0], '4065550143');
  // Too short to be a phone number is null, not a truncated key that would
  // merge two unrelated callers.
  assert.equal(callerKey('12345'), null);
  assert.equal(callerKey(''), null);
  assert.equal(callerKey(null), null);
});

test('reservoir: runway is measured in days, and refuses to divide by nothing', () => {
  assert.equal(runwayDays(4500, 4500), 1);
  assert.equal(runwayDays(1000, 4500), 0, 'a thousand prospects is not one day at the ceiling');
  assert.equal(runwayDays(25000, 100), 250);
  // No send rate means no answer, not Infinity dressed up as good news.
  assert.equal(runwayDays(1000, 0), null);
  assert.equal(runwayDays(1000, Number.NaN), null);
});

test('trades: every industry in the registry is complete and internally consistent', () => {
  for (const key of SOURCEABLE_TRADES) {
    const d = TRADE_DEFS[key];
    assert.equal(d.key, key, `${key}: the key inside the block must match the key it is filed under`);
    assert.ok(d.label && d.maps.length && d.scenarios.length >= 3, `${key}: missing label, maps queries or scenarios`);
    assert.ok(d.economics.avgJobValue > 0 && d.economics.closeRatePct > 0 && d.economics.callsPerReview > 0, `${key}: economics must be real numbers`);
    assert.ok(d.roleplay.length > 80, `${key}: the roleplay note is what Mr. Mustard actually becomes, it cannot be a stub`);
    // Every trade must match its own name, or sourcing it finds nothing.
    assert.ok(d.match.test(d.label) || d.maps.some((q) => d.match.test(q)), `${key}: the strict filter does not match its own search terms`);
    assert.ok(TRADE_LABELS[key] && TRADE_SCENARIOS[key]?.length && TRADE_ROLEPLAY_NOTE[key], `${key}: missing from the derived tables`);
  }
  assert.ok(SOURCEABLE_TRADES.length >= 16, 'the registry should carry every industry we can sell to');
  for (const t of PROVEN_TRADES) assert.ok(SOURCEABLE_TRADES.includes(t), `${t} is marked proven but is not in the registry`);
});

test('trades: the keyword collisions that would poison a campaign are all rejected', () => {
  // Each of these reads exactly like the trade and is not the trade. Sending
  // a missed-call pitch to a power co-op or a paint-and-sip bar is the kind of
  // mistake that gets a sending domain reported.
  const traps: [string, Parameters<typeof matchesTrade>[1]][] = [
    ['Flathead Electric Cooperative', 'electrical'],
    ['Electric Avenue Bikes', 'electrical'],
    ['Bozeman Furniture Restoration', 'restoration'],
    ['Classic Auto Restoration', 'restoration'],
    ['Pinot and Paint Studio', 'painting'],
    ['Maaco Collision Repair and Auto Painting', 'painting'],
    ['Corner Pocket Billiards and Pool Hall', 'pool_service'],
    ['Missoula Family Tree Genealogy', 'tree_service'],
    ['Larry H Miller Toyota', 'auto_repair'],
    ['AutoZone Auto Parts', 'auto_repair'],
    ['Veterans Affairs Clinic', 'veterinary'],
    ['Second Floor Dance Studio', 'flooring'],
    ['Scratch and Dent Appliance Store', 'appliance_repair'],
    ['Glacier Garden Center and Nursery', 'landscaping'],
  ];
  for (const [name, trade] of traps) {
    assert.equal(matchesTrade(name, trade), false, `"${name}" must never be sourced as ${trade}`);
  }

  // And the real ones still get through, including the three whose industry
  // vocabulary collides head-on with the global contractor exclusions.
  const real: [string, Parameters<typeof matchesTrade>[1]][] = [
    ['Bigfork Electric LLC', 'electrical'],
    ['Overhead Door Company of Kalispell', 'garage_door'],
    ['SERVPRO of Flathead County Water Damage Restoration', 'restoration'],
    ['Glacier Pest Control', 'pest_control'],
    ['Whitefish Tree Service', 'tree_service'],
    ['Flathead Valley Animal Hospital', 'veterinary'],
    ['Kalispell Auto Repair', 'auto_repair'],
    ['Big Sky Pool Service and Spa', 'pool_service'],
    ['Montana Appliance Repair', 'appliance_repair'],
    ['Summit Chimney Sweep', 'chimney'],
    ['Larson Painting Company', 'painting'],
    ['Glacier Flooring Gallery', 'flooring'],
    ['Evergreen Lawn Care', 'landscaping'],
  ];
  for (const [name, trade] of real) {
    assert.equal(matchesTrade(name, trade), true, `"${name}" should source as ${trade}`);
  }
});

test('trades: an estimate is built for every industry, never just the original three', () => {
  for (const trade of SOURCEABLE_TRADES) {
    const est = estimateFor(lead({ trade, review_count: 180, rating: 4.8 }));
    assert.ok(est.personalizable, `${trade}: a well-reviewed business must be personalizable`);
    assert.ok(est.monthlyLeakCents > 0, `${trade}: the estimate must be a real number`);
    assert.ok(est.inputs.every((i) => i.because), `${trade}: every input must say where it came from`);
  }
});

test('lead finder: a queued run with no worker reports ABSENT, never idle', () => {
  const now = Date.parse('2026-08-14T02:20:00Z');
  const queued = { status: 'queued', heartbeat_at: null, created_at: '2026-08-14T01:42:00Z' };

  // The exact bug. Thirty eight minutes queued, nothing listening, and the
  // screen used to say IDLE because no run had status 'running'.
  const abandoned = workerStatus([queued], now);
  assert.equal(abandoned.state, 'absent');
  assert.match(abandoned.detail, /38 minutes/);
  assert.ok(abandoned.command, 'must hand back the command that fixes it');

  // Claimed and beating.
  assert.equal(workerStatus([{ status: 'running', heartbeat_at: '2026-08-14T02:19:30Z', created_at: '2026-08-14T01:42:00Z' }], now).state, 'working');

  // Claimed, then the terminal was closed.
  assert.equal(workerStatus([{ status: 'running', heartbeat_at: '2026-08-14T02:05:00Z', created_at: '2026-08-14T01:42:00Z' }], now).state, 'stalled');

  // Genuinely nothing to do. This is the only case that is not a problem.
  assert.equal(workerStatus([{ status: 'done', heartbeat_at: '2026-08-13T19:05:00Z', created_at: '2026-08-13T18:58:00Z' }], now).state, 'waiting');
  assert.equal(workerStatus([], now).state, 'waiting');
});

test('sequence: gaps are sanitized so a bad row cannot fire the whole drip at once', () => {
  // The dangerous case. A zero gap means "due immediately", and five emails
  // arriving in one pass is a spam complaint rather than a sequence.
  assert.deepEqual(sequenceGaps([0, 0, 0, 0]), [1, 1, 1, 1]);
  assert.deepEqual(sequenceGaps([]), [2, 3, 3, 4], 'empty falls back to the house spacing');
  assert.deepEqual(sequenceGaps(null), [2, 3, 3, 4]);
  assert.deepEqual(sequenceGaps([2.6, -5, 999]), [3, 1, 60], 'rounded, floored at 1, capped at 60');
  assert.equal(sequenceLength([2, 3, 3, 4]), 5, 'four gaps means five emails');
  assert.equal(sequenceLength(null), 5);
});

test('sequence: every body_key in the sequence renders its own distinct email', () => {
  const seen = new Map<string, string>();
  for (const body_key of ['default', 'proof', 'challenge', 'keep_her', 'breakup']) {
    const built = buildCampaignEmail({
      lead: lead(),
      variant: { id: 'v', campaign_id: 'c', key: 'A', step: 1, subject: 'S', cta_label: 'YES', body_key, weight: 1, active: true },
      step: 1,
      fromName: 'Sarah',
      fromEmail: 'sarah@modernmustardseed.com',
      replyTo: 'sarah@modernmustardseed.com',
    });
    assert.ok(built, `${body_key} should build`);
    for (const [other, html] of seen) {
      assert.notEqual(built!.html, html, `${body_key} renders the same email as ${other}`);
    }
    seen.set(body_key, built!.html);
  }
});

test('emails: the proof email quotes only cited figures, and shows the contested one as a range', () => {
  const built = buildCampaignEmail({
    lead: lead(),
    variant: { id: 'v', campaign_id: 'c', key: 'A', step: 2, subject: 'The call you never hear about', cta_label: 'YES', body_key: 'proof', weight: 1, active: true },
    step: 2,
    fromName: 'Sarah',
    fromEmail: 'sarah@modernmustardseed.com',
    replyTo: 'sarah@modernmustardseed.com',
  });
  const html = built!.html;
  assert.match(html, /391%/);
  assert.match(html, /Harvard Business Review, 2011/);
  assert.match(html, /82%/);
  assert.match(html, /CallRail, 2025/);
  // The voicemail figure is contested, so it must never appear as a bare
  // round number pretending to be settled.
  assert.match(html, /67% to 86%/, 'the voicemail spread must be shown');
  // The numbers with no primary source stay out, forever.
  for (const junk of ['85%', '126,000', '$126K', '62% of business calls']) {
    assert.ok(!html.includes(junk), `unsourced figure "${junk}" must never ship`);
  }
});

test('emails: the keep-her email promises nobody loses a job', () => {
  const built = buildCampaignEmail({
    lead: lead(),
    variant: { id: 'v', campaign_id: 'c', key: 'A', step: 4, subject: 'You do not have to replace anybody', cta_label: 'YES', body_key: 'keep_her', weight: 1, active: true },
    step: 4,
    fromName: 'Sarah',
    fromEmail: 'sarah@modernmustardseed.com',
    replyTo: 'sarah@modernmustardseed.com',
  });
  const html = built!.html;
  assert.match(html, /not a replacement/i);
  assert.match(html, /After hours and weekends/);
  assert.match(html, /Overflow only/);
  assert.match(html, /ABC Heating &amp; Air/, 'their name, escaped, not a raw ampersand');
  assert.ok(!/fire|replace (her|your staff)|cut (a )?salary/i.test(html), 'never sells this as cutting staff');
});

test('emails: prose carries no em dashes, per the house rule', () => {
  const built = buildCampaignEmail({
    lead: lead(),
    variant: { id: 'v', campaign_id: 'c', key: 'A', step: 1, subject: 'Want my AI receptionist to call you?', cta_label: 'YES', body_key: 'default', weight: 1, active: true },
    step: 1,
    fromName: 'Sarah at Modern Mustard Seed',
    fromEmail: 'sarah@modernmustardseed.com',
    replyTo: 'sarah@modernmustardseed.com',
  });
  assert.ok(!built!.subject.includes('—'));
  // Strip the CTA label, which is Sarah's own copy and may carry a dash.
  const prose = built!.html.replace(/YES[^<]*/g, '');
  assert.ok(!prose.includes('—'), 'no em dashes in email prose');
});

test('emails: a prospect with no address builds nothing rather than something broken', () => {
  const built = buildCampaignEmail({
    lead: lead({ email: null }),
    variant: { id: 'v', campaign_id: 'c', key: 'A', step: 1, subject: 'S', cta_label: 'YES', body_key: 'default', weight: 1, active: true },
    step: 1,
    fromName: 'S',
    fromEmail: 's@x.com',
    replyTo: 's@x.com',
  });
  assert.equal(built, null);
});

test('emails: the tracked link carries the prospect, the step and the arm', () => {
  const url = permissionUrl(lead(), 2, 'B');
  assert.match(url, /p=11111111-1111-4111-8111-111111111111/);
  assert.match(url, /s=2/);
  assert.match(url, /v=B/);
});

/* ------------------------------- A/B testing ------------------------------ */

test('A/B: a prospect always lands in the same arm, so a retry cannot corrupt the test', () => {
  const variants: AcqVariant[] = ['A', 'B', 'C'].map((key) => ({ id: key, campaign_id: 'c', key, step: 1, subject: key, cta_label: 'YES', body_key: 'default', weight: 1, active: true }));
  const first = pickVariant(variants, 1, 'lead-42');
  for (let i = 0; i < 20; i++) assert.equal(pickVariant(variants, 1, 'lead-42')?.key, first?.key);
  assert.equal(pickVariant(variants, 1, 'lead-42')?.key !== undefined, true);
  // Different steps and different leads may differ; an inactive pool returns null.
  assert.equal(pickVariant(variants.map((v) => ({ ...v, active: false })), 1, 'lead-42'), null);
  assert.equal(pickVariant(variants, 9, 'lead-42'), null);
});

test('A/B: weights spread the population across the arms', () => {
  const variants: AcqVariant[] = ['A', 'B', 'C'].map((key) => ({ id: key, campaign_id: 'c', key, step: 1, subject: key, cta_label: 'YES', body_key: 'default', weight: 1, active: true }));
  const seen = new Set<string>();
  for (let i = 0; i < 300; i++) seen.add(pickVariant(variants, 1, `lead-${i}`)!.key);
  assert.equal(seen.size, 3, 'every arm should be used across a population');
});

/* --------------------------------- sourcing ------------------------------- */

test('sourcing: the strict trade filter keeps bars and leasing offices out', () => {
  assert.equal(matchesTrade('Valley Heating & Air Conditioning', 'hvac'), true);
  assert.equal(matchesTrade('Culdesac Tempe Leasing Office', 'hvac'), false, 'the "ac " substring must not qualify');
  assert.equal(matchesTrade('Sazerac PHX Cocktails and Craft', 'hvac'), false);
  assert.equal(matchesTrade('Indoor Comfort Supply', 'hvac'), false, 'a wholesale supplier is not a contractor');
  assert.equal(matchesTrade('Local 469 Plumbers Union', 'plumbing'), false);
  assert.equal(matchesTrade("Bob's Plumbing & Drain", 'plumbing'), true);
  assert.equal(matchesTrade('Summit Roofing & Exteriors', 'roofing'), true);
  assert.equal(matchesTrade('Roofing Supply Warehouse', 'roofing'), false);
});

test('sourcing: Cloudflare obfuscated addresses decode to what the page shows a human', () => {
  const addr = 'office@example.com';
  const key = 0x2a;
  const hex = [key, ...[...addr].map((c) => c.charCodeAt(0) ^ key)].map((b) => b.toString(16).padStart(2, '0')).join('');
  assert.deepEqual(cloudflareEmails(`<a href="/cdn-cgi/l/email-protection" data-cfemail="${hex}">x</a>`), [addr]);
  assert.deepEqual(cloudflareEmails('<a data-cfemail="zz">x</a>'), []);
});

test('sourcing: an address written to dodge scrapers is still read', () => {
  const decoded = decodeObfuscated('reach us at office (at) abcheating.com');
  assert.match(decoded, /office@abcheating\.com/);
});

test('sourcing: a phone is read from tel: first, then from the page', () => {
  assert.equal(extractPhone('<a href="tel:+16025550134">call</a>'), '(602) 555-0134');
  assert.equal(extractPhone('<p>Call us at (480) 237-6139 today</p>'), '(480) 237-6139');
  assert.equal(normalizePhone('1112223333'), null, 'an invalid area code is a wrong number');
  assert.equal(normalizePhone('0005550134'), null);
  assert.equal(normalizePhone('6025550134'), '(602) 555-0134');
});

test('sourcing: hours parse from both per-day lines and ranges', () => {
  const perDay = extractHours('<p>Monday: 8:00 am - 5:00 pm Tuesday: 8:00 am - 5:00 pm Wednesday: 8:00 am - 5:00 pm</p>');
  assert.ok(perDay && perDay.monday && perDay.wednesday);
  const range = extractHours('<p>Mon - Fri: 7:30am - 4:30pm Sat - Sun: Closed</p>');
  assert.ok(range && range.friday && range.saturday);
  assert.equal(extractHours('<p>nothing here</p>'), null);
});

test('sourcing: OSM opening_hours parse, including 24/7', () => {
  const h = parseOsmHours('Mo-Fr 08:00-17:00; Sa 09:00-13:00');
  assert.equal(h?.monday, '08:00-17:00');
  assert.equal(h?.saturday, '09:00-13:00');
  assert.equal(parseOsmHours('24/7')?.sunday, '24 hours');
});

test('sourcing: a service area claim needs a state or a real area word', () => {
  assert.equal(extractServiceArea('<p>Proudly serving Scottsdale and the surrounding areas</p>')?.includes('Scottsdale'), true);
  assert.equal(extractServiceArea('<p>Serving Arizona Senior Last year we</p>'), null);
});

test('sourcing: hostOf strips www and survives junk', () => {
  assert.equal(hostOf('https://www.ABCHeating.com/x'), 'abcheating.com');
  assert.equal(hostOf('abcheating.com'), 'abcheating.com');
  assert.equal(hostOf('!!!'), '');
});

/* ------------------------------- Mr. Mustard ------------------------------ */

test('Mr. Mustard: the briefing names only what we actually know', () => {
  const known = buildBriefing(lead(), '2026-08-13T18:00:00Z');
  assert.match(known, /Phoenix, AZ/);
  assert.match(known, /312 public reviews/);
  assert.match(known, /NEVER imply we know something/);
  assert.match(known, /I'm an AI, not a human/);

  const blind = buildBriefing(lead({ city: null, state: null, website: null, review_count: null, contact_name: null, emergency_service: false }), null);
  assert.match(blind, /We know almost nothing else about them/);
  assert.match(blind, /We do NOT have their name/);
  assert.ok(!blind.includes('public reviews'));
});

test('Mr. Mustard: the briefing carries this trade’s roleplay instincts', () => {
  assert.match(buildBriefing(lead({ trade: 'plumbing' }), null), /shutoff valve/i);
  assert.match(buildBriefing(lead({ trade: 'roofing' }), null), /insurance/i);
  assert.match(buildBriefing(lead({ trade: 'hvac' }), null), /no-cool|system age/i);
});

test('Mr. Mustard: he opens by disclosing what he is', () => {
  const first = firstMessage(lead());
  assert.match(first, /Mr\. Mustard from Modern Mustard Seed/);
  assert.match(first, /AI/);
  assert.match(first, /not a human/);
  assert.match(first, /ABC Heating & Air/);
});

test('Mr. Mustard: the trade is inferred from the name when it is not set', () => {
  assert.equal(tradeOf(lead({ trade: null, business_name: 'Summit Roofing' })), 'roofing');
  assert.equal(tradeOf(lead({ trade: null, business_name: "Bob's Drain & Sewer" })), 'plumbing');
  assert.equal(tradeOf(lead({ trade: null, business_name: 'Valley Heating' })), 'hvac');
  assert.equal(tradeOf(lead({ trade: null, business_name: 'Zeta Consulting' })), 'other');
});

test('Mr. Mustard: the acquisition toolbelt is complete and carries no secrets', () => {
  const tools = acquisitionTools();
  const names = tools.map((t) => t.function.name).sort();
  assert.deepEqual(names, ['email_prospect_demo', 'forge_prospect_agent', 'log_call_outcome', 'send_checkout_link', 'stop_contacting']);
  // Tools inherit the assistant's own server block; declaring one here would
  // mean carrying a webhook secret through application code.
  for (const t of tools) assert.equal('server' in t, false);
  assert.match(JSON.stringify(tools), new RegExp(`\\$${OFFER.setupUsd} setup`));
});

/* ------------------------------- intelligence ----------------------------- */

test('intelligence: objections collapse into the families that matter', () => {
  assert.equal(normalizeObjection('worried he would have to change his phone number'), 'Worried about changing the phone number');
  assert.equal(normalizeObjection('too expensive for us right now'), 'Price');
  assert.equal(normalizeObjection('my customers will know it is a robot'), 'Customers will know it is AI');
  assert.equal(normalizeObjection('needs to talk to his partner'), 'Timing, needs to think');
  assert.equal(normalizeObjection('does it work with ServiceTitan'), 'Integration with their software');
});

/* -------------------------------- governor -------------------------------- */

const settingsFor = (over: Partial<AcqSettings> = {}): AcqSettings =>
  ({
    master_paused: false, sourcing_enabled: true, enrichment_enabled: true, email_enabled: true,
    calls_enabled: true, followups_enabled: true, daily_sourcing_enabled: false, daily_sourcing_target: 100,
    daily_sourcing_split: {}, total_campaign_max: 25000, min_lead_score: 40, paused_reason: null,
    updated_at: new Date().toISOString(),
    global_rolling_24h_ceiling: 4500, sender_state: 'healthy', sender_state_reason: null,
    sender_state_at: new Date().toISOString(), adaptive_daily_allowance: 500, last_ramp_at: null,
    max_bounce_rate_pct: 4, max_complaint_rate_pct: 0.1, min_days_between_emails: 2,
    allowed_email_tiers: ['A', 'B', 'C'], target_ready_inventory: 25000,
    hunter_min_lead_score: 70, hunter_daily_credit_cap: 0,
    ...over,
  }) as AcqSettings;

const campaignFor = (over: Partial<AcqCampaign> = {}): AcqCampaign =>
  ({
    id: 'c0000000-0000-4000-8000-000000000000', slug: 'meet-mr-mustard', name: 'MEET MR. MUSTARD',
    status: 'live', goal_clients: 50, daily_send_cap: 150, hourly_send_cap: 25,
    // A window wide enough that the test never depends on the wall clock.
    send_start_hour: 0, send_end_hour: 24, send_weekdays_only: false,
    from_name: 'Sarah', from_email: 's@x.com', reply_to: 's@x.com',
    step_after_days: [2, 4, 3, 4], max_call_attempts: 2, settings: {},
    started_at: null, paused_at: null, goal_mrr_cents: 0, goal_revenue_cents: 100000000,
    goal_horizon_months: 12, goal_started_on: null, monthly_client_target_min: 30,
    monthly_client_target_stretch: 40,
    ...over,
  }) as AcqCampaign;

const clean = { sent24h: 0, sent1h: 0, bounced24h: 0, complained24h: 0, unsub24h: 0 };
const fakeDb = {} as never;

async function decide(over: { lead?: Partial<AcqProspect>; settings?: Partial<AcqSettings>; campaign?: Partial<AcqCampaign>; rolling?: typeof clean } = {}) {
  return authorize({
    db: fakeDb,
    lead: lead(over.lead ?? {}),
    settings: settingsFor(over.settings),
    campaign: campaignFor(over.campaign),
    rolling: over.rolling ?? clean,
  });
}

test('governor: a clean prospect in a healthy state is allowed', async () => {
  const d = await decide();
  assert.equal(d.allowed, true, d.reason ?? '');
  assert.ok(d.remainingToday > 0);
});

test('governor: every global stop refuses, and says which one', async () => {
  const cases: [Parameters<typeof decide>[0], RegExp][] = [
    [{ settings: { master_paused: true, paused_reason: 'held' } }, /master switch/i],
    [{ settings: { email_enabled: false } }, /outbound email/i],
    [{ campaign: { status: 'paused' } }, /campaign status/i],
    [{ settings: { sender_state: 'restricted', sender_state_reason: 'complaints' } }, /sender state/i],
    [{ settings: { sender_state: 'paused' } }, /sender state/i],
  ];
  for (const [over, expected] of cases) {
    const d = await decide(over);
    assert.equal(d.allowed, false, JSON.stringify(over));
    assert.match(d.reason ?? '', expected);
  }
});

test('governor: the rolling ceiling and the allowance are separate walls', async () => {
  // Under the ceiling but at the allowance: still refused. The allowance is the
  // wall that actually binds day to day.
  const atAllowance = await decide({ rolling: { ...clean, sent24h: 500 } });
  assert.equal(atAllowance.allowed, false);
  assert.match(atAllowance.reason ?? '', /adaptive allowance/i);

  // At the hard ceiling with an allowance raised above it: still refused, and
  // the ceiling is what names it.
  const atCeiling = await decide({
    settings: { adaptive_daily_allowance: 99999 },
    rolling: { ...clean, sent24h: 4500 },
  });
  assert.equal(atCeiling.allowed, false);
  assert.match(atCeiling.reason ?? '', /ceiling/i);
});

test('governor: the ceiling is clamped below five thousand by the allowance min', async () => {
  const d = await decide({ settings: { adaptive_daily_allowance: 999999, global_rolling_24h_ceiling: 4500 } });
  assert.equal(d.allowance, 4500, 'the allowance can never exceed the ceiling');
  assert.equal(d.ceiling, 4500);
});

test('governor: the hourly cap refuses and says when to come back', async () => {
  const d = await decide({ rolling: { ...clean, sent24h: 100, sent1h: 25 } });
  assert.equal(d.allowed, false);
  assert.match(d.reason ?? '', /hourly rate/i);
  assert.ok(d.retryAfter instanceof Date);
});

test('governor: bad rates stop the engine, and a thin sample does not', async () => {
  const bad = await decide({ rolling: { ...clean, sent24h: 200, bounced24h: 20 } });
  assert.equal(bad.allowed, false);
  assert.match(bad.reason ?? '', /bounce rate/i);

  const complained = await decide({ rolling: { ...clean, sent24h: 200, complained24h: 3 } });
  assert.equal(complained.allowed, false);
  assert.match(complained.reason ?? '', /complaint rate/i);

  // The same ratio under the measurement floor must NOT stop anything: two
  // bounces out of ten is noise, not a signal.
  const thin = await decide({ rolling: { ...clean, sent24h: 10, bounced24h: 2 } });
  assert.equal(thin.allowed, true, thin.reason ?? '');
});

test('governor: every recipient-level stop refuses', async () => {
  const cases: [Partial<AcqProspect>, RegExp][] = [
    [{ email: null }, /recipient address/i],
    [{ is_test: true }, /real prospect/i],
    [{ unsubscribed_at: new Date().toISOString() }, /opt-out/i],
    [{ bounced: true }, /previous bounce/i],
    [{ dnc_checked: true }, /do not contact/i],
    [{ email_status: 'risky' }, /email confidence/i],
    [{ last_campaign_email_at: new Date().toISOString() }, /contact frequency/i],
  ];
  for (const [over, expected] of cases) {
    const d = await decide({ lead: over });
    assert.equal(d.allowed, false, JSON.stringify(over));
    assert.match(d.reason ?? '', expected);
  }
});

test('governor: an email tier outside the allowed set is refused', async () => {
  const d = await decide({ lead: { email_status: 'public' }, settings: { allowed_email_tiers: ['A'] } });
  assert.equal(d.allowed, false);
  assert.match(d.reason ?? '', /email confidence/i);
});

test('governor: the send window refuses outside hours and says when it opens', async () => {
  const d = await decide({ campaign: { send_start_hour: 9, send_end_hour: 10, send_weekdays_only: false } });
  // Either it is genuinely inside 09:00-10:00 Mountain right now, or it refuses
  // with a retry time. Both are correct; a silent pass is not.
  if (!d.allowed) {
    assert.match(d.reason ?? '', /send window/i);
    assert.ok(d.retryAfter instanceof Date);
  }
});

test('governor: the ramp goes up one step and comes down a whole one', () => {
  assert.equal(nextRampStep(100, 4500), 250);
  assert.equal(nextRampStep(1000, 4500), 1500);
  assert.equal(nextRampStep(4500, 4500), 4500, 'never past the ceiling');
  assert.equal(nextRampStep(250, 500), 500, 'the ceiling clamps the step');
  assert.equal(backOffStep(1000), 750);
  assert.equal(backOffStep(100), 100, 'never below the first step');
});

test('governor: email tiers follow provenance, not optimism', () => {
  assert.equal(tierFor({ email_status: 'verified', email_source: 'website', email_confidence: 90 }), 'A');
  assert.equal(tierFor({ email_status: 'verified', email_source: 'hunter', email_confidence: 90 }), 'B');
  assert.equal(tierFor({ email_status: 'likely', email_source: 'website', email_confidence: 78 }), 'A');
  assert.equal(tierFor({ email_status: 'likely', email_source: 'website', email_confidence: 40 }), 'C');
  assert.equal(tierFor({ email_status: 'public', email_source: 'osm', email_confidence: 48 }), 'C');
  assert.equal(tierFor({ email_status: 'risky', email_source: null, email_confidence: 30 }), 'HOLD');
  assert.equal(tierFor({ email_status: 'unknown', email_source: null, email_confidence: 0 }), 'HOLD');
});

/* ------------------------------ client factory ---------------------------- */

test('factory: the ladder marks the rung we are on and never treats it as a ceiling', () => {
  const l = goalLadder(12, 500_000, 50);
  const current = l.clients.find((c) => c.current);
  assert.equal(current?.value, 50);
  assert.equal(l.clients.some((c) => c.value === 5000), true, 'the ladder runs past the goal');
  assert.equal(l.clients.filter((c) => c.reached).length, 0);

  const past = goalLadder(260, 12_000_000, 50);
  assert.equal(past.clients.find((c) => c.current)?.value, 500);
  assert.ok(past.clients.filter((c) => c.reached).length >= 3);
});

test('factory: a forecast off a thin sample returns nothing rather than a fiction', () => {
  const thin: FunnelRate[] = [
    { key: 'email-permission', label: '', numerator: 1, denominator: 3, ratePct: 33, thin: true },
    { key: 'permission-call', label: '', numerator: 1, denominator: 1, ratePct: 100, thin: true },
    { key: 'call-forge', label: '', numerator: 0, denominator: 1, ratePct: 0, thin: true },
    { key: 'forge-paid', label: '', numerator: 0, denominator: 0, ratePct: null, thin: true },
  ];
  const f = forecast(thin, 50);
  assert.equal(f.prospectsNeeded, null);
  assert.equal(f.confident, false);
  assert.match(f.basedOn, /not enough/i);
});

test('factory: a real sample forecasts, labels itself a projection, and widens when thin', () => {
  const rates: FunnelRate[] = [
    { key: 'email-permission', label: '', numerator: 40, denominator: 10000, ratePct: 0.4, thin: false },
    { key: 'permission-call', label: '', numerator: 33, denominator: 40, ratePct: 82, thin: false },
    { key: 'call-forge', label: '', numerator: 22, denominator: 33, ratePct: 67, thin: false },
    { key: 'forge-paid', label: '', numerator: 7, denominator: 22, ratePct: 31, thin: false },
  ];
  const f = forecast(rates, 30);
  assert.ok(f.forgesNeeded! >= 96 && f.forgesNeeded! <= 98, `forges ${f.forgesNeeded}`);
  assert.ok(f.emailsNeeded! > 40000, `emails ${f.emailsNeeded}`);
  assert.match(f.basedOn, /PROJECTION, NOT GUARANTEE/);
  assert.equal(f.confident, false, 'the smallest denominator here is 22, which is not a confident sample');
  assert.ok(f.high! > f.low!);
});

test('factory: whole months are floored, not rounded up', () => {
  assert.equal(monthsBetween(new Date('2026-01-15T00:00:00Z'), new Date('2026-02-14T00:00:00Z')), 0);
  assert.equal(monthsBetween(new Date('2026-01-15T00:00:00Z'), new Date('2026-02-15T00:00:00Z')), 1);
  assert.equal(monthsBetween(new Date('2026-01-15T00:00:00Z'), new Date('2027-01-15T00:00:00Z')), 12);
});

/* ------------------------------ personalization --------------------------- */

test('personalization: refuses to personalize when we do not actually know them', () => {
  const blind = estimateFor(lead({ review_count: null, rating: null, city: null, state: null, hours: null, open_24_7: false, emergency_service: false }));
  assert.equal(blind.personalizable, false, 'nothing true to say means no personalized email');
  assert.equal(blind.hook, null);
});

test('personalization: opens with something true, and the arithmetic follows from it', () => {
  const e = estimateFor(lead({ review_count: 312, rating: 4.8, city: 'Phoenix', state: 'AZ' }));
  assert.equal(e.personalizable, true);
  assert.match(e.hook ?? '', /312 reviews/);
  assert.match(e.hook ?? '', /Phoenix, AZ/);
  assert.match(personalOpener(lead({ review_count: 312, rating: 4.8, city: 'Phoenix', state: 'AZ' }), e), /312 reviews/);
  assert.ok(e.monthlyLeakCents > 0);
});

test('personalization: every input is labelled fact or assumption, and the guesses are named', () => {
  const e = estimateFor(lead({ review_count: 312, city: 'Phoenix', state: 'AZ' }));
  for (const i of e.inputs) {
    assert.ok(['fact', 'assumption'].includes(i.provenance), `${i.key} must declare its provenance`);
    assert.ok(i.because.length > 10, `${i.key} must say why we believe it`);
  }
  // The two the reader would know better than we do are always stated.
  assert.ok(e.inputs.some((i) => i.key === 'value' && i.provenance === 'assumption'));
  assert.ok(e.inputs.some((i) => i.key === 'close' && i.provenance === 'assumption'));
});

test('personalization: the coverage gap it names matches what we observed', () => {
  const closesEarly = estimateFor(lead({
    review_count: 200,
    hours: { monday: '8:00 am - 5:00 pm', tuesday: '8:00 am - 5:00 pm', wednesday: '8:00 am - 5:00 pm', thursday: '8:00 am - 5:00 pm', friday: '8:00 am - 5:00 pm' },
  }));
  assert.match(closesEarly.inputs.find((i) => i.key === 'missed')!.because, /posted hours end at 5pm/);

  const always = estimateFor(lead({ review_count: 200, open_24_7: true }));
  assert.match(always.inputs.find((i) => i.key === 'missed')!.because, /around the clock/);
});

test('personalization: roofing carries a bigger ticket than plumbing, and it says so', () => {
  const roof = estimateFor(lead({ trade: 'roofing', review_count: 200 }));
  const plumb = estimateFor(lead({ trade: 'plumbing', review_count: 200 }));
  assert.ok(roof.avgJobValue > plumb.avgJobValue);
  assert.match(roof.inputs.find((i) => i.key === 'value')!.because, /roofing/);
});

test('personalization: the calculator block is email safe and shows its working', () => {
  const l = lead({ review_count: 312, rating: 4.8, city: 'Phoenix', state: 'AZ' });
  const html = calculatorBlock(l, estimateFor(l), (s) => s);
  assert.match(html, /<table/, 'tables, because half of these open in Outlook');
  assert.ok(!/<script|onclick=|position:\s*fixed|background-image/i.test(html), 'no script, no handlers, no background images');
  assert.match(html, /Every month/);
  assert.match(html, /worked back from your 312 public reviews/);
  assert.match(html, /Two of those are guesses/, 'the guesses must be admitted in the body');
});

test('personalization: the personalized email still carries the opt-out and the tracked CTA', () => {
  const l = lead({ review_count: 312, rating: 4.8, city: 'Phoenix', state: 'AZ' });
  const built = buildCampaignEmail({
    lead: l,
    variant: { id: 'v', campaign_id: 'c', key: 'P', step: 1, subject: 'x', cta_label: 'YES', body_key: 'personalized', weight: 1, active: true },
    step: 1,
    fromName: 'Sarah',
    fromEmail: 's@x.com',
    replyTo: 's@x.com',
  });
  assert.ok(built);
  assert.match(built!.html, /unsubscribe here/i);
  assert.match(built!.html, /\/api\/acq\/click\?/);
  assert.match(built!.subject, /what happens to the calls you miss/i);
  assert.ok(!built!.html.includes('—'), 'no em dashes');
});

test('personalization: a thin prospect on the personalized variant gets the plain email', () => {
  const thin = lead({ review_count: null, city: null, state: null, hours: null, emergency_service: false, open_24_7: false });
  const built = buildCampaignEmail({
    lead: thin,
    variant: { id: 'v', campaign_id: 'c', key: 'P', step: 1, subject: 'Want my AI receptionist to call you?', cta_label: 'YES', body_key: 'personalized', weight: 1, active: true },
    step: 1,
    fromName: 'Sarah',
    fromEmail: 's@x.com',
    replyTo: 's@x.com',
  });
  assert.ok(built);
  assert.match(built!.html, /Slightly unusual question/, 'falls back to the plain email');
  assert.ok(!built!.html.includes('What the misses are worth'), 'no invented calculator');
});

/* ----------------------------- the /mustard door -------------------------- */

test('mustard: attribution is read off the URL and never invented', () => {
  const a = readAttribution(
    new URL('https://modernmustardseed.com/mustard?source=Facebook-Group&utm_source=fb&utm_campaign=trades&utm_content=A'),
    new Headers({ referer: 'https://facebook.com/groups/hvac' }),
  );
  assert.equal(a.source, 'facebook-group', 'sources are normalized, not trusted verbatim');
  assert.equal(a.utm_campaign, 'trades');
  assert.equal(a.utm_content, 'A');
  assert.equal(a.referrer, 'https://facebook.com/groups/hvac');

  const bare = readAttribution(new URL('https://modernmustardseed.com/mustard'), new Headers());
  assert.equal(bare.source, 'direct', 'an unknown arrival is direct, not a guess');
  assert.equal(bare.utm_source, null);
});

test('mustard: a hostile source string cannot escape into the record', () => {
  const a = readAttribution(new URL('https://x.com/mustard?source=' + encodeURIComponent('../../evil<script>')), new Headers());
  assert.match(a.source, /^[a-z0-9._-]+$/);
  assert.ok(!a.source.includes('<'));
});

test('mustard: an unknown source is kept rather than dropped', () => {
  // A new channel is meant to work by inventing a URL, with no deploy.
  const a = readAttribution(new URL('https://x.com/mustard?source=trade-show-booth'), new Headers());
  assert.equal(a.source, 'trade-show-booth');
  assert.equal(labelSource('trade-show-booth'), 'trade show booth');
  assert.equal(labelSource('facebook-group'), 'Facebook group');
  assert.equal(labelSource(null), 'Direct');
});

test('mustard: only the token hash is ever stored', () => {
  const token = 'a-secret-token-value';
  const h = hashToken(token);
  assert.equal(h.length, 64, 'sha-256 hex');
  assert.notEqual(h, token);
  assert.equal(hashToken(token), h, 'stable');
  assert.notEqual(hashToken(`${token}x`), h);
});

/* ---------------------------------- price --------------------------------- */

test('price: the offer is read from the one place price lives', () => {
  assert.equal(OFFER.setupUsd, 397);
  assert.equal(OFFER.monthlyUsd, 397);
  assert.equal(OFFER.line, '$397 setup + $397/month');
});
