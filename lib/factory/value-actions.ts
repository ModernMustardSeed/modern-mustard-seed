import type { SupabaseClient } from '@supabase/supabase-js';
import { runWebsiteAudit } from '@/lib/website-audit';
import { llmJson, LlmUnavailable } from '@/lib/llm';
import type { Blueprint, FactoryRow } from './types';
import { recordUsage } from './usage';
import { enqueue } from './queue';
import { audit } from './audit-log';

/**
 * THE VALUE ACTION LIBRARY. The part of Client Factory that is not a mail
 * merge.
 *
 * A Value Action is something useful the Factory DOES for a prospect before
 * asking them to buy anything: an audit of their own site, the arithmetic on
 * what a problem is costing them, a demo configured around how they actually
 * work, a receptionist that answers as their business. It is the reason a
 * stranger reads the second sentence, and it is the thing that separates this
 * product from "leads plus a sequencer plus a chatbot".
 *
 * TWO SHAPES, ONE INTERFACE. Some actions run inside the request (an audit, a
 * calculation). Some are minutes of work and get queued (a built demo, a built
 * voice agent). Callers do not branch on which: `runValueAction` returns either
 * a finished run or a queued one, and the run row is the contract either way.
 *
 * GROUNDING IS NOT OPTIONAL. Every action here reports what it actually found.
 * There is no path that produces a flattering finding because the campaign
 * needed one. A fabricated audit is worse than no audit: it is the fastest way
 * to lose a prospect who knows their own business better than we do.
 */

export type ValueActionContext = {
  supabase: SupabaseClient;
  tenantId: string;
  factory: FactoryRow;
  blueprint: Blueprint;
  prospect: {
    id: string;
    company: string;
    website: string | null;
    domain: string | null;
    industry: string | null;
    city: string | null;
    region: string | null;
    phone: string | null;
    signals: Record<string, unknown>;
    enrichment: Record<string, unknown>;
    is_test: boolean;
  };
  config: Record<string, unknown>;
};

export type ValueActionOutcome =
  | { status: 'ready'; output: Record<string, unknown>; outputUrl?: string | null; costCents: number; summary: string }
  | { status: 'queued'; jobKind: string; costCents: number; summary: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

export type ValueAction = {
  key: string;
  name: string;
  blurb: string;
  moduleKey: string;
  inputs: string[];
  outputs: string[];
  industries: string[] | null;
  costCents: number;
  risk: 'low' | 'medium' | 'high';
  safety: string;
  successMetric: string;
  status: 'internal' | 'beta' | 'stable' | 'proposed';
  run: (ctx: ValueActionContext) => Promise<ValueActionOutcome>;
};

/* ─────────────────────────── website audit ─────────────────────────── */

const websiteAudit: ValueAction = {
  key: 'website_audit',
  name: 'Website Audit',
  blurb: 'Grades their own public site and names the specific things costing them conversions.',
  moduleKey: 'value.website_audit',
  inputs: ['website'],
  outputs: ['score', 'letter_grade', 'top_three_fixes', 'full_report'],
  industries: null,
  costCents: 6,
  risk: 'low',
  safety: 'Reads only what the site serves publicly. No probing, no authenticated access, no vulnerability testing.',
  successMetric: 'Reply rate on the campaign that leads with the findings.',
  status: 'stable',
  async run(ctx) {
    const url = ctx.prospect.website || (ctx.prospect.domain ? `https://${ctx.prospect.domain}` : null);
    if (!url) return { status: 'skipped', reason: 'No website to audit.' };

    const result = await runWebsiteAudit(url);
    if (!result.ok) return { status: 'failed', error: result.error };

    const top = result.report.top_three_fixes ?? [];
    return {
      status: 'ready',
      output: {
        score: result.report.overall_score,
        letter: result.report.letter_grade,
        headline: result.report.headline,
        analysis: result.report.overall_analysis,
        top_three: top,
        categories: result.report.categories ?? {},
        signals: result.signals_summary,
      },
      costCents: 6,
      summary: `${result.report.letter_grade} (${result.report.overall_score}/100). ${top.length} specific fixes.`,
    };
  },
};

/* ────────────────────────── ROI calculator ─────────────────────────── */

/**
 * The customer's own economics applied to this prospect. Every input is a
 * number a human entered, and if the numbers are not there the action skips
 * rather than modelling something plausible: an invented figure in a cold email
 * is a claim, and a wrong claim to somebody who knows their own business is
 * worse than silence.
 */
const roiCalculator: ValueAction = {
  key: 'roi_calculator',
  name: 'ROI Calculator',
  blurb: 'Turns the customer\'s real economics into a number for this specific prospect.',
  moduleKey: 'value.roi_calculator',
  inputs: ['economics.avg_first_sale', 'prospect signals'],
  outputs: ['monthly_value', 'annual_value', 'assumptions'],
  industries: null,
  costCents: 0,
  risk: 'low',
  safety: 'Refuses to compute when the inputs are missing. Every assumption is shown beside the result.',
  successMetric: 'Reply rate versus a campaign with no number in it.',
  status: 'stable',
  async run(ctx) {
    const econ = ctx.blueprint.economics;
    const jobValue = econ.avg_first_sale_cents ?? null;
    const closeRate = econ.close_rate_pct ?? null;
    if (jobValue === null || closeRate === null) {
      return { status: 'skipped', reason: 'Needs average first sale and close rate on the blueprint. Neither can be guessed.' };
    }

    const signals = ctx.prospect.signals ?? {};
    const missedPerWeek = Number(signals.missed_calls_week ?? ctx.config.default_missed_calls_week ?? 0);
    if (!missedPerWeek) {
      return { status: 'skipped', reason: 'No observed volume signal for this prospect, so there is nothing honest to multiply.' };
    }

    const monthlyCents = Math.round(missedPerWeek * 4.3 * (closeRate / 100) * jobValue);
    return {
      status: 'ready',
      output: {
        monthly_cents: monthlyCents,
        annual_cents: monthlyCents * 12,
        assumptions: {
          missed_per_week: missedPerWeek,
          weeks_per_month: 4.3,
          close_rate_pct: closeRate,
          avg_first_sale_cents: jobValue,
          source: 'Customer-supplied economics and observed prospect signals.',
        },
      },
      costCents: 0,
      summary: `About $${(monthlyCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })} a month, on their own numbers.`,
    };
  },
};

/* ──────────────────────── personalized report ──────────────────────── */

const REPORT_SCHEMA = {
  type: 'object',
  required: ['headline', 'findings', 'closing'],
  properties: {
    headline: { type: 'string' },
    findings: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        required: ['title', 'evidence', 'why_it_matters'],
        properties: {
          title: { type: 'string' },
          evidence: { type: 'string', description: 'Quote or describe exactly what was observed. If nothing was observed, say so.' },
          why_it_matters: { type: 'string' },
        },
      },
    },
    closing: { type: 'string' },
  },
};

const personalizedReport: ValueAction = {
  key: 'personalized_report',
  name: 'Personalized Report',
  blurb: 'A grounded written analysis of what was actually observed about this prospect.',
  moduleKey: 'value.personalized_report',
  inputs: ['research', 'business knowledge'],
  outputs: ['headline', 'findings', 'closing'],
  industries: null,
  costCents: 6,
  risk: 'medium',
  safety: 'Findings must cite observed evidence. The prompt forbids inference presented as fact and forbids any claim outside the approved list.',
  successMetric: 'Engagement rate on the report link.',
  status: 'stable',
  async run(ctx) {
    const research = ctx.prospect.enrichment?.research;
    if (!research) return { status: 'skipped', reason: 'No research on this prospect yet. Enrich first.' };

    try {
      const doc = await llmJson<{ headline: string; findings: { title: string; evidence: string; why_it_matters: string }[]; closing: string }>({
        label: 'factory.value.personalized_report',
        model: 'sonnet',
        schema: REPORT_SCHEMA,
        system: [
          `You are writing a short analysis for ${ctx.prospect.company} on behalf of ${ctx.blueprint.business.name}.`,
          'RULES, in order of importance:',
          '1. Every finding must rest on evidence in the research provided. If the research does not support a finding, do not make it.',
          '2. Never state a number, a comparison or an outcome that is not in the material given to you.',
          `3. You may only make these claims about ${ctx.blueprint.business.name}: ${ctx.blueprint.business.approved_claims.join(' | ') || '(none approved, so make none)'}.`,
          ctx.blueprint.business.prohibited_claims.length ? `4. Never say any of: ${ctx.blueprint.business.prohibited_claims.join(' | ')}.` : '',
          '5. No guarantees of revenue, results or ROI. Ever.',
          '6. No em dashes.',
          'Fewer, well-evidenced findings beat more speculative ones. Three real findings is a good report.',
        ].filter(Boolean).join('\n'),
        user: `RESEARCH ON ${ctx.prospect.company}:\n${JSON.stringify(research).slice(0, 12000)}\n\nWhat we sell: ${ctx.blueprint.offer.headline}\nThe pain we address: ${ctx.blueprint.pain.primary}`,
      });

      return {
        status: 'ready',
        output: { ...doc },
        costCents: 6,
        summary: `${doc.findings.length} evidenced finding(s).`,
      };
    } catch (err) {
      if (err instanceof LlmUnavailable) {
        return { status: 'queued', jobKind: 'value_action.retry', costCents: 0, summary: 'Queued: the model was busy. It will finish and deliver itself.' };
      }
      return { status: 'failed', error: err instanceof Error ? err.message : 'Report generation failed.' };
    }
  },
};

/* ───────────────────────────── quote ───────────────────────────────── */

const quoteEstimate: ValueAction = {
  key: 'quote_estimate',
  name: 'Quote Estimate',
  blurb: 'Composes an estimate from the customer\'s canonical packages.',
  moduleKey: 'value.quote_builder',
  inputs: ['offer.packages', 'prospect size'],
  outputs: ['line_items', 'total'],
  industries: null,
  costCents: 0,
  risk: 'medium',
  safety: 'Only prices that exist in the blueprint are ever used. There is no arithmetic that could produce a new one.',
  successMetric: 'Quote to meeting rate.',
  status: 'stable',
  async run(ctx) {
    const priced = ctx.blueprint.offer.packages.filter((p) => typeof p.price_cents === 'number');
    if (!priced.length) return { status: 'skipped', reason: 'No package carries a price, so there is nothing to quote.' };

    const pick = priced[0];
    return {
      status: 'ready',
      output: {
        package: pick.name,
        price_cents: pick.price_cents,
        cadence: pick.cadence,
        includes: pick.includes,
        note: 'Canonical package pricing. Not negotiated, not discounted.',
      },
      costCents: 0,
      summary: `${pick.name} at the standard package price.`,
    };
  },
};

/* ─────────────────── the queued, heavyweight actions ───────────────── */

function queued(key: string, name: string, blurb: string, moduleKey: string, costCents: number, extras: Partial<ValueAction>): ValueAction {
  return {
    key,
    name,
    blurb,
    moduleKey,
    inputs: extras.inputs ?? ['prospect'],
    outputs: extras.outputs ?? ['url'],
    industries: extras.industries ?? null,
    costCents,
    risk: extras.risk ?? 'medium',
    safety: extras.safety ?? 'Runs on a worker with a per-run cost ceiling and an idempotency key, so a retry cannot build it twice.',
    successMetric: extras.successMetric ?? 'View rate on the delivered asset.',
    status: extras.status ?? 'stable',
    async run(ctx) {
      const job = await enqueue(ctx.supabase, {
        tenantId: ctx.tenantId,
        factoryId: ctx.factory.id,
        lane: 'value_action',
        kind: `value_action.${key}`,
        payload: { prospect_id: ctx.prospect.id, config: ctx.config, company: ctx.prospect.company },
        idempotencyKey: `va:${key}:${ctx.prospect.id}`,
      });
      return job
        ? { status: 'queued', jobKind: `value_action.${key}`, costCents, summary: `${name} queued for ${ctx.prospect.company}.` }
        : { status: 'failed', error: 'Could not queue the build.' };
    },
  };
}

const demoSite = queued(
  'demo_site',
  'Demo Build',
  'Builds a prospect-specific demo and hosts it at a link they can open.',
  'value.demo_builder',
  25,
  { outputs: ['demo_url'], successMetric: 'Demo open rate, then demo to meeting rate.' },
);

const receptionistRoleplay = queued(
  'receptionist_roleplay',
  'Receptionist Roleplay',
  'Stands up a working AI receptionist for the prospect\'s own business and calls them with it.',
  'value.receptionist_roleplay',
  25,
  {
    outputs: ['assistant_id', 'call_url'],
    risk: 'medium',
    safety: 'Places a call ONLY to a number the prospect supplied when asking for the demonstration. The consent row is written before the job is queued, and the job refuses to run without it.',
    successMetric: 'Call completion rate, then call to meeting rate.',
  },
);

/* ──────────────────────────── the registry ─────────────────────────── */

export const VALUE_ACTIONS: ValueAction[] = [
  websiteAudit,
  roiCalculator,
  personalizedReport,
  quoteEstimate,
  demoSite,
  receptionistRoleplay,
];

const BY_KEY = new Map(VALUE_ACTIONS.map((a) => [a.key, a]));

export function getValueAction(key: string): ValueAction | null {
  return BY_KEY.get(key) ?? null;
}

export function listValueActions(): Omit<ValueAction, 'run'>[] {
  return VALUE_ACTIONS.map(({ run: _run, ...rest }) => rest);
}

/* ──────────────────────────── execution ────────────────────────────── */

export type RunRow = {
  id: string;
  status: 'queued' | 'running' | 'ready' | 'failed' | 'skipped';
  action_key: string;
  output: Record<string, unknown>;
  output_url: string | null;
  cost_cents: number;
};

/**
 * Run a Value Action for one prospect, once.
 *
 * The idempotency key is (factory, action, prospect): running the same action
 * for the same prospect twice returns the first result rather than paying for
 * it again. That matters more here than anywhere else in the platform, because
 * these are the operations that actually cost money.
 */
export async function runValueAction(
  ctx: ValueActionContext,
  actionKey: string,
): Promise<{ run: RunRow } | { error: string }> {
  const action = getValueAction(actionKey);
  if (!action) return { error: `Unknown value action "${actionKey}".` };

  const idempotencyKey = `${actionKey}:${ctx.prospect.id}`;
  const { data: existing } = await ctx.supabase
    .from('factory_action_runs')
    .select('id, status, action_key, output, output_url, cost_cents')
    .eq('factory_id', ctx.factory.id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existing) return { run: existing as RunRow };

  const { data: created, error } = await ctx.supabase
    .from('factory_action_runs')
    .insert({
      tenant_id: ctx.tenantId,
      factory_id: ctx.factory.id,
      prospect_id: ctx.prospect.id,
      action_key: actionKey,
      status: 'running',
      inputs: { company: ctx.prospect.company, website: ctx.prospect.website },
      idempotency_key: idempotencyKey,
      is_test: ctx.prospect.is_test,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };

  const runId = created.id as string;
  let outcome: ValueActionOutcome;
  try {
    outcome = await action.run(ctx);
  } catch (err) {
    outcome = { status: 'failed', error: err instanceof Error ? err.message : 'Value action threw.' };
  }

  const patch =
    outcome.status === 'ready'
      ? { status: 'ready' as const, output: outcome.output, output_url: outcome.outputUrl ?? null, cost_cents: outcome.costCents, completed_at: new Date().toISOString() }
      : outcome.status === 'queued'
        ? { status: 'queued' as const, output: { note: outcome.summary }, cost_cents: 0 }
        : outcome.status === 'skipped'
          ? { status: 'skipped' as const, output: { reason: outcome.reason }, error: outcome.reason, completed_at: new Date().toISOString() }
          : { status: 'failed' as const, error: outcome.error, completed_at: new Date().toISOString() };

  const { data: updated } = await ctx.supabase
    .from('factory_action_runs')
    .update(patch)
    .eq('id', runId)
    .select('id, status, action_key, output, output_url, cost_cents')
    .single();

  if (outcome.status === 'ready' && outcome.costCents > 0 && !ctx.prospect.is_test) {
    await recordUsage(ctx.supabase, {
      tenantId: ctx.tenantId,
      factoryId: ctx.factory.id,
      metric: 'value_actions',
      moduleKey: action.moduleKey,
      costCents: outcome.costCents,
      idempotencyKey: `va:${runId}`,
      meta: { action: actionKey },
    });
  }

  await audit(ctx.supabase, {
    tenantId: ctx.tenantId,
    factoryId: ctx.factory.id,
    action: 'action.run',
    target: ctx.prospect.id,
    actorKind: 'system',
    meta: { action: actionKey, status: outcome.status, test: ctx.prospect.is_test },
  });

  return { run: (updated as RunRow) ?? { id: runId, status: 'failed', action_key: actionKey, output: {}, output_url: null, cost_cents: 0 } };
}
