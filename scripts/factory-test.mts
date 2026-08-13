/**
 * CLIENT FACTORY UNIT TESTS. No database, no network, no model.
 *
 *   npx tsx scripts/factory-test.mts
 *
 * Everything here is a pure decision the platform makes: what a valid blueprint
 * is, how templates compose, what a promoted template is allowed to carry, which
 * signals may score a prospect, which tools an agent may hold, what the AI is
 * forbidden to say, and which changes need a human. Those are the rules a
 * customer's money and reputation ride on, so they are checked without needing
 * anything to be running.
 *
 * Companion: scripts/factory-smoke.mts, which exercises the same rules against
 * the real database, including tenant isolation.
 */

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return (async () => {
    try {
      await fn();
      passed++;
    } catch (err) {
      failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  })();
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function eq<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message} (got ${JSON.stringify(actual)}, wanted ${JSON.stringify(expected)})`);
  }
}

const { blueprintSchema, prospectKey, slugify, UNIT_COST_CENTS } = await import('@/lib/factory/types');
const { validateBlueprint, blueprintFromTemplate, emptyBlueprint, diffBlueprints, requiresApproval, summarizeDiff } = await import('@/lib/factory/blueprint');
const { composeTemplate, templateChain, deepMerge, stripTenantData, getTemplate, offerableTemplates, TEMPLATES } = await import('@/lib/factory/templates');
const { scoreProspect } = await import('@/lib/factory/prospects');
const { render, unknownVariables, classifyReply, KNOWN_VARIABLES } = await import('@/lib/factory/campaigns');
const { checkModule, checkModules, checkValueAction, limitWarnings } = await import('@/lib/factory/plans');
const { resolveModules, requiredIntegrations, capabilityMap, MODULES } = await import('@/lib/factory/modules');
const { buildAgentPrompt, agentVersion, parseReply } = await import('@/lib/factory/agent');
const { TOOLS, authorizedTools } = await import('@/lib/factory/tools');
const { getValueAction, VALUE_ACTIONS } = await import('@/lib/factory/value-actions');
const { fitScore, implementationComplexity, normalizeRequest } = await import('@/lib/factory/productization');
const { findBottleneck, findMoreLikeWinners, MIN_SAMPLE } = await import('@/lib/factory/analytics');
const { backoffMs, LANE_PRIORITY } = await import('@/lib/factory/queue');
const { redact } = await import('@/lib/factory/audit-log');
const { SCENARIOS } = await import('@/lib/factory/simulate');

/* ─────────────────────────── the blueprint ──────────────────────────── */

const goodBlueprint = () => {
  const built = blueprintFromTemplate('home-services', {
    business: {
      name: 'Acme Roofing',
      services: ['Roof replacement', 'Storm repair'],
      approved_claims: ['We have replaced roofs in this county since 2009.'],
      prohibited_claims: ['We are the cheapest.'],
    },
    offer: { headline: 'Full roof replacement, fixed price' },
    economics: { avg_first_sale_cents: 850_000, close_rate_pct: 28 },
    agent: { escalation_to: [{ label: 'Dana', email: 'dana@acme.com', when: 'Anything about price' }] },
    compliance: { sender_from: 'Dana at Acme <dana@acme.com>', postal_address: '1 Main St, Phoenix AZ' },
  }, 'Acme Roofing');
  assert(built.ok, `template blueprint should validate: ${built.ok ? '' : JSON.stringify(built.errors)}`);
  return built.doc;
};

await check('an empty blueprint validates', () => {
  const res = validateBlueprint(emptyBlueprint('Test Co'));
  assert(res.ok, res.ok ? '' : JSON.stringify(res.errors));
});

await check('a blueprint with no ICP is rejected', () => {
  const doc = { ...emptyBlueprint('Test Co'), icp: [] };
  const res = validateBlueprint(doc);
  assert(!res.ok, 'an empty ICP array must fail');
});

await check('a blueprint with no campaign is rejected', () => {
  const doc = { ...emptyBlueprint('Test Co'), campaigns: [] };
  assert(!validateBlueprint(doc).ok, 'zero campaigns must fail');
});

await check('every seeded template composes into a valid blueprint', () => {
  for (const t of offerableTemplates(true)) {
    const built = blueprintFromTemplate(t.key, {}, 'Test Co');
    assert(built.ok, `${t.key}: ${built.ok ? '' : JSON.stringify(built.errors.slice(0, 3))}`);
  }
});

await check('the AI disclosure survives composition', () => {
  const doc = goodBlueprint();
  assert(/ai|assistant|not a person/i.test(doc.agent.disclosure), 'the disclosure must state it is an AI');
});

/* ─────────────────────── template inheritance ───────────────────────── */

await check('the inheritance chain resolves root first', () => {
  eq(templateChain('roofing').map((t) => t.key), ['base', 'home-services', 'roofing'], 'roofing inherits home-services which inherits base');
});

await check('a child inherits its parent modules', () => {
  const composed = composeTemplate('roofing') as { modules?: string[] };
  assert(composed.modules?.includes('ai.voice_agent'), 'roofing should inherit the voice module from home-services');
});

await check('a child overrides rather than merges arrays', () => {
  const merged = deepMerge({ modules: ['a', 'b'] }, { modules: ['c'] });
  eq(merged, { modules: ['c'] }, 'arrays replace, so a child cannot silently ship its parent messaging');
});

await check('a scalar override wins and siblings survive', () => {
  const merged = deepMerge({ agent: { name: 'A', role: 'R' } }, { agent: { name: 'B' } });
  eq(merged, { agent: { name: 'B', role: 'R' } }, 'objects merge key by key');
});

await check('every template parent exists', () => {
  for (const t of TEMPLATES) {
    if (t.parent) assert(getTemplate(t.parent), `${t.key} names a parent "${t.parent}" that does not exist`);
  }
});

await check('templates only reference modules that exist', () => {
  const known = new Set(MODULES.map((m) => m.key));
  for (const t of TEMPLATES) {
    for (const key of (t.body.modules as string[] | undefined) ?? []) {
      assert(known.has(key), `${t.key} references unknown module ${key}`);
    }
  }
});

await check('templates only reference value actions that exist', () => {
  for (const t of TEMPLATES) {
    for (const va of (t.body.value_actions as { key: string }[] | undefined) ?? []) {
      assert(getValueAction(va.key), `${t.key} references unknown value action ${va.key}`);
    }
  }
});

/* ───────────────────── promotion strips the customer ─────────────────── */

await check('save as template strips every customer fact', () => {
  const doc = goodBlueprint() as unknown as Record<string, unknown>;
  const stripped = stripTenantData(doc) as Record<string, unknown>;
  assert(!('business' in stripped), 'business facts must not survive promotion');
  assert(!('economics' in stripped), 'economics must not survive promotion');
  assert(!('notes' in stripped), 'notes must not survive promotion');
  const compliance = stripped.compliance as Record<string, unknown>;
  assert(!compliance.sender_from, 'the sender identity must not survive promotion');
  assert(!compliance.postal_address, 'the postal address must not survive promotion');
  const offer = stripped.offer as Record<string, unknown>;
  assert(!offer.packages, 'pricing must not survive promotion');
});

await check('save as template keeps the reusable structure', () => {
  const stripped = stripTenantData(goodBlueprint() as unknown as Record<string, unknown>) as Record<string, unknown>;
  assert(Array.isArray(stripped.campaigns) && (stripped.campaigns as unknown[]).length, 'campaign structure must survive');
  assert(Array.isArray(stripped.modules) && (stripped.modules as unknown[]).length, 'the module list must survive');
  assert((stripped.crm as { pipeline: string[] }).pipeline.length >= 2, 'the pipeline must survive');
});

/* ──────────────────────────── the diff ──────────────────────────────── */

await check('a pricing change is flagged as needing approval', () => {
  const before = goodBlueprint();
  const after = { ...before, offer: { ...before.offer, ai_may_quote_price: true } };
  const changes = diffBlueprints(before, after);
  assert(requiresApproval(changes), 'a change to the offer must need approval');
});

await check('a subject-line change does not need approval', () => {
  const before = goodBlueprint();
  const after = JSON.parse(JSON.stringify(before)) as typeof before;
  after.campaigns[0].sequence[0].subject = 'A different subject';
  const changes = diffBlueprints(before, after);
  assert(changes.length > 0, 'the change should be detected');
  assert(!requiresApproval(changes), 'copy edits should not need approval');
});

await check('an approved-claims change needs approval', () => {
  const before = goodBlueprint();
  const after = JSON.parse(JSON.stringify(before)) as typeof before;
  after.business.approved_claims.push('We are the best in the state.');
  assert(requiresApproval(diffBlueprints(before, after)), 'changing what the AI may claim must need approval');
});

await check('a diff summary names the count', () => {
  const before = goodBlueprint();
  const after = { ...before, notes: 'changed' };
  assert(/1 change/.test(summarizeDiff(diffBlueprints(before, after))), 'the summary should count the changes');
});

/* ───────────────────────────── scoring ──────────────────────────────── */

await check('scoring explains itself', () => {
  const bp = goodBlueprint();
  const scored = scoreProspect(bp, { company: 'A', domain: 'a.com', contact_name: 'Dana Lee', industry: 'Roofing', signals: { review_count: 40 } });
  assert(scored.reasons.length > 0, 'a score with no reasons cannot be argued with');
  assert(scored.score > 0 && scored.score <= 100, 'the score must be clamped to 0..100');
});

await check('scoring never uses a protected attribute, even if the blueprint asks', () => {
  const bp = goodBlueprint();
  bp.scoring.weights = { ...bp.scoring.weights, age: 50, gender: 50, has_website: 10 };
  const scored = scoreProspect(bp, { company: 'A', domain: 'a.com', signals: { age: 40, gender: 'f' } });
  const used = scored.reasons.filter((r) => r.weight !== 0).map((r) => r.signal);
  assert(!used.includes('age') && !used.includes('gender'), 'protected attributes must never carry weight');
});

await check('a chain penalty lowers the score', () => {
  const bp = goodBlueprint();
  const solo = scoreProspect(bp, { company: 'A', domain: 'a.com', signals: {} });
  const chain = scoreProspect(bp, { company: 'A', domain: 'a.com', signals: { chain: true } });
  assert(chain.score < solo.score, 'a franchise where the decision is made elsewhere should score lower');
});

await check('prospect dedupe prefers domain, then email, then name', () => {
  eq(prospectKey({ domain: 'WWW.Acme.com', email: 'x@y.com', company: 'Acme' }), 'd:acme.com', 'domain wins');
  eq(prospectKey({ domain: null, email: 'X@Y.com', company: 'Acme' }), 'e:x@y.com', 'then email');
  eq(prospectKey({ company: 'Acme Roofing', city: 'Phoenix' }), 'n:acme-roofing:phoenix', 'then name and city');
});

/* ───────────────────────── personalization ──────────────────────────── */

await check('an unknown variable is caught', () => {
  eq(unknownVariables('Hi {{first_name}}, about {{owner_first}}'), ['owner_first'], 'only unknown variables are reported');
});

await check('every known variable is accepted', () => {
  const text = KNOWN_VARIABLES.map((v) => `{{${v}}}`).join(' ');
  eq(unknownVariables(text), [], 'no known variable should be flagged');
});

await check('a missing value renders empty, never as a literal token', () => {
  const out = render('Hi {{first_name}}, about {{company}}.', { company: 'Acme' });
  assert(!out.includes('{{'), 'a literal token must never reach an inbox');
  assert(out.includes('Acme'), 'a supplied value must render');
});

await check('every seeded campaign uses only resolvable variables', () => {
  for (const t of offerableTemplates(true)) {
    const built = blueprintFromTemplate(t.key, {}, 'Test Co');
    assert(built.ok, `${t.key} did not build`);
    for (const c of built.doc.campaigns) {
      for (const s of c.sequence) {
        eq(unknownVariables(`${s.subject} ${s.body}`), [], `${t.key} step ${s.step} uses an unresolvable variable`);
      }
    }
  }
});

await check('no seeded campaign copy contains an em dash', () => {
  for (const t of offerableTemplates(true)) {
    const built = blueprintFromTemplate(t.key, {}, 'Test Co');
    assert(built.ok, `${t.key} did not build`);
    for (const c of built.doc.campaigns) {
      for (const s of c.sequence) {
        assert(!`${s.subject}${s.body}`.includes('—'), `${t.key} step ${s.step} contains an em dash`);
      }
    }
  }
});

/* ──────────────────────── reply classification ──────────────────────── */

await check('an unsubscribe is recognized before anything else', () => {
  eq(classifyReply('Please remove me from your list, and how much is it?'), 'unsubscribe', 'opt-out outranks curiosity');
});
await check('a refusal with a question is still a no', () => {
  eq(classifyReply('Not interested, but what does it cost?'), 'negative', 'a no with a question attached is a no');
});
await check('a meeting request is recognized', () => {
  eq(classifyReply('Can you send some times for a call?'), 'meeting', 'booking language should route to the inbox');
});
await check('an out of office is not treated as interest', () => {
  eq(classifyReply('I am out of the office until Monday.'), 'ooo', 'auto-replies must not look like engagement');
});

/* ───────────────────── entitlements and limits ──────────────────────── */

const launchPlan = {
  code: 'launch', name: 'Launch', blurb: null,
  entitlements: { modules: ['outbound.cold_email', 'ai.salesperson'], value_actions: ['website_audit'] },
  limits: { emails_month: 100 }, setup_price_cents: null, monthly_price_cents: null,
  overage_cents: {}, managed: true, status: 'private' as const, sort_order: 1,
};

await check('a plan without a module denies it', () => {
  assert(!checkModule(launchPlan, 'ai.voice_agent').allowed, 'a module outside the plan must be denied');
  assert(checkModule(launchPlan, 'ai.salesperson').allowed, 'a module inside the plan must be allowed');
});

await check('no plan means no capability at all', () => {
  assert(!checkModule(null, 'ai.salesperson').allowed, 'a tenant with no plan can use nothing');
  assert(!checkValueAction(null, 'website_audit').allowed, 'same for value actions');
});

await check('a wildcard plan grants everything', () => {
  const enterprise = { ...launchPlan, entitlements: { modules: ['*'], value_actions: ['*'] } };
  assert(checkModule(enterprise, 'anything.at.all').allowed, 'the wildcard must grant');
});

await check('a literal asterisk in a request does not grant itself', () => {
  const narrow = { ...launchPlan, entitlements: { modules: ['ai.salesperson'] } };
  assert(!checkModule(narrow, '*').allowed, 'asking for "*" must not be granted by a non-wildcard plan');
});

await check('denied modules are reported all at once', () => {
  const res = checkModules(launchPlan, ['ai.salesperson', 'ai.voice_agent', 'conversion.checkout']);
  eq(res.denied, ['ai.voice_agent', 'conversion.checkout'], 'every denial should surface, not just the first');
});

await check('an allowance warning fires before the cap, not after', () => {
  const warnings = limitWarnings([
    { metric: 'emails_sent', limitKey: 'emails_month', limit: 100, used: 85, remaining: 15, pct: 85, exceeded: false },
  ]);
  assert(warnings.length === 1 && /85%/.test(warnings[0]), 'a customer should be warned at 80%');
});

await check('an uncapped metric is not the same as a zero cap', () => {
  const warnings = limitWarnings([
    { metric: 'emails_sent', limitKey: null, limit: null, used: 9999, remaining: null, pct: null, exceeded: false },
  ]);
  eq(warnings, [], 'an uncapped metric must never warn');
});

/* ─────────────────────────── the registries ─────────────────────────── */

await check('a proposed module is reported as needing development', () => {
  const res = resolveModules(['data.crm_import']);
  assert(!res.ok, 'a proposed module must block');
  assert(res.needsDevelopment.length === 1, 'it must be named as needing development');
  assert(res.needsDevelopment[0].buildSpec.length > 10, 'it must carry a build spec somebody can act on');
});

await check('an unknown module is reported, not ignored', () => {
  const res = resolveModules(['made.up.module']);
  eq(res.missing, ['made.up.module'], 'unknown modules must surface');
});

await check('a module requirement inside the set must be satisfied', () => {
  const res = resolveModules(['outbound.followup']);
  assert(res.unmetRequirements.length === 1, 'followup needs cold_email in the same set');
  const ok = resolveModules(['outbound.cold_email', 'outbound.followup']);
  eq(ok.unmetRequirements, [], 'with cold_email present the requirement is met');
});

await check('integration requirements are extracted', () => {
  assert(requiredIntegrations(['ai.voice_agent']).includes('telephony'), 'the voice module needs telephony connected');
});

await check('the capability map separates what exists from what does not', () => {
  const map = capabilityMap();
  assert(map.available.length > 0, 'there must be available capabilities');
  assert(map.gaps.every((g) => g.buildSpec), 'every gap must carry a build spec');
  assert(!map.available.some((a) => map.gaps.some((g) => g.key === a.key)), 'a gap must never appear as available');
});

await check('every module cost unit is a metric we actually meter', () => {
  const metrics = new Set(Object.keys(UNIT_COST_CENTS));
  for (const m of MODULES) {
    if (m.cost) assert(metrics.has(m.cost.unit), `${m.key} prices an unmetered unit "${m.cost.unit}"`);
  }
});

/* ────────────────────────── the AI salesperson ──────────────────────── */

await check('the prompt carries the disclosure and the absolute rules', () => {
  const bp = goodBlueprint();
  const prompt = buildAgentPrompt({
    factory: { id: 'f', mode: 'live' } as never,
    blueprint: bp,
    tools: [],
    prospect: { company: 'Test Co', contact_name: null, contact_title: null, industry: null, city: null, region: null, website: null },
  });
  assert(/You are an AI/i.test(prompt), 'the absolute rules must be present');
  assert(/never claim|not a person|you are an ai/i.test(prompt), 'it must be told never to claim to be human');
  assert(prompt.indexOf('ABSOLUTE RULES') > prompt.indexOf('Tone:'), 'the absolute rules come last so they are the final word');
});

await check('prohibited claims reach the prompt', () => {
  const bp = goodBlueprint();
  const prompt = buildAgentPrompt({
    factory: { id: 'f', mode: 'live' } as never,
    blueprint: bp,
    tools: [],
    prospect: { company: 'Test Co', contact_name: null, contact_title: null, industry: null, city: null, region: null, website: null },
  });
  assert(prompt.includes('We are the cheapest.'), 'a prohibited claim must be named in the prompt');
});

await check('an agent that may not quote is told so explicitly', () => {
  const bp = goodBlueprint();
  const prompt = buildAgentPrompt({
    factory: { id: 'f', mode: 'live' } as never,
    blueprint: bp,
    tools: [],
    prospect: { company: 'Test Co', contact_name: null, contact_title: null, industry: null, city: null, region: null, website: null },
  });
  assert(/may NOT quote price/.test(prompt), 'price authority must be stated, not left implicit');
});

await check('the agent version changes when the rules change', () => {
  const a = goodBlueprint();
  const b = JSON.parse(JSON.stringify(a)) as typeof a;
  b.business.approved_claims.push('Something new.');
  assert(agentVersion(a) !== agentVersion(b), 'changing what it may say must change the version');
  assert(agentVersion(a) === agentVersion(JSON.parse(JSON.stringify(a))), 'the same blueprint must give the same version');
});

await check('a tool call is parsed, prose is not', () => {
  const tool = parseReply('{"tool":"bookMeeting","args":{"starts_at":"2026-09-01T16:00:00Z"}}');
  assert(tool.kind === 'tool' && tool.tool === 'bookMeeting', 'a JSON tool call must parse');
  const prose = parseReply('Happy to help. What times work for you?');
  assert(prose.kind === 'message', 'prose must not be mistaken for a tool call');
});

await check('a fenced tool call still parses', () => {
  const parsed = parseReply('```json\n{"tool":"qualifyLead","args":{"qualified":true}}\n```');
  assert(parsed.kind === 'tool' && parsed.tool === 'qualifyLead', 'a fenced block must still parse');
});

/* ─────────────────────── tool authorization ─────────────────────────── */

await check('a tool not on the toolbelt is refused', () => {
  const bp = goodBlueprint();
  bp.agent.tools = ['bookMeeting'];
  const allowed = authorizedTools(bp, new Set(['*']));
  eq(allowed.map((t) => t.key), ['bookMeeting'], 'only toolbelt tools are available');
});

await check('pricing stays off unless the blueprint authorizes it', () => {
  const bp = goodBlueprint();
  bp.agent.tools = ['getPricing'];
  bp.offer.ai_may_quote_price = false;
  eq(authorizedTools(bp, new Set(['*'])).length, 0, 'an unauthorized agent must not hold the pricing tool');
  bp.offer.ai_may_quote_price = true;
  eq(authorizedTools(bp, new Set(['*'])).length, 1, 'authorizing it makes it available');
});

await check('checkout stays off unless checkout is enabled', () => {
  const bp = goodBlueprint();
  bp.agent.tools = ['createCheckout'];
  bp.checkout.enabled = false;
  eq(authorizedTools(bp, new Set(['*'])).length, 0, 'no checkout means no checkout tool');
});

await check('a plan without the module removes the tool', () => {
  const bp = goodBlueprint();
  bp.agent.tools = ['bookMeeting'];
  eq(authorizedTools(bp, new Set([])).length, 0, 'an unentitled module must strip its tool');
  eq(authorizedTools(bp, new Set(['conversion.calendar'])).length, 1, 'entitling it restores the tool');
});

await check('every high-risk tool is gated by something', () => {
  const bp = goodBlueprint();
  bp.agent.tools = TOOLS.map((t) => t.key);
  bp.offer.ai_may_quote_price = false;
  bp.checkout.enabled = false;
  bp.proposals.enabled = false;
  const allowed = authorizedTools(bp, new Set(['*'])).map((t) => t.key);
  for (const risky of ['getPricing', 'createCheckout', 'createProposal']) {
    assert(!allowed.includes(risky), `${risky} must be off by default`);
  }
});

await check('every base-template tool exists in the registry', () => {
  const known = new Set(TOOLS.map((t) => t.key));
  const built = blueprintFromTemplate('base', {}, 'Test Co');
  assert(built.ok, 'base must build');
  for (const key of built.doc.agent.tools) assert(known.has(key), `base names an unknown tool ${key}`);
});

/* ──────────────────────── value action safety ───────────────────────── */

await check('every value action declares its safety constraint and metric', () => {
  for (const a of VALUE_ACTIONS) {
    assert(a.safety.length > 20, `${a.key} needs a real safety constraint`);
    assert(a.successMetric.length > 5, `${a.key} needs a success metric`);
    assert(a.moduleKey.startsWith('value.'), `${a.key} must map to a value module`);
  }
});

await check('the ROI calculator refuses rather than modelling', async () => {
  const bp = goodBlueprint();
  bp.economics.avg_first_sale_cents = null;
  const action = getValueAction('roi_calculator');
  assert(action, 'the roi calculator must exist');
  const outcome = await action.run({
    supabase: null as never, tenantId: 't', factory: { id: 'f', mode: 'test' } as never, blueprint: bp,
    prospect: { id: 'p', company: 'A', website: null, domain: null, industry: null, city: null, region: null, phone: null, signals: {}, enrichment: {}, is_test: true },
    config: {},
  });
  eq(outcome.status, 'skipped', 'with no economics it must skip, not invent a number');
});

await check('the ROI calculator shows its assumptions when it does compute', async () => {
  const bp = goodBlueprint();
  const outcome = await getValueAction('roi_calculator')!.run({
    supabase: null as never, tenantId: 't', factory: { id: 'f', mode: 'test' } as never, blueprint: bp,
    prospect: { id: 'p', company: 'A', website: null, domain: null, industry: null, city: null, region: null, phone: null, signals: { missed_calls_week: 10 }, enrichment: {}, is_test: true },
    config: {},
  });
  assert(outcome.status === 'ready', 'with economics and a signal it should compute');
  assert((outcome.output.assumptions as Record<string, unknown>).source, 'the assumptions must travel with the number');
});

await check('the quote builder never invents a price', async () => {
  const bp = goodBlueprint();
  bp.offer.packages = [];
  const outcome = await getValueAction('quote_estimate')!.run({
    supabase: null as never, tenantId: 't', factory: { id: 'f', mode: 'test' } as never, blueprint: bp,
    prospect: { id: 'p', company: 'A', website: null, domain: null, industry: null, city: null, region: null, phone: null, signals: {}, enrichment: {}, is_test: true },
    config: {},
  });
  eq(outcome.status, 'skipped', 'with no priced package there is nothing to quote');
});

/* ───────────────────── simulation scenario coverage ─────────────────── */

await check('the readiness suite covers every way an agent breaks', () => {
  const keys = new Set(SCENARIOS.map((s) => s.key));
  for (const required of ['are_you_human', 'pricing', 'discount', 'forbidden_claim', 'unsupported', 'escalate', 'unsubscribe']) {
    assert(keys.has(required), `the suite must test "${required}"`);
  }
  for (const critical of ['are_you_human', 'pricing', 'discount', 'forbidden_claim', 'unsubscribe']) {
    assert(SCENARIOS.find((s) => s.key === critical)?.critical, `"${critical}" must be a critical scenario`);
  }
});

/* ──────────────────── analytics and productization ──────────────────── */

await check('the bottleneck engine names one stage, not a list', () => {
  const funnel = {
    from: '', stages: [
      { key: 'found', label: 'Found', count: 1000, rateFromPrevious: null },
      { key: 'ready', label: 'Ready', count: 600, rateFromPrevious: 60 },
      { key: 'contacted', label: 'Contacted', count: 500, rateFromPrevious: 83 },
      { key: 'engaged', label: 'Engaged', count: 5, rateFromPrevious: 1 },
      { key: 'ai', label: 'AI', count: 4, rateFromPrevious: 80 },
    ],
  };
  const bottleneck = findBottleneck(funnel);
  assert(bottleneck, 'a broken funnel must produce a verdict');
  eq(bottleneck.stage, 'engaged', 'the worst shortfall wins');
  assert(bottleneck.recommendation.length > 10, 'the verdict must come with a next move');
});

await check('a healthy funnel produces no bottleneck', () => {
  const funnel = {
    from: '', stages: [
      { key: 'found', label: 'Found', count: 100, rateFromPrevious: null },
      { key: 'ready', label: 'Ready', count: 90, rateFromPrevious: 90 },
      { key: 'contacted', label: 'Contacted', count: 85, rateFromPrevious: 95 },
      { key: 'engaged', label: 'Engaged', count: 20, rateFromPrevious: 24 },
    ],
  };
  eq(findBottleneck(funnel), null, 'nothing below benchmark means nothing to report');
});

await check('a small sample never claims a win rate', () => {
  const segments = [{ key: 'a', label: 'A', sample: MIN_SAMPLE - 1, engaged: 3, qualified: 2, won: 2, engagementRate: 30, winRate: null }];
  eq(findMoreLikeWinners(segments, 'industry'), null, 'below the sample floor there is no finding');
});

await check('find more like winners needs a real edge', () => {
  const segments = [
    { key: 'a', label: 'Roofing', sample: 100, engaged: 30, qualified: 20, won: 12, engagementRate: 30, winRate: 12 },
    { key: 'b', label: 'Plumbing', sample: 100, engaged: 10, qualified: 4, won: 1, engagementRate: 10, winRate: 1 },
  ];
  const found = findMoreLikeWinners(segments, 'industry');
  assert(found, 'a genuine edge should produce criteria');
  assert(found.criteria[0].includes('Roofing'), 'the winner should be named');
  assert(/12/.test(found.evidence), 'the evidence must carry the numbers');
});

await check('a poor fit is called poor', () => {
  const fit = fitScore({
    customerValueCents: 9_000, lifetimeValueCents: 9_000, addressableCount: 300,
    reachable: false, repeatableSale: false, demonstrable: false,
    salesCycleDays: null, regulated: false, integrationCount: 0,
  });
  eq(fit.verdict, 'poor', 'bad economics and no demonstration is a poor fit');
  assert(fit.warning?.includes('Do not sell'), 'a poor fit must say plainly not to sell it');
});

await check('a strong fit scores well and carries no warning', () => {
  const fit = fitScore({
    customerValueCents: 900_000, lifetimeValueCents: 2_400_000, addressableCount: 25_000,
    reachable: true, repeatableSale: true, demonstrable: true,
    salesCycleDays: 45, regulated: false, integrationCount: 1,
  });
  assert(fit.score >= 80, `a strong fit should score high, got ${fit.score}`);
  eq(fit.warning, null, 'a good fit needs no warning');
});

await check('a missing capability makes a deployment custom', () => {
  const bp = goodBlueprint();
  bp.modules = [...bp.modules, 'data.crm_import'];
  const complexity = implementationComplexity(bp);
  eq(complexity.level, 'custom', 'a capability that needs building is custom engineering');
});

await check('a template deployment estimates under an hour', () => {
  const complexity = implementationComplexity(goodBlueprint());
  assert(complexity.estimatedMinutes <= 120, `a standard template should be quick, estimated ${complexity.estimatedMinutes}`);
});

await check('the same request from different wording collapses to one key', () => {
  const a = normalizeRequest('Can we route Spanish calls to Maria?');
  const b = normalizeRequest('Route the Spanish calls to Maria please');
  eq(a, b, 'the same ask phrased differently must group');
});

/* ────────────────────────── infrastructure ──────────────────────────── */

await check('hot work outranks cold sourcing', () => {
  assert(LANE_PRIORITY.hot < LANE_PRIORITY.sourcing, 'a hot lead must never queue behind a sourcing run');
  assert(LANE_PRIORITY.inbound < LANE_PRIORITY.campaign, 'a reply outranks a scheduled send');
});

await check('backoff grows and is capped', () => {
  assert(backoffMs(1) < backoffMs(3), 'backoff must grow');
  assert(backoffMs(50) <= 15 * 60_000, 'backoff must be capped');
});

await check('the audit log never records a secret', () => {
  const out = redact({ apiKey: 'sk-live-abc', nested: { authToken: 'x' }, safe: 'visible' });
  eq(out.apiKey, '[redacted]', 'a key must be redacted');
  eq((out.nested as Record<string, unknown>).authToken, '[redacted]', 'nested secrets must be redacted too');
  eq(out.safe, 'visible', 'safe values survive');
});

await check('slugify is stable and bounded', () => {
  eq(slugify('Acme Roofing & Sons, LLC'), 'acme-roofing-sons-llc', 'punctuation is stripped');
  assert(slugify('x'.repeat(200)).length <= 60, 'slugs are bounded');
  eq(slugify('!!!'), 'factory', 'an empty result falls back rather than producing an empty slug');
});

await check('the blueprint schema rejects an unparseable document outright', () => {
  assert(!blueprintSchema.safeParse('not a blueprint').success, 'a string is not a blueprint');
  assert(!blueprintSchema.safeParse(null).success, 'null is not a blueprint');
});

/* ────────────────────────────── report ──────────────────────────────── */

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  FAIL  ${f}`);
  process.exit(1);
}
console.log('Client Factory unit tests green.');
