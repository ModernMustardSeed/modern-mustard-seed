import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlueprintInput, TemplateChannel } from './types';

/**
 * THE TEMPLATE LIBRARY. Modern Mustard Seed's reusable IP.
 *
 * A template is a working Factory with every tenant-specific fact removed: the
 * structure, the sequence, the scoring shape, the agent's role, the
 * demonstration strategy, the pipeline. It is the difference between MMS
 * building an acquisition system and MMS deploying one.
 *
 * INHERITANCE BY COMPOSITION. `parent` is a single key, resolved by merging the
 * chain root-first. Objects merge, arrays and scalars replace. That rule is
 * deliberate: a child that redefines `campaigns` means "these campaigns, not the
 * parent's", while a child that sets `agent.tone` keeps everything else about
 * the agent. Fixing something in `base` therefore reaches every descendant,
 * which is the only reason a library of forty templates stays maintainable.
 *
 * RELEASE CHANNELS. internal -> beta -> stable -> deprecated. New acquisition
 * systems get proven on a small cohort before they are offered as the default
 * for a vertical, and a deprecated template keeps working for the Factories
 * already on it.
 *
 * WHAT A TEMPLATE MUST NEVER CARRY. Customer data, credentials, prospect lists,
 * private conversations, real pricing from another tenant. `stripTenantData`
 * enforces that on the SAVE AS TEMPLATE path rather than trusting whoever
 * clicked it.
 */

export type FactoryTemplate = {
  key: string;
  name: string;
  vertical: string | null;
  blurb: string;
  parent: string | null;
  channel: TemplateChannel;
  version: number;
  /** A partial blueprint. Merged over the parent chain by `composeTemplate`. */
  body: DeepPartial<BlueprintInput>;
};

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/* ───────────────────────────── the seeds ───────────────────────────── */

const BASE: FactoryTemplate = {
  key: 'base',
  name: 'Client Factory Base',
  vertical: null,
  blurb: 'The shape every Factory shares: reservoir, sequence, agent, CRM, booking, attribution.',
  parent: null,
  channel: 'stable',
  version: 1,
  body: {
    modules: [
      'data.web_research', 'data.business_search', 'data.email_verify',
      'outbound.cold_email', 'outbound.followup', 'outbound.reply_classifier',
      'ai.salesperson',
      'conversion.calendar', 'conversion.handoff',
      'ops.crm', 'ops.analytics', 'ops.attribution', 'ops.notifications',
    ],
    agent: {
      tone: 'Direct and specific. Plain sentences. No hype, no pressure, no invented urgency.',
      disclosure: 'I am an AI assistant, not a person. I can answer questions and book time with the team.',
      must_not_discuss: [
        'Anything not in the approved claims list',
        'Discounts, contract terms, or guarantees',
        'Legal, financial, medical or regulated advice',
        'Another customer of ours',
      ],
      escalation_rules: [
        'The prospect asks for something outside the approved offer',
        'The prospect asks for a discount or a non-standard term',
        'The prospect is upset, or asks for a human',
        'The prospect asks a question the business knowledge does not answer',
      ],
      qualification_questions: [
        'What are you using today for this?',
        'What made you look now?',
        'Who else would be part of the decision?',
        'What would have to be true for this to be worth doing?',
      ],
      tools: [
        'getBusinessKnowledge', 'researchProspect', 'qualifyLead',
        'createCrmLead', 'updateCrmLead', 'checkCalendar', 'bookMeeting',
        'transferToHuman', 'stopContacting',
      ],
      voice_enabled: false,
    },
    scoring: {
      weights: {
        has_website: 10,
        icp_industry_match: 25,
        icp_geo_match: 15,
        icp_size_match: 15,
        named_contact: 15,
        verified_email: 10,
        engaged_before: 20,
        no_website: -20,
        chain_or_franchise: -15,
      },
      threshold_ready: 50,
      threshold_hot: 80,
    },
    followup: { max_touches: 4, stop_on_reply: true, nurture_days: 90 },
    crm: { pipeline: ['prospect', 'contacted', 'engaged', 'qualified', 'demo', 'meeting', 'proposal', 'won', 'lost'] },
    scheduling: { enabled: true, provider: 'mms', duration_min: 30 },
    kpis: ['Qualified meetings per month', 'Reply rate', 'Demo to meeting rate', 'Cost per qualified opportunity'],
    compliance: {
      consent: { email: 'legitimate_interest', ai_call: 'forbidden', sms: 'forbidden' },
      regulated_vertical: false,
    },
  },
};

const B2B_SERVICE: FactoryTemplate = {
  key: 'b2b-service',
  name: 'B2B Service Factory',
  vertical: 'Professional services',
  blurb: 'Named-contact outbound to businesses, led by a specific observation rather than a pitch.',
  parent: 'base',
  channel: 'stable',
  version: 1,
  body: {
    modules: [
      'data.web_research', 'data.business_search', 'data.hunter', 'data.email_verify',
      'outbound.cold_email', 'outbound.followup', 'outbound.reply_classifier',
      'ai.salesperson', 'ai.objection_handler',
      'value.website_audit', 'value.personalized_report',
      'conversion.calendar', 'conversion.handoff', 'conversion.proposal',
      'ops.crm', 'ops.analytics', 'ops.attribution', 'ops.notifications',
    ],
    icp: [{ label: 'Primary', audience: 'b2b', industries: [], job_titles: ['Owner', 'Founder', 'VP', 'Director'], geographies: [] }],
    sourcing: { providers: ['web_research', 'business_search'], inventory_target: 2000, monthly_target: 800, min_score: 45, enrichment_budget_cents: 20000 },
    proposals: { enabled: true, requires_human_approval: true },
  },
};

const AGENCY_AUDIT: FactoryTemplate = {
  key: 'agency-audit',
  name: 'Agency Audit Factory',
  vertical: 'Marketing and web agencies',
  blurb: 'Find businesses with a weak public presence, audit it for real, lead with the three findings.',
  parent: 'b2b-service',
  channel: 'stable',
  version: 1,
  body: {
    value_actions: [
      { key: 'website_audit', label: 'Public website and conversion audit', config: { depth: 'full' }, max_cost_cents: 25, preemptive_score: 70, human_approval: false },
    ],
    campaigns: [
      {
        name: 'Three things costing you conversions',
        channel: 'email',
        hook: 'A specific, named problem found on their own public website, not a claim about results.',
        secondary_hook: 'What the fix is worth, using their own numbers where we have them.',
        cta: 'Want the full audit? I can send it now, no call needed.',
        value_action_key: 'website_audit',
        conversion_event: 'meeting',
        daily_send_cap: 40,
        sequence: [
          {
            step: 1, day_offset: 0, variant: 'A',
            subject: 'Three things on {{company}} that are costing conversions',
            body: 'Hi {{first_name}},\n\nI ran {{website}} through our audit this morning. Three things stood out:\n\n{{audit_top_three}}\n\nNone of them are hard to fix. I can send the full audit, no call required. Want it?\n\n{{sender_name}}',
          },
          {
            step: 2, day_offset: 3, variant: 'A',
            subject: 'The audit for {{company}}',
            body: 'Hi {{first_name}},\n\nHere is the full audit for {{website}}: {{value_action_url}}\n\nIt is yours whether or not we ever talk. If any of it is useful and you want it done rather than described, reply and I will show you what that looks like.\n\n{{sender_name}}',
          },
          {
            step: 3, day_offset: 8, variant: 'A',
            subject: 'Anything worth fixing?',
            body: 'Hi {{first_name}},\n\nDid anything in the {{company}} audit look worth fixing? If not, say so and I will close the file.\n\n{{sender_name}}',
          },
        ],
      },
    ],
    agent: { role: 'AI Growth Strategist' },
    pain: {
      primary: 'Their website gets traffic and does not convert it, and nobody in the business can say why.',
      trigger_events: ['A rebrand', 'A drop in inbound', 'A new competitor outranking them', 'A failed ad spend'],
    },
  },
};

const HOME_SERVICES: FactoryTemplate = {
  key: 'home-services',
  name: 'Home Services Factory',
  vertical: 'Home services',
  blurb: 'Local trades: missed calls, slow response, and revenue leaking out of the phone.',
  parent: 'base',
  channel: 'stable',
  version: 1,
  body: {
    modules: [
      'data.web_research', 'data.business_search', 'data.email_verify',
      'outbound.cold_email', 'outbound.followup', 'outbound.permission_request', 'outbound.reply_classifier',
      'ai.salesperson', 'ai.voice_agent',
      'value.roi_calculator', 'value.receptionist_roleplay',
      'conversion.calendar', 'conversion.checkout', 'conversion.handoff',
      'ops.crm', 'ops.analytics', 'ops.attribution', 'ops.notifications',
    ],
    icp: [{
      label: 'Local operator', audience: 'b2b',
      job_titles: ['Owner', 'General Manager', 'Operations Manager'],
      business_signals: ['20 or more Google reviews', 'No online booking', 'Single or few locations', 'Phone number published'],
      geographies: [],
    }],
    value_actions: [
      { key: 'roi_calculator', label: 'What the missed calls are worth', config: {}, max_cost_cents: 0, preemptive_score: 60, human_approval: false },
      { key: 'receptionist_roleplay', label: 'Their own AI receptionist, live on the phone', config: {}, max_cost_cents: 40, preemptive_score: null, human_approval: false },
    ],
    campaigns: [
      {
        name: 'The calls you are not catching',
        channel: 'email',
        hook: 'What their missed calls are worth per month, computed from their own job value and volume.',
        cta: 'Want to hear what a caller would hear? I can have it call you in a minute.',
        value_action_key: 'roi_calculator',
        conversion_event: 'demo_viewed',
        daily_send_cap: 60,
        sequence: [
          {
            step: 1, day_offset: 0, variant: 'A',
            subject: '{{company}}: the calls nobody is catching',
            body: 'Hi {{first_name}},\n\nMost {{industry}} shops your size miss a real share of inbound calls, and the ones missed after hours almost never call back.\n\nAt your job values that works out to roughly {{monthly_leak}} a month walking away. The math is here: {{value_action_url}}\n\nWant to hear what a caller would hear? Say yes and I will have it ring your phone.\n\n{{sender_name}}',
          },
          {
            step: 2, day_offset: 4, variant: 'A',
            subject: 'Offer still stands',
            body: 'Hi {{first_name}},\n\nThe offer stands: reply with a number and I will have your own version call you so you can hear it answer as {{company}}.\n\nNothing to install, nothing to sign.\n\n{{sender_name}}',
          },
        ],
      },
    ],
    // A demonstration call is placed only after the prospect asks for it, in writing.
    compliance: { consent: { email: 'legitimate_interest', ai_call: 'opt_in_only', sms: 'forbidden' } },
    pain: {
      primary: 'Calls come in while the crew is on a roof, and a missed call is a job that goes to whoever answers.',
      trigger_events: ['Busy season', 'Losing a dispatcher', 'A bad review about nobody answering', 'Expanding to a second truck'],
    },
    agent: { role: 'AI Front Desk Specialist', voice_enabled: true },
    scoring: { weights: { review_count_high: 20, no_online_booking: 15, single_location: 5, chain_or_franchise: -30 } },
  },
};

const ROOFING: FactoryTemplate = {
  key: 'roofing',
  name: 'Roofing Factory',
  vertical: 'Roofing',
  blurb: 'Storm-cycle roofing with a property-specific triage before the pitch.',
  parent: 'home-services',
  channel: 'beta',
  version: 1,
  body: {
    icp: [{
      label: 'Commercial and residential roofing', audience: 'b2b',
      industries: ['Roofing contractor'],
      job_titles: ['Owner', 'Operations Manager', 'Sales Manager'],
      business_signals: ['Multiple crews', 'Storm-market geography', 'Published emergency line'],
      geographies: [],
    }],
    pain: { primary: 'After a storm the phone does not stop, and the jobs go to whoever picks up first.' },
  },
};

const HVAC: FactoryTemplate = {
  key: 'hvac',
  name: 'HVAC Factory',
  vertical: 'HVAC',
  blurb: 'Seasonal demand spikes, maintenance plans, and after-hours calls.',
  parent: 'home-services',
  channel: 'beta',
  version: 1,
  body: {
    icp: [{
      label: 'Residential HVAC', audience: 'b2b',
      industries: ['HVAC contractor'],
      job_titles: ['Owner', 'Service Manager'],
      business_signals: ['Maintenance plan advertised', '24 hour service claimed', '50 or more reviews'],
      geographies: [],
    }],
    pain: { primary: 'The first hot week of the year produces a month of calls in three days, and half of them are never answered.' },
  },
};

const SAAS_DEMO: FactoryTemplate = {
  key: 'saas-demo',
  name: 'SaaS Demo Factory',
  vertical: 'Software',
  blurb: 'Configure a personalized product walkthrough from the prospect\'s own workflow, then qualify.',
  parent: 'b2b-service',
  channel: 'beta',
  version: 1,
  body: {
    modules: [
      'data.web_research', 'data.business_search', 'data.hunter', 'data.email_verify',
      'outbound.cold_email', 'outbound.followup', 'outbound.reply_classifier',
      'ai.salesperson', 'ai.objection_handler',
      'value.demo_builder', 'value.personalized_report',
      'conversion.calendar', 'conversion.checkout', 'conversion.handoff',
      'ops.crm', 'ops.analytics', 'ops.attribution', 'ops.notifications', 'ops.experiments',
    ],
    agent: { role: 'AI Product Specialist' },
    value_actions: [
      { key: 'demo_site', label: 'A demo configured around their workflow', config: { kind: 'workflow' }, max_cost_cents: 60, preemptive_score: null, human_approval: false },
    ],
    campaigns: [
      {
        name: 'Configured, not generic',
        channel: 'email',
        hook: 'A specific workflow the prospect is visibly running today, and what it would look like configured.',
        cta: 'Want me to configure it around your workflow? Takes a reply, not a call.',
        value_action_key: 'demo_site',
        conversion_event: 'demo_viewed',
        daily_send_cap: 50,
        sequence: [
          {
            step: 1, day_offset: 0, variant: 'A',
            subject: 'Configured around how {{company}} actually works',
            body: 'Hi {{first_name}},\n\n{{research_note}}\n\nRather than send a generic demo, I can configure one around that and send you the link. No call, no form.\n\nWant it?\n\n{{sender_name}}',
          },
          {
            step: 2, day_offset: 5, variant: 'A',
            subject: 'Built it anyway',
            body: 'Hi {{first_name}},\n\nBuilt it anyway: {{value_action_url}}\n\nIf the shape is wrong, tell me what is off and I will redo it.\n\n{{sender_name}}',
          },
        ],
      },
    ],
    proposals: { enabled: false, requires_human_approval: true },
    checkout: { enabled: true, provider: 'stripe' },
  },
};

const COMMERCIAL_SERVICES: FactoryTemplate = {
  key: 'commercial-services',
  name: 'Commercial Services Factory',
  vertical: 'Insurance, finance, business services',
  blurb: 'Regulated-adjacent B2B: capture need and timing, qualify, hand to a licensed human.',
  parent: 'b2b-service',
  channel: 'internal',
  version: 1,
  body: {
    agent: {
      role: 'AI Intake Specialist',
      must_not_discuss: [
        'Coverage recommendations, rates, or terms',
        'Anything that constitutes regulated professional advice',
        'Eligibility decisions',
      ],
      escalation_rules: [
        'Any question about coverage, rates, terms or eligibility',
        'Any request for advice',
        'Anything the approved claims do not cover',
      ],
    },
    // Intake only. The AI captures renewal timing and need, then a licensed
    // human takes it from there. This is why the template ships 'internal':
    // activation requires a compliance review, not just a checkbox.
    compliance: { regulated_vertical: true },
    proposals: { enabled: false, requires_human_approval: true },
    checkout: { enabled: false, provider: 'none' },
  },
};

const MMS_INTERNAL: FactoryTemplate = {
  key: 'mms-internal',
  name: 'Modern Mustard Seed Factory',
  vertical: 'AI product studio',
  blurb: 'Our own machine: permission, then Mr. Mustard calls and works as their receptionist.',
  parent: 'home-services',
  channel: 'internal',
  version: 1,
  body: {
    agent: { name: 'Mr. Mustard', role: 'AI Front Office Specialist', voice_enabled: true },
    value_actions: [
      { key: 'receptionist_roleplay', label: 'Mr. Mustard answers as their business', config: {}, max_cost_cents: 40, preemptive_score: null, human_approval: false },
      { key: 'website_audit', label: 'What their site is costing them', config: { depth: 'full' }, max_cost_cents: 25, preemptive_score: 70, human_approval: false },
    ],
    campaigns: [
      {
        name: 'Want my AI receptionist to call you?',
        channel: 'email',
        hook: 'One question, and the answer is a phone call they asked for.',
        cta: 'Reply with a number and it rings in about ten seconds.',
        value_action_key: 'receptionist_roleplay',
        conversion_event: 'demo_viewed',
        daily_send_cap: 40,
        sequence: [
          {
            step: 1, day_offset: 0, variant: 'A',
            subject: 'Want my AI receptionist to call you?',
            body: 'Hi {{first_name}},\n\nI build AI front desks for {{industry}} businesses. Rather than describe it: reply with a number and mine will call you in about ten seconds and answer as {{company}}.\n\nThat is the whole pitch.\n\n{{sender_name}}',
          },
        ],
      },
    ],
  },
};

export const TEMPLATES: FactoryTemplate[] = [
  BASE, B2B_SERVICE, AGENCY_AUDIT, HOME_SERVICES, ROOFING, HVAC, SAAS_DEMO, COMMERCIAL_SERVICES, MMS_INTERNAL,
];

const BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

export function getTemplate(key: string): FactoryTemplate | null {
  return BY_KEY.get(key) ?? null;
}

/** Templates a Factory may be built on today. `internal` is staff-only. */
export function offerableTemplates(includeInternal = false): FactoryTemplate[] {
  return TEMPLATES.filter(
    (t) => t.key !== 'base' && t.channel !== 'deprecated' && (includeInternal || t.channel !== 'internal'),
  );
}

/* ─────────────────────────── composition ───────────────────────────── */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Merge a child layer over a parent. Objects merge key by key; arrays and
 * scalars replace outright. Replacing arrays is the important half: a template
 * that declares campaigns means THOSE campaigns, and a merge that concatenated
 * them would silently ship the parent's messaging alongside the child's.
 */
export function deepMerge<T>(base: T, over: unknown): T {
  if (over === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(over)) return over as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

/** The inheritance chain, root first. Throws on a cycle rather than looping forever. */
export function templateChain(key: string): FactoryTemplate[] {
  const chain: FactoryTemplate[] = [];
  const seen = new Set<string>();
  let cursor: string | null = key;
  while (cursor) {
    if (seen.has(cursor)) throw new Error(`Template inheritance cycle at "${cursor}"`);
    seen.add(cursor);
    const t = BY_KEY.get(cursor);
    if (!t) throw new Error(`Unknown template "${cursor}"`);
    chain.unshift(t);
    cursor = t.parent;
  }
  return chain;
}

/** The fully resolved partial blueprint a template contributes. */
export function composeTemplate(key: string): DeepPartial<BlueprintInput> {
  return templateChain(key).reduce<DeepPartial<BlueprintInput>>(
    (acc, t) => deepMerge(acc as unknown as Record<string, unknown>, t.body) as DeepPartial<BlueprintInput>,
    {},
  );
}

/* ────────────────────── promotion and cloning ──────────────────────── */

/**
 * Everything that must be stripped before a working Factory becomes shared IP.
 * Structure survives, the customer does not.
 */
const TENANT_FIELDS = [
  'business', 'economics', 'compliance.postal_address', 'compliance.sender_from',
  'compliance.sender_domain', 'compliance.unsubscribe_url', 'agent.voice_assistant_id',
  'checkout.price_refs', 'crm.owner_email', 'scheduling.booking_url', 'scheduling.assign_to',
  'offer.packages', 'notes',
];

/**
 * SAVE AS TEMPLATE / CLONE FACTORY. Copies the reusable structure and refuses
 * to copy anything that identifies a customer: business facts, economics,
 * pricing, senders, assistant ids, owners, booking links, notes. What survives
 * is the workflow, the pipeline, the scoring shape, the agent's role and the
 * campaign skeleton, which is exactly the part that is worth reusing.
 */
export function stripTenantData(doc: Record<string, unknown>): DeepPartial<BlueprintInput> {
  const clone = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
  for (const path of TENANT_FIELDS) {
    const parts = path.split('.');
    let cursor: Record<string, unknown> | undefined = clone;
    for (let i = 0; i < parts.length - 1 && cursor; i++) {
      cursor = isPlainObject(cursor[parts[i]]) ? (cursor[parts[i]] as Record<string, unknown>) : undefined;
    }
    if (cursor) delete cursor[parts[parts.length - 1]];
  }

  // Sequence copy keeps the skeleton, not the words a specific customer approved.
  const campaigns = clone.campaigns;
  if (Array.isArray(campaigns)) {
    clone.campaigns = campaigns.map((c) => {
      const camp = c as Record<string, unknown>;
      const seq = Array.isArray(camp.sequence) ? camp.sequence : [];
      return {
        ...camp,
        sequence: seq.map((s) => {
          const step = s as Record<string, unknown>;
          return { step: step.step, day_offset: step.day_offset, subject: step.subject, body: step.body, variant: step.variant };
        }),
      };
    });
  }

  delete clone.template_key;
  delete clone.template_version;
  return clone as DeepPartial<BlueprintInput>;
}

/* ─────────────────────── database mirror ───────────────────────────── */

export type TemplateRow = {
  id: string;
  key: string;
  version: number;
  name: string;
  vertical: string | null;
  blurb: string | null;
  parent_key: string | null;
  body: DeepPartial<BlueprintInput>;
  channel: TemplateChannel;
  source_factory_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Push the code-defined library into the database so operations can see it,
 * gate it, and layer promoted templates beside it. Code stays the source of
 * truth for the built-ins; the table is where promoted ones live.
 */
export async function syncTemplateRegistry(supabase: SupabaseClient): Promise<number> {
  const rows = TEMPLATES.map((t) => ({
    key: t.key,
    version: t.version,
    name: t.name,
    vertical: t.vertical,
    blurb: t.blurb,
    parent_key: t.parent,
    body: t.body,
    channel: t.channel,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('factory_templates').upsert(rows, { onConflict: 'key,version' });
  if (error) {
    console.error('syncTemplateRegistry failed', error.message);
    return 0;
  }
  return rows.length;
}

/** Every template, built-ins plus anything promoted out of a real Factory. */
export async function allTemplates(supabase: SupabaseClient): Promise<TemplateRow[]> {
  const { data } = await supabase.from('factory_templates').select('*').order('key').order('version', { ascending: false });
  return (data as TemplateRow[]) ?? [];
}
