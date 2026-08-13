import type { SupabaseClient } from '@supabase/supabase-js';
import { MODULES } from './modules';
import { listValueActions } from './value-actions';
import { syncTemplateRegistry } from './templates';
import { blueprintFromTemplate } from './blueprint';
import { saveBlueprint } from './blueprint';
import { INTERNAL_TENANT_SLUG } from './tenant';
import type { FactoryRow, FactoryTenant } from './types';
import { audit } from './audit-log';

/**
 * BOOTSTRAP. Push the code-defined registries into the database and make sure
 * Modern Mustard Seed exists as tenant #1.
 *
 * DOGFOODING IS STRUCTURAL, NOT ASPIRATIONAL. MMS's own acquisition machine
 * runs as a tenant of the product it sells, on the same engine, the same
 * blueprint schema, the same compiler and the same guardrails. If our own
 * Factory needed a special path, the productization would be incomplete and we
 * would find out from a customer instead of from ourselves.
 *
 * WHAT THIS DOES NOT DO. It does not touch outbound_*, the existing Forge, the
 * demo-site worker or Mr. Mustard. The internal Factory row is the PRODUCT-side
 * representation of that machine, which is what lets the two converge over time
 * rather than requiring a migration before either works.
 *
 * Idempotent. Safe to run on every deploy.
 */

export type BootstrapResult = {
  modules: number;
  valueActions: number;
  templates: number;
  tenant: string | null;
  factory: string | null;
  created: boolean;
  notes: string[];
};

export async function bootstrapFactoryPlatform(
  supabase: SupabaseClient,
  opts: { actor?: string; createInternalFactory?: boolean } = {},
): Promise<BootstrapResult> {
  const notes: string[] = [];
  const actor = opts.actor ?? 'system';

  const moduleRows = MODULES.map((m) => ({
    key: m.key,
    name: m.name,
    category: m.category,
    blurb: m.blurb,
    config_schema: m.configSchema,
    cost_model: m.cost ?? {},
    requires: m.requires,
    risk: m.risk,
    status: m.status === 'proposed' ? 'internal' : m.status,
    build_spec: m.buildSpec ?? null,
    updated_at: new Date().toISOString(),
  }));
  const { error: moduleError } = await supabase.from('factory_modules').upsert(moduleRows, { onConflict: 'key' });
  if (moduleError) notes.push(`Module registry sync failed: ${moduleError.message}`);

  const actionRows = listValueActions().map((a) => ({
    key: a.key,
    name: a.name,
    blurb: a.blurb,
    inputs: a.inputs,
    outputs: a.outputs,
    module_key: a.moduleKey,
    industries: a.industries ?? [],
    cost_cents: a.costCents,
    risk: a.risk,
    safety: a.safety,
    success_metric: a.successMetric,
    status: a.status,
    updated_at: new Date().toISOString(),
  }));
  const { error: actionError } = await supabase.from('factory_value_actions').upsert(actionRows, { onConflict: 'key' });
  if (actionError) notes.push(`Value action registry sync failed: ${actionError.message}`);

  const templates = await syncTemplateRegistry(supabase);

  const { data: tenantRow } = await supabase
    .from('factory_tenants')
    .select('*')
    .eq('slug', INTERNAL_TENANT_SLUG)
    .maybeSingle();
  const tenant = tenantRow as FactoryTenant | null;
  if (!tenant) {
    notes.push('The internal tenant is missing. Apply migration 095 first.');
    return { modules: moduleRows.length, valueActions: actionRows.length, templates, tenant: null, factory: null, created: false, notes };
  }

  let factoryId: string | null = null;
  let created = false;
  if (opts.createInternalFactory !== false) {
    const result = await ensureInternalFactory(supabase, tenant, actor);
    factoryId = result.factoryId;
    created = result.created;
    if (result.note) notes.push(result.note);
  }

  return { modules: moduleRows.length, valueActions: actionRows.length, templates, tenant: tenant.id, factory: factoryId, created, notes };
}

/**
 * MMS's own Factory, as a product tenant.
 *
 * Its blueprint describes the machine we actually run: permission first, then
 * Mr. Mustard calls and works as their receptionist. It ships in TEST mode with
 * outreach paused, because the live sending for MMS's own acquisition already
 * happens through the outbound cockpit, and two systems mailing the same
 * prospect list is the one outcome nobody wants.
 */
async function ensureInternalFactory(
  supabase: SupabaseClient,
  tenant: FactoryTenant,
  actor: string,
): Promise<{ factoryId: string | null; created: boolean; note?: string }> {
  const { data: existing } = await supabase
    .from('factories')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('slug', 'mms-acquisition')
    .maybeSingle();
  if (existing) return { factoryId: (existing as FactoryRow).id, created: false };

  const { data: created, error } = await supabase
    .from('factories')
    .insert({
      tenant_id: tenant.id,
      name: 'MMS Acquisition',
      slug: 'mms-acquisition',
      template_key: 'mms-internal',
      template_version: 1,
      status: 'draft',
      mode: 'test',
      autonomy: 'manual',
      outreach_paused: true,
      pause_reason: 'Outreach for MMS itself runs through the outbound cockpit. This Factory is the product-side mirror.',
      goals: {},
    })
    .select('*')
    .single();
  if (error) return { factoryId: null, created: false, note: `Could not create the internal Factory: ${error.message}` };

  const factory = created as FactoryRow;
  const built = blueprintFromTemplate('mms-internal', internalOverlay(), 'Modern Mustard Seed');
  if (!built.ok) {
    return {
      factoryId: factory.id,
      created: true,
      note: `Internal Factory created, but its blueprint did not validate: ${built.errors.map((e) => `${e.path} ${e.message}`).join('; ')}`,
    };
  }

  const saved = await saveBlueprint(supabase, {
    tenantId: tenant.id,
    factoryId: factory.id,
    doc: built.doc,
    source: 'template',
    createdBy: actor,
    changeSummary: 'Initial blueprint for the MMS reference Factory.',
  });
  if ('error' in saved) return { factoryId: factory.id, created: true, note: `Blueprint save failed: ${saved.error}` };

  await audit(supabase, {
    tenantId: tenant.id,
    factoryId: factory.id,
    actor,
    actorKind: 'system',
    action: 'factory.created',
    meta: { internal: true, template: 'mms-internal' },
  });
  return { factoryId: factory.id, created: true };
}

/**
 * The facts about MMS itself.
 *
 * Every claim below is one Modern Mustard Seed already makes in public, and
 * every number is one Sarah has set. Nothing here is inferred, and the postal
 * address is deliberately read from the environment rather than written in:
 * MMS_POSTAL_ADDRESS is not set on this machine, and inventing a street address
 * to make a checklist go green is exactly the failure this platform refuses
 * everywhere else.
 */
function internalOverlay() {
  return {
    business: {
      name: 'Modern Mustard Seed',
      website: 'https://modernmustardseed.com',
      industry: 'AI product studio',
      description:
        'An AI product studio. We build voice agents, AI systems, custom software and websites at set package prices, and we hand the client an asset they own and can operate without us.',
      services: ['AI Front Office', 'Client Factory', 'Voice agents', 'Custom software', 'Websites'],
      current_lead_sources: ['Outbound', 'Referral', 'Inbound'],
      approved_claims: [
        'We build voice agents, AI systems, custom software and websites.',
        'We sell set package pricing, not hourly.',
        'Changes to what we built for you are included.',
        'You own what we build and can operate it without us.',
        'Our AI receptionist answers and books around the clock.',
      ],
      prohibited_claims: [
        'Any hourly rate, day rate or time-and-materials arrangement.',
        'Any guarantee of revenue, leads, ROI or results.',
        'Any named client we have not been given permission to name.',
      ],
    },
    offer: {
      headline: 'Idea to Product: the idea becomes a specified, built, launched and handed-off product.',
      detail: 'Four tiers: Scope and Sequence, Build and Ship, Launch, Hand Off. Set package pricing at every tier.',
      ai_may_quote_price: false,
      ai_may_discount: false,
    },
    icp: [
      {
        label: 'The second-business operator',
        industries: ['Home services', 'Professional services', 'Local business'],
        job_titles: ['Owner', 'Founder', 'General Manager'],
        business_signals: ['Already running something that works', 'No in-house engineering team', 'Phone is the main inbound channel'],
        geographies: [],
        technology_signals: [],
        exclusions: ['Franchise locations without local decision authority'],
        audience: 'b2b' as const,
      },
    ],
    pain: {
      primary: 'They already run a business that works and want a product built without hiring a team to build it.',
      secondary: 'Calls come in while they are working and the missed ones go to whoever answers.',
      trigger_events: ['Busy season', 'Losing the person who answered the phone', 'A product idea they cannot start', 'Growth that outran the systems'],
      objections: [
        { objection: 'We already have someone who does our website.', response: 'Good. This is not a website. It is the system that answers, qualifies and books while you are working.' },
        { objection: 'How much?', response: 'Set package pricing by tier. I will have Sarah send the exact package that fits what you described.' },
        { objection: 'We tried AI and it was useless.', response: 'Most of it is. Rather than argue, I can have it call you and answer as your business so you can hear it.' },
      ],
    },
    agent: {
      name: 'Mr. Mustard',
      role: 'AI Front Office Specialist',
      escalation_to: [{ label: 'Sarah', email: 'sarah@modernmustardseed.com', when: 'Pricing, scope, anything outside the approved claims' }],
    },
    crm: { owner_email: 'sarah@modernmustardseed.com' },
    compliance: {
      sender_from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      sender_domain: 'modernmustardseed.com',
      unsubscribe_url: 'https://modernmustardseed.com/api/outreach/unsubscribe',
      postal_address: process.env.MMS_POSTAL_ADDRESS?.trim() || null,
      consent: { email: 'legitimate_interest' as const, ai_call: 'opt_in_only' as const, sms: 'forbidden' as const },
    },
    notes:
      'The reference tenant. Outreach is paused here because MMS itself sends through the outbound cockpit; this Factory exists so the product is exercised by the company that sells it.',
  };
}
