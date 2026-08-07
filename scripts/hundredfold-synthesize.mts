/**
 * Run the three synthesis steps for one member from the command line.
 *
 * The desk does this with three buttons; this does the same thing without a
 * browser, for seeding the demo and for re-running a step that failed.
 *
 *   npx tsx scripts/hundredfold-synthesize.mts <memberId> [--step answers|roadmap|offer]
 */

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const memberId = args.find((a) => !a.startsWith('--'));
const only = args.includes('--step') ? args[args.indexOf('--step') + 1] : null;
if (!memberId) {
  console.error('Usage: npx tsx scripts/hundredfold-synthesize.mts <memberId> [--step answers|roadmap|offer]');
  process.exit(1);
}

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
process.env.SUPABASE_URL ??= process.env.supabase_url;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= process.env.supabase_service_role_key;

const store = await import('../lib/hundredfold-store');
const synth = await import('../lib/hundredfold-synthesis');
const { interviewCoverage } = await import('../lib/hundredfold-interview');
const { getRoadmapBySlug } = await import('../lib/roadmap-store');

const member = await store.getMemberById(memberId);
if (!member) throw new Error('no such member');
const interviews = await store.listInterviews(memberId);
const interview = interviews.find((i) => i.status === 'complete') ?? interviews[0];
if (!interview) throw new Error('no interview');

console.log(`${member.business_name ?? member.email}: ${interview.transcript?.length ?? 0} turns`);

const run = (step: string) => !only || only === step;
const t0 = Date.now();

if (run('answers')) {
  console.log('\n[1/3] Reading the answers...');
  const answers = await synth.extractAnswers(interview.transcript ?? []);
  await store.saveInterviewProgress(interview.id, { answers });
  const c = interviewCoverage(answers);
  console.log(`      ${c.answered}/${c.total} filed. Enough: ${c.enough}`);
  interview.answers = answers;
}

if (run('roadmap')) {
  console.log('\n[2/3] Building the deep roadmap...');
  const fresh = await store.getInterview(interview.id);
  const free = member.roadmap_slug ? await getRoadmapBySlug(member.roadmap_slug) : null;
  const roadmap = await synth.buildDeepRoadmap({
    businessName: member.business_name,
    url: fresh?.url ?? null,
    answers: fresh?.answers ?? {},
    freeRoadmap: free?.report ?? null,
  });
  await store.updateMember(memberId, { deep_roadmap: roadmap });
  console.log(`      ${roadmap.stage}, ${roadmap.scale_score}/100`);
  console.log(`      "${roadmap.headline}"`);
  console.log(`      Constraint: ${roadmap.constraint.type} — ${roadmap.constraint.title}`);
}

if (run('offer')) {
  console.log('\n[3/3] Forging the offer and the build plan...');
  const m2 = await store.getMemberById(memberId);
  const fresh = await store.getInterview(interview.id);
  if (!m2?.deep_roadmap) throw new Error('no roadmap yet, run the roadmap step first');
  const { offer, systems, gates } = await synth.forgeOffer({
    businessName: m2.business_name,
    answers: fresh?.answers ?? {},
    roadmap: m2.deep_roadmap,
  });
  await store.saveSynthesis(memberId, { roadmap: m2.deep_roadmap, offer, systems, gates });
  console.log(`      Offer: ${offer.name} at ${offer.price}`);
  console.log(`      ${offer.stack.length} stack items, ${systems.length} systems, ${gates.length} gates`);
}

console.log(`\nDone in ${Math.round((Date.now() - t0) / 1000)}s.`);
