import type { SupabaseClient } from '@supabase/supabase-js';
import type { Blueprint } from './types';

/**
 * THE ACQUISITION CRM.
 *
 * Every Client Factory customer gets one. Not because the world needs another
 * CRM, but because a Factory that cannot say what happened to a prospect cannot
 * prove it did anything, and requiring Salesforce before a customer can use the
 * product they just bought is a fifth of them who never launch.
 *
 * ATTRIBUTION IS FROZEN AT CREATION. An opportunity records the campaign,
 * cohort, variant, source, provider, value action and conversation that
 * produced it, at the moment it is created. Reconstructing that chain later
 * from timestamps is guesswork, and guesswork is not an ROI number.
 */

export type Opportunity = {
  id: string;
  tenant_id: string;
  factory_id: string;
  prospect_id: string | null;
  name: string;
  stage: string;
  value_cents: number | null;
  probability: number | null;
  owner: string | null;
  attribution: Attribution;
  close_reason: string | null;
  is_test: boolean;
  won_at: string | null;
  lost_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Attribution = {
  source?: string | null;
  provider?: string | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  cohort?: string | null;
  variant?: string | null;
  value_action_key?: string | null;
  value_action_run_id?: string | null;
  conversation_id?: string | null;
  first_contact_at?: string | null;
  first_engagement_at?: string | null;
  human_owner?: string | null;
};

export async function logActivity(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    factoryId: string;
    prospectId?: string | null;
    opportunityId?: string | null;
    kind: string;
    summary: string;
    detail?: Record<string, unknown>;
    actor?: string;
  },
): Promise<void> {
  await supabase.from('factory_activities').insert({
    tenant_id: input.tenantId,
    factory_id: input.factoryId,
    prospect_id: input.prospectId ?? null,
    opportunity_id: input.opportunityId ?? null,
    kind: input.kind,
    summary: input.summary,
    detail: input.detail ?? {},
    actor: input.actor ?? 'system',
  });
}

/**
 * Create an opportunity, or return the one that already exists for this
 * prospect. Called from an AI tool, which means it will be called twice: a
 * model that is unsure whether it already logged something logs it again.
 */
export async function upsertOpportunity(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    factoryId: string;
    prospectId: string;
    name: string;
    stage?: string;
    valueCents?: number | null;
    owner?: string | null;
    attribution?: Attribution;
    isTest?: boolean;
  },
): Promise<{ opportunity: Opportunity; created: boolean } | { error: string }> {
  const { data: existing } = await supabase
    .from('factory_opportunities')
    .select('*')
    .eq('tenant_id', input.tenantId)
    .eq('factory_id', input.factoryId)
    .eq('prospect_id', input.prospectId)
    .is('lost_at', null)
    .maybeSingle();
  if (existing) return { opportunity: existing as Opportunity, created: false };

  const { data, error } = await supabase
    .from('factory_opportunities')
    .insert({
      tenant_id: input.tenantId,
      factory_id: input.factoryId,
      prospect_id: input.prospectId,
      name: input.name,
      stage: input.stage ?? 'qualified',
      value_cents: input.valueCents ?? null,
      owner: input.owner ?? null,
      attribution: input.attribution ?? {},
      is_test: input.isTest ?? false,
    })
    .select('*')
    .single();
  if (error) return { error: error.message };

  await logActivity(supabase, {
    tenantId: input.tenantId,
    factoryId: input.factoryId,
    prospectId: input.prospectId,
    opportunityId: (data as Opportunity).id,
    kind: 'opportunity.created',
    summary: `Opportunity created: ${input.name}`,
    detail: { stage: input.stage ?? 'qualified' },
  });
  return { opportunity: data as Opportunity, created: true };
}

/**
 * Move an opportunity. The stage must exist in THIS Factory's pipeline: a
 * customizable pipeline is worthless if anything can write any string into it,
 * and an AI tool call is exactly what would.
 */
export async function moveStage(
  supabase: SupabaseClient,
  input: { tenantId: string; opportunityId: string; stage: string; blueprint: Blueprint; actor?: string; reason?: string },
): Promise<{ ok: true; stage: string } | { error: string }> {
  const pipeline = input.blueprint.crm.pipeline;
  if (!pipeline.includes(input.stage)) {
    return { error: `"${input.stage}" is not a stage in this pipeline (${pipeline.join(' → ')}).` };
  }

  const terminal =
    input.stage === 'won'
      ? { won_at: new Date().toISOString() }
      : input.stage === 'lost'
        ? { lost_at: new Date().toISOString(), close_reason: input.reason ?? null }
        : {};

  const { data, error } = await supabase
    .from('factory_opportunities')
    .update({ stage: input.stage, updated_at: new Date().toISOString(), ...terminal })
    .eq('id', input.opportunityId)
    .eq('tenant_id', input.tenantId)
    .select('id, factory_id, prospect_id')
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Opportunity not found.' };

  const row = data as { id: string; factory_id: string; prospect_id: string | null };
  await logActivity(supabase, {
    tenantId: input.tenantId,
    factoryId: row.factory_id,
    prospectId: row.prospect_id,
    opportunityId: row.id,
    kind: 'opportunity.stage',
    summary: `Moved to ${input.stage}`,
    detail: { reason: input.reason ?? null },
    actor: input.actor,
  });
  return { ok: true, stage: input.stage };
}

export type PipelineCounts = { stage: string; count: number; valueCents: number }[];

export async function pipelineSnapshot(
  supabase: SupabaseClient,
  tenantId: string,
  factoryId: string,
  pipeline: string[],
): Promise<PipelineCounts> {
  const { data } = await supabase
    .from('factory_opportunities')
    .select('stage, value_cents')
    .eq('tenant_id', tenantId)
    .eq('factory_id', factoryId)
    .eq('is_test', false);

  const rows = (data as { stage: string; value_cents: number | null }[]) ?? [];
  return pipeline.map((stage) => {
    const mine = rows.filter((r) => r.stage === stage);
    return {
      stage,
      count: mine.length,
      valueCents: mine.reduce((sum, r) => sum + (r.value_cents ?? 0), 0),
    };
  });
}

/** One prospect's whole story, newest first. What the operator reads before calling. */
export async function timeline(
  supabase: SupabaseClient,
  tenantId: string,
  prospectId: string,
  limit = 100,
): Promise<{ kind: string; summary: string; detail: Record<string, unknown>; actor: string | null; occurred_at: string }[]> {
  const { data } = await supabase
    .from('factory_activities')
    .select('kind, summary, detail, actor, occurred_at')
    .eq('tenant_id', tenantId)
    .eq('prospect_id', prospectId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  return (data as { kind: string; summary: string; detail: Record<string, unknown>; actor: string | null; occurred_at: string }[]) ?? [];
}
