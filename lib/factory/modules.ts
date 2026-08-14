/**
 * THE MODULE LIBRARY. Reusable capability, declared once.
 *
 * Everything a Client Factory can do sits at one of four levels:
 *
 *   LEVEL 1  CONFIGURATION   a field in the blueprint. No code.
 *   LEVEL 2  MODULE          this file. Reusable across every tenant.
 *   LEVEL 3  TEMPLATE        modules + configuration for a vertical.
 *   LEVEL 4  CUSTOM          engineering, tracked in factory_custom_code.
 *
 * A new customer requirement is answered at the HIGHEST level that fits, and
 * the honest test for whether this productization is working is the ratio: what
 * share of a live Factory came from levels 1 to 3. lib/factory/productization.ts
 * computes it.
 *
 * A module declares what it is, what it costs, what it needs, and how to check
 * that it is working. It does not declare how a particular customer uses it:
 * that is `config`, validated against `configSchema` at deploy time.
 *
 * MISSING CAPABILITY IS A FIRST-CLASS STATE. `status: 'proposed'` means the
 * Factory Forge and the System Designer may reference it, clearly marked NEEDS
 * DEVELOPMENT, and a blueprint that depends on it will not deploy. Pretending a
 * capability exists is the one failure mode that reaches a customer.
 */

export type ModuleCategory = 'data' | 'outbound' | 'ai' | 'value' | 'conversion' | 'ops';

export type FactoryModule = {
  key: string;
  name: string;
  category: ModuleCategory;
  blurb: string;
  /** Shape of the per-tenant config. Field name -> what it is. Kept human-readable on purpose. */
  configSchema: Record<string, string>;
  /** What one run costs MMS. Unit names match UsageMetric in types.ts. */
  cost: { unit: string; cents: number } | null;
  /** Integration providers or other modules that must be present. */
  requires: string[];
  risk: 'low' | 'medium' | 'high';
  status: 'internal' | 'beta' | 'stable' | 'deprecated' | 'proposed';
  /** Filled in for `proposed`: what building it would take. Becomes a dev task. */
  buildSpec?: string;
};

export const MODULES: FactoryModule[] = [
  /* ── DATA ───────────────────────────────────────────────────────────── */
  {
    key: 'data.web_research',
    name: 'Public Web Research',
    category: 'data',
    blurb: 'Reads a prospect\'s own public website and pulls the facts a message can legitimately reference.',
    configSchema: { max_pages: 'How many pages to read per prospect (1-8)' },
    cost: { unit: 'enrichment_calls', cents: 2 },
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'data.business_search',
    name: 'Business Search',
    category: 'data',
    blurb: 'Finds businesses matching an ICP from public business directories.',
    configSchema: { providers: 'Ordered provider list', radius_miles: 'Search radius when geographic' },
    cost: { unit: 'prospects_sourced', cents: 1 },
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'data.hunter',
    name: 'Hunter Enrichment',
    category: 'data',
    blurb: 'Finds and verifies a named contact at a domain.',
    configSchema: { confidence_min: 'Reject results below this confidence (0-100)' },
    cost: { unit: 'hunter_lookups', cents: 4 },
    requires: ['hunter'],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'data.email_verify',
    name: 'Email Verification',
    category: 'data',
    blurb: 'Checks an address is deliverable before it costs sender reputation.',
    configSchema: { reject_catchall: 'Drop catch-all domains (true/false)' },
    cost: { unit: 'email_verifications', cents: 1 },
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'data.csv_import',
    name: 'List Import',
    category: 'data',
    blurb: 'Customer-supplied lists: mapping, dedupe, validation and suppression on the way in.',
    configSchema: { dedupe_on: 'domain | email | name_city' },
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'data.crm_import',
    name: 'CRM Import',
    category: 'data',
    blurb: 'Pulls existing companies and contacts out of a connected CRM so nothing is retyped.',
    configSchema: { provider: 'hubspot | pipedrive | csv' },
    cost: null,
    requires: ['crm'],
    risk: 'medium',
    status: 'proposed',
    buildSpec: 'Connector-backed import against the CRM connector registry. Needs OAuth app per provider.',
  },

  /* ── OUTBOUND ───────────────────────────────────────────────────────── */
  {
    key: 'outbound.cold_email',
    name: 'Cold Email',
    category: 'outbound',
    blurb: 'Sequenced, personalized email with suppression, unsubscribe and a send governor.',
    configSchema: { daily_cap: 'Sends per day', from: 'Sender identity', warmup_days: 'Ramp period' },
    cost: { unit: 'emails_sent', cents: 1 },
    requires: ['email_sender'],
    risk: 'medium',
    status: 'stable',
  },
  {
    key: 'outbound.followup',
    name: 'Follow-Up',
    category: 'outbound',
    blurb: 'Timed follow-up that stops the moment a prospect replies.',
    configSchema: { max_touches: 'Touches before nurture', stop_on_reply: 'true/false' },
    cost: { unit: 'emails_sent', cents: 1 },
    requires: ['outbound.cold_email'],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'outbound.permission_request',
    name: 'Permission Request',
    category: 'outbound',
    blurb: 'Asks before anything that needs consent, and records the answer as evidence.',
    configSchema: { channel: 'ai_call | sms', expiry_days: 'How long a grant stands' },
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'outbound.reply_classifier',
    name: 'Reply Classification',
    category: 'outbound',
    blurb: 'Reads inbound replies and routes them: interested, question, pricing, wrong person, unsubscribe.',
    configSchema: { auto_suppress_negative: 'true/false' },
    cost: { unit: 'ai_conversations', cents: 1 },
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'outbound.sms',
    name: 'SMS Outreach',
    category: 'outbound',
    blurb: 'Opt-in SMS only. Refuses to send without a recorded consent grant.',
    configSchema: { messaging_service: 'Provider service id' },
    cost: { unit: 'emails_sent', cents: 2 },
    requires: ['telephony'],
    risk: 'high',
    status: 'beta',
  },

  /* ── AI ─────────────────────────────────────────────────────────────── */
  {
    key: 'ai.salesperson',
    name: 'AI Salesperson',
    category: 'ai',
    blurb: 'The customer-specific sales representative: knowledge, qualification, toolbelt, escalation.',
    configSchema: { name: 'Agent name', role: 'Their job title', tools: 'Authorized tool keys' },
    cost: { unit: 'ai_conversations', cents: 3 },
    requires: [],
    risk: 'medium',
    status: 'stable',
  },
  {
    key: 'ai.voice_agent',
    name: 'AI Voice Agent',
    category: 'ai',
    blurb: 'The salesperson on the phone. Permission-first: it never places an unsolicited AI cold call.',
    configSchema: { voice: 'Voice id', assistant_id: 'Provider assistant id' },
    cost: { unit: 'voice_minutes', cents: 9 },
    requires: ['telephony'],
    risk: 'high',
    status: 'stable',
  },
  {
    key: 'ai.multilingual',
    name: 'Multilingual',
    category: 'ai',
    blurb: 'The agent answers in the prospect\'s language and routes by language.',
    configSchema: { languages: 'Language codes', route_by_language: 'lang -> teammate email' },
    cost: null,
    requires: ['ai.salesperson'],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'ai.objection_handler',
    name: 'Objection Handler',
    category: 'ai',
    blurb: 'Answers the objections the customer actually gets, in their approved words.',
    configSchema: { objections: 'objection -> approved response' },
    cost: null,
    requires: ['ai.salesperson'],
    risk: 'medium',
    status: 'stable',
  },

  /* ── VALUE ACTIONS ──────────────────────────────────────────────────── */
  {
    key: 'value.website_audit',
    name: 'Website Audit',
    category: 'value',
    blurb: 'Grades a prospect\'s own public site and names the specific things costing them.',
    configSchema: { depth: 'quick | full', brand: 'Whose brand the report carries' },
    cost: { unit: 'value_actions', cents: 6 },
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'value.roi_calculator',
    name: 'ROI Calculator',
    category: 'value',
    blurb: 'Turns the customer\'s own economics into a number for this specific prospect.',
    configSchema: { model: 'Which leak model', inputs: 'Which prospect fields feed it' },
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'value.personalized_report',
    name: 'Personalized Report',
    category: 'value',
    blurb: 'A grounded, prospect-specific written analysis. Findings only, never invention.',
    configSchema: { sections: 'Report sections', tone: 'Voice of the report' },
    cost: { unit: 'value_actions', cents: 6 },
    requires: ['data.web_research'],
    risk: 'medium',
    status: 'stable',
  },
  {
    key: 'value.quote_builder',
    name: 'Quote Builder',
    category: 'value',
    blurb: 'Composes an estimate from the customer\'s canonical packages. Never invents a price.',
    configSchema: { rounding: 'Rounding rule', require_approval: 'true/false' },
    cost: null,
    requires: [],
    risk: 'medium',
    status: 'stable',
  },
  {
    key: 'value.demo_builder',
    name: 'Demo Builder',
    category: 'value',
    blurb: 'Builds a prospect-specific demo asset and hosts it at a link they can open.',
    configSchema: { kind: 'site | workflow | environment', brief: 'What to build' },
    cost: { unit: 'forge_runs', cents: 25 },
    requires: ['forge_worker'],
    risk: 'medium',
    status: 'stable',
  },
  {
    key: 'value.receptionist_roleplay',
    name: 'Receptionist Roleplay',
    category: 'value',
    blurb: 'Stands up a working AI receptionist for the prospect\'s own business and lets them call it.',
    configSchema: { greeting: 'Opening line', services: 'What it can talk about' },
    cost: { unit: 'forge_runs', cents: 25 },
    requires: ['telephony', 'ai.voice_agent'],
    risk: 'medium',
    status: 'stable',
  },

  /* ── CONVERSION ─────────────────────────────────────────────────────── */
  {
    key: 'conversion.calendar',
    name: 'Calendar Booking',
    category: 'conversion',
    blurb: 'Real availability, a held slot, and a CRM record of it.',
    configSchema: { duration_min: 'Meeting length', provider: 'mms | google | outlook' },
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'conversion.checkout',
    name: 'Checkout',
    category: 'conversion',
    blurb: 'Sends a payment link built from canonical prices, and attributes the purchase.',
    configSchema: { provider: 'stripe | external', price_refs: 'Allowed price ids' },
    cost: null,
    requires: ['payments'],
    risk: 'high',
    status: 'stable',
  },
  {
    key: 'conversion.proposal',
    name: 'Proposal',
    category: 'conversion',
    blurb: 'Generates a proposal for human approval. The AI never commits terms by itself.',
    configSchema: { template: 'Proposal template', approver: 'Who signs off' },
    cost: null,
    requires: [],
    risk: 'high',
    status: 'stable',
  },
  {
    key: 'conversion.handoff',
    name: 'Human Handoff',
    category: 'conversion',
    blurb: 'Knows when to stop and who to hand to, by rule rather than by vibe.',
    configSchema: { rules: 'When to escalate', targets: 'Who receives it' },
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },

  /* ── OPS ────────────────────────────────────────────────────────────── */
  {
    key: 'ops.crm',
    name: 'Acquisition CRM',
    category: 'ops',
    blurb: 'Companies, contacts, opportunities, stages and a full timeline. No Salesforce required.',
    configSchema: { pipeline: 'Stage names in order' },
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'ops.analytics',
    name: 'Analytics',
    category: 'ops',
    blurb: 'Funnel, conversion rates, and the bottleneck engine.',
    configSchema: {},
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'ops.attribution',
    name: 'Attribution',
    category: 'ops',
    blurb: 'Every customer keeps the whole chain that produced them, so ROI is a fact.',
    configSchema: {},
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'ops.notifications',
    name: 'Notifications',
    category: 'ops',
    blurb: 'Tells a human about the things a human should see, and nothing else.',
    configSchema: { hot_lead_to: 'Who hears about a hot lead' },
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },
  {
    key: 'ops.experiments',
    name: 'Experiments',
    category: 'ops',
    blurb: 'One variable at a time, cohorted, with an honest verdict including "inconclusive".',
    configSchema: { min_sample: 'Smallest sample that may declare a winner' },
    cost: null,
    requires: [],
    risk: 'low',
    status: 'stable',
  },
];

const BY_KEY = new Map(MODULES.map((m) => [m.key, m]));

export function getModule(key: string): FactoryModule | null {
  return BY_KEY.get(key) ?? null;
}

export function modulesByCategory(): Record<ModuleCategory, FactoryModule[]> {
  const out = { data: [], outbound: [], ai: [], value: [], conversion: [], ops: [] } as Record<
    ModuleCategory,
    FactoryModule[]
  >;
  for (const m of MODULES) out[m.category].push(m);
  return out;
}

/** Modules that exist and may be composed today. */
export function availableModules(): FactoryModule[] {
  return MODULES.filter((m) => m.status !== 'proposed' && m.status !== 'deprecated');
}

/**
 * THE CAPABILITY MAP. What MMS can actually do, machine-readable.
 *
 * The Forge and the System Designer compose from this and nothing else. Asking
 * for something outside it does not produce a quiet approximation; it produces a
 * MISSING CAPABILITY with a build spec, which is a decision Sarah gets to make
 * rather than a surprise a customer finds.
 */
export type CapabilityGap = { key: string; name: string; buildSpec: string };

export function capabilityMap(): {
  available: { key: string; name: string; category: ModuleCategory }[];
  gaps: CapabilityGap[];
} {
  return {
    available: availableModules().map((m) => ({ key: m.key, name: m.name, category: m.category })),
    gaps: MODULES.filter((m) => m.status === 'proposed').map((m) => ({
      key: m.key,
      name: m.name,
      buildSpec: m.buildSpec ?? 'Not specified.',
    })),
  };
}

/**
 * Resolve a module list into what can run, what is missing, and what a missing
 * piece would take to build. Callers must treat a non-empty `missing` as a
 * blocker, not a warning.
 */
export function resolveModules(keys: string[]): {
  ok: boolean;
  resolved: FactoryModule[];
  missing: string[];
  needsDevelopment: CapabilityGap[];
  unmetRequirements: { key: string; needs: string }[];
} {
  const resolved: FactoryModule[] = [];
  const missing: string[] = [];
  const needsDevelopment: CapabilityGap[] = [];
  for (const key of keys) {
    const m = BY_KEY.get(key);
    if (!m) {
      missing.push(key);
      continue;
    }
    if (m.status === 'proposed') {
      needsDevelopment.push({ key: m.key, name: m.name, buildSpec: m.buildSpec ?? 'Not specified.' });
      continue;
    }
    resolved.push(m);
  }

  // A module requirement that names another module must be satisfied inside the
  // same set. A requirement that names an integration is checked at preflight
  // against factory_integrations, because only then is there a tenant to check.
  const present = new Set(resolved.map((m) => m.key));
  const unmetRequirements: { key: string; needs: string }[] = [];
  for (const m of resolved) {
    for (const need of m.requires) {
      if (need.includes('.') && !present.has(need)) unmetRequirements.push({ key: m.key, needs: need });
    }
  }

  return {
    ok: missing.length === 0 && needsDevelopment.length === 0 && unmetRequirements.length === 0,
    resolved,
    missing,
    needsDevelopment,
    unmetRequirements,
  };
}

/** Integration providers a module set needs connected before it can run. */
export function requiredIntegrations(keys: string[]): string[] {
  const out = new Set<string>();
  for (const key of keys) {
    const m = BY_KEY.get(key);
    if (!m) continue;
    for (const need of m.requires) if (!need.includes('.')) out.add(need);
  }
  return [...out];
}
