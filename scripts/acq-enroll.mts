/**
 * ENROL PROSPECTS INTO THE CAMPAIGN, FROM A SHELL.
 *
 * The admin button does the same thing, and on a full reservoir it was
 * returning 504 because a serverless function gets sixty seconds and a full
 * pass over every prospect wanted more. The route is fixed; this exists
 * anyway, because "start my campaign" should never be blocked by a platform
 * timeout, and a terminal has no such ceiling.
 *
 *   npm run acq:enroll -- --dry          # what WOULD happen. Changes nothing.
 *   npm run acq:enroll                   # enrol everyone eligible
 *   npm run acq:enroll -- --limit=150    # enrol the first 150
 *   npm run acq:enroll -- --queue        # enrol AND queue their first email
 *
 * DRY BY DEFAULT IT IS NOT: enrolling is reversible and sends nothing. What it
 * cannot do is send: --queue only schedules, and the governor and the master
 * pause still stand between a queued job and a delivered email.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const arg = (k: string, d = '') => (argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`
  npm run acq:enroll -- --dry           what would happen, changes nothing
  npm run acq:enroll                    enrol everyone eligible
  npm run acq:enroll -- --limit=150     enrol the first 150
  npm run acq:enroll -- --queue         enrol and queue their first email
  npm run acq:enroll -- --minScore=45   raise the score floor for this pass
`);
  process.exit(0);
}

const DRY = argv.includes('--dry');
const QUEUE = argv.includes('--queue');
const LIMIT = arg('limit') ? Number(arg('limit')) : undefined;

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

const { getCampaign, getAcqSettings } = await import('../lib/acq/settings');
const { enrollEligible } = await import('../lib/acq/server');

const campaign = await getCampaign();
if (!campaign) {
  console.error('No campaign row. Nothing to enrol into.');
  process.exit(1);
}
const settings = await getAcqSettings();
const minScore = arg('minScore') ? Number(arg('minScore')) : settings.min_lead_score;

console.log(`\n${DRY ? 'DRY RUN — nothing will change' : 'ENROLLING'}  into "${campaign.slug}"`);
console.log(`  score floor ${minScore}${LIMIT ? `, limit ${LIMIT}` : ''}${QUEUE ? ', queueing the first email' : ''}\n`);

const started = Date.now();
const report = await enrollEligible(db, campaign.id, { minScore, limit: LIMIT, dryRun: DRY, queueFirstEmail: QUEUE });

console.log(`  considered   ${report.considered.toLocaleString()}`);
console.log(`  ENROLLED     ${report.enrolled.toLocaleString()}`);
console.log(`  already in   ${report.alreadyIn.toLocaleString()}`);
if (QUEUE) console.log(`  queued       ${report.queued.toLocaleString()} first emails`);
console.log(`  took         ${((Date.now() - started) / 1000).toFixed(1)}s`);

const rejected = Object.entries(report.rejected).sort((a, b) => b[1] - a[1]);
if (rejected.length) {
  console.log('\n  not enrolled, and why:');
  for (const [reason, n] of rejected.slice(0, 12)) console.log(`    ${String(n).padStart(6)}  ${reason}`);
}

// The two switches that actually decide whether anything leaves the building.
// Printed every time so nobody reads "enrolled 1,786" as "sending".
console.log(`\n  master switch   ${settings.master_paused ? 'PAUSED — nothing sends' : 'running'}`);
console.log(`  campaign        ${campaign.status}${campaign.status === 'live' ? '' : ' — nothing sends until this is live'}`);
console.log(`  sender          ${settings.sender_state}, ${settings.adaptive_daily_allowance}/day allowance\n`);
