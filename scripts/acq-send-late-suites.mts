/**
 * SEND THE ASKERS WHAT THEY ASKED FOR.
 *
 *   pnpm exec tsx scripts/acq-send-late-suites.mts                 # dry run: the list, and a preview per email
 *   pnpm exec tsx scripts/acq-send-late-suites.mts --apply         # send them
 *   pnpm exec tsx scripts/acq-send-late-suites.mts --only swan     # one business, by name fragment
 *   pnpm exec tsx scripts/acq-send-late-suites.mts --out C:\previews
 *
 * WHO. lib/acq/askers.ts owns the definition and the build script reads the
 * same one, so the two can never disagree about who is owed something.
 *
 * TWO EMAILS GO OUT OF HERE, and which one a person gets is decided by what
 * they have already been sent:
 *
 *   never   THE LATE SUITE. One sentence owning the wait, the reason a person
 *           can accept, every finished piece, and one ask: call Mr. Mustard
 *           and book a slot with Sarah.
 *
 *   partial THE WEBSITE. They were already sent a suite holding only a
 *           receptionist, because the website build had died. The rebuild has
 *           landed since, which is real news, but they must not hear the
 *           apology twice. Short note, both doors, same one ask.
 *
 * A person whose suite is still incomplete is NEVER mailed a half. The whole
 * point of the wait is that what arrives is what they asked for, a website and
 * a voice agent. They are listed as waiting on the build instead.
 *
 * Every send goes through sendSuiteEmail, so it carries the hand-send override
 * (the master switch and the pacing step aside, the recipient's own
 * protections do not), stamps the lead, writes the ledger and the timeline,
 * and starts the post-demo follow-ups.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_CANDIDATES = ['.env.local', resolve('../../products/modern-mustard-seed/.env.local')];
const envFile = ENV_CANDIDATES.find((p) => existsSync(p));
if (!envFile) {
  console.error('No .env.local found. Looked in:\n  ' + ENV_CANDIDATES.join('\n  '));
  process.exit(1);
}
for (const l of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const { findAskers, piecesOf } = await import('../lib/acq/askers');
const { sendSuiteEmail, checkoutUrlFor, CALENDAR_URL } = await import('../lib/acq/send');
const { buildSuiteEmail } = await import('../lib/acq/campaign');
const { getCampaign } = await import('../lib/acq/settings');
const { OFFER } = await import('../lib/acq/types');
type AcqProspect = import('../lib/acq/types').AcqProspect;
type Asker = import('../lib/acq/askers').Asker;

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith('[')) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be real values in .env.local.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const flag = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const only = flag('--only');
const outDir = flag('--out') ?? join(process.cwd(), '.late-suites-preview');

const REASON = 'Sent by hand: what the askers asked for (2026-09-10)';

const { askers, skipped } = await findAskers(db, { only });

/** Complete suite, nothing sent yet: the late suite with the apology. */
const late = askers.filter((a) => a.complete && a.sent === 'never');
/** Already sent a partial suite, and the website has landed since. */
const landed = askers.filter((a) => a.complete && a.sent === 'partial');
/** Asked, still missing a piece. Not mailed a half. */
const waiting = askers.filter((a) => !a.complete);

const campaign = await getCampaign();
if (!campaign) {
  console.error('There is no campaign row to send from.');
  process.exit(1);
}

function preview(a: Asker, kind: 'late' | 'landed') {
  const l = a.lead;
  return buildSuiteEmail({
    lead: l as AcqProspect,
    suite: {
      hubUrl: l.hub_demo_url as string,
      voiceUrl: l.demo_url,
      siteUrl: l.site_demo_status === 'ready' ? l.site_demo_url : null,
      osUrl: l.os_demo_url,
      personalVideo: false,
      film: l.suite_film_status === 'ready',
    },
    checkoutUrl: checkoutUrlFor(l as AcqProspect),
    calendarUrl: CALENDAR_URL,
    offerLine: OFFER.line,
    fromMustard: false,
    fromName: campaign!.from_name,
    fromEmail: campaign!.from_email,
    replyTo: campaign!.reply_to,
    late: kind === 'late',
    siteLanded: kind === 'landed',
  });
}

console.log(`\n${apply ? 'SENDING' : 'Would send'} the late suite to ${late.length}:`);
for (const a of late) console.log(`  ${a.lead.business_name} <${a.lead.email}>  [${piecesOf(a)}]  asked: ${a.why.join(', ')}`);

console.log(`\n${apply ? 'SENDING' : 'Would send'} the website note to ${landed.length} who already have the receptionist:`);
for (const a of landed) console.log(`  ${a.lead.business_name} <${a.lead.email}>  [${piecesOf(a)}]  first email ${a.lead.demo_emailed_at?.slice(0, 16)}`);

if (waiting.length) {
  console.log(`\nStill waiting on the build (${waiting.length}). Nobody is mailed half a suite:`);
  for (const a of waiting)
    console.log(`  ${a.lead.business_name} <${a.lead.email}>  owed ${a.missing.join(' + ')}${a.building ? ', on the anvil now' : a.failed ? ', last build FAILED' : ''}`);
}
if (skipped.length) {
  console.log(`\nLeft alone (${skipped.length}):`);
  for (const s of skipped) console.log(`  ${s.name}: ${s.reason}`);
}

/* Previews, always, so nothing goes out unseen. */
mkdirSync(outDir, { recursive: true });
for (const [list, kind] of [
  [late, 'late'],
  [landed, 'landed'],
] as const) {
  for (const a of list) {
    const built = preview(a, kind);
    if (!built) continue;
    const file = join(outDir, `${kind}-${a.lead.business_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`);
    writeFileSync(file, `<!-- Subject: ${built.subject} -->\n${built.html}`);
  }
}
console.log(`\nPreviews: ${outDir}`);

if (!apply) {
  console.log('Dry run. Add --apply to send.');
  process.exit(0);
}

let sent = 0;
const total = late.length + landed.length;
for (const a of late) {
  const res = await sendSuiteEmail(db, campaign, a.lead as AcqProspect, { late: true }, { reason: REASON });
  if (res.ok) { sent++; console.log(`  sent  ${a.lead.business_name}: ${res.subject}`); }
  else console.log(`  REFUSED  ${a.lead.business_name}: ${res.error}`);
}
for (const a of landed) {
  // resend, because their first suite already stamped the lead. The email is a
  // different one and the timeline records which.
  const res = await sendSuiteEmail(db, campaign, a.lead as AcqProspect, { resend: true, siteLanded: true }, { reason: REASON });
  if (res.ok) { sent++; console.log(`  sent  ${a.lead.business_name}: ${res.subject}`); }
  else console.log(`  REFUSED  ${a.lead.business_name}: ${res.error}`);
}

console.log(`\n${sent} of ${total} sent.`);
