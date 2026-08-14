import type { SupabaseClient } from '@supabase/supabase-js';
import type { Blueprint } from './types';
import { MODULES, resolveModules } from './modules';
import { TEMPLATES } from './templates';

/**
 * THE PRODUCTIZATION INSTRUMENTS.
 *
 * The company's real question is not "how many Factories did we sell", it is
 * "did selling one more make us do more work". Everything in this file measures
 * that, and it is the difference between a software company and an agency with
 * a login page.
 *
 *   FIT SCORE            should we sell this customer a Factory at all
 *   COMPLEXITY           standard, advanced, or custom engineering
 *   PRODUCTIZATION RATIO how much of a live Factory came from reusable parts
 *   DEPLOYMENT EFFORT    human minutes per launch, and whether it is falling
 *   REPEATED REQUESTS    the same ask from N customers is a product, not a favour
 *
 * None of these are vanity numbers. If the productization ratio falls or human
 * minutes rise as the customer count grows, the productization is not working,
 * and the honest thing is for that to be visible rather than felt.
 */

/* ──────────────────────────── the fit score ────────────────────────── */

export type FitInput = {
  /** What one customer is worth to them. Without it, nothing else is calculable. */
  customerValueCents: number | null;
  lifetimeValueCents: number | null;
  /** Roughly how many businesses match the ICP. An honest order of magnitude. */
  addressableCount: number | null;
  /** Do the target businesses have findable, reachable named contacts? */
  reachable: boolean | null;
  /** Is there a repeatable sales conversation, or is every deal bespoke? */
  repeatableSale: boolean | null;
  /** Can we do something useful for a prospect before they buy? */
  demonstrable: boolean | null;
  salesCycleDays: number | null;
  regulated: boolean;
  integrationCount: number;
};

export type FitScore = {
  score: number;
  verdict: 'excellent' | 'good' | 'marginal' | 'poor';
  reasons: string[];
  /** Present when we should tell them no. Shown to staff before a proposal goes out. */
  warning: string | null;
};

/**
 * Should MMS sell this business a Client Factory?
 *
 * A low score is a REASON NOT TO SELL, not a discount lever. A Factory built
 * for a business whose customers are worth ninety dollars and whose market is
 * four hundred companies will fail, the customer will churn angry, and the
 * setup fee will not have been worth it. Surfacing that before the proposal is
 * cheaper for everyone than discovering it in month three.
 */
export function fitScore(input: FitInput): FitScore {
  const reasons: string[] = [];
  let score = 0;

  const value = input.lifetimeValueCents ?? input.customerValueCents;
  if (value === null) {
    reasons.push('No customer value supplied, so the economics cannot be checked at all.');
  } else if (value >= 500_000) { score += 30; reasons.push(`A customer is worth ${fmt(value)}. Outbound acquisition pays for itself easily at that value.`); }
  else if (value >= 150_000) { score += 22; reasons.push(`A customer is worth ${fmt(value)}. Workable.`); }
  else if (value >= 50_000) { score += 12; reasons.push(`A customer is worth ${fmt(value)}. Thin: the funnel has to run efficiently.`); }
  else { reasons.push(`A customer is worth ${fmt(value)}. Too low for personalized outbound to pay for itself.`); }

  const tam = input.addressableCount;
  if (tam === null) reasons.push('No estimate of how many businesses match the ICP.');
  else if (tam >= 10_000) { score += 20; reasons.push(`About ${tam.toLocaleString()} businesses match. Room to run for years.`); }
  else if (tam >= 2_000) { score += 15; reasons.push(`About ${tam.toLocaleString()} businesses match.`); }
  else if (tam >= 500) { score += 8; reasons.push(`About ${tam.toLocaleString()} businesses match. The market will be exhausted inside a year.`); }
  else { reasons.push(`Only about ${tam?.toLocaleString()} businesses match. The market runs out before the Factory pays back.`); }

  if (input.reachable) { score += 15; reasons.push('Named decision makers are findable and reachable.'); }
  else if (input.reachable === false) reasons.push('Decision makers are hard to reach. Outbound will struggle regardless of the messaging.');

  if (input.repeatableSale) { score += 15; reasons.push('The sales conversation repeats, so the agent can be configured once.'); }
  else if (input.repeatableSale === false) reasons.push('Every deal is bespoke. An AI salesperson has little to work with.');

  if (input.demonstrable) { score += 20; reasons.push('There is something useful we can do for a prospect before they buy. This is the strongest single predictor.'); }
  else if (input.demonstrable === false) reasons.push('Nothing can be demonstrated pre-sale, so this degrades to cold email with extra steps.');

  if (input.salesCycleDays !== null && input.salesCycleDays > 270) { score -= 10; reasons.push(`A ${input.salesCycleDays} day sales cycle means results arrive long after the first invoice.`); }
  if (input.regulated) { score -= 5; reasons.push('Regulated vertical: activation needs a compliance review and the agent is scope-limited.'); }
  if (input.integrationCount > 3) { score -= 5; reasons.push(`${input.integrationCount} integrations pushes this out of a standard deployment.`); }

  score = Math.max(0, Math.min(100, score));
  const verdict = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'marginal' : 'poor';
  return {
    score,
    verdict,
    reasons,
    warning:
      verdict === 'poor'
        ? 'Do not sell a full Client Factory into this. The economics say it will not produce for them, and a churned angry customer costs more than the setup fee earns.'
        : verdict === 'marginal'
          ? 'Marginal fit. Sell it only with the constraint named out loud, and set the goal accordingly.'
          : null,
  };
}

function fmt(cents: number | null): string {
  return cents === null ? 'unknown' : `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/* ──────────────────────── implementation complexity ────────────────── */

export type Complexity = {
  level: 'standard' | 'advanced' | 'custom';
  drivers: string[];
  /** Estimated MMS human minutes to launch. An estimate, and labelled one. */
  estimatedMinutes: number;
};

/**
 * How much of MMS's time this deployment will actually take. Feeds pricing and
 * scheduling, and is compared against the recorded actual afterwards, which is
 * the only way the estimate ever gets better.
 */
export function implementationComplexity(bp: Blueprint): Complexity {
  const drivers: string[] = [];
  let minutes = 35; // the floor: review the blueprint, connect the sender, run the test

  const gaps = resolveModules(bp.modules);
  if (gaps.needsDevelopment.length) {
    drivers.push(`${gaps.needsDevelopment.length} capability needs building: ${gaps.needsDevelopment.map((g) => g.name).join(', ')}.`);
    minutes += gaps.needsDevelopment.length * 480;
  }

  const integrations = bp.integrations.length;
  if (integrations > 0) { drivers.push(`${integrations} integration(s) to connect.`); minutes += integrations * 20; }

  const heavyActions = bp.value_actions.filter((v) => v.key === 'demo_site' || v.key === 'receptionist_roleplay');
  if (heavyActions.length) { drivers.push(`${heavyActions.length} build-heavy value action(s).`); minutes += heavyActions.length * 30; }

  if (bp.campaigns.length > 2) { drivers.push(`${bp.campaigns.length} campaigns.`); minutes += (bp.campaigns.length - 2) * 15; }
  if (bp.compliance.regulated_vertical) { drivers.push('Regulated vertical: compliance review required.'); minutes += 120; }
  if (bp.checkout.enabled) { drivers.push('Checkout wiring and canonical price verification.'); minutes += 30; }
  if (bp.agent.voice_enabled) { drivers.push('Voice agent provisioning.'); minutes += 45; }
  if (!bp.template_key) { drivers.push('No template: built from scratch.'); minutes += 90; }

  const level: Complexity['level'] =
    gaps.needsDevelopment.length > 0 ? 'custom' : minutes > 120 || integrations > 3 ? 'advanced' : 'standard';

  return { level, drivers: drivers.length ? drivers : ['Standard template deployment.'], estimatedMinutes: minutes };
}

/* ───────────────────────── productization ratio ────────────────────── */

export type ProductizationRatio = {
  reusablePct: number;
  fromTemplate: number;
  fromModules: number;
  fromConfiguration: number;
  custom: number;
  note: string;
};

/**
 * What share of this Factory came from reusable parts.
 *
 * Counted in configured areas rather than lines of code, because that is the
 * unit that predicts labour: an area filled by a template costs nothing to
 * deploy again, an area that needed engineering costs the same every time.
 */
export async function productizationRatio(
  supabase: SupabaseClient,
  factoryId: string,
  bp: Blueprint,
): Promise<ProductizationRatio> {
  const { count: customCount } = await supabase
    .from('factory_custom_code')
    .select('id', { count: 'exact', head: true })
    .eq('factory_id', factoryId)
    .eq('status', 'active');

  const fromTemplate = bp.template_key ? 1 : 0;
  const fromModules = bp.modules.length;
  const fromConfiguration = [
    bp.business.services.length > 0,
    bp.business.approved_claims.length > 0,
    bp.icp.length > 0,
    bp.pain.objections.length > 0,
    bp.campaigns.length > 0,
    bp.value_actions.length > 0,
    Object.keys(bp.scoring.weights).length > 0,
    bp.crm.pipeline.length > 0,
    bp.agent.tools.length > 0,
  ].filter(Boolean).length;

  const custom = customCount ?? 0;
  const reusable = fromTemplate + fromModules + fromConfiguration;
  const total = reusable + custom * 5; // one custom unit costs about five configured areas of labour
  const reusablePct = total ? Math.round((reusable / total) * 100) : 100;

  return {
    reusablePct,
    fromTemplate,
    fromModules,
    fromConfiguration,
    custom,
    note:
      custom === 0
        ? 'Entirely template, modules and configuration. This deployment is repeatable as it stands.'
        : `${custom} piece(s) of tenant-specific code. Review whether any of it should become a module.`,
  };
}

/* ───────────────────────── deployment effort ───────────────────────── */

export type DeploymentEffort = {
  count: number;
  medianMinutes: number | null;
  meanMinutes: number | null;
  meanAutomationPct: number | null;
  byTemplate: { template: string; count: number; medianMinutes: number | null }[];
  trend: 'falling' | 'flat' | 'rising' | 'unknown';
};

/**
 * Human minutes per launch, and which way the line is going.
 *
 * The trend compares the most recent third of deployments against the oldest
 * third. If it is not falling as templates improve, the templates are not
 * improving, whatever the template count says.
 */
export async function deploymentEffort(supabase: SupabaseClient): Promise<DeploymentEffort> {
  const { data } = await supabase
    .from('factory_deployments')
    .select('human_minutes, automation_pct, created_at, factory_id, factories(template_key)')
    .eq('status', 'succeeded')
    .order('created_at', { ascending: true })
    .limit(1000);

  type Row = { human_minutes: number | null; automation_pct: number | null; created_at: string; factories: { template_key: string | null } | null };
  const rows = ((data as unknown as Row[]) ?? []).filter((r) => typeof r.human_minutes === 'number');
  if (!rows.length) {
    return { count: 0, medianMinutes: null, meanMinutes: null, meanAutomationPct: null, byTemplate: [], trend: 'unknown' };
  }

  const minutes = rows.map((r) => r.human_minutes as number);
  const automation = rows.map((r) => r.automation_pct).filter((a): a is number => typeof a === 'number');

  const byTemplateMap = new Map<string, number[]>();
  for (const r of rows) {
    const key = r.factories?.template_key ?? 'none';
    const bucket = byTemplateMap.get(key) ?? [];
    if (!byTemplateMap.has(key)) byTemplateMap.set(key, bucket);
    bucket.push(r.human_minutes as number);
  }

  return {
    count: rows.length,
    medianMinutes: median(minutes),
    meanMinutes: Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length),
    meanAutomationPct: automation.length ? Math.round(automation.reduce((a, b) => a + b, 0) / automation.length) : null,
    byTemplate: [...byTemplateMap.entries()].map(([template, mins]) => ({ template, count: mins.length, medianMinutes: median(mins) })),
    trend: trendOf(minutes),
  };
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function trendOf(minutes: number[]): DeploymentEffort['trend'] {
  if (minutes.length < 6) return 'unknown';
  const third = Math.floor(minutes.length / 3);
  const oldest = median(minutes.slice(0, third)) ?? 0;
  const newest = median(minutes.slice(-third)) ?? 0;
  if (!oldest) return 'unknown';
  const change = (newest - oldest) / oldest;
  return change < -0.15 ? 'falling' : change > 0.15 ? 'rising' : 'flat';
}

/* ─────────────────────── repeated requests ─────────────────────────── */

export type ProductOpportunity = {
  requestKey: string;
  title: string;
  count: number;
  tenants: number;
  kind: string;
  status: string;
  /** The rule: once is custom, twice is a flag, three times is a module. */
  recommendation: string;
};

/** Normalize an ask so the same request from nine customers collapses to one row. */
export function normalizeRequest(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(a|an|the|can|we|i|you|please|would|like|want|need|our|my|for|to|of|with|it|is|be|able)\b/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .slice(0, 6)
    .join('-');
}

export async function logRequest(
  supabase: SupabaseClient,
  input: { tenantId?: string | null; factoryId?: string | null; title: string; detail?: string; kind?: ProductOpportunity['kind']; createdBy: string },
): Promise<void> {
  await supabase.from('factory_requests').insert({
    tenant_id: input.tenantId ?? null,
    factory_id: input.factoryId ?? null,
    request_key: normalizeRequest(input.title),
    title: input.title,
    detail: input.detail ?? null,
    kind: input.kind ?? 'capability',
    created_by: input.createdBy,
  });
}

/**
 * REPEATED REQUESTS / PRODUCT OPPORTUNITIES.
 *
 * Ranked by how many DISTINCT tenants asked, not how many rows exist: one loud
 * customer asking six times is one signal, and six customers asking once is a
 * roadmap item.
 */
export async function productOpportunities(supabase: SupabaseClient): Promise<ProductOpportunity[]> {
  const { data } = await supabase
    .from('factory_requests')
    .select('request_key, title, tenant_id, kind, status')
    .neq('status', 'declined')
    .limit(5000);

  type R = { request_key: string; title: string; tenant_id: string | null; kind: string; status: string };
  const groups = new Map<string, R[]>();
  for (const r of ((data as R[]) ?? [])) {
    const bucket = groups.get(r.request_key) ?? [];
    if (!groups.has(r.request_key)) groups.set(r.request_key, bucket);
    bucket.push(r);
  }

  return [...groups.entries()]
    .map(([requestKey, rows]) => {
      const tenants = new Set(rows.map((r) => r.tenant_id).filter(Boolean)).size;
      return {
        requestKey,
        title: rows[0].title,
        count: rows.length,
        tenants,
        kind: rows[0].kind,
        status: rows.some((r) => r.status === 'shipped') ? 'shipped' : rows[0].status,
        recommendation:
          tenants >= 3
            ? 'Three or more customers have asked. Build the module.'
            : tenants === 2
              ? 'Asked twice. Flag as potentially reusable and watch for a third.'
              : 'One customer. Custom is fine for now.',
      };
    })
    .sort((a, b) => b.tenants - a.tenants || b.count - a.count);
}

/* ──────────────────────── the capability picture ───────────────────── */

export type PlatformCapabilitySummary = {
  modules: number;
  stableModules: number;
  proposedModules: number;
  templates: number;
  stableTemplates: number;
};

export function capabilitySummary(): PlatformCapabilitySummary {
  return {
    modules: MODULES.length,
    stableModules: MODULES.filter((m) => m.status === 'stable').length,
    proposedModules: MODULES.filter((m) => m.status === 'proposed').length,
    templates: TEMPLATES.length,
    stableTemplates: TEMPLATES.filter((t) => t.channel === 'stable').length,
  };
}
