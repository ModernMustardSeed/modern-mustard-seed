import type { SupabaseClient } from '@supabase/supabase-js';
import type { Blueprint, FactoryRow } from './types';
import { runValueAction, getValueAction } from './value-actions';
import { logActivity, upsertOpportunity, moveStage } from './crm';
import { suppress, recordConsent } from './campaigns';
import { audit } from './audit-log';
import { sendViaResend } from '@/lib/send-email';

/**
 * THE MMS TOOL REGISTRY.
 *
 * One definition per capability, used by the AI salesperson, by workflows, by
 * the Build and by the admin. There is deliberately no second implementation of
 * "book a meeting" living inside a prompt somewhere: business logic lives here,
 * and every surface calls the same function.
 *
 * AUTHORIZATION IS PER TENANT, PER TOOL, AND SERVER-SIDE. A tool is available
 * to an agent only if it is (a) in the blueprint's toolbelt, (b) permitted by
 * the plan's modules, and (c) allowed by the guardrails on the tool itself.
 * Not every agent gets every capability, and the check happens where the tool
 * runs, not where the prompt is written, because a prompt is a suggestion and a
 * model under pressure will call whatever it can reach.
 *
 * RISK IS DECLARED. `risk: 'high'` tools (checkout, proposals) refuse to run at
 * all unless the blueprint explicitly authorizes them. An AI that can compose a
 * price or commit terms is not a feature.
 */

export type ToolRisk = 'low' | 'medium' | 'high';

export type ToolContext = {
  supabase: SupabaseClient;
  tenantId: string;
  factory: FactoryRow;
  blueprint: Blueprint;
  prospect: {
    id: string;
    company: string;
    email: string | null;
    phone: string | null;
    contact_name: string | null;
    contact_title: string | null;
    website: string | null;
    domain: string | null;
    industry: string | null;
    city: string | null;
    region: string | null;
    signals: Record<string, unknown>;
    enrichment: Record<string, unknown>;
    is_test: boolean;
  };
  conversationId?: string | null;
  actor?: string;
};

export type ToolResult = { ok: true; data: unknown; say?: string } | { ok: false; error: string; say?: string };

export type FactoryTool = {
  key: string;
  name: string;
  purpose: string;
  /** Human-readable input contract. The agent prompt renders this verbatim. */
  input: Record<string, string>;
  output: string;
  /** Module that must be entitled for this tool to be usable. */
  moduleKey: string | null;
  risk: ToolRisk;
  /** Does calling this cost real money? Shown in the toolbelt editor. */
  costCents: number;
  requiresIntegration: string | null;
  run: (ctx: ToolContext, args: Record<string, unknown>) => Promise<ToolResult>;
};

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/* ─────────────────────────────── tools ─────────────────────────────── */

const getBusinessKnowledge: FactoryTool = {
  key: 'getBusinessKnowledge',
  name: 'Get Business Knowledge',
  purpose: 'Look up an approved fact about the business you represent.',
  input: { topic: 'services | offer | pricing | claims | objections | escalation' },
  output: 'The approved answer, or a clear "not approved to say" so you escalate instead of improvising.',
  moduleKey: null,
  risk: 'low',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    const bp = ctx.blueprint;
    const topic = str(args.topic).toLowerCase();
    const book: Record<string, unknown> = {
      services: bp.business.services,
      offer: { headline: bp.offer.headline, detail: bp.offer.detail, incentives: bp.offer.incentives },
      pricing: bp.offer.ai_may_quote_price
        ? bp.offer.packages
        : 'You are not authorized to quote price. Offer to have a person send it.',
      claims: bp.business.approved_claims,
      objections: bp.pain.objections,
      escalation: bp.agent.escalation_to,
    };
    const answer = book[topic];
    if (answer === undefined) {
      return { ok: false, error: `No approved knowledge for "${topic}".`, say: 'I do not have an approved answer for that. Let me get a person on it.' };
    }
    return { ok: true, data: answer };
  },
};

const researchProspect: FactoryTool = {
  key: 'researchProspect',
  name: 'Research Prospect',
  purpose: 'Read what is already known about this prospect before you speak.',
  input: {},
  output: 'Company facts, public signals, and prior enrichment. Never anything private.',
  moduleKey: 'data.web_research',
  risk: 'low',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx) {
    return {
      ok: true,
      data: {
        company: ctx.prospect.company,
        website: ctx.prospect.website,
        industry: ctx.prospect.industry,
        location: [ctx.prospect.city, ctx.prospect.region].filter(Boolean).join(', ') || null,
        contact: { name: ctx.prospect.contact_name, title: ctx.prospect.contact_title },
        signals: ctx.prospect.signals,
        research: ctx.prospect.enrichment?.research ?? null,
      },
    };
  },
};

const qualifyLead: FactoryTool = {
  key: 'qualifyLead',
  name: 'Qualify Lead',
  purpose: 'Record what you learned and whether this prospect meets the qualification bar.',
  input: {
    qualified: 'true or false',
    pain: 'What hurts, in their words',
    timeline: 'When they want this solved',
    decision_maker: 'Are they the decision maker',
    notes: 'Anything else that matters',
  },
  output: 'Confirmation, and the prospect state is updated.',
  moduleKey: 'ai.salesperson',
  risk: 'low',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    const qualified = args.qualified === true || str(args.qualified).toLowerCase() === 'true';
    const intelligence = {
      pain: str(args.pain) || null,
      timeline: str(args.timeline) || null,
      decision_maker: str(args.decision_maker) || null,
      notes: str(args.notes) || null,
    };

    await ctx.supabase
      .from('factory_prospects')
      .update({ state: qualified ? 'hot' : 'nurture', last_engagement_at: new Date().toISOString() })
      .eq('id', ctx.prospect.id)
      .eq('tenant_id', ctx.tenantId);

    if (ctx.conversationId) {
      await ctx.supabase.from('factory_conversations').update({ intelligence, outcome: qualified ? 'qualified' : 'disqualified' }).eq('id', ctx.conversationId).eq('tenant_id', ctx.tenantId);
    }
    await logActivity(ctx.supabase, {
      tenantId: ctx.tenantId,
      factoryId: ctx.factory.id,
      prospectId: ctx.prospect.id,
      kind: 'qualification',
      summary: qualified ? 'Qualified by the AI salesperson' : 'Not qualified',
      detail: intelligence,
      actor: ctx.blueprint.agent.name,
    });
    return { ok: true, data: { qualified, ...intelligence } };
  },
};

const createCrmLead: FactoryTool = {
  key: 'createCrmLead',
  name: 'Create CRM Opportunity',
  purpose: 'Open an opportunity for this prospect so a human can pick it up.',
  input: { name: 'What to call it', value_cents: 'Expected value in cents, if known' },
  output: 'The opportunity id.',
  moduleKey: 'ops.crm',
  risk: 'low',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    const res = await upsertOpportunity(ctx.supabase, {
      tenantId: ctx.tenantId,
      factoryId: ctx.factory.id,
      prospectId: ctx.prospect.id,
      name: str(args.name) || `${ctx.prospect.company}: ${ctx.blueprint.offer.headline}`,
      valueCents: typeof args.value_cents === 'number' ? args.value_cents : ctx.blueprint.economics.avg_first_sale_cents ?? null,
      owner: ctx.blueprint.crm.owner_email,
      attribution: {
        conversation_id: ctx.conversationId ?? null,
        first_contact_at: ctx.factory.first_contact_at,
        human_owner: ctx.blueprint.crm.owner_email,
      },
      isTest: ctx.prospect.is_test,
    });
    if ('error' in res) return { ok: false, error: res.error };
    return { ok: true, data: { opportunity_id: res.opportunity.id, created: res.created } };
  },
};

const updateCrmLead: FactoryTool = {
  key: 'updateCrmLead',
  name: 'Update CRM Opportunity',
  purpose: 'Move an opportunity to a different stage.',
  input: { opportunity_id: 'The opportunity', stage: 'A stage in this pipeline', reason: 'Why' },
  output: 'The new stage.',
  moduleKey: 'ops.crm',
  risk: 'low',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    const res = await moveStage(ctx.supabase, {
      tenantId: ctx.tenantId,
      opportunityId: str(args.opportunity_id),
      stage: str(args.stage),
      blueprint: ctx.blueprint,
      actor: ctx.blueprint.agent.name,
      reason: str(args.reason) || undefined,
    });
    return 'error' in res ? { ok: false, error: res.error } : { ok: true, data: res };
  },
};

const generateValueAction: FactoryTool = {
  key: 'generateValueAction',
  name: 'Generate Value Action',
  purpose: 'Do something useful for this prospect: an audit, a calculation, a demo, a report.',
  input: { action_key: 'Which value action' },
  output: 'The result, or confirmation that it is being built.',
  moduleKey: null,
  risk: 'medium',
  costCents: 6,
  requiresIntegration: null,
  async run(ctx, args) {
    const key = str(args.action_key);
    const configured = ctx.blueprint.value_actions.find((v) => v.key === key);
    if (!configured) return { ok: false, error: `"${key}" is not configured for this Factory.` };

    const def = getValueAction(key);
    if (def && configured.max_cost_cents > 0 && def.costCents > configured.max_cost_cents) {
      return { ok: false, error: `${def.name} costs more than the ceiling set for this Factory.` };
    }
    if (configured.human_approval) {
      return { ok: false, error: 'This value action needs human approval first.', say: 'I will have someone kick that off for you today.' };
    }

    const res = await runValueAction({ ...ctx, config: configured.config }, key);
    if ('error' in res) return { ok: false, error: res.error };
    return { ok: true, data: res.run };
  },
};

const sendValueAction: FactoryTool = {
  key: 'sendValueAction',
  name: 'Send Value Action',
  purpose: 'Email a finished value action to the prospect.',
  input: { run_id: 'The value action run', note: 'A line to go with it' },
  output: 'Confirmation.',
  moduleKey: 'outbound.cold_email',
  risk: 'medium',
  costCents: 1,
  requiresIntegration: 'email_sender',
  async run(ctx, args) {
    if (!ctx.prospect.email) return { ok: false, error: 'No email address for this prospect.' };
    if (!ctx.blueprint.compliance.sender_from) return { ok: false, error: 'No sender configured.' };

    const { data } = await ctx.supabase
      .from('factory_action_runs')
      .select('id, action_key, output_url, status')
      .eq('id', str(args.run_id))
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();
    const run = data as { id: string; action_key: string; output_url: string | null; status: string } | null;
    if (!run) return { ok: false, error: 'Value action run not found.' };
    if (run.status !== 'ready') return { ok: false, error: `That is still ${run.status}.` };

    if (ctx.factory.mode === 'test' || ctx.prospect.is_test) {
      return { ok: true, data: { delivered: false, test: true }, say: 'Test mode: nothing was actually sent.' };
    }

    const res = await sendViaResend({
      from: ctx.blueprint.compliance.sender_from,
      to: ctx.prospect.email,
      subject: `For ${ctx.prospect.company}`,
      text: `${str(args.note) || 'Here it is:'}\n\n${run.output_url ?? ''}`.trim(),
    });
    if (!res.ok) return { ok: false, error: res.error };

    await ctx.supabase.from('factory_action_runs').update({ delivered_at: new Date().toISOString() }).eq('id', run.id);
    return { ok: true, data: { delivered: true } };
  },
};

const getPricing: FactoryTool = {
  key: 'getPricing',
  name: 'Get Pricing',
  purpose: 'State the canonical price for a package.',
  input: { package: 'Package name' },
  output: 'The approved price, or a refusal.',
  moduleKey: null,
  risk: 'high',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    if (!ctx.blueprint.offer.ai_may_quote_price) {
      return { ok: false, error: 'Not authorized to quote price.', say: 'I am not the right one to quote that. Let me get you a person who is.' };
    }
    const want = str(args.package).toLowerCase();
    const pack = ctx.blueprint.offer.packages.find((p) => p.name.toLowerCase().includes(want)) ?? ctx.blueprint.offer.packages[0];
    if (!pack || pack.price_cents === null || pack.price_cents === undefined) {
      return { ok: false, error: 'No canonical price for that package.', say: 'That one is quoted rather than listed. I will have someone put a number in front of you.' };
    }
    return { ok: true, data: { package: pack.name, price_cents: pack.price_cents, cadence: pack.cadence, includes: pack.includes } };
  },
};

const createCheckout: FactoryTool = {
  key: 'createCheckout',
  name: 'Create Checkout',
  purpose: 'Send a payment link for an approved price.',
  input: { price_ref: 'An approved price id' },
  output: 'The checkout URL.',
  moduleKey: 'conversion.checkout',
  risk: 'high',
  costCents: 0,
  requiresIntegration: 'payments',
  async run(ctx, args) {
    if (!ctx.blueprint.checkout.enabled) return { ok: false, error: 'Checkout is not enabled for this Factory.' };
    const ref = str(args.price_ref);
    if (!ctx.blueprint.checkout.price_refs.includes(ref)) {
      return { ok: false, error: 'That price is not on the approved list.', say: 'I can only send our standard pricing. Let me have someone confirm the right one.' };
    }
    // The link is minted by the tenant's payments integration, never composed
    // here: an AI that can build a checkout URL can build one for any amount.
    return {
      ok: true,
      data: { queued: true, price_ref: ref },
      say: 'Sending that over now.',
    };
  },
};

const checkCalendar: FactoryTool = {
  key: 'checkCalendar',
  name: 'Check Calendar',
  purpose: 'Offer real times, not made-up ones.',
  input: { days: 'How many days ahead to look (default 7)' },
  output: 'Available start times in ISO 8601.',
  moduleKey: 'conversion.calendar',
  risk: 'low',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    const days = Math.min(21, Math.max(1, Number(args.days ?? 7) || 7));
    const slots = await availableSlots(ctx, days);
    return { ok: true, data: { slots: slots.slice(0, 12), duration_min: ctx.blueprint.scheduling.duration_min } };
  },
};

const bookMeeting: FactoryTool = {
  key: 'bookMeeting',
  name: 'Book Meeting',
  purpose: 'Hold a real slot and record it in the CRM.',
  input: { starts_at: 'ISO 8601 start time', attendee_email: 'Their email', attendee_name: 'Their name' },
  output: 'The meeting id.',
  moduleKey: 'conversion.calendar',
  risk: 'medium',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    const startsAt = str(args.starts_at);
    if (!startsAt || Number.isNaN(Date.parse(startsAt))) return { ok: false, error: 'A valid start time is required.' };

    const free = await availableSlots(ctx, 21);
    if (!free.includes(new Date(startsAt).toISOString())) {
      return { ok: false, error: 'That time is not available.', say: 'That one just went. Here are the next open times.' };
    }

    const { data, error } = await ctx.supabase
      .from('factory_meetings')
      .insert({
        tenant_id: ctx.tenantId,
        factory_id: ctx.factory.id,
        prospect_id: ctx.prospect.id,
        starts_at: new Date(startsAt).toISOString(),
        duration_min: ctx.blueprint.scheduling.duration_min,
        attendee_email: str(args.attendee_email) || ctx.prospect.email,
        attendee_name: str(args.attendee_name) || ctx.prospect.contact_name,
        assigned_to: ctx.blueprint.scheduling.assign_to[0] ?? ctx.blueprint.crm.owner_email,
        is_test: ctx.prospect.is_test || ctx.factory.mode === 'test',
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };

    await Promise.all([
      logActivity(ctx.supabase, {
        tenantId: ctx.tenantId,
        factoryId: ctx.factory.id,
        prospectId: ctx.prospect.id,
        kind: 'meeting.booked',
        summary: `Meeting booked for ${new Date(startsAt).toISOString()}`,
        actor: ctx.blueprint.agent.name,
      }),
      audit(ctx.supabase, {
        tenantId: ctx.tenantId,
        factoryId: ctx.factory.id,
        action: 'meeting.booked',
        target: ctx.prospect.id,
        actorKind: 'ai',
        actor: ctx.blueprint.agent.name,
      }),
    ]);
    return { ok: true, data: { meeting_id: data.id, starts_at: startsAt } };
  },
};

const transferToHuman: FactoryTool = {
  key: 'transferToHuman',
  name: 'Transfer To Human',
  purpose: 'Stop and hand this to a person.',
  input: { reason: 'Why', urgency: 'normal | high' },
  output: 'Confirmation that a human was notified.',
  moduleKey: 'conversion.handoff',
  risk: 'low',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    const reason = str(args.reason) || 'The AI escalated this conversation.';
    const target = ctx.blueprint.agent.escalation_to[0];
    if (!target) return { ok: false, error: 'No escalation route configured.' };

    if (ctx.conversationId) {
      await ctx.supabase
        .from('factory_conversations')
        .update({ outcome: 'escalated', escalated_to: target.email, ended_at: new Date().toISOString() })
        .eq('id', ctx.conversationId)
        .eq('tenant_id', ctx.tenantId);
    }
    await Promise.all([
      logActivity(ctx.supabase, {
        tenantId: ctx.tenantId,
        factoryId: ctx.factory.id,
        prospectId: ctx.prospect.id,
        kind: 'escalation',
        summary: `Escalated to ${target.label}`,
        detail: { reason, urgency: str(args.urgency) || 'normal' },
        actor: ctx.blueprint.agent.name,
      }),
      audit(ctx.supabase, {
        tenantId: ctx.tenantId,
        factoryId: ctx.factory.id,
        action: 'conversation.escalated',
        target: ctx.prospect.id,
        actorKind: 'ai',
        severity: 'warning',
        meta: { to: target.email, reason },
      }),
    ]);
    return { ok: true, data: { escalated_to: target.label }, say: `Let me get ${target.label} on this. They will follow up shortly.` };
  },
};

const createProposal: FactoryTool = {
  key: 'createProposal',
  name: 'Create Proposal',
  purpose: 'Draft a proposal for a human to approve and send.',
  input: { summary: 'What they asked for' },
  output: 'A draft awaiting approval. Never sent by the AI.',
  moduleKey: 'conversion.proposal',
  risk: 'high',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    if (!ctx.blueprint.proposals.enabled) return { ok: false, error: 'Proposals are not enabled for this Factory.' };
    await logActivity(ctx.supabase, {
      tenantId: ctx.tenantId,
      factoryId: ctx.factory.id,
      prospectId: ctx.prospect.id,
      kind: 'proposal.drafted',
      summary: 'Proposal drafted, awaiting human approval',
      detail: { summary: str(args.summary) },
      actor: ctx.blueprint.agent.name,
    });
    return {
      ok: true,
      data: { status: 'awaiting_approval' },
      say: 'I have put that in front of the team to price and send. It will not come from me.',
    };
  },
};

const stopContacting: FactoryTool = {
  key: 'stopContacting',
  name: 'Stop Contacting',
  purpose: 'Honour a request not to be contacted, immediately and permanently.',
  input: { scope: 'email | domain', reason: 'What they said' },
  output: 'Confirmation.',
  moduleKey: null,
  risk: 'low',
  costCents: 0,
  requiresIntegration: null,
  async run(ctx, args) {
    const scope = str(args.scope) === 'domain' ? 'domain' : 'email';
    const value = scope === 'domain' ? ctx.prospect.domain : ctx.prospect.email;
    if (!value) return { ok: false, error: 'Nothing to suppress.' };

    await Promise.all([
      suppress(ctx.supabase, ctx.tenantId, { kind: scope, value, reason: 'unsubscribe' }),
      ctx.supabase
        .from('factory_prospects')
        .update({ state: 'suppressed', suppressed_at: new Date().toISOString(), suppressed_reason: str(args.reason) || 'Requested' })
        .eq('id', ctx.prospect.id)
        .eq('tenant_id', ctx.tenantId),
      recordConsent(ctx.supabase, {
        tenantId: ctx.tenantId,
        prospectId: ctx.prospect.id,
        channel: 'email',
        state: 'revoked',
        evidence: { said: str(args.reason), by: 'prospect', at: new Date().toISOString() },
      }),
    ]);
    return { ok: true, data: { suppressed: value }, say: 'Done. You will not hear from us again.' };
  },
};

/* ──────────────────────────── the registry ─────────────────────────── */

export const TOOLS: FactoryTool[] = [
  getBusinessKnowledge,
  researchProspect,
  qualifyLead,
  createCrmLead,
  updateCrmLead,
  generateValueAction,
  sendValueAction,
  getPricing,
  createCheckout,
  checkCalendar,
  bookMeeting,
  transferToHuman,
  createProposal,
  stopContacting,
];

const BY_KEY = new Map(TOOLS.map((t) => [t.key, t]));

export function getTool(key: string): FactoryTool | null {
  return BY_KEY.get(key) ?? null;
}

export function listTools(): Omit<FactoryTool, 'run'>[] {
  return TOOLS.map(({ run: _run, ...rest }) => rest);
}

/**
 * The tools an agent may actually hold: on the blueprint's toolbelt, entitled
 * by the plan, and not a high-risk tool the blueprint never switched on.
 */
export function authorizedTools(blueprint: Blueprint, entitledModules: Set<string>): FactoryTool[] {
  return TOOLS.filter((t) => {
    if (!blueprint.agent.tools.includes(t.key)) return false;
    if (t.moduleKey && !entitledModules.has(t.moduleKey) && !entitledModules.has('*')) return false;
    if (t.key === 'getPricing' && !blueprint.offer.ai_may_quote_price) return false;
    if (t.key === 'createCheckout' && !blueprint.checkout.enabled) return false;
    if (t.key === 'createProposal' && !blueprint.proposals.enabled) return false;
    return true;
  });
}

/**
 * Run a tool on behalf of an agent.
 *
 * The authorization check happens HERE rather than at the prompt, because the
 * prompt is advisory and this is not. A tool name the agent invented, a tool it
 * was told about in a previous version of its instructions, or a tool the plan
 * stopped including yesterday all end at the same refusal.
 */
export async function runTool(
  ctx: ToolContext,
  entitledModules: Set<string>,
  toolKey: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const allowed = authorizedTools(ctx.blueprint, entitledModules);
  const tool = allowed.find((t) => t.key === toolKey);
  if (!tool) {
    return { ok: false, error: `Tool "${toolKey}" is not authorized for this Factory.`, say: 'That is not something I can do. Let me get a person on it.' };
  }
  if (ctx.factory.ai_paused) {
    return { ok: false, error: 'The AI is paused on this Factory.' };
  }

  try {
    const result = await tool.run(ctx, args);
    await audit(ctx.supabase, {
      tenantId: ctx.tenantId,
      factoryId: ctx.factory.id,
      action: 'admin.action',
      target: `tool:${toolKey}`,
      actorKind: 'ai',
      actor: ctx.blueprint.agent.name,
      meta: { ok: result.ok, prospect: ctx.prospect.id },
    });
    return result;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Tool failed.' };
  }
}

/* ─────────────────────────── native scheduling ─────────────────────── */

/**
 * Slots this Factory can genuinely offer.
 *
 * Native scheduling only, per tenant: weekday business hours in the Factory's
 * configured window, minus what is already booked. A Factory pointed at Google
 * or Outlook resolves availability through its connector instead; until that
 * connector is connected, preflight blocks activation rather than letting the
 * agent offer times nobody's calendar knows about.
 */
export async function availableSlots(ctx: ToolContext, days: number): Promise<string[]> {
  const duration = ctx.blueprint.scheduling.duration_min;
  const { data } = await ctx.supabase
    .from('factory_meetings')
    .select('starts_at, duration_min')
    .eq('tenant_id', ctx.tenantId)
    .eq('factory_id', ctx.factory.id)
    .in('status', ['booked', 'rescheduled'])
    .gte('starts_at', new Date().toISOString());

  const taken = ((data as { starts_at: string; duration_min: number }[]) ?? []).map((m) => ({
    start: new Date(m.starts_at).getTime(),
    end: new Date(m.starts_at).getTime() + m.duration_min * 60_000,
  }));

  const out: string[] = [];
  const now = Date.now();
  for (let d = 1; d <= days; d++) {
    const day = new Date(now + d * 86_400_000);
    const dow = day.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    // 15:00 to 22:00 UTC is roughly 9am to 4pm Mountain, the window the rest of
    // the studio books in. A connector-backed calendar replaces this entirely.
    for (let hour = 15; hour < 22; hour++) {
      const start = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, 0, 0);
      if (start < now + 3 * 3_600_000) continue; // never offer inside three hours
      const end = start + duration * 60_000;
      if (taken.some((t) => start < t.end && end > t.start)) continue;
      out.push(new Date(start).toISOString());
    }
  }
  return out;
}
