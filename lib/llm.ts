/**
 * THE ONLY WAY THIS APP TALKS TO A MODEL.
 *
 * There is no Anthropic API key in this codebase any more, and there is no code
 * path that would use one if there were. Every prompt in the product goes
 * through `llmText` or `llmJson`, and both of them end at the Claude Code CLI
 * running on Sarah's Max subscription. Flat cost, no wallet, no balance to
 * empty, nothing that fails at 2am because a credit card expired.
 *
 * WHY A BROKER AND NOT JUST A FUNCTION CALL.
 *
 * Vercel has no `claude` binary. That is not a temporary gap to be worked
 * around, it is the shape of serverless, and pretending otherwise is what the
 * old `AUDIT_ENGINE` flag did before it silently fell back to the API on every
 * production request. So there are two ways to reach the subscription and this
 * module picks between them:
 *
 *   1. RUN IT HERE. Anything with a local CLI — scripts, `npm run dev`, the
 *      workers themselves — just runs the prompt. Free and immediate.
 *   2. HAND IT OVER. Everything on Vercel writes a row to `llm_jobs` and waits
 *      a bounded number of seconds for a drainer to answer it.
 *
 * Two drainers work that queue: the workstation worker (instant) and a
 * five-minute GitHub Actions cron holding a subscription OAuth token (always
 * on). So the honest answer to "does this only work when my laptop is open" is
 * no: the laptop makes it fast, the runner makes it certain.
 *
 * WHAT CALLERS MUST HANDLE. `LlmUnavailable` is not an error in the usual
 * sense, it is a schedule. The work is still queued and will still be done; the
 * request just ended first. A caller that has somewhere to put a late answer
 * (an email, a saved draft, a poll endpoint) should say "on its way" and hand
 * back `jobId`. A caller with nowhere to put it should say so plainly. What no
 * caller should do is treat it as a crash, because nothing crashed.
 *
 * Related: `lib/claude-code-json.ts` (the engine), `scripts/llm-worker.mjs` and
 * `.github/workflows/llm-worker.yml` (the drainers),
 * `supabase/migrations/092_llm_jobs.sql` (the queue).
 */
import { getSupabase } from '@/lib/supabase';
import {
  claudeCodeAvailable,
  runClaudeCodeJson,
  runClaudeCodeText,
} from '@/lib/claude-code-json';

/**
 * The work is queued but the request could not wait for it.
 *
 * Carries the job id so a caller can hand the visitor a poll link, or so a
 * background delivery can find the answer later.
 */
export class LlmUnavailable extends Error {
  readonly jobId: string | null;
  constructor(message: string, jobId: string | null = null) {
    super(message);
    this.name = 'LlmUnavailable';
    this.jobId = jobId;
  }
}

/**
 * Friendly names, because a call site should say how hard the thinking is, not
 * pin a model id that will be wrong in four months. The CLI accepts a full id
 * too, so anything unrecognised is passed straight through.
 */
export type LlmModel = 'opus' | 'sonnet' | 'haiku' | (string & {});

export type LlmRequest = {
  /** The role and rubric. */
  system: string;
  /** The task. */
  user: string;
  /** Which call site this is. Shows up in logs and in the desk. */
  label: string;
  /** Defaults to sonnet: the right answer for drafting and chat. */
  model?: LlmModel;
  /**
   * How long to wait inside the request before giving up and throwing
   * `LlmUnavailable`. Must leave headroom under the route's `maxDuration`, or
   * the platform kills the request and the caller gets nothing at all instead
   * of an honest "still working".
   */
  timeoutMs?: number;
  /**
   * COLLECT AN ANSWER THIS REQUEST ALREADY PAID FOR.
   *
   * When set, the newest job with this same label that finished inside the
   * window is returned instead of queueing a new one.
   *
   * This exists because of a real, silent, repeating loss. A route enqueues,
   * waits its timeout, gives up, and tells the operator "it is queued, try
   * again in a minute". The drainer then finishes the job seconds later and
   * writes the answer into `llm_jobs.result_json`, where NOTHING EVER READS IT.
   * Trying again started a completely fresh job, waited again, and threw that
   * answer away too. On 2026-08-25 four finished website audits sat in this
   * table with real scores (41, 46, 41, 38) while all three leads still read
   * `audit_at = NEVER`. The button could only ever work by winning a race.
   *
   * Opt-in per call site, and deliberately short, so it collects the answer the
   * operator is standing there waiting for and never serves a stale one to a
   * caller that wanted fresh work. A deliberate re-grade later still runs for
   * real. Only switch it on where the LABEL identifies the question: see
   * `alreadyAnswered` for why the prompt cannot be the key.
   */
  collectWithinMs?: number;
  /**
   * WHO THIS ANSWER IS FOR.
   *
   * A drainer does not need it. Delivery does. Without it a job that finishes
   * after its request gave up is an answer belonging to nobody, which is how
   * four graded websites sat in this table while all four leads read
   * `audit_at = NULL`. `lib/audit-delivery.mjs` had to infer the owner from the
   * hostname in the label; this is the fact that inference stood in for.
   *
   * Optional because plenty of work genuinely has no owner: the public audit
   * page, the chat composer, anything a visitor triggers. Null means nobody is
   * waiting, and that is a real answer rather than missing data.
   */
  source?: { table: string; id: string } | null;
};

/** How often to check the queue while waiting. */
const POLL_MS = 1500;

/** Conservative default: comfortably inside a 60s route. */
const DEFAULT_TIMEOUT_MS = 45_000;

/* ───────────────────────── the queued path ───────────────────────── */

async function enqueue(req: LlmRequest, schema: unknown | null): Promise<string> {
  const sb = getSupabase();
  if (!sb) {
    throw new LlmUnavailable(
      'No local Claude Code CLI and no database to queue through. Nothing can run this prompt.',
    );
  }

  const { data, error } = await sb
    .from('llm_jobs')
    .insert({
      label: req.label,
      system_prompt: req.system,
      user_prompt: req.user,
      schema: schema ?? null,
      model: req.model ?? 'sonnet',
      source_table: req.source?.table ?? null,
      source_id: req.source?.id ?? null,
    })
    .select('id')
    .single();

  if (error) throw new LlmUnavailable(`Could not queue the work: ${error.message}`);
  return data.id as string;
}

type JobRow = {
  status: 'queued' | 'running' | 'done' | 'failed';
  result_text: string | null;
  result_json: unknown;
  error: string | null;
};

/**
 * Wait for a drainer to answer, then hand back the row.
 *
 * The job is NEVER cancelled on timeout. A drainer will still pick it up, still
 * run it, and still write the answer, which is why this returns null rather
 * than deleting the row.
 *
 * That answer used to go nowhere. This comment said the work "just lands after
 * the response", which was true of the row and false of everything the operator
 * can see: the report reached `result_json` and no caller ever came back for
 * it. `collectWithinMs` is what makes the sentence true. Without it on a call
 * site, a timeout here still means the work was done and discarded.
 */
async function waitFor(jobId: string, timeoutMs: number): Promise<JobRow | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_MS));

    const { data } = await sb
      .from('llm_jobs')
      .select('status, result_text, result_json, error')
      .eq('id', jobId)
      .maybeSingle();

    const job = data as JobRow | null;
    if (job && (job.status === 'done' || job.status === 'failed')) return job;
  }
  return null;
}

/**
 * The newest finished answer to this same question, if one landed inside the
 * window.
 *
 * MATCHED ON THE LABEL, AND THAT IS A CONTRACT, NOT A SHORTCUT. Matching on the
 * user prompt is the obvious idea and it does not work: these prompts embed
 * live-read facts and today's DATE. Two audits of one site ninety seconds apart
 * differed by "read live, 2026-08-25" versus "2026-08-26" and by one line of
 * opening hours, so an exact-prompt key would have missed every retry it exists
 * to catch, and would go stale at midnight on principle.
 *
 * So the label has to identify the question. `audit example.com` does. That is
 * why `collectWithinMs` is opt-in per call site rather than on by default: a
 * caller whose label is coarse (`draft`, `summary`) must not switch it on, or
 * it will collect the answer to somebody else's question.
 *
 * Failed jobs are never collected: a failure is worth re-running, an answer is
 * not. Neither is a 'done' row with nothing in it, which is a drainer bug
 * wearing an answer's clothes.
 */
async function alreadyAnswered(req: LlmRequest, wantsJson: boolean): Promise<JobRow | null> {
  const withinMs = req.collectWithinMs ?? 0;
  if (withinMs <= 0) return null;

  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data } = await sb
      .from('llm_jobs')
      .select('status, result_text, result_json, error')
      .eq('label', req.label)
      .eq('status', 'done')
      .gte('finished_at', new Date(Date.now() - withinMs).toISOString())
      .order('finished_at', { ascending: false })
      .limit(5);

    for (const row of (data ?? []) as JobRow[]) {
      const answered = wantsJson ? row.result_json != null : !!(row.result_text ?? '').trim();
      if (answered) return row;
    }
  } catch {
    /* Collecting is an optimisation. A failure here must only cost a re-run. */
  }
  return null;
}

async function viaQueue(req: LlmRequest, schema: unknown | null): Promise<JobRow> {
  const collected = await alreadyAnswered(req, schema != null);
  if (collected) return collected;

  const jobId = await enqueue(req, schema);
  const job = await waitFor(jobId, req.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  if (!job) {
    throw new LlmUnavailable(
      'The work is queued and will be finished shortly, but it did not land inside this request.',
      jobId,
    );
  }
  if (job.status === 'failed') {
    throw new LlmUnavailable(job.error || 'The work failed.', jobId);
  }
  return job;
}

/* ───────────────────────── the public surface ───────────────────────── */

/**
 * Run a prompt whose answer is prose.
 *
 * Throws `LlmUnavailable` when the answer could not be produced inside the
 * request. It does not throw for cost, for quota, or for a dry wallet, because
 * on a subscription none of those exist.
 */
export async function llmText(req: LlmRequest): Promise<string> {
  if (claudeCodeAvailable()) {
    return runClaudeCodeText({
      system: req.system,
      user: req.user,
      model: req.model ?? 'sonnet',
      label: req.label,
    });
  }

  const job = await viaQueue(req, null);
  const text = (job.result_text ?? '').trim();
  if (!text) throw new LlmUnavailable('The drainer returned an empty answer.');
  return text;
}

/**
 * Run a prompt whose answer must satisfy `schema`.
 *
 * The CLI has no structured-output mode, so the schema is instruction rather
 * than enforcement; `lib/claude-code-json.ts` does the parsing, the control
 * character repair and the one structural repair the model actually makes. All
 * of that already ran in production against thousands of audits, which is why
 * this delegates to it rather than reimplementing a parser here.
 */
export async function llmJson<T = unknown>(req: LlmRequest & { schema: unknown }): Promise<T> {
  if (claudeCodeAvailable()) {
    return (await runClaudeCodeJson({
      system: req.system,
      user: req.user,
      schema: req.schema,
      model: req.model ?? 'sonnet',
      label: req.label,
    })) as T;
  }

  const job = await viaQueue(req, req.schema);
  if (job.result_json == null) throw new LlmUnavailable('The drainer returned no document.');
  return job.result_json as T;
}

/** The key `scripts/llm-worker.mjs` heartbeats into `app_state` while resident. */
export const LLM_WORKER_HEALTH_KEY = 'llm_worker_health';

/**
 * How stale the heartbeat may be before the workstation counts as gone. The
 * resident worker beats on every poll (2s), so 90 seconds is forty-odd missed
 * beats: past any slow poll or brief sleep, well short of trusting a machine
 * that has been shut.
 */
const HEARTBEAT_MAX_AGE_MS = 90_000;

/**
 * Is a LIVE drainer standing by right now?
 *
 * Only the resident workstation worker heartbeats; the five-minute Actions
 * drainer deliberately does not. That distinction is the whole point of this
 * function. The runner guarantees the work eventually happens, which is the
 * right promise for a draft or an audit. It is the wrong promise for a visitor
 * typing into a chat box, who needs an answer in seconds or a different
 * experience entirely. A "someone will get to it" drainer must not be allowed
 * to advertise itself as a live one.
 *
 * Fails CLOSED. A route that cannot tell should offer the visitor the reliable
 * path, not gamble their session on a worker it has no evidence for.
 */
export async function residentWorkerAlive(): Promise<boolean> {
  if (claudeCodeAvailable()) return true; // this process IS the engine

  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { data } = await sb
      .from('app_state')
      .select('value, updated_at')
      .eq('key', LLM_WORKER_HEALTH_KEY)
      .maybeSingle();
    if (!data?.updated_at) return false;
    return Date.now() - new Date(data.updated_at as string).getTime() < HEARTBEAT_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Flatten a chat transcript into one prompt.
 *
 * The CLI is single-shot: there is no `messages` array to hand it, so a
 * multi-turn conversation has to be rendered into the user prompt. Speakers are
 * labelled rather than run together, because an unlabelled transcript reads as
 * one rambling monologue and the model answers the wrong turn.
 *
 * The trailing marker matters. Without it the model tends to continue the
 * conversation from both sides, helpfully inventing the visitor's next
 * question; with it, the only thing left to write is the reply.
 */
export function renderTranscript(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  opts: { userLabel?: string; assistantLabel?: string } = {},
): string {
  const you = opts.assistantLabel ?? 'You';
  const them = opts.userLabel ?? 'Them';

  const body = messages
    .map((m) => `${m.role === 'assistant' ? you : them}: ${m.content}`)
    .join('\n\n');

  return `${body}\n\n${you}:`;
}

/**
 * Fire a prompt and do not wait for it at all.
 *
 * For work with somewhere else to land: a draft that appears on the desk when
 * it is ready, a nightly brief that gets emailed. Returns the job id so the
 * caller can record where the answer will show up.
 */
export async function llmEnqueue(req: LlmRequest & { schema?: unknown }): Promise<string> {
  return enqueue(req, req.schema ?? null);
}
