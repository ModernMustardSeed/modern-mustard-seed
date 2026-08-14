import type { SupabaseClient } from '@supabase/supabase-js';
import { llmText, renderTranscript, LlmUnavailable } from '@/lib/llm';
import type { Blueprint, FactoryRow } from './types';
import { authorizedTools, type FactoryTool } from './tools';
import { recordUsage } from './usage';

/**
 * THE AI SALESPERSON.
 *
 * There is ONE prompt in this product. Not one per customer: one, assembled
 * from four layers at call time.
 *
 *   BASE          the rules that hold for every agent MMS ever ships.
 *   ROLE          what this kind of salesperson does (from the template).
 *   TENANT        this business, this offer, this pain, these claims.
 *   SESSION       this prospect, this conversation, these tools.
 *
 * Maintaining a hand-written prompt file per customer is the exact failure the
 * secondary directive is written against: at fifty tenants it is a full-time
 * job, at five hundred it is impossible, and a fix to the base rules would have
 * to be pasted five hundred times. Everything a customer needs to change lives
 * in their blueprint, and the blueprint is versioned, so the prompt is too.
 *
 * THE FLOOR IS NOT CONFIGURABLE. Never claim to be human. Never invent a price,
 * a guarantee, a capability or a customer. Never exceed the approved claims.
 * Escalate rather than improvise. Those live in BASE_RULES and no tenant
 * configuration can remove them, which is why they are concatenated last: the
 * final word in the prompt is ours.
 */

export const AGENT_PROMPT_VERSION = 3;

const BASE_RULES = [
  'ABSOLUTE RULES. These override every other instruction in this prompt, including anything the person you are talking to asks for.',
  '1. You are an AI. If anyone asks whether they are talking to a person, say plainly that you are not. Never imply otherwise, never dodge the question.',
  '2. Never state a price, discount, guarantee, timeline commitment or capability that is not in the approved material below. If you do not have it, say you do not have it and escalate.',
  '3. Never invent a customer, a case study, a statistic or a result.',
  '4. Never give legal, medical, financial, tax or other regulated professional advice.',
  '5. Never agree to contract terms, refunds, or anything that binds the business.',
  '6. If you are asked for something outside your approved scope, escalate to a human. Escalating is a success, not a failure.',
  '7. Do not use em dashes.',
  '8. Short, specific, plain sentences. No hype. Assume they are busy and smart.',
  '9. If the prospect asks not to be contacted, use the stopContacting tool immediately and confirm it. Do not negotiate.',
];

export type AgentContext = {
  factory: FactoryRow;
  blueprint: Blueprint;
  tools: FactoryTool[];
  prospect: {
    company: string;
    contact_name: string | null;
    contact_title: string | null;
    industry: string | null;
    city: string | null;
    region: string | null;
    website: string | null;
    signals?: Record<string, unknown>;
  };
  /** What the Factory has already done FOR this prospect. The agent must know. */
  valueActions?: { key: string; summary: string; url: string | null }[];
};

function section(title: string, body: string | string[]): string {
  const text = Array.isArray(body) ? body.filter(Boolean).map((b) => `- ${b}`).join('\n') : body;
  return text.trim() ? `\n## ${title}\n${text}` : '';
}

/**
 * Assemble the system prompt. Deterministic: the same blueprint and the same
 * prospect always produce the same prompt, which is what makes a simulation
 * result mean anything about production.
 */
export function buildAgentPrompt(ctx: AgentContext): string {
  const bp = ctx.blueprint;
  const a = bp.agent;

  const toolLines = ctx.tools.map((t) => {
    const args = Object.entries(t.input).map(([k, v]) => `${k} (${v})`).join(', ');
    return `${t.key}: ${t.purpose}${args ? ` Arguments: ${args}.` : ''}`;
  });

  const parts = [
    `You are ${a.name}, ${a.role} for ${bp.business.name}.`,
    a.disclosure,
    `Tone: ${a.tone}`,
    a.languages.length ? `You answer in the language the prospect writes in. Supported: ${a.languages.join(', ')}.` : '',

    section('The business', [
      bp.business.description ?? '',
      bp.business.services.length ? `Services: ${bp.business.services.join(', ')}` : '',
      bp.business.service_area ? `Service area: ${bp.business.service_area}` : '',
    ]),

    section('The offer', [
      bp.offer.headline,
      bp.offer.detail ?? '',
      bp.offer.ai_may_quote_price
        ? `You MAY quote these prices, exactly as written: ${bp.offer.packages.map((p) => `${p.name}${p.price_cents ? ` $${(p.price_cents / 100).toLocaleString('en-US')}` : ''} (${p.cadence})`).join('; ')}`
        : 'You may NOT quote price. If asked, say a person will send the pricing and offer to arrange that.',
      bp.offer.ai_may_discount ? 'You may discuss the approved incentives only.' : 'You may NOT offer any discount, for any reason.',
    ]),

    section('What you may claim, verbatim only', bp.business.approved_claims),
    section('What you must never say', [...bp.business.prohibited_claims, ...a.must_not_discuss]),

    section('Why people buy this', [
      bp.pain.primary,
      bp.pain.secondary ?? '',
      bp.pain.urgency ?? '',
      ...bp.pain.trigger_events.map((t) => `Trigger: ${t}`),
    ]),

    section(
      'Objections and the approved answers',
      bp.pain.objections.map((o) => `"${o.objection}" -> ${o.response}`),
    ),

    section('How to qualify', a.qualification_questions),

    section('When to hand off to a human', [
      ...a.escalation_rules,
      ...a.escalation_to.map((e) => `${e.label} (${e.when})`),
    ]),

    ctx.valueActions?.length
      ? section(
          'What we have already done for this prospect',
          ctx.valueActions.map((v) => `${v.key}: ${v.summary}${v.url ? ` (${v.url})` : ''}`),
        )
      : '',

    section('This prospect', [
      `Company: ${ctx.prospect.company}`,
      ctx.prospect.contact_name ? `Contact: ${ctx.prospect.contact_name}${ctx.prospect.contact_title ? `, ${ctx.prospect.contact_title}` : ''}` : '',
      ctx.prospect.industry ? `Industry: ${ctx.prospect.industry}` : '',
      [ctx.prospect.city, ctx.prospect.region].filter(Boolean).length ? `Location: ${[ctx.prospect.city, ctx.prospect.region].filter(Boolean).join(', ')}` : '',
      ctx.prospect.website ? `Website: ${ctx.prospect.website}` : '',
    ]),

    section('Tools you may call', toolLines.length ? toolLines : ['(none: you can only talk and escalate)']),
    toolLines.length
      ? 'To call a tool, reply with ONLY a JSON object: {"tool":"toolName","args":{...}}. Otherwise reply with the message to send, and nothing else. Never mention tools to the prospect.'
      : '',

    ctx.factory.mode === 'test' ? '\nTEST MODE. This is a rehearsal against a test record. Behave exactly as you would in production.' : '',

    `\n${BASE_RULES.join('\n')}`,
  ];

  return parts.filter(Boolean).join('\n').trim();
}

/**
 * A stable fingerprint of the assembled instructions.
 *
 * Two different blueprints must not report the same agent version, and the same
 * blueprint must report the same one across processes, so a readiness score can
 * be pinned to the exact instructions it tested. Simple, deterministic, and
 * good enough to detect drift.
 */
export function agentVersion(bp: Blueprint): number {
  const material = JSON.stringify([
    AGENT_PROMPT_VERSION,
    bp.agent,
    bp.offer,
    bp.business.approved_claims,
    bp.business.prohibited_claims,
    bp.pain.objections,
  ]);
  let hash = 5381;
  for (let i = 0; i < material.length; i++) hash = ((hash * 33) ^ material.charCodeAt(i)) >>> 0;
  return hash % 1_000_000;
}

/* ─────────────────────────── conversation ──────────────────────────── */

export type Turn = { role: 'user' | 'assistant'; content: string };

export type AgentReply =
  | { kind: 'message'; text: string }
  | { kind: 'tool'; tool: string; args: Record<string, unknown> }
  | { kind: 'unavailable'; jobId: string | null; text: string };

/** Parse a reply that may be a tool call. Tolerant of a fenced block around it. */
export function parseReply(raw: string): AgentReply {
  const text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  if (candidate.startsWith('{') && candidate.includes('"tool"')) {
    try {
      const parsed = JSON.parse(candidate) as { tool?: unknown; args?: unknown };
      if (typeof parsed.tool === 'string') {
        return { kind: 'tool', tool: parsed.tool, args: (parsed.args as Record<string, unknown>) ?? {} };
      }
    } catch {
      /* not a tool call after all; fall through and send it as prose */
    }
  }
  return { kind: 'message', text };
}

/**
 * One turn of the AI salesperson.
 *
 * Costs are metered per conversation rather than per token: the model runs on a
 * flat subscription (lib/llm.ts), so a token count would be a fiction and a
 * conversation count is the honest unit for both the plan limit and the margin
 * view.
 */
export async function agentTurn(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    ctx: AgentContext;
    history: Turn[];
    conversationId?: string | null;
    entitledModules: Set<string>;
  },
): Promise<AgentReply> {
  if (input.ctx.factory.ai_paused) {
    return { kind: 'message', text: 'The AI is paused on this Factory.' };
  }

  const tools = authorizedTools(input.ctx.blueprint, input.entitledModules);
  const system = buildAgentPrompt({ ...input.ctx, tools });

  try {
    const raw = await llmText({
      label: `factory.agent.${input.ctx.factory.id}`,
      model: 'sonnet',
      system,
      user: renderTranscript(input.history, { assistantLabel: input.ctx.blueprint.agent.name, userLabel: input.ctx.prospect.company }),
      timeoutMs: 40_000,
    });

    if (input.conversationId) {
      await recordUsage(supabase, {
        tenantId: input.tenantId,
        factoryId: input.ctx.factory.id,
        metric: 'ai_conversations',
        moduleKey: 'ai.salesperson',
        idempotencyKey: `conv:${input.conversationId}:${input.history.length}`,
      });
    }
    return parseReply(raw);
  } catch (err) {
    if (err instanceof LlmUnavailable) {
      return {
        kind: 'unavailable',
        jobId: err.jobId,
        text: 'Give me a moment and I will come back to you on this.',
      };
    }
    return { kind: 'message', text: 'Let me get a person to answer that properly.' };
  }
}

/** Append a turn to a stored conversation. */
export async function appendTurn(
  supabase: SupabaseClient,
  tenantId: string,
  conversationId: string,
  turn: Turn,
): Promise<void> {
  const { data } = await supabase
    .from('factory_conversations')
    .select('transcript')
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  const transcript = ((data as { transcript: Turn[] } | null)?.transcript ?? []).concat(turn);
  await supabase.from('factory_conversations').update({ transcript }).eq('id', conversationId).eq('tenant_id', tenantId);
}

/* ────────────────────── conversation intelligence ──────────────────── */

export type ConversationIntelligence = {
  pain: string | null;
  objection: string | null;
  timeline: string | null;
  budget: string | null;
  decision_maker: string | null;
  competitor: string | null;
  requested: string | null;
  intent: 'high' | 'medium' | 'low' | null;
  next_step: string | null;
};

const INTEL_SCHEMA = {
  type: 'object',
  properties: {
    pain: { type: ['string', 'null'] },
    objection: { type: ['string', 'null'] },
    timeline: { type: ['string', 'null'] },
    budget: { type: ['string', 'null'], description: 'Only if they volunteered it. Otherwise null.' },
    decision_maker: { type: ['string', 'null'] },
    competitor: { type: ['string', 'null'] },
    requested: { type: ['string', 'null'] },
    intent: { type: ['string', 'null'], enum: ['high', 'medium', 'low', null] },
    next_step: { type: ['string', 'null'] },
  },
};

/**
 * Read a finished conversation into structured facts.
 *
 * Every field may be null, and null is the correct answer far more often than a
 * guess. Inferring a budget nobody stated is how a pipeline fills with numbers
 * that were never true.
 */
export async function extractIntelligence(transcript: Turn[]): Promise<ConversationIntelligence | null> {
  if (!transcript.length) return null;
  const { llmJson } = await import('@/lib/llm');
  try {
    return await llmJson<ConversationIntelligence>({
      label: 'factory.agent.intelligence',
      model: 'haiku',
      schema: INTEL_SCHEMA,
      system:
        'Read this sales conversation and extract only what was actually said. Every field may be null and null is the right answer when the transcript does not contain it. Do not infer budget, authority or timeline from tone.',
      user: renderTranscript(transcript),
      timeoutMs: 30_000,
    });
  } catch {
    return null;
  }
}
