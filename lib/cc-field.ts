import type { SupabaseClient } from '@supabase/supabase-js';
import { LlmUnavailable, llmJson } from '@/lib/llm';
import type { ClientProject } from '@/lib/client-leads';
import type { JobRow } from '@/lib/cc-jobs';
import { STAGE_LABEL } from '@/lib/cc-jobs';

/**
 * FROM THE SITE.
 *
 * The superintendent is standing in a half framed house at 7am with a phone
 * full of photographs, twelve minutes before the concrete truck. Everything
 * that should happen with those photographs (the job's own record, a note to
 * the homeowner who is two states away and anxious, a post that shows the
 * town what this crew does) takes twenty minutes at a desk that evening, which
 * means it happens roughly never.
 *
 * So: photographs in, three drafts out, one screen, one press. The photographs
 * are read on the machine that runs the prompt, the same path the tray uses,
 * which is why none of this needs a vision key.
 *
 * WHAT IT WILL NOT DO. It will not name the homeowner in a public post, it
 * will not say where the house is beyond the town, and it will not describe
 * work it cannot see in the picture. A builder's customers are people whose
 * address is worth money to a stranger, and a caption that says "the Fulbright
 * place on Kestrel Ridge" is a small betrayal that no amount of reach pays
 * for. The client note may use their name, because it is addressed to them.
 */

export type FieldRead = {
  /** One line for the job's own trail. Plain, factual, what a builder writes. */
  log: string;
  /** A short note to the homeowner. Theirs, private, may use their name. */
  clientNote: { subject: string; body: string } | null;
  /** Words for a public post. No names, no address, nothing not in the photo. */
  post: string | null;
  /** What the photographs actually show, so a person can check the reading. */
  saw: string[];
  /** Anything that should not go out: a face, a plate, an address, a mess. */
  careful: string[];
};

const FIELD_SCHEMA = {
  type: 'object',
  required: ['log', 'clientNote', 'post', 'saw', 'careful'],
  properties: {
    saw: { type: 'array', items: { type: 'string' }, description: 'One short line per photograph: what is actually in it. This is checked by a person, so be literal.' },
    log: { type: 'string', description: "One or two sentences for the job's own record, the way a builder writes it. Factual. No adjectives that are not earned." },
    clientNote: {
      type: ['object', 'null'],
      description: 'A short note to the homeowner about their own house. Warm, specific, four sentences at most. May use their name. Never promises a date or a cost.',
      properties: { subject: { type: 'string' }, body: { type: 'string' } },
    },
    post: {
      type: ['string', 'null'],
      description: 'Words for a public post about the work. NEVER the homeowner name, never the street or the lot, town at most. Only what is visible in the photographs. Null when the photographs are not worth posting.',
    },
    careful: { type: 'array', items: { type: 'string' }, description: 'Anything in these photographs that should not go public: a face, a number plate, a house number, a neighbour, an unsafe or untidy detail. Empty when there is nothing.' },
  },
} as const;

function systemPrompt(project: ClientProject, job: JobRow | null): string {
  return [
    `You are helping ${project.business}, a custom home builder, turn photographs taken on a job site into three things: a line for the job's own record, a note to the homeowner, and words for a public post.`,
    job ? `The job: ${job.name}. Stage: ${STAGE_LABEL[job.stage]}.${job.contact_name ? ` The homeowner is ${job.contact_name}.` : ''}${job.town ? ` The site is in ${job.town}.` : ''}` : 'No job was picked, so write the log line generally and leave the client note null.',
    'Read the photographs. Say what you actually see. Never describe work that is not in the picture, never name a material or a brand you cannot see, and never estimate a stage of completion you are guessing at.',
    'THE PUBLIC POST HAS RULES THAT DO NOT BEND. No homeowner name. No street, no lot number, no house number, no directions. The town is the most location it may ever carry. Nothing about price, budget or schedule. If the photographs show nothing worth posting, or show a mess, a hazard, a face or a number plate, set post to null and say why in careful.',
    'The client note is private and addressed to the homeowner, so it may use their name and talk about their house. Warm, brief, specific to what is in the photograph. Never promise a date or a cost.',
    'The business speaks as itself: we, us, our.',
    'No em dashes anywhere. At most one exclamation mark across everything.',
    'Return only the JSON.',
  ]
    .filter(Boolean)
    .join('\n');
}

export type FieldInput = {
  project: ClientProject;
  job: JobRow | null;
  /** What the person on site typed or said. Often nothing. */
  text: string | null;
  files: Array<{ url: string; name?: string; type?: string }>;
};

export type FieldResult = { ok: true; read: FieldRead } | { ok: false; queued: true; jobId: string | null } | { ok: false; queued: false; error: string };

export async function readSiteDrop(input: FieldInput): Promise<FieldResult> {
  if (!input.files.length && !(input.text ?? '').trim()) return { ok: false, queued: false, error: 'Add a photo or say what happened.' };

  const user = [
    input.files.length ? `${input.files.length} photograph${input.files.length === 1 ? '' : 's'} from the site.` : 'No photographs, only what they typed.',
    (input.text ?? '').trim() ? `What they said about it: """${input.text!.trim().slice(0, 2000)}"""` : 'They did not type anything, so the photographs have to carry it.',
    'Write the JSON.',
  ].join('\n');

  try {
    const j = await llmJson<FieldRead>({
      system: systemPrompt(input.project, input.job),
      user,
      label: `field:${input.project.clientEmail}`,
      model: 'sonnet',
      schema: FIELD_SCHEMA,
      attachments: input.files,
      timeoutMs: 50_000,
    });
    return { ok: true, read: normalise(j, input) };
  } catch (err) {
    if (err instanceof LlmUnavailable) return { ok: false, queued: true, jobId: err.jobId };
    return { ok: false, queued: false, error: 'Nothing could read that just now. Try again in a minute.' };
  }
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Trust the shape, never the contents, and enforce the two rules that matter
 * in code rather than only in the prompt: a public post never carries the
 * homeowner's name, and never carries the site address.
 */
function normalise(raw: unknown, input: FieldInput): FieldRead {
  const j = (raw ?? {}) as Record<string, unknown>;
  const note = (j.clientNote ?? null) as Record<string, unknown> | null;
  let post = str(j.post, 3000) || null;

  const banned: string[] = [];
  const who = (input.job?.contact_name ?? '').trim();
  if (who) banned.push(...who.split(/\s+/).filter((w) => w.length > 2));
  const site = (input.job?.site ?? '').trim();
  if (site) banned.push(site);

  if (post) {
    const leak = banned.find((b) => new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(post!));
    // A post that names the homeowner or the lot is not edited into shape, it
    // is withheld. The person can write their own; we do not quietly publish a
    // near miss on somebody's address.
    if (leak) post = null;
  }

  return {
    log: str(j.log, 1000) || 'Photos from the site.',
    clientNote: note && str(note.body, 3000) ? { subject: str(note.subject, 140) || 'An update on your build', body: str(note.body, 3000) } : null,
    post,
    saw: (Array.isArray(j.saw) ? j.saw : []).map((s) => str(s, 200)).filter(Boolean).slice(0, 10),
    careful: (Array.isArray(j.careful) ? j.careful : []).map((s) => str(s, 200)).filter(Boolean).slice(0, 10),
  };
}

/** Collect a read that finished after the request gave up. */
export async function collectField(sb: SupabaseClient, jobId: string, input: FieldInput): Promise<{ status: 'working' } | { status: 'done'; read: FieldRead } | { status: 'failed'; error: string }> {
  const { data } = await sb.from('llm_jobs').select('status, result_json, error').eq('id', jobId).maybeSingle();
  if (!data) return { status: 'failed', error: 'That read is gone.' };
  if (data.status === 'failed') return { status: 'failed', error: String(data.error ?? 'It could not be read.') };
  if (data.status !== 'done' || !data.result_json) return { status: 'working' };
  return { status: 'done', read: normalise(data.result_json, input) };
}
