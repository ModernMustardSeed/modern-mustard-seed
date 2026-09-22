import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientProject } from '@/lib/client-leads';
import { jobEvents, type JobRow } from '@/lib/cc-jobs';
import { certState, listTrades, type Trade } from '@/lib/cc-trades';
import type { BriefAction } from '@/lib/cc-briefs';

/**
 * THE DAY A HOUSE IS FINISHED.
 *
 * Three things should happen, and for most builders none of them do.
 *
 *   THE REVIEW. The single best moment to ask is the week they move in, while
 *   the feeling is "we love it" rather than "it was fine". A month later the
 *   snag list has happened and the answer is politeness. Every builder knows
 *   this and almost nobody asks on time, because on the day itself they are
 *   already on the next job.
 *
 *   THE PROJECT PAGE. The house is finished, Zayne photographed it through the
 *   whole build, and none of it ever reaches the website. The best marketing
 *   asset this business will produce this year dies in a camera roll.
 *
 *   THE RECORD. What it finally sold for, and that it is done.
 *
 * All three parts already exist in the Command Center. Nothing connected them,
 * so this does: when a job reaches Complete, one brief arrives with the review
 * ask, the project page (photographs from the job already attached), and the
 * closing note, each a button.
 *
 * NOTHING FIRES ON ITS OWN. A review ask is a message to a customer and a
 * project page is a public page about their home. Both wait for a person, the
 * way everything that leaves this building does.
 */

/** Every photograph the field pipeline logged against this job. */
export async function jobPhotos(sb: SupabaseClient, jobId: string): Promise<string[]> {
  const events = await jobEvents(sb, jobId);
  const urls: string[] = [];
  for (const e of events) {
    for (const m of (e.body ?? '').matchAll(/https:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)/gi)) {
      if (!urls.includes(m[0])) urls.push(m[0]);
    }
  }
  return urls.slice(0, 20);
}

export function handoverBody(job: JobRow, photos: string[]): string {
  const worth = job.value_cents ? `$${Math.round(job.value_cents / 100).toLocaleString('en-US')}` : null;
  const lines = [
    `${job.name} is finished.`,
    '',
    'Three things are worth doing this week, while they still feel it:',
    `- Ask ${job.contact_name ?? 'them'} for a review. The week they move in is the week the answer is warm.`,
    photos.length
      ? `- Put it on the website. ${photos.length} photograph${photos.length === 1 ? '' : 's'} from the build are already on this job and go with it.`
      : '- Put it on the website. There are no photographs on this job yet, so it needs a few before it can go up.',
    '- Close the record: what it sold for, and the date it handed over.',
  ];
  if (worth) lines.push('', `On the board it is ${worth}${job.confidence === 'guess' ? ', which is still marked a guess' : ''}.`);
  if (job.source) lines.push(`It came from ${job.source}, who is worth a thank you as much as a review is.`);
  return lines.join('\n');
}

/** The buttons on a handover brief. */
export function handoverActions(job: JobRow, photos: string[]): BriefAction[] {
  const actions: BriefAction[] = [];
  if (job.contact_email || job.contact_phone) {
    actions.push({ kind: 'review_ask', label: `Ask ${job.contact_name ?? 'them'} for a review`, jobId: job.id });
  }
  actions.push({ kind: 'project_page', label: photos.length ? `Put it on the website with ${photos.length} photo${photos.length === 1 ? '' : 's'}` : 'Start the project page', jobId: job.id });
  actions.push({ kind: 'open', label: 'Open the job', room: 'jobs', jobId: job.id });
  return actions;
}

/* ─────────────────────── the certificate watch ─────────────────────── */

export function certBody(trades: Array<Trade & { cert: ReturnType<typeof certState> }>): string {
  const lines: string[] = [];
  const lapsed = trades.filter((t) => t.cert.level === 'lapsed');
  const soon = trades.filter((t) => t.cert.level !== 'lapsed');
  if (lapsed.length) {
    lines.push(lapsed.length === 1 ? 'One certificate has already lapsed:' : `${lapsed.length} certificates have already lapsed:`);
    for (const t of lapsed) lines.push(`- ${t.company}${t.trade ? `, ${t.trade}` : ''}: ${t.cert.say.toLowerCase()}`);
    lines.push('');
    lines.push('A sub on a lapsed policy is a liability that lands on you, not on them. Worth a call before they are back on a site.');
  }
  if (soon.length) {
    if (lapsed.length) lines.push('');
    lines.push(soon.length === 1 ? 'One runs out shortly:' : 'These run out shortly:');
    for (const t of soon) lines.push(`- ${t.company}${t.trade ? `, ${t.trade}` : ''}: ${t.cert.say.toLowerCase()}`);
  }
  return lines.join('\n');
}

/** Whose certificate the standing work should raise today, and what to say about it. */
export async function certsNeedingAttention(sb: SupabaseClient, project: ClientProject): Promise<Array<Trade & { cert: ReturnType<typeof certState> }>> {
  const trades = await listTrades(sb, project.clientEmail);
  return trades
    .filter((t) => t.active && t.insurance_expires)
    .map((t) => ({ ...t, cert: certState(t.insurance_expires) }))
    // A certificate that runs out in a fortnight is worth a brief. One that
    // runs out in two months is not, and a brief that cries early is a brief
    // people learn to close without reading.
    .filter((t) => t.cert.level === 'lapsed' || t.cert.level === 'urgent' || (t.cert.days !== null && t.cert.days <= 14))
    .sort((a, b) => (a.cert.days ?? 0) - (b.cert.days ?? 0));
}
