import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * THE BOARD. Every opportunity between "somebody asked" and "Buildertrend has
 * it", which for a custom home builder is eight to fourteen months and the
 * whole of the sale.
 *
 * The judgment in this file is one idea: SILENCE IS THE RISK. A custom home is
 * not lost in a meeting, it is lost in a gap. The homeowner talked to three
 * builders, two of them called back this month, and the third is the one whose
 * board said "estimate, 41 days, nobody has touched it". So every stage
 * carries how long a person may reasonably leave it, and anything past that is
 * on the screen in a colour, without anybody having to remember it.
 *
 * The numbers are deliberately generous. A board that cries every Tuesday gets
 * ignored by Thursday.
 */

export const STAGES = ['inquiry', 'talking', 'visit', 'design', 'estimate', 'contract', 'building', 'complete', 'hold', 'lost'] as const;
export type Stage = (typeof STAGES)[number];

/** The stages that are live work. The board sums and watches these. */
export const OPEN_STAGES: Stage[] = ['inquiry', 'talking', 'visit', 'design', 'estimate'];
/** Sold. Buildertrend runs these; the board keeps them for the number and the photographs. */
export const WON_STAGES: Stage[] = ['contract', 'building', 'complete'];

export const STAGE_LABEL: Record<Stage, string> = {
  inquiry: 'New inquiry',
  talking: 'Talking',
  visit: 'Site visit',
  design: 'Design agreement',
  estimate: 'Estimate out',
  contract: 'Contract signed',
  building: 'Building',
  complete: 'Complete',
  hold: 'On hold',
  lost: 'Lost',
};

/** What each stage is actually for, said in one line on the board. */
export const STAGE_MEANS: Record<Stage, string> = {
  inquiry: 'Somebody asked. Nobody has spoken to them yet.',
  talking: 'Calls back and forth. Budget and timeline being felt out.',
  visit: 'A walk of the lot or a meeting, set or done.',
  design: 'A paid design agreement is signed and drawings are under way.',
  estimate: 'Drawings priced. The budget is with the homeowner.',
  contract: 'Signed. This is where Buildertrend takes over the job.',
  building: 'Under construction.',
  complete: 'Handed over, in warranty.',
  hold: 'Real, but not now. Worth a call every few months.',
  lost: 'Gone. The reason is the lesson.',
};

/**
 * How many days a stage may sit untouched before it needs a person.
 *
 * An inquiry is hours, not days: a custom home buyer is phoning three
 * builders on the same afternoon and the first callback wins an unfair share.
 * A design agreement can breathe for a fortnight because drawings take that
 * long. "On hold" is a quarterly touch, because that is what it is.
 */
export const QUIET_AFTER_DAYS: Record<Stage, number | null> = {
  inquiry: 1,
  talking: 5,
  visit: 7,
  design: 14,
  estimate: 7,
  contract: 30,
  building: null,
  complete: null,
  hold: 90,
  lost: null,
};

export type JobRow = {
  id: string;
  client_email: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  lead_id: string | null;
  contact_id: string | null;
  stage: Stage;
  value_cents: number | null;
  confidence: 'guess' | 'rough' | 'firm';
  kind: 'new-build' | 'remodel' | 'addition' | 'shop' | 'other';
  site: string | null;
  town: string | null;
  source: string | null;
  owner_key: string | null;
  owner_name: string | null;
  next_step: string | null;
  next_step_on: string | null;
  stage_changed_at: string;
  last_touch_at: string;
  notes: string | null;
  lost_reason: string | null;
  bt_job: string | null;
  created_at: string;
  updated_at: string;
};

export type JobEvent = {
  id: string;
  job_id: string;
  kind: 'note' | 'call' | 'meeting' | 'email' | 'stage' | 'won' | 'lost' | 'created' | 'agent';
  body: string | null;
  from_stage: string | null;
  to_stage: string | null;
  author_name: string | null;
  created_at: string;
};

export const JOB_COLUMNS =
  'id, client_email, name, contact_name, contact_phone, contact_email, lead_id, contact_id, stage, value_cents, confidence, kind, site, town, source, owner_key, owner_name, next_step, next_step_on, stage_changed_at, last_touch_at, notes, lost_reason, bt_job, created_at, updated_at';

const DAY = 86_400_000;
export const daysSince = (iso: string | null | undefined, now = Date.now()): number | null => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : Math.floor((now - t) / DAY);
};

export type Risk = { level: 'ok' | 'due' | 'quiet' | 'cold'; why: string | null; days: number | null };

/**
 * What this job needs, and how loudly.
 *
 * Two things can be true at once (the next step is overdue AND it has gone
 * quiet); the louder one wins, because a row can only say one thing.
 */
export function riskOf(job: Pick<JobRow, 'stage' | 'last_touch_at' | 'next_step' | 'next_step_on'>, now = Date.now()): Risk {
  const quietAfter = QUIET_AFTER_DAYS[job.stage];
  const silent = daysSince(job.last_touch_at, now);
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

  if (job.next_step_on && job.next_step_on < today) {
    const late = Math.max(1, Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${job.next_step_on}T12:00:00Z`)) / DAY));
    return { level: late >= 7 ? 'cold' : 'due', why: `${job.next_step ?? 'The next step'} was due ${late} ${late === 1 ? 'day' : 'days'} ago`, days: late };
  }

  if (quietAfter !== null && silent !== null && silent > quietAfter) {
    const bad = silent > quietAfter * 2;
    return {
      level: bad ? 'cold' : 'quiet',
      why: `Nobody has touched this in ${silent} ${silent === 1 ? 'day' : 'days'}`,
      days: silent,
    };
  }

  if (job.next_step_on === today) return { level: 'due', why: `${job.next_step ?? 'The next step'} is today`, days: 0 };
  return { level: 'ok', why: null, days: silent };
}

export const money = (cents: number | null | undefined): string => {
  if (cents == null) return '';
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(dollars >= 10_000_000 ? 0 : 1)}M`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}k`;
  return `$${Math.round(dollars)}`;
};

export type BoardSummary = {
  open: number;
  openValueCents: number;
  /** Only what somebody has actually priced. A guess is not a forecast. */
  firmValueCents: number;
  needing: number;
  byStage: Array<{ stage: Stage; count: number; valueCents: number }>;
  wonThisYear: { count: number; valueCents: number };
  lostThisYear: { count: number; valueCents: number };
};

export function summarise(jobs: JobRow[], now = Date.now()): BoardSummary {
  const year = new Date(now).getFullYear();
  const open = jobs.filter((j) => OPEN_STAGES.includes(j.stage));
  const byStage = STAGES.filter((s) => OPEN_STAGES.includes(s)).map((stage) => {
    const rows = jobs.filter((j) => j.stage === stage);
    return { stage, count: rows.length, valueCents: rows.reduce((n, j) => n + (j.value_cents ?? 0), 0) };
  });
  const inYear = (j: JobRow) => new Date(j.stage_changed_at).getFullYear() === year;
  const won = jobs.filter((j) => WON_STAGES.includes(j.stage) && inYear(j));
  const lost = jobs.filter((j) => j.stage === 'lost' && inYear(j));
  return {
    open: open.length,
    openValueCents: open.reduce((n, j) => n + (j.value_cents ?? 0), 0),
    firmValueCents: open.filter((j) => j.confidence !== 'guess').reduce((n, j) => n + (j.value_cents ?? 0), 0),
    needing: open.filter((j) => riskOf(j, now).level !== 'ok').length,
    byStage,
    wonThisYear: { count: won.length, valueCents: won.reduce((n, j) => n + (j.value_cents ?? 0), 0) },
    lostThisYear: { count: lost.length, valueCents: lost.reduce((n, j) => n + (j.value_cents ?? 0), 0) },
  };
}

export async function listJobs(sb: SupabaseClient, clientEmail: string): Promise<JobRow[]> {
  const { data } = await sb
    .from('client_jobs')
    .select(JOB_COLUMNS)
    .eq('client_email', clientEmail.toLowerCase().trim())
    .order('stage_changed_at', { ascending: false })
    .limit(500);
  return (data ?? []) as JobRow[];
}

export async function getJob(sb: SupabaseClient, clientEmail: string, id: string): Promise<JobRow | null> {
  const { data } = await sb.from('client_jobs').select(JOB_COLUMNS).eq('client_email', clientEmail.toLowerCase().trim()).eq('id', id).maybeSingle();
  return (data as JobRow | null) ?? null;
}

export async function jobEvents(sb: SupabaseClient, jobId: string): Promise<JobEvent[]> {
  const { data } = await sb.from('client_job_events').select('id, job_id, kind, body, from_stage, to_stage, author_name, created_at').eq('job_id', jobId).order('created_at', { ascending: false }).limit(200);
  return (data ?? []) as JobEvent[];
}

export async function logJobEvent(
  sb: SupabaseClient,
  clientEmail: string,
  jobId: string,
  event: { kind: JobEvent['kind']; body?: string | null; from?: string | null; to?: string | null },
  author: { key: string | null; name: string },
): Promise<JobEvent | null> {
  const { data } = await sb
    .from('client_job_events')
    .insert({
      job_id: jobId,
      client_email: clientEmail.toLowerCase().trim(),
      kind: event.kind,
      body: (event.body ?? '').trim().slice(0, 4000) || null,
      from_stage: event.from ?? null,
      to_stage: event.to ?? null,
      author_key: author.key,
      author_name: author.name,
    })
    .select('id, job_id, kind, body, from_stage, to_stage, author_name, created_at')
    .maybeSingle();
  return (data as JobEvent | null) ?? null;
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Dollars as a person types them ("1.4m", "$875,000", "875k") into cents. */
export function parseValue(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw * 100);
  const s = String(raw ?? '').trim().toLowerCase().replace(/[$,\s]/g, '');
  if (!s) return null;
  const m = /^(\d+(?:\.\d+)?)([km])?$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] === 'm' ? 1_000_000 : m[2] === 'k' ? 1_000 : 1);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export type JobInput = Partial<{
  name: unknown;
  contact_name: unknown;
  contact_phone: unknown;
  contact_email: unknown;
  stage: unknown;
  value: unknown;
  confidence: unknown;
  kind: unknown;
  site: unknown;
  town: unknown;
  source: unknown;
  owner_key: unknown;
  owner_name: unknown;
  next_step: unknown;
  next_step_on: unknown;
  notes: unknown;
  lost_reason: unknown;
  bt_job: unknown;
  lead_id: unknown;
  contact_id: unknown;
}>;

/** The patch a form sends, cleaned. Only keys that were actually sent are touched. */
export function jobPatch(input: JobInput): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if ('name' in input) p.name = clean(input.name, 120);
  if ('contact_name' in input) p.contact_name = clean(input.contact_name, 120) || null;
  if ('contact_phone' in input) p.contact_phone = clean(input.contact_phone, 40) || null;
  if ('contact_email' in input) p.contact_email = clean(input.contact_email, 200).toLowerCase() || null;
  if ('stage' in input && (STAGES as readonly string[]).includes(String(input.stage))) p.stage = input.stage;
  if ('value' in input) p.value_cents = parseValue(input.value);
  if ('confidence' in input && ['guess', 'rough', 'firm'].includes(String(input.confidence))) p.confidence = input.confidence;
  if ('kind' in input && ['new-build', 'remodel', 'addition', 'shop', 'other'].includes(String(input.kind))) p.kind = input.kind;
  if ('site' in input) p.site = clean(input.site, 200) || null;
  if ('town' in input) p.town = clean(input.town, 80) || null;
  if ('source' in input) p.source = clean(input.source, 120) || null;
  if ('owner_key' in input) p.owner_key = clean(input.owner_key, 40) || null;
  if ('owner_name' in input) p.owner_name = clean(input.owner_name, 80) || null;
  if ('next_step' in input) p.next_step = clean(input.next_step, 200) || null;
  if ('next_step_on' in input) p.next_step_on = /^\d{4}-\d{2}-\d{2}$/.test(String(input.next_step_on)) ? input.next_step_on : null;
  if ('notes' in input) p.notes = clean(input.notes, 8000) || null;
  if ('lost_reason' in input) p.lost_reason = clean(input.lost_reason, 400) || null;
  if ('bt_job' in input) p.bt_job = clean(input.bt_job, 120) || null;
  if ('lead_id' in input) p.lead_id = clean(input.lead_id, 60) || null;
  if ('contact_id' in input) p.contact_id = clean(input.contact_id, 60) || null;
  return p;
}

export type SaveResult = { ok: true; job: JobRow } | { ok: false; error: string };

export async function createJob(sb: SupabaseClient, clientEmail: string, input: JobInput, author: { key: string | null; name: string }): Promise<SaveResult> {
  const patch = jobPatch(input);
  const name = String(patch.name ?? '').trim();
  if (name.length < 2) return { ok: false, error: 'Give it a name you would say out loud: "Kestrel Ridge new build".' };
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from('client_jobs')
    .insert({ ...patch, client_email: clientEmail.toLowerCase().trim(), stage_changed_at: now, last_touch_at: now, updated_at: now })
    .select(JOB_COLUMNS)
    .single();
  if (error || !data) return { ok: false, error: 'That did not save. Try once more.' };
  const job = data as JobRow;
  await logJobEvent(sb, clientEmail, job.id, { kind: 'created', body: `Added at ${STAGE_LABEL[job.stage]}` }, author);
  return { ok: true, job };
}

/**
 * Change a job. A stage move logs itself and resets the stage clock, because
 * "40 days in estimate" is only true if the clock starts when the stage does.
 * Every edit is a touch: the silence detector must not fire at somebody who
 * was working on it this morning.
 */
export async function updateJob(sb: SupabaseClient, clientEmail: string, id: string, input: JobInput, author: { key: string | null; name: string }, opts: { touch?: boolean } = {}): Promise<SaveResult> {
  const before = await getJob(sb, clientEmail, id);
  if (!before) return { ok: false, error: 'No such job.' };
  const patch = jobPatch(input);
  if (!Object.keys(patch).length) return { ok: true, job: before };

  const now = new Date().toISOString();
  const moved = typeof patch.stage === 'string' && patch.stage !== before.stage;
  if (moved) patch.stage_changed_at = now;
  if (opts.touch !== false) patch.last_touch_at = now;
  patch.updated_at = now;

  const { data, error } = await sb.from('client_jobs').update(patch).eq('id', id).eq('client_email', clientEmail.toLowerCase().trim()).select(JOB_COLUMNS).single();
  if (error || !data) return { ok: false, error: 'That did not save.' };
  const job = data as JobRow;

  if (moved) {
    const to = job.stage;
    await logJobEvent(
      sb,
      clientEmail,
      id,
      {
        kind: to === 'lost' ? 'lost' : to === 'contract' ? 'won' : 'stage',
        body: to === 'lost' ? job.lost_reason : null,
        from: before.stage,
        to,
      },
      author,
    );
  }
  return { ok: true, job };
}

/**
 * A website lead becomes a job on the board.
 *
 * Their land-and-plans priority already says a great deal about what this is
 * worth chasing, so it seeds the name and the kind rather than being thrown
 * away. Idempotent by lead: pressing the button twice opens the job that
 * already exists instead of making its twin.
 */
export async function jobFromLead(
  sb: SupabaseClient,
  clientEmail: string,
  lead: { id: string; name?: string | null; phone?: string | null; email?: string | null; town?: string | null; project_type?: string | null; land?: string | null; message?: string | null; source?: string | null },
  author: { key: string | null; name: string },
): Promise<SaveResult> {
  const existing = await sb.from('client_jobs').select(JOB_COLUMNS).eq('client_email', clientEmail.toLowerCase().trim()).eq('lead_id', lead.id).maybeSingle();
  if (existing.data) return { ok: true, job: existing.data as JobRow };

  const who = (lead.name ?? '').trim() || 'New inquiry';
  const what = /remodel|renovat/i.test(`${lead.project_type ?? ''} ${lead.message ?? ''}`) ? 'remodel' : 'new-build';
  const where = (lead.town ?? '').trim();

  return createJob(
    sb,
    clientEmail,
    {
      name: [who, where && `, ${where}`].filter(Boolean).join(''),
      contact_name: lead.name,
      contact_phone: lead.phone,
      contact_email: lead.email,
      town: lead.town,
      kind: what,
      stage: 'inquiry',
      source: lead.source ? `Website, ${lead.source}` : 'Website',
      lead_id: lead.id,
      notes: [lead.land ? `Land: ${lead.land}` : '', lead.project_type ? `Project: ${lead.project_type}` : '', (lead.message ?? '').trim()].filter(Boolean).join('\n'),
    },
    author,
  );
}
