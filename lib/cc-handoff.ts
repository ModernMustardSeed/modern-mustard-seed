import type { JobRow } from '@/lib/cc-jobs';

/**
 * THE BUILDERTREND HAND-OFF.
 *
 * Buildertrend runs a job beautifully once the job exists. Getting it in there
 * is the part nobody enjoys, and for this client it cannot be automated at
 * all: their Lead Contact Form runs invisible reCAPTCHA Enterprise, which
 * refuses a server post by design, and Buildertrend's real API is for
 * partners, not for a builder with twelve homes a year. We have tested this
 * properly and the answer does not change: a server cannot put a lead in
 * there, and any code that appears to is lying (a scripted browser gets back
 * success and the lead is silently dropped on a low score).
 *
 * So this does the honest thing and makes the human hand-off take a minute
 * instead of twenty: every field Buildertrend asks for, in the order its form
 * asks for it, assembled from the months of work already on the board, ready
 * to paste. It is not a workaround pretending to be an integration. It is the
 * twenty minutes of retyping removed.
 *
 * If Buildertrend ever exempts the form or grants API access, the packet stays
 * useful and the push goes on top of it.
 */

export type HandoffField = { label: string; value: string; hint?: string };

const phone = (v: string | null) => (v ?? '').trim();
const money = (cents: number | null) => (cents == null ? '' : `$${Math.round(cents / 100).toLocaleString('en-US')}`);

const KIND_WORD: Record<string, string> = {
  'new-build': 'New custom home',
  remodel: 'Remodel',
  addition: 'Addition',
  shop: 'Shop or outbuilding',
  other: 'Other',
};

/** The fields in the order Buildertrend's own lead form asks for them. */
export function handoffFields(job: JobRow, business: string): HandoffField[] {
  const name = (job.contact_name ?? job.name).trim();
  const [first, ...rest] = name.split(/\s+/);
  return [
    { label: 'Lead name', value: job.name },
    { label: 'First name', value: first ?? '' },
    { label: 'Last name', value: rest.join(' ') },
    { label: 'Phone', value: phone(job.contact_phone) },
    { label: 'Email', value: (job.contact_email ?? '').trim() },
    { label: 'Street', value: (job.site ?? '').trim(), hint: 'The lot or build address, if it is known yet.' },
    { label: 'City', value: (job.town ?? '').trim() },
    { label: 'State', value: 'MT' },
    { label: 'Lead source', value: (job.source ?? 'Website').trim() },
    { label: 'Project type', value: KIND_WORD[job.kind] ?? 'Other' },
    { label: 'Estimated value', value: money(job.value_cents), hint: job.confidence === 'guess' ? 'This is still a guess on the board.' : '' },
    { label: 'Notes', value: handoffNotes(job, business) },
  ];
}

/**
 * The notes field, which is where the value actually is: everything the board
 * learned over the months, in the order somebody setting up the job needs it.
 */
export function handoffNotes(job: JobRow, business: string): string {
  const lines: string[] = [];
  lines.push(`${job.name}, handed over from the ${business} Command Center.`);
  if (job.contact_name) lines.push(`Homeowner: ${job.contact_name}${job.contact_phone ? `, ${job.contact_phone}` : ''}${job.contact_email ? `, ${job.contact_email}` : ''}`);
  if (job.site || job.town) lines.push(`Site: ${[job.site, job.town].filter(Boolean).join(', ')}`);
  if (job.source) lines.push(`Came from: ${job.source}`);
  if (job.value_cents) lines.push(`Value on the board: ${money(job.value_cents)}${job.confidence === 'guess' ? ' (a guess)' : job.confidence === 'rough' ? ' (rough)' : ' (priced)'}`);
  if (job.owner_name) lines.push(`Owned by: ${job.owner_name}`);
  const first = job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' }) : null;
  if (first) lines.push(`First contact: ${first}`);
  if (job.notes?.trim()) {
    lines.push('');
    lines.push('Notes from the board:');
    lines.push(job.notes.trim());
  }
  return lines.join('\n');
}

/** The whole packet as one block, for the person who would rather paste once. */
export function handoffText(job: JobRow, business: string): string {
  return handoffFields(job, business)
    .filter((f) => f.value.trim())
    .map((f) => (f.label === 'Notes' ? `${f.label}:\n${f.value}` : `${f.label}: ${f.value}`))
    .join('\n');
}
