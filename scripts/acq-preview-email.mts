/**
 * See the real email, for a real prospect, before anybody receives it.
 *
 *   npx tsx scripts/acq-preview-email.mts                # the highest scoring one
 *   npx tsx scripts/acq-preview-email.mts "ABC Heating"  # a specific business
 *
 * Writes the exact bytes to a temp file and prints the path. This is the same
 * builder the sender uses, so a preview can never drift from what ships.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { buildCampaignEmail } = await import('../lib/acq/campaign');
const { estimateFor } = await import('../lib/acq/personalize');
const { pickVariant } = await import('../lib/acq/settings');

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

const search = process.argv[2];
let q = db.from('outbound_leads').select('*').eq('acq_eligible', true).limit(1);
q = search ? q.ilike('business_name', `%${search}%`) : q.order('lead_score', { ascending: false });
const { data } = await q;
const lead = (data ?? [])[0];
if (!lead) {
  console.error(search ? `No campaign-ready prospect matching "${search}".` : 'No campaign-ready prospects yet.');
  process.exit(1);
}

const { data: campaign } = await db.from('acq_campaigns').select('*').eq('slug', 'meet-mr-mustard').single();
const { data: variants } = await db.from('acq_variants').select('*').eq('campaign_id', campaign.id).eq('active', true);

const est = estimateFor(lead);
console.log(`\n${lead.business_name}  ·  ${[lead.city, lead.state].filter(Boolean).join(', ')}`);
console.log(`  score ${lead.lead_score} · ${lead.review_count ?? 0} reviews · ${lead.email} (${lead.email_status})`);
console.log(`  personalizable: ${est.personalizable ? `YES, on ${est.factCount} facts` : 'no, falls back to the plain email'}`);
if (est.hook) console.log(`  hook: ${est.hook}`);
console.log(`  estimate: $${Math.round(est.monthlyLeakCents / 100).toLocaleString()}/month from ${est.missedPerWeek} missed calls a week\n`);

// Every step-1 arm is rendered so the arms can be compared side by side, then
// the arm this prospect would actually land in is named at the end.
type V = { key: string; step: number };
const toRender: V[] = [
  ...((variants ?? []) as V[]).filter((v) => v.step === 1),
  ...([2, 3] as const).map((s) => pickVariant(variants ?? [], s, lead.id)).filter(Boolean).map((v) => v as V),
];

for (const variant of toRender) {
  const step = variant.step as 1 | 2 | 3;
  const built = buildCampaignEmail({
    lead,
    variant: variant as never,
    step,
    fromName: campaign.from_name,
    fromEmail: campaign.from_email,
    replyTo: campaign.reply_to,
  });
  if (!built) continue;
  const file = join(tmpdir(), `mms-email-${step}-${variant.key}.html`);
  writeFileSync(file, built.html);
  const personalized = built.html.includes('What the misses are worth');
  console.log(`  EMAIL ${step} (variant ${variant.key})${personalized ? '  ← personalized, with the calculator' : ''}`);
  console.log(`    subject: ${built.subject}`);
  console.log(`    open:    ${file}\n`);
}

const assigned = pickVariant(variants ?? [], 1, lead.id);
console.log(`  This prospect is assigned to arm ${assigned?.key ?? '?'} on email 1, deterministically.\n`);
