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
import { evaluate, dueForStep, businessDaysBetween } from '../lib/acq/eligibility';
import { idempotencyKey } from '../lib/acq/queue';
import { CONSENT_VERSIONS, CURRENT_CONSENT, toE164, consentVersion } from '../lib/acq/consent';
import { greetingFor, firstNameOr, renderSubject, shortBusiness, buildCampaignEmail, permissionUrl } from '../lib/acq/campaign';
import { pickVariant } from '../lib/acq/settings';
import { normalizeObjection } from '../lib/acq/stats';
import { addBusinessDays, shouldStopFollowup } from '../lib/acq/runner';
import { cloudflareEmails, extractPhone, extractHours, extractServiceArea, parseOsmHours, matchesTrade, normalizePhone, decodeObfuscated, hostOf } from '../lib/acq/source';
import { tradeOf, buildBriefing, firstMessage, acquisitionTools } from '../lib/acq/call';
import { OFFER, isMailableEmailStatus } from '../lib/acq/types';
import type { AcqProspect, AcqVariant } from '../lib/acq/types';

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
  assert.equal(dueForStep(lead({ email_stage: 0 }), now, 2, 4), 1);
  assert.equal(dueForStep(lead({ consent_status: 'granted' }), now, 2, 4), null);
  assert.equal(dueForStep(lead({ reply_at: now.toISOString() }), now, 2, 4), null);
  assert.equal(dueForStep(lead({ acq_stage: 'called' }), now, 2, 4), null);
  assert.equal(dueForStep(lead({ email_stage: 3 }), now, 2, 4), null);
});

test('sequencing: step two waits its business days', () => {
  const sent = new Date('2026-08-17T16:00:00Z'); // a Monday
  const oneDay = new Date('2026-08-18T16:00:00Z');
  const twoDays = new Date('2026-08-19T16:00:00Z');
  assert.equal(dueForStep(lead({ email_stage: 1, last_campaign_email_at: sent.toISOString() }), oneDay, 2, 4), null);
  assert.equal(dueForStep(lead({ email_stage: 1, last_campaign_email_at: sent.toISOString() }), twoDays, 2, 4), 2);
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
  for (const step of [1, 2, 3] as const) {
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

/* ---------------------------------- price --------------------------------- */

test('price: the offer is read from the one place price lives', () => {
  assert.equal(OFFER.setupUsd, 397);
  assert.equal(OFFER.monthlyUsd, 397);
  assert.equal(OFFER.line, '$397 setup + $397/month');
});
