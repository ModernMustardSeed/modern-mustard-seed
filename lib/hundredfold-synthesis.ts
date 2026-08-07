/**
 * What the interview becomes.
 *
 * Three model calls, run in order, after the owner hangs up:
 *   1. read the transcript into the thirty answers
 *   2. build the DEEP roadmap from those answers (same document, better input)
 *   3. forge the offer, and derive the systems we will build and the gates
 *
 * Sequential on purpose. Step 3 has to see step 2 or the money model and the
 * offer drift apart, and nobody is sitting on a loading screen for this: it runs
 * after the call ends and lands in the member's Command Center.
 */

import Anthropic from '@anthropic-ai/sdk';
import { extractJson } from './claude-code-json';
import { runRoadmapFromBrief } from './scaling-roadmap';
import type { RoadmapReport } from './roadmap-shape';
import { QUESTIONS, transcriptText, type Turn } from './hundredfold-interview';

const MODELS = (process.env.ROADMAP_MODELS || 'claude-opus-5,claude-sonnet-5')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

async function ask(
  system: string,
  user: string,
  schema: unknown,
  label: string,
  maxTokens = 16000
): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/\\n$/, '');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const anthropic = new Anthropic({ apiKey });

  const keys = Object.keys((schema as { properties?: object }).properties ?? {});
  const instructions = [
    'Return ONLY a single JSON object matching this JSON Schema. No preamble, no commentary, no markdown fence. The first character of your reply must be {.',
    '',
    JSON.stringify(schema),
    '',
    keys.length > 1
      ? `The root object has exactly these ${keys.length} keys and every one is a DIRECT CHILD of the root: ${keys.join(', ')}. They are siblings. Close each nested object before starting the next root key.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  let last: unknown;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await anthropic.messages
          .stream({
            model,
            max_tokens: maxTokens,
            output_config: { effort: 'high' },
            system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: `${user}\n\n---\n\n${instructions}` }],
          })
          .finalMessage();
        if (response.stop_reason === 'max_tokens') throw new Error(`${label}: hit the max_tokens ceiling`);
        const block = response.content.find((b) => b.type === 'text');
        if (!block || block.type !== 'text') throw new Error(`${label}: no text block`);
        return extractJson(block.text, schema, label);
      } catch (err) {
        last = err;
        console.warn(`${label}: attempt failed on ${model}:`, err instanceof Error ? err.message : err);
      }
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

const str = { type: 'string' as const };
const obj = <T extends Record<string, unknown>>(properties: T) => ({
  type: 'object' as const,
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const arr = (items: unknown) => ({ type: 'array' as const, items });

/* -------------------------------------------------------------------------- */
/* 1. Transcript to answers                                                    */
/* -------------------------------------------------------------------------- */

const ANSWERS_SCHEMA = {
  type: 'object' as const,
  properties: Object.fromEntries(QUESTIONS.map((q) => [q.key, str])),
  additionalProperties: false,
};

/**
 * Pull the thirty answers out of a conversation.
 *
 * Deliberately not required-all: a real interview skips questions, and forcing
 * the model to fill every key produces invented answers, which is the single
 * worst thing that could happen to a document an owner is about to run their
 * year on. An unanswered question comes back as an empty string and the
 * coverage check downstream decides whether there is enough to synthesize.
 */
export async function extractAnswers(turns: Turn[]): Promise<Record<string, string>> {
  const system = `You read interview transcripts and file the answers. You never invent, never infer beyond what was said, and never fill a gap to be helpful. If the owner did not answer a question, or gave only a non-answer, return an empty string for that key. An empty string is the correct, useful answer. A guess is a lie that ends up in a business plan.

Capture the owner's own numbers and their own words. Keep it tight: one to three sentences per key, in their voice, not summarized into corporate language. If they gave a number, the number must survive.`;

  const user = `Here is the interview. File each answer under its key.

${QUESTIONS.map((q) => `[${q.key}] ${q.ask}`).join('\n')}

TRANSCRIPT:
${transcriptText(turns)}`;

  const parsed = (await ask(system, user, ANSWERS_SCHEMA, 'hundredfold-answers', 8000)) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const q of QUESTIONS) {
    const v = parsed[q.key];
    if (typeof v === 'string' && v.trim()) out[q.key] = v.trim();
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* 2. The deep roadmap                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The same roadmap document, built from the interview instead of a homepage.
 *
 * This is what the member is buying at the top of the funnel: they can lay the
 * free one next to this one and see exactly what thirty questions bought them.
 */
export async function buildDeepRoadmap(input: {
  businessName?: string | null;
  url?: string | null;
  answers: Record<string, string>;
  freeRoadmap?: RoadmapReport | null;
}): Promise<RoadmapReport> {
  const answered = QUESTIONS.filter((q) => input.answers[q.key])
    .map((q) => `Q: ${q.ask}\nA: ${input.answers[q.key]}`)
    .join('\n\n');

  const prior = input.freeRoadmap
    ? `\n\nWe already built a roadmap for them from their website alone. It said their stage was ${input.freeRoadmap.stage}, scored them ${input.freeRoadmap.scale_score}, and named their constraint as "${input.freeRoadmap.constraint?.type}: ${input.freeRoadmap.constraint?.title}". Treat that as a first impression from the outside, nothing more. The interview outranks it everywhere they disagree, and if the interview changes the constraint, change it and be direct about why.`
    : '';

  const brief = `Write the Hundredfold Roadmap for this business. This one is different from the usual run: instead of a website scrape, you have a full thirty question interview with the owner, in their own words and their own numbers.

Business: ${input.businessName ?? 'the owner did not name it'}${input.url ? `\nWebsite: ${input.url}` : ''}${prior}

THE INTERVIEW:

${answered}`;

  const extra = `Rules specific to an interview-built roadmap:
- Their numbers outrank every inference. If they told you their close rate, their average ticket, their margin, or their list size, use those figures directly and say they are theirs.
- Quote the owner back to themselves at least twice, in the verdict and in the constraint. Hearing their own sentence used as evidence is what makes them believe the rest.
- Where they said "I don't know", say so plainly and make finding that number a move in window one. Never fill the hole with an estimate dressed as a fact.
- This owner is about to be coached through this plan every week for a year, so the moves can be harder and more specific than a plan someone reads alone. Assume someone is checking on them.
- The scoreboard's "current" column should carry their real answers wherever they gave one.`;

  const result = await runRoadmapFromBrief(brief, {
    effort: 'high',
    label: `hundredfold-roadmap ${input.businessName ?? ''}`.trim(),
    extra,
  });
  if (!result.ok) throw new Error(result.error);
  return result.report;
}

/* -------------------------------------------------------------------------- */
/* 3. The offer forge                                                          */
/* -------------------------------------------------------------------------- */

export type ForgedOffer = {
  name: string;
  one_liner: string;
  promise: string;
  price: string;
  price_logic: string;
  guarantee: string;
  urgency: string;
  stack: { item: string; value: string; why: string }[];
  ladder: {
    attraction: string;
    core: string;
    continuity: string;
    upsell: string;
    downsell: string;
  };
  headline: string;
  subhead: string;
  proof_to_build: string[];
  objections: { objection: string; answer: string }[];
  call_opening: string;
  close_ask: string;
};

export type PlannedSystem = {
  name: string;
  window_no: number;
  kind: string;
  summary: string;
  gives_back: string;
};

export type PlannedGate = {
  window_no: number;
  kind: 'move' | 'gate';
  label: string;
  target: string;
};

const OFFER_SCHEMA = obj({
  offer: obj({
    name: str,
    one_liner: str,
    promise: str,
    price: str,
    price_logic: str,
    guarantee: str,
    urgency: str,
    headline: str,
    subhead: str,
    call_opening: str,
    close_ask: str,
  }),
  stack: arr(obj({ item: str, value: str, why: str })),
  ladder: obj({ attraction: str, core: str, continuity: str, upsell: str, downsell: str }),
  proof_to_build: arr(str),
  objections: arr(obj({ objection: str, answer: str })),
  systems: arr(obj({ name: str, window_no: { type: 'number' as const }, kind: str, summary: str, gives_back: str })),
  gates: arr(
    obj({
      window_no: { type: 'number' as const },
      kind: { type: 'string' as const, enum: ['move', 'gate'] },
      label: str,
      target: str,
    })
  ),
});

const OFFER_SYSTEM = `You are the offer strategist at Modern Mustard Seed, working inside HUNDREDFOLD. A member has been interviewed and their roadmap is written. Your job now is the single most valuable document their business will own this year: the offer they should actually be selling, built so it is obviously worth more than the price.

You also plan the BUILD: which agents and automations Modern Mustard Seed will wire into their business, window by window, to make the roadmap happen instead of just being read.

# The offer

- **Name it** so a buyer repeats it to their spouse without looking it up. Concrete beats clever. Their trade's words beat marketing words.
- **The promise** is one outcome, stated in the buyer's language, with a time frame the business can actually hold.
- **Price** in real dollars, anchored to what the buyer is comparing it against, not to what it costs to deliver.
- **The stack** is 5 to 7 line items, each with a dollar value and one line on why the buyer cares. The total should make the price look small. Values must be defensible: what that piece costs elsewhere, or what it saves.
- **The guarantee** is conditional and specific, and the business must be able to honor it without going broke. Never "satisfaction guaranteed". Name the exact condition and the exact remedy.
- **Urgency** must be TRUE for this business: capacity, season, a real cohort, install slots, a price that is genuinely going up. Never a fake countdown. If nothing honest exists, say what to build so that it does.
- **The ladder** is attraction, core, continuity, upsell, downsell. Continuity is mandatory even if it has to be invented, because it is the difference between a business and a job.
- **Objections**: the 4 to 6 things this specific buyer actually says, with the answer in one or two sentences. Use their words from the interview where you have them.
- **call_opening** is the first fifteen seconds of a sales conversation, written to be read aloud. **close_ask** is the exact sentence that asks for the money.

# The build plan

**systems**: 4 to 7 things we build for them, each tied to a window (1 through 4). These are real agents and automations: a voice agent on their number, a follow-up engine that works their unclosed list, a booking flow, a content engine that turns finished work into proof, a dashboard wiring their scoreboard to live numbers, a quoting tool, an intake that qualifies. Each names what it is, what it does, and \`gives_back\`: the hours or the money it hands back to the owner, in their own terms. Only propose what a small studio can genuinely build and run.

**gates**: every window (1 through 4) gets 3 to 5 \`move\` rows and exactly ONE \`gate\` row. A move is a step they take. The gate is the number that must be true before the next window opens. Gate targets are numbers, always. These become checkboxes in their Command Center, so each label must be short enough to read at a glance and specific enough to be undeniably done or not done.

# Voice

Direct, warm, founder to founder. Second person. No em dashes. No corporate filler. Never invent a statistic, a case study, a testimonial, or a result. Every dollar figure is an estimate and reads like one.`;

export async function forgeOffer(input: {
  businessName?: string | null;
  answers: Record<string, string>;
  roadmap: RoadmapReport;
}): Promise<{
  offer: ForgedOffer;
  systems: PlannedSystem[];
  gates: PlannedGate[];
}> {
  const answered = QUESTIONS.filter((q) => input.answers[q.key])
    .map((q) => `Q: ${q.ask}\nA: ${input.answers[q.key]}`)
    .join('\n\n');

  const user = `Forge the offer and plan the build for ${input.businessName ?? 'this business'}.

THEIR ROADMAP (already written, do not contradict it, build on it):
Stage: ${input.roadmap.stage}, score ${input.roadmap.scale_score}
Headline: ${input.roadmap.headline}
Constraint: ${input.roadmap.constraint.type}. ${input.roadmap.constraint.title}. ${input.roadmap.constraint.evidence}
Offer direction from the roadmap: ${input.roadmap.offer.name}. ${input.roadmap.offer.promise} Priced at ${input.roadmap.offer.price}.
Money model: attraction ${input.roadmap.money_model.attraction} | core ${input.roadmap.money_model.core} | continuity ${input.roadmap.money_model.continuity}
Windows: ${input.roadmap.phases.map((p, i) => `W${i + 1} ${p.title} (gate: ${p.gate})`).join(' | ')}

THE INTERVIEW, in their words:

${answered}

Go deeper than the roadmap did. The roadmap sketched the offer in a paragraph. You are writing the finished thing, plus the assets to sell it, plus the list of systems we are going to build for them.`;

  const parsed = (await ask(OFFER_SYSTEM, user, OFFER_SCHEMA, 'hundredfold-offer', 20000)) as {
    offer: Record<string, string>;
    stack: ForgedOffer['stack'];
    ladder: ForgedOffer['ladder'];
    proof_to_build: string[];
    objections: ForgedOffer['objections'];
    systems: PlannedSystem[];
    gates: PlannedGate[];
  };

  const isText = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
  const text = (x: unknown) => (isText(x) ? x : '');
  const has =
    (...keys: string[]) =>
    (x: unknown): boolean =>
      Boolean(x) && typeof x === 'object' && !Array.isArray(x) && keys.every((k) => k in (x as object));

  const offer: ForgedOffer = {
    name: text(parsed.offer?.name),
    one_liner: text(parsed.offer?.one_liner),
    promise: text(parsed.offer?.promise),
    price: text(parsed.offer?.price),
    price_logic: text(parsed.offer?.price_logic),
    guarantee: text(parsed.offer?.guarantee),
    urgency: text(parsed.offer?.urgency),
    headline: text(parsed.offer?.headline),
    subhead: text(parsed.offer?.subhead),
    call_opening: text(parsed.offer?.call_opening),
    close_ask: text(parsed.offer?.close_ask),
    stack: (parsed.stack ?? []).filter(has('item', 'value', 'why')).slice(0, 7),
    ladder: {
      attraction: text(parsed.ladder?.attraction),
      core: text(parsed.ladder?.core),
      continuity: text(parsed.ladder?.continuity),
      upsell: text(parsed.ladder?.upsell),
      downsell: text(parsed.ladder?.downsell),
    },
    proof_to_build: (parsed.proof_to_build ?? []).filter(isText).slice(0, 6),
    objections: (parsed.objections ?? []).filter(has('objection', 'answer')).slice(0, 6),
  };

  if (!offer.name || !offer.stack.length) {
    throw new Error('offer forge came back without a name or a stack');
  }

  const clampWindow = (n: unknown) => Math.max(1, Math.min(4, Math.round(Number(n) || 1)));
  const systems = (parsed.systems ?? [])
    .filter(has('name', 'window_no', 'kind', 'summary', 'gives_back'))
    .slice(0, 7)
    .map((s) => ({ ...s, window_no: clampWindow(s.window_no) }));
  const gates = (parsed.gates ?? [])
    .filter(has('window_no', 'kind', 'label', 'target'))
    .slice(0, 30)
    .map((g) => ({
      ...g,
      window_no: clampWindow(g.window_no),
      kind: g.kind === 'gate' ? ('gate' as const) : ('move' as const),
    }));

  if (!systems.length || !gates.length) {
    throw new Error('offer forge came back without systems or gates');
  }

  return { offer, systems, gates };
}

/* -------------------------------------------------------------------------- */
/* The typed interview, one turn at a time                                     */
/* -------------------------------------------------------------------------- */

/**
 * Mr. Mustard's next line in a typed interview.
 *
 * The voice channels hand the whole question bank to Vapi and let the model run
 * the conversation itself. The typed path cannot do that, so each turn is a
 * call: here is the conversation so far, here is what has been covered, say the
 * next thing.
 *
 * Returns the key he is now asking about so the UI can show real progress
 * rather than a fake bar, and a `done` flag so he decides when the interview is
 * over instead of a counter deciding for him.
 */
const TURN_SCHEMA = obj({
  say: str,
  question_key: str,
  done: { type: 'boolean' as const },
});

export async function nextCoachTurn(input: {
  systemPrompt: string;
  turns: Turn[];
  covered: string[];
}): Promise<{ say: string; question_key: string; done: boolean }> {
  const remaining = QUESTIONS.filter((q) => !input.covered.includes(q.key));
  const conversation = input.turns.length
    ? transcriptText(input.turns)
    : '(nothing yet, this is your opening)';

  const user = `THE CONVERSATION SO FAR:
${conversation}

ALREADY COVERED: ${input.covered.length ? input.covered.join(', ') : 'nothing yet'}

STILL TO COVER (${remaining.length}):
${remaining.map((q) => `[${q.key}] ${q.ask}`).join('\n')}

Say your next thing. That is one short acknowledgement of what they just said, if they said something, followed by ONE question. Never two questions. Never a list.

If their last answer was soft or dodged a number, use the push for that question instead of moving on, and return the SAME question_key you were already on. Only push once per question: if the conversation shows you already pushed on it, take what they gave and move to the next one.

Set question_key to the key you are asking about right now. Set done to true only when everything worth covering is covered, and in that case what you say is your closing: thank them by name if you know it, tell them Sarah reviews this and their plan gets built from their answers.`;

  const parsed = (await ask(input.systemPrompt, user, TURN_SCHEMA, 'hundredfold-turn', 1200)) as {
    say?: string;
    question_key?: string;
    done?: boolean;
  };

  const say = typeof parsed.say === 'string' && parsed.say.trim() ? parsed.say.trim() : null;
  if (!say) throw new Error('coach returned nothing to say');

  return {
    say,
    question_key: typeof parsed.question_key === 'string' ? parsed.question_key : '',
    done: parsed.done === true,
  };
}
