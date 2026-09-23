/**
 * THE PAID LANE. Dormant until somebody puts a key in it.
 *
 * `lib/llm.ts` runs every prompt in this product on Sarah's Max subscription,
 * and that is still true: nothing here runs unless the subscription could not
 * answer. What changed is what happens next. The old answer was
 * `LlmUnavailable`, which is honest ("the work is queued, the request ended
 * first") and completely useless to a client standing in front of the Operator
 * waiting for a QR code. This module is the second answer.
 *
 * FOUR RULES, AND THEY ARE THE WHOLE DESIGN.
 *
 *   1. SUBSCRIPTION FIRST. This is a fallback, not a router. A drainer gets the
 *      job and gets a real chance to finish it before a cent is spent. The one
 *      exception is `preferPaid`, for the handful of call sites where a person
 *      is watching a spinner and forty seconds is the wrong answer.
 *   2. SAME QUESTION. The prompts come from `jsonPrompt` in the CLI engine, the
 *      parsing comes from `extractJson` in the CLI engine. A fallback that asks
 *      a different question is a second product with its own bugs.
 *   3. A CEILING THAT ACTUALLY STOPS. Spend is metered into `app_state` and the
 *      lane closes at the cap. Past the cap this module behaves exactly like it
 *      did before it existed, which is a safe place to fail.
 *   4. SILENCE IS NOT SUCCESS. The first fallback of the month and the month it
 *      hits the ceiling both reach Sarah through `lib/cc-alert.ts`. A paid lane
 *      nobody is watching is how a $99.99 Vercel build bill happened.
 *
 * WHY ANTHROPIC AND NOT THE CHEAPEST TOKENS ON THE MARKET. gpt-5-mini is real
 * money cheaper per token and it does not matter: at this product's volume the
 * whole spread between the cheapest option and this one is about $3 a month.
 * What is not $3 is rewriting nineteen prompt sites and two vision paths that
 * were written and tuned against Claude, and re-validating them in front of a
 * paying client. Same family, same prompts, no revalidation.
 *
 * AT HANDOVER THIS BECOMES THE CLIENT'S. `CC_PAID_ANTHROPIC_KEY` is Sarah's key
 * and Sarah's bill. A client who owns their Command Center owns their own key
 * on their own billing, stored encrypted per client like every other
 * credential. We do not rent them a dependency on us.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractJson, jsonPrompt } from '@/lib/claude-code-json';
import { alert } from '@/lib/cc-alert';

/**
 * Deliberately NOT `ANTHROPIC_API_KEY`.
 *
 * That name has one meaning in this codebase and it is "a mistake in the
 * environment": `lib/claude-code-json.ts` deletes it from the child env before
 * spawning the CLI, because its mere presence silently flips the CLI off the
 * subscription and onto metered billing. There is a real one sitting in
 * `.env.local` right now that nothing uses. Giving the paid lane its own name
 * keeps that stripping unambiguous and makes spending an explicit act.
 */
const KEY_VAR = 'CC_PAID_ANTHROPIC_KEY';

/** Where the month's spend lives. One row, read-modify-write, best effort. */
const LEDGER_KEY = 'llm_paid_spend';

/** The default ceiling, in cents. Override with `CC_PAID_MONTHLY_CENTS`. */
const DEFAULT_CEILING_CENTS = 2_000;

/**
 * Friendly name to model id, and the price of each in cents per million tokens.
 *
 * Sonnet 5 is the default for the same reason it is the default on the
 * subscription side: it is the right answer for drafting and chat, and at this
 * volume the difference between it and Haiku is under two dollars a month.
 * Prices are duplicated here rather than fetched because a ledger that needs a
 * network call to count is a ledger that stops counting when the network is the
 * thing that broke.
 */
const MODELS: Record<string, { id: string; inCents: number; outCents: number }> = {
  opus: { id: 'claude-opus-5', inCents: 500, outCents: 2_500 },
  sonnet: { id: 'claude-sonnet-5', inCents: 200, outCents: 1_000 },
  haiku: { id: 'claude-haiku-4-5', inCents: 100, outCents: 500 },
};

/**
 * Low effort, on purpose.
 *
 * The subscription path runs these prompts with no extended thinking at all, so
 * low is already the more generous of the two, and it keeps the fallback in the
 * few-seconds range that is the entire reason a person would want it. These are
 * composition and classification tasks; they do not repay deep thinking. The
 * one thing not done here is disabling thinking outright, which buys nothing
 * and invites tag leakage into client-facing prose.
 */
const EFFORT = 'low' as const;

/** Generous enough that nothing this product asks for gets cut off mid-sentence. */
const MAX_TOKENS = 16_000;

function modelFor(name: string | undefined): { id: string; inCents: number; outCents: number } {
  const known = MODELS[name ?? 'sonnet'];
  if (known) return known;
  // An explicit model id passed straight through. Price it as Sonnet: guessing
  // low would be the one direction that lets the ceiling be walked past.
  return { id: name as string, inCents: MODELS.sonnet.inCents, outCents: MODELS.sonnet.outCents };
}

/** Is there a key at all? Cheap, synchronous, safe to call on every request. */
export function paidLaneConfigured(): boolean {
  return !!(process.env[KEY_VAR] ?? '').trim();
}

function ceilingCents(): number {
  const raw = Number.parseInt(process.env.CC_PAID_MONTHLY_CENTS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CEILING_CENTS;
}

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

type Ledger = { month: string; cents: number; calls: number };

async function readLedger(sb: SupabaseClient | null): Promise<Ledger> {
  const blank: Ledger = { month: thisMonth(), cents: 0, calls: 0 };
  if (!sb) return blank;
  try {
    const { data } = await sb.from('app_state').select('value').eq('key', LEDGER_KEY).maybeSingle();
    const led = data?.value as Ledger | null;
    // A new month starts at zero rather than carrying the old total forward.
    if (!led || led.month !== blank.month) return blank;
    return { month: led.month, cents: Number(led.cents) || 0, calls: Number(led.calls) || 0 };
  } catch {
    return blank;
  }
}

/**
 * What this month has cost so far, and what is left.
 *
 * Exported so the desk and the smoke test can show it without spending anything
 * to find out.
 */
export async function paidSpend(sb: SupabaseClient | null): Promise<{
  configured: boolean;
  month: string;
  cents: number;
  calls: number;
  ceilingCents: number;
  open: boolean;
}> {
  const led = await readLedger(sb);
  const cap = ceilingCents();
  return {
    configured: paidLaneConfigured(),
    month: led.month,
    cents: led.cents,
    calls: led.calls,
    ceilingCents: cap,
    open: paidLaneConfigured() && led.cents < cap,
  };
}

/**
 * Add a call to the month's total.
 *
 * Read-modify-write, so two calls landing in the same instant can lose one of
 * them. That is a known and accepted inaccuracy: it can only ever UNDERCOUNT by
 * one call, the ceiling is checked before every spend, and the largest single
 * call this product makes is a fraction of a cent. Precise accounting would
 * cost a migration and a lock to protect a number that is checked against a cap
 * measured in dollars.
 */
async function bill(sb: SupabaseClient | null, cents: number): Promise<Ledger> {
  const led = await readLedger(sb);
  const next: Ledger = { month: led.month, cents: led.cents + cents, calls: led.calls + 1 };
  if (!sb) return next;
  try {
    await sb.from('app_state').upsert({ key: LEDGER_KEY, value: next }, { onConflict: 'key' });
  } catch {
    // Failing to record a spend must not fail the answer the client is waiting
    // for. The ceiling is a budget, not a safety interlock.
  }
  return next;
}

function centsFor(m: { inCents: number; outCents: number }, inTok: number, outTok: number): number {
  return (inTok / 1_000_000) * m.inCents + (outTok / 1_000_000) * m.outCents;
}

/**
 * Raised when the paid lane declines to run.
 *
 * Distinct from a failure: no key, or a closed ceiling, means the caller should
 * carry on doing exactly what it did before this module existed.
 */
export class PaidLaneClosed extends Error {}

type PaidRequest = {
  system: string;
  user: string;
  label: string;
  model?: string;
  attachments?: Array<{ url: string; name?: string; type?: string }> | null;
};

/**
 * Attachments, which are simpler here than on the subscription side.
 *
 * The CLI cannot read an image from a string, so `lib/llm-files.mjs` downloads
 * every attachment onto the running machine's disk and points the prompt at the
 * path. The API takes the URL directly and fetches it itself, so this path has
 * no disk, no temp directory and no cleanup. Anything that is not an image or a
 * PDF is named in the prompt rather than silently dropped, so the model can say
 * it could not read something instead of inventing what was in it.
 */
function contentFor(req: PaidRequest, prompt: string): Anthropic.MessageParam['content'] {
  const files = req.attachments ?? [];
  if (!files.length) return prompt;

  const blocks: Anthropic.ContentBlockParam[] = [];
  const unreadable: string[] = [];

  for (const f of files) {
    const type = (f.type ?? '').toLowerCase();
    if (type.startsWith('image/')) {
      blocks.push({ type: 'image', source: { type: 'url', url: f.url } });
    } else if (type === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'url', url: f.url } });
    } else {
      unreadable.push(f.name || f.url);
    }
  }

  const note = unreadable.length
    ? `\n\nAttached but not readable as an image or PDF, so you have NOT seen the contents: ${unreadable.join(', ')}. Say so rather than guessing what they contain.`
    : '';

  blocks.push({ type: 'text', text: prompt + note });
  return blocks;
}

async function call(sb: SupabaseClient | null, req: PaidRequest, prompt: string): Promise<string> {
  const key = (process.env[KEY_VAR] ?? '').trim();
  if (!key) throw new PaidLaneClosed('No paid key is configured.');

  const spend = await paidSpend(sb);
  if (!spend.open) {
    await alert(sb, {
      key: 'llm-paid-ceiling',
      severity: 'broken',
      what: 'The Command Center paid model lane has hit its monthly ceiling',
      where: 'Every client desk. The Operator is back to queue-only until this clears.',
      doThis: `Raise CC_PAID_MONTHLY_CENTS in Vercel, or leave it and the lane reopens on the 1st.`,
      detail: `${spend.calls} calls this month, $${(spend.cents / 100).toFixed(2)} of a $${(spend.ceilingCents / 100).toFixed(2)} ceiling.`,
    });
    throw new PaidLaneClosed(
      `The paid lane is closed: $${(spend.cents / 100).toFixed(2)} spent against a $${(spend.ceilingCents / 100).toFixed(2)} ceiling.`,
    );
  }

  const m = modelFor(req.model);
  const client = new Anthropic({ apiKey: key });

  const res = await client.messages.create({
    model: m.id,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT },
    messages: [{ role: 'user', content: contentFor(req, prompt) }],
  });

  const after = await bill(sb, centsFor(m, res.usage.input_tokens, res.usage.output_tokens));

  // The first spend of the month is worth knowing about. It means a drainer did
  // not answer, which is the thing that used to fail silently.
  if (after.calls === 1) {
    await alert(sb, {
      key: `llm-paid-first:${after.month}`,
      severity: 'watch',
      what: 'The Command Center fell back to the paid model lane',
      where: `First time this month. Job: ${req.label}`,
      doThis: 'Nothing, this is the lane working. Worth a look if the drainers are meant to be up.',
      detail: `Model ${m.id}. Ceiling $${(ceilingCents() / 100).toFixed(2)} a month.`,
    });
  }

  // A policy decline is not a transport failure and must not be read as one.
  // Returning the empty text would hand a client a blank draft that looks like
  // a bug in us.
  if (res.stop_reason === 'refusal') {
    throw new Error(`The model declined this request (${res.stop_details?.category ?? 'no category'}).`);
  }

  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

/** Prose, on the paid lane. Throws `PaidLaneClosed` when there is no lane. */
export async function paidText(sb: SupabaseClient | null, req: PaidRequest): Promise<string> {
  const prompt = [req.system, '', '---', '', req.user].join('\n');
  const text = await call(sb, req, prompt);
  if (!text) throw new Error('The paid lane returned an empty answer.');
  return text;
}

/** A document, on the paid lane. Same prompt and same parser as the CLI path. */
export async function paidJson(
  sb: SupabaseClient | null,
  req: PaidRequest & { schema: unknown },
): Promise<unknown> {
  const text = await call(sb, req, jsonPrompt({ system: req.system, user: req.user, schema: req.schema }));
  return extractJson(text, req.schema, req.label);
}
