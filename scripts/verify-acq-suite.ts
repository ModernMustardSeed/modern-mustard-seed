/**
 * Proof that the two things a prospect actually receives are right, without a
 * database: the SUITE EMAIL they open, and the SITE BRIEF the forge builds
 * their website from.
 *
 * Run it against a realistic prospect and read the output. Both are pure
 * functions of the record, so this is the whole surface:
 *
 *   npx tsx scripts/verify-acq-suite.ts
 *
 * It writes the email to out/acq-suite-email.html so it can be opened in a
 * browser exactly as the recipient sees it, and prints the brief and the
 * degraded cases to the terminal.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildSuiteEmail } from '@/lib/acq/campaign';
import { acqBriefAddendum, buildAcqSiteBrief, suiteState } from '@/lib/acq/suite';
import { OFFER } from '@/lib/acq/types';
import type { AcqProspect, CallIntel } from '@/lib/acq/types';

const OUT = path.join(process.cwd(), 'out');
mkdirSync(OUT, { recursive: true });

/** A prospect the way the Lead Finder actually banks one. */
const prospect = {
  id: '11111111-2222-3333-4444-555555555555',
  business_name: 'Kestrel Heating and Air LLC',
  contact_name: 'Dana Whitcomb',
  contact_title: 'Owner',
  phone: '+14065550142',
  email: 'dana@kestrelheating.com',
  website: 'https://kestrelheating.com',
  niche: 'home_service',
  trade: 'hvac',
  city: 'Kalispell',
  state: 'MT',
  address: '1140 W Idaho St, Kalispell, MT 59901',
  postal_code: '59901',
  service_area: 'Kalispell, Whitefish, Columbia Falls and the north valley',
  email_status: 'verified',
  email_confidence: 92,
  email_source: 'website',
  email_source_url: 'https://kestrelheating.com/contact',
  contact_source_url: null,
  phone_type: 'landline',
  rating: 4.8,
  review_count: 214,
  hours: {
    monday: '07:30-17:00',
    tuesday: '07:30-17:00',
    wednesday: '07:30-17:00',
    thursday: '07:30-17:00',
    friday: '07:30-16:00',
    saturday: 'Closed',
    sunday: 'Closed',
  },
  open_24_7: false,
  emergency_service: true,
  call_volume_score: 74,
  missed_call_score: 81,
  lead_score: 86,
  score_reasons: [{ label: 'Excellent rating on real volume', points: 10 }],
  priority: 1,
  source: 'google-maps',
  source_urls: ['https://maps.google.com/?cid=1234567890', 'https://kestrelheating.com'],
  acq_campaign_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  acq_stage: 'forged',
  acq_variant: null,
  acq_eligible: true,
  acq_ineligible_reason: null,
  email_stage: 2,
  last_campaign_email_at: '2026-08-18T15:02:00.000Z',
  reply_at: null,
  call_stage: 'none',
  call_attempts: 0,
  last_call_at: null,
  consent_status: 'none',
  consent_at: null,
  consent_id: null,
  demo_status: 'ready',
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
  imported_at: '2026-08-12T15:00:00.000Z',
  needs_human: null,
  notes: 'REVIEWS: "Waited two days for a callback in July" (Google)\nWEBSITE: broken',
  rep_notes: null,
  demo_url: 'https://modernmustardseed.com/voice-agents/forge/demo/run-1',
  hub_demo_id: 'hub-1',
  hub_demo_url: 'https://modernmustardseed.com/demo/hub/hub-1',
  hub_view_count: 0,
  site_demo_id: 'site-1',
  site_demo_url: 'https://modernmustardseed.com/demo/site/site-1',
  site_demo_status: 'ready',
  os_demo_id: 'os-1',
  os_demo_url: 'https://modernmustardseed.com/demo/os/os-1',
  os_demo_status: 'ready',
  suite_film_status: 'ready',
  dnc_checked: false,
  status: 'new',
  created_at: '2026-08-12T15:00:00.000Z',
  updated_at: '2026-08-21T15:00:00.000Z',
  acq_cohort_id: null,
  reservoir_state: 'forged',
  email_tier: 'A',
  metro: 'Flathead Valley',
  last_enriched_at: null,
  enrichment_provider: null,
  enrichment_cost_cents: null,
} as unknown as AcqProspect;

const intel: CallIntel = {
  pain_point: 'Two techs, both on roofs, nobody on the phone between 8 and 4',
  company_size: '2 techs plus the owner',
  current_phone_workflow: 'Cell phone forwards to voicemail, checked at lunch',
  missed_call_problem: 'Loses the first-call jobs to the bigger shop in town',
  after_hours_need: 'Wants no-heat emergencies triaged at night',
  objection: 'Worried a robot will annoy the older customers',
  requested_features: ['book straight into the calendar', 'text me the details'],
  buying_intent: 'high',
  price_reaction: null,
  next_step: null,
  competitor: null,
  close_probability: 70,
  roleplay_scenario: 'No heat at 9pm in February',
  needs_human: null,
};

function rule(title: string) {
  console.log(`\n${'='.repeat(78)}\n${title}\n${'='.repeat(78)}`);
}

/* ── 1. the suite state ── */
rule('SUITE STATE');
console.log(suiteState(prospect));

/* ── 2. the email, everything built ── */
const full = buildSuiteEmail({
  lead: prospect,
  suite: {
    hubUrl: prospect.hub_demo_url!,
    voiceUrl: prospect.demo_url,
    siteUrl: prospect.site_demo_url,
    osUrl: prospect.os_demo_url,
    personalVideo: true,
    film: true,
  },
  checkoutUrl: 'https://modernmustardseed.com/demo/order/hub-1',
  calendarUrl: 'https://modernmustardseed.com/book',
  offerLine: OFFER.line,
  fromName: 'Sarah at Modern Mustard Seed',
  fromEmail: 'sarah@modernmustardseed.com',
  replyTo: 'sarah@modernmustardseed.com',
  fromMustard: false,
});
if (!full) throw new Error('The suite email refused to build with everything present.');
writeFileSync(path.join(OUT, 'acq-suite-email.html'), full.html, 'utf8');
rule('SUITE EMAIL (everything built)');
console.log('subject :', full.subject);
console.log('from    :', full.from);
console.log('summary :', full.summary);
console.log('bytes   :', full.html.length);
console.log('written :', path.join(OUT, 'acq-suite-email.html'));

/* ── 3. the email when the website is still on the anvil ── */
const partial = buildSuiteEmail({
  lead: { ...prospect, call_stage: 'completed' } as AcqProspect,
  suite: {
    hubUrl: prospect.hub_demo_url!,
    voiceUrl: prospect.demo_url,
    siteUrl: null,
    osUrl: prospect.os_demo_url,
    personalVideo: false,
    film: false,
  },
  checkoutUrl: 'https://modernmustardseed.com/demo/order/hub-1',
  calendarUrl: 'https://modernmustardseed.com/book',
  offerLine: OFFER.line,
  fromName: 'Mr. Mustard at Modern Mustard Seed',
  fromEmail: 'sarah@modernmustardseed.com',
  replyTo: 'sarah@modernmustardseed.com',
  fromMustard: true,
});
if (!partial) throw new Error('The suite email refused to build with two pieces present.');
writeFileSync(path.join(OUT, 'acq-suite-email-partial.html'), partial.html, 'utf8');
rule('SUITE EMAIL (website still building)');
console.log('names the website?', /Your website/.test(partial.html));
console.log('promises a video? ', /video|walkthrough/i.test(partial.html));
console.log('signed by        ', /Mr. Mustard/.test(partial.html) ? 'Mr. Mustard' : 'Sarah');
console.log('written          :', path.join(OUT, 'acq-suite-email-partial.html'));

/* ── 4. the email refuses when nothing is built ── */
const none = buildSuiteEmail({
  lead: prospect,
  suite: { hubUrl: prospect.hub_demo_url!, voiceUrl: null, siteUrl: null, osUrl: null, personalVideo: false, film: false },
  checkoutUrl: 'x',
  calendarUrl: 'y',
  offerLine: OFFER.line,
  fromName: 'Sarah',
  fromEmail: 'sarah@modernmustardseed.com',
  replyTo: 'sarah@modernmustardseed.com',
  fromMustard: false,
});
rule('SUITE EMAIL (nothing built)');
console.log('refused as expected:', none === null);

/* ── 5. the site brief ── */
rule('SITE BRIEF (acquisition chapter, with call intel)');
console.log(acqBriefAddendum(prospect, intel));

rule('SITE BRIEF (no rating, no listing, no call: the honest degraded case)');
console.log(
  acqBriefAddendum(
    { ...prospect, rating: null, review_count: null, source_urls: null, hours: null, service_area: null, address: null, emergency_service: false } as AcqProspect,
    null,
  ),
);

rule('FULL BRIEF HEADER (tier + talking website flags the worker parses)');
console.log(buildAcqSiteBrief(prospect, prospect.demo_url, intel, { designTier: 3, talkingWebsite: true }).split('\n').slice(0, 6).join('\n'));

/* ── 6. the prose rules ── */
rule('PROSE CHECK');
const prose = [full.subject, full.html, partial.html, acqBriefAddendum(prospect, intel)].join('\n');
const emDashes = (prose.match(/—/g) ?? []).length;
const hourly = /\b(per hour|hourly|\/hr|an hour|day rate|time and materials)\b/i.test(prose);
console.log('em dashes:', emDashes, emDashes === 0 ? 'OK' : 'VIOLATION');
console.log('hourly pricing language:', hourly ? 'VIOLATION' : 'none, OK');
console.log('offer line used:', OFFER.line);

/* ── 7. side by side with the email that already ships, so any layout
      difference is mine and not the shell's ── */
import { buildDemoEmail } from '@/lib/acq/campaign';
const existing = buildDemoEmail({
  lead: prospect,
  demoUrl: prospect.hub_demo_url!,
  checkoutUrl: 'https://modernmustardseed.com/demo/order/hub-1',
  calendarUrl: 'https://modernmustardseed.com/book',
  offerLine: OFFER.line,
  fromName: 'Mr. Mustard at Modern Mustard Seed',
  fromEmail: 'sarah@modernmustardseed.com',
  replyTo: 'sarah@modernmustardseed.com',
});
if (existing) writeFileSync(path.join(OUT, 'acq-demo-email-existing.html'), existing.html, 'utf8');
rule('THE EMAIL THAT ALREADY SHIPS (control)');
console.log('written:', path.join(OUT, 'acq-demo-email-existing.html'));
console.log('bytes  :', existing?.html.length);

/* ── 8. THE COMMAND CENTER RULE ──────────────────────────────────────
   IT IS NEVER NAMED. It came off the demo suite and out of the offer on
   2026-08-22, and Sarah said it again on 2026-08-25: "I am not pushing command
   center anywhere." So no shape of a suite email may name a back office, not
   even a lead who still carries an os_demo_url from before that date, and the
   board's suiteState must never mark one as shown. ------------------------- */
rule('THE COMMAND CENTER RULE (never named, in any shape)');

const shapes = [
  {
    name: 'voice agent alone (an os_demo_url from before the change is present)',
    suite: { hubUrl: prospect.hub_demo_url!, voiceUrl: prospect.demo_url, siteUrl: null, osUrl: prospect.os_demo_url, personalVideo: false, film: false },
  },
  {
    name: 'website alone',
    suite: { hubUrl: prospect.hub_demo_url!, voiceUrl: null, siteUrl: prospect.site_demo_url, osUrl: prospect.os_demo_url, personalVideo: false, film: false },
  },
  {
    name: 'the pair',
    suite: { hubUrl: prospect.hub_demo_url!, voiceUrl: prospect.demo_url, siteUrl: prospect.site_demo_url, osUrl: prospect.os_demo_url, personalVideo: false, film: false },
  },
];

let failures = 0;
for (const shape of shapes) {
  const built = buildSuiteEmail({
    lead: prospect,
    suite: shape.suite,
    checkoutUrl: 'https://modernmustardseed.com/demo/order/hub-1',
    calendarUrl: 'https://modernmustardseed.com/book',
    offerLine: OFFER.line,
    fromName: 'Sarah at Modern Mustard Seed',
    fromEmail: 'sarah@modernmustardseed.com',
    replyTo: 'sarah@modernmustardseed.com',
    fromMustard: false,
  });
  if (!built) { console.log(` ${shape.name}: REFUSED TO BUILD`); failures++; continue; }
  const namesOs = /back office|command cent/i.test(built.html);
  const ok = !namesOs;
  if (!ok) failures++;
  console.log(` ${ok ? 'OK  ' : 'FAIL'} ${shape.name}`);
  console.log(`        subject: ${built.subject}`);
  console.log(`        names the back office: ${namesOs} (expected false)`);
}

/* And the suite state the board reads must agree with the email. */
const voiceOnly = suiteState({ ...prospect, site_demo_url: null, site_demo_status: null, suite_film_status: null } as AcqProspect);
const pair = suiteState(prospect);
const siteBuilding = suiteState({ ...prospect, site_demo_status: 'building', suite_film_status: null } as AcqProspect);
console.log('');
console.log(' suiteState.osShown, voice only            :', voiceOnly.osShown, '(expected false)');
console.log(' suiteState.osShown, website still building:', siteBuilding.osShown, '(expected false)');
console.log(' suiteState.osShown, the pair              :', pair.osShown, '(expected false)');
if (voiceOnly.osShown !== false || siteBuilding.osShown !== false || pair.osShown !== false) failures++;
console.log(' pieces the prospect can open, voice only  :', voiceOnly.pieces, '(expected 1: the agent, alone)');
if (voiceOnly.pieces !== 1) failures++;

console.log(failures === 0 ? 'ALL COMMAND CENTER CHECKS PASS' : `${failures} CHECK(S) FAILED`);
if (failures) process.exitCode = 1;
