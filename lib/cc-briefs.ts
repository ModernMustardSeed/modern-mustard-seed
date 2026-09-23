import type { SupabaseClient } from '@supabase/supabase-js';
import { LlmUnavailable, llmJson } from '@/lib/llm';
import { OPEN_STAGES, STAGE_LABEL, STAGE_MEANS, daysSince, listJobs, money, riskOf, type JobRow, type Stage } from '@/lib/cc-jobs';
import type { ClientProject } from '@/lib/client-leads';

/**
 * THE STANDING WORK.
 *
 * Everything else in this app answers when it is asked. This goes first.
 *
 * A brief is one piece of work, already done, waiting on a decision: a new
 * inquiry read and a reply drafted before anybody has called back, a job that
 * has gone quiet with the check-in already written, Monday's board read and
 * ranked. It exists because of how a custom home is actually lost. Not in a
 * meeting. In a gap, while the homeowner talks to the two builders who called
 * back.
 *
 * THREE RULES, and they are the product:
 *
 *   1. NOTHING IN A BRIEF ACTS ON ITS OWN. Every action is a button. The
 *      drafted email lands in their own Drafts folder when they press it, and
 *      sends when they send it. A tool that mails a stranger on a builder's
 *      behalf without being asked gets switched off in week two, and deserves
 *      to be.
 *   2. THE FACTS COME FROM ROWS. Stage, days, value, what the homeowner typed.
 *      The model phrases and prioritises; it never supplies a fact. If the
 *      model is unavailable the brief is still written, from the same rows, in
 *      plainer words, because the point is the work, not the prose.
 *   3. NO GUESSED MONEY. A builder's board gets summed and taken to a bank. A
 *      value nobody has priced stays blank rather than becoming a number that
 *      feels like knowledge.
 */

export type BriefKind = 'qualify' | 'quiet' | 'monday' | 'risk' | 'cert' | 'handover' | 'noticed';

export type BriefAction =
  | { kind: 'draft_email'; label: string; to: string; subject: string; body: string }
  | { kind: 'call'; label: string; phone: string; jobId?: string; leadId?: string }
  | { kind: 'stage'; label: string; jobId: string; to: Stage }
  | { kind: 'next_step'; label: string; jobId: string; step: string; inDays: number }
  | { kind: 'add_job'; label: string; leadId: string }
  | { kind: 'open'; label: string; room: string; jobId?: string }
  /** Ask the homeowner of a finished job for a review. Sends when pressed, never before. */
  | { kind: 'review_ask'; label: string; jobId: string }
  /** Turn a finished job, and the photographs already on it, into a project page request. */
  | { kind: 'project_page'; label: string; jobId: string }
  | { kind: 'note'; label: string; jobId: string; body: string };

export type Brief = {
  id: string;
  kind: BriefKind;
  subject_type: 'lead' | 'job' | 'board' | 'trade';
  subject_id: string | null;
  title: string;
  body: string;
  actions: BriefAction[];
  status: 'new' | 'done' | 'dismissed';
  created_at: string;
};

export const BRIEF_COLUMNS = 'id, kind, subject_type, subject_id, title, body, actions, status, created_at';

export async function listBriefs(sb: SupabaseClient, clientEmail: string, status: 'new' | 'all' = 'new'): Promise<Brief[]> {
  let q = sb.from('client_briefs').select(BRIEF_COLUMNS).eq('client_email', clientEmail.toLowerCase().trim()).order('created_at', { ascending: false }).limit(50);
  if (status === 'new') q = q.eq('status', 'new');
  const { data } = await q;
  return ((data ?? []) as Brief[]).map((b) => ({ ...b, actions: Array.isArray(b.actions) ? b.actions : [] }));
}

/**
 * Write a brief, or leave the open one alone.
 *
 * The unique index on (client, kind, subject) where status = new does the real
 * work: a second Monday does not stack a second card, and a job that is still
 * quiet next week is still the same one card.
 */
export async function put(
  sb: SupabaseClient,
  clientEmail: string,
  brief: { kind: BriefKind; subject_type: 'lead' | 'job' | 'board' | 'trade'; subject_id: string | null; title: string; body: string; actions: BriefAction[] },
): Promise<'written' | 'already'> {
  const { error } = await sb.from('client_briefs').insert({
    client_email: clientEmail.toLowerCase().trim(),
    kind: brief.kind,
    subject_type: brief.subject_type,
    subject_id: brief.subject_id,
    title: brief.title.slice(0, 200),
    body: brief.body.slice(0, 8000),
    actions: brief.actions,
  });
  // 23505 is the one-open-brief-per-thing index, which is a success, not a fault.
  if (error?.code === '23505') return 'already';
  return error ? 'already' : 'written';
}

/* ─────────────────────────── the qualifier ─────────────────────────── */

const QUALIFY_SCHEMA = {
  type: 'object',
  required: ['read', 'questions', 'reply', 'priority'],
  properties: {
    read: { type: 'string', description: 'Two or three sentences to the builder about what this inquiry is and is not. Only what their words support.' },
    priority: { type: 'string', enum: ['now', 'soon', 'later'], description: 'now if it looks like a real build with land or a decision close, later if it reads like early research.' },
    questions: { type: 'array', items: { type: 'string' }, description: 'Four or five questions to ask on the call, in the order to ask them. Specific to what they wrote, never generic.' },
    reply: { type: 'object', required: ['subject', 'body'], properties: { subject: { type: 'string' }, body: { type: 'string', description: 'A short reply from the business to this person, warm and plain, proposing a call. First person as the company. No em dashes.' } } },
  },
} as const;

function qualifySystem(project: ClientProject): string {
  return [
    `You are the front desk of ${project.business}, a custom home builder. A new inquiry has come in through their website and nobody has called back yet.`,
    'Your job is to hand the builder a page they can read in twenty seconds before they pick up the phone.',
    'Work ONLY from what the person wrote. Never infer a budget, a lot, a timeline or a name they did not give. If their message says almost nothing, say that plainly: "There is very little here" is useful, and inventing detail is not.',
    'Land is the single biggest signal for a custom builder: somebody who owns a lot is a different conversation from somebody browsing. Say which one this reads like, and why, from their words.',
    'The questions are the value. Make them specific to what this person wrote, in the order a builder would actually ask them, and never ask something they already answered.',
    'The reply is from the business, first person plural, warm and brief, four sentences at most, proposing a specific next step. Never promise a price, a date or a slot. Never use an em dash.',
    'Return only the JSON.',
  ].join('\n');
}

type LeadLike = { id: string; name: string | null; phone: string | null; email: string | null; town: string | null; project_type: string | null; land: string | null; message: string | null; source: string | null; created_at: string };

function qualifyUser(lead: LeadLike): string {
  return [
    'The inquiry, exactly as it arrived:',
    `Name: ${lead.name ?? 'not given'}`,
    `Town: ${lead.town ?? 'not given'}`,
    `Phone: ${lead.phone ?? 'not given'}`,
    `Email: ${lead.email ?? 'not given'}`,
    `What they are planning: ${lead.project_type ?? 'not given'}`,
    `Land: ${lead.land ?? 'not given'}`,
    `Their message: """${(lead.message ?? '').trim() || 'they left it blank'}"""`,
    `Came through: ${lead.source ?? 'the website'}`,
    'Read it and return the JSON.',
  ].join('\n');
}

/** The brief a person gets when the model is not there. Same facts, plainer words. */
function qualifyFallback(lead: LeadLike, project: ClientProject): { title: string; body: string } {
  const bits: string[] = [];
  bits.push(`${lead.name ?? 'Someone'} came through the website${lead.town ? ` from ${lead.town}` : ''}.`);
  if (lead.land) bits.push(`On land: ${lead.land}.`);
  if (lead.project_type) bits.push(`Planning: ${lead.project_type}.`);
  if ((lead.message ?? '').trim()) bits.push(`In their words: "${(lead.message ?? '').trim().slice(0, 400)}"`);
  bits.push('');
  bits.push('Worth asking on the call:');
  bits.push('- Do you own the lot, and has it been perked and surveyed?');
  bits.push('- Do you have drawings, or are we starting at the napkin?');
  bits.push('- What range are you building to, all in?');
  bits.push('- When would you want to be in the house?');
  bits.push('- Who else are you talking to?');
  bits.push('');
  bits.push(`Call ${lead.phone ?? 'them'} today if you can. ${project.business} wins these on the callback.`);
  return { title: `New inquiry: ${lead.name ?? 'someone'}${lead.town ? `, ${lead.town}` : ''}`, body: bits.join('\n') };
}

/** Read one new inquiry and write the brief. */
export async function qualifyLead(sb: SupabaseClient, project: ClientProject, lead: LeadLike): Promise<'written' | 'already'> {
  let title: string;
  let body: string;
  const actions: BriefAction[] = [];

  try {
    const j = await llmJson<{ read: string; priority: string; questions: string[]; reply: { subject: string; body: string } }>({
      system: qualifySystem(project),
      user: qualifyUser(lead),
      label: `brief:qualify:${project.clientEmail}`,
      model: 'sonnet',
      schema: QUALIFY_SCHEMA,
      timeoutMs: 45_000,
    });
    const questions = (Array.isArray(j.questions) ? j.questions : []).slice(0, 6).map((q) => `- ${String(q).trim()}`);
    title = `New inquiry: ${lead.name ?? 'someone'}${lead.town ? `, ${lead.town}` : ''}`;
    body = [String(j.read ?? '').trim(), '', 'Worth asking on the call:', ...questions].join('\n');
    if (j.reply?.body && lead.email) {
      actions.push({ kind: 'draft_email', label: 'Put a reply in my drafts', to: lead.email, subject: String(j.reply.subject ?? 'Thanks for reaching out').slice(0, 140), body: String(j.reply.body).slice(0, 4000) });
    }
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err;
    const f = qualifyFallback(lead, project);
    title = f.title;
    body = f.body;
  }

  if (lead.phone) actions.push({ kind: 'call', label: `Call ${lead.name ?? 'them'}`, phone: lead.phone, leadId: lead.id });
  actions.push({ kind: 'add_job', label: 'Put it on the board', leadId: lead.id });

  return put(sb, project.clientEmail, { kind: 'qualify', subject_type: 'lead', subject_id: lead.id, title, body, actions });
}

/* ─────────────────────────── the silence watch ─────────────────────────── */

const QUIET_SCHEMA = {
  type: 'object',
  required: ['read', 'message'],
  properties: {
    read: { type: 'string', description: 'One or two sentences to the builder: what this job is, how long it has been quiet, and what the move is.' },
    message: { type: 'object', required: ['subject', 'body'], properties: { subject: { type: 'string' }, body: { type: 'string', description: 'A short check-in from the business to the homeowner. Warm, specific to the stage, never pushy, never apologetic. No em dashes.' } } },
  },
} as const;

export async function quietJob(sb: SupabaseClient, project: ClientProject, job: JobRow): Promise<'written' | 'already'> {
  const risk = riskOf(job);
  const quiet = daysSince(job.last_touch_at) ?? 0;
  const title = `${job.name} has gone quiet`;
  const facts = [
    `Stage: ${STAGE_LABEL[job.stage]}. ${STAGE_MEANS[job.stage]}`,
    `Untouched for ${quiet} ${quiet === 1 ? 'day' : 'days'}.`,
    job.value_cents ? `Worth about ${money(job.value_cents)}${job.confidence === 'guess' ? ', on a guess' : ''}.` : 'No value on it yet.',
    job.next_step ? `The next step was: ${job.next_step}${job.next_step_on ? ` (due ${job.next_step_on})` : ''}.` : 'No next step was set.',
    job.owner_name ? `${job.owner_name} owns it.` : 'Nobody owns it.',
  ];

  let body: string;
  const actions: BriefAction[] = [];

  try {
    const j = await llmJson<{ read: string; message: { subject: string; body: string } }>({
      system: [
        `You write for ${project.business}, a custom home builder, to the owner of the business, about one job in their pipeline that nobody has touched in a while.`,
        'Be short and be useful. They know their own jobs; tell them the state and the move, not the theory.',
        'Then write the check-in message itself, from the business to the homeowner: four sentences at most, warm, specific to the stage it is at, and never apologetic about the gap. Never promise a price or a date. No em dashes.',
        'Return only the JSON.',
      ].join('\n'),
      user: [`The job: ${job.name}`, ...facts, job.notes ? `Notes on it: ${job.notes.slice(0, 1200)}` : '', 'Write the JSON.'].filter(Boolean).join('\n'),
      label: `brief:quiet:${project.clientEmail}`,
      model: 'sonnet',
      schema: QUIET_SCHEMA,
      timeoutMs: 45_000,
    });
    body = [String(j.read ?? '').trim(), '', ...facts].join('\n');
    if (j.message?.body && job.contact_email) {
      actions.push({ kind: 'draft_email', label: 'Put a check-in in my drafts', to: job.contact_email, subject: String(j.message.subject ?? 'Checking in').slice(0, 140), body: String(j.message.body).slice(0, 4000) });
    }
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err;
    body = [`${risk.why ?? 'This one has gone quiet'}.`, '', ...facts].join('\n');
  }

  if (job.contact_phone) actions.push({ kind: 'call', label: `Call ${job.contact_name ?? 'them'}`, phone: job.contact_phone, jobId: job.id });
  actions.push({ kind: 'next_step', label: 'Call them this week', jobId: job.id, step: `Call ${job.contact_name ?? 'them'}`, inDays: 3 });
  actions.push({ kind: 'stage', label: 'Move it to on hold', jobId: job.id, to: 'hold' });
  actions.push({ kind: 'open', label: 'Open the job', room: 'jobs', jobId: job.id });

  return put(sb, project.clientEmail, { kind: 'quiet', subject_type: 'job', subject_id: job.id, title, body, actions });
}

/* ─────────────────────────── Monday ─────────────────────────── */

export async function mondayBoard(sb: SupabaseClient, project: ClientProject): Promise<'written' | 'already' | 'nothing'> {
  const jobs = await listJobs(sb, project.clientEmail);
  const open = jobs.filter((j) => OPEN_STAGES.includes(j.stage));
  if (!open.length) return 'nothing';

  const ranked = open
    .map((j) => ({ job: j, risk: riskOf(j) }))
    .sort((a, b) => {
      const order = { cold: 0, due: 1, quiet: 2, ok: 3 } as const;
      return order[a.risk.level] - order[b.risk.level] || (b.job.value_cents ?? 0) - (a.job.value_cents ?? 0);
    });

  const lines = ranked.slice(0, 12).map(({ job, risk }) => {
    const bits = [STAGE_LABEL[job.stage], job.value_cents ? money(job.value_cents) : null, risk.why].filter(Boolean);
    return `- ${job.name}: ${bits.join('. ')}.`;
  });

  const needing = ranked.filter((r) => r.risk.level !== 'ok').length;
  const worth = open.reduce((n, j) => n + (j.value_cents ?? 0), 0);

  const head = [
    `${open.length} ${open.length === 1 ? 'job' : 'jobs'} in play${worth ? `, about ${money(worth)} of work` : ''}.`,
    needing ? `${needing} ${needing === 1 ? 'needs' : 'need'} a person this week.` : 'Nothing is overdue. That is worth knowing too.',
  ].join(' ');

  const body = [head, '', ...lines].join('\n');
  const actions: BriefAction[] = [{ kind: 'open', label: 'Open the board', room: 'jobs' }];
  const top = ranked[0];
  if (top && top.risk.level !== 'ok' && top.job.contact_phone) {
    actions.unshift({ kind: 'call', label: `Call ${top.job.contact_name ?? top.job.name}`, phone: top.job.contact_phone, jobId: top.job.id });
  }

  const monday = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/Denver' });
  return put(sb, project.clientEmail, { kind: 'monday', subject_type: 'board', subject_id: null, title: `The board, ${monday}`, body, actions });
}

/* ─────────────────────────── deciding ─────────────────────────── */

export async function decideBrief(sb: SupabaseClient, clientEmail: string, id: string, status: 'done' | 'dismissed', by: string): Promise<void> {
  await sb
    .from('client_briefs')
    .update({ status, decided_at: new Date().toISOString(), decided_by: by })
    .eq('id', id)
    .eq('client_email', clientEmail.toLowerCase().trim());
}
