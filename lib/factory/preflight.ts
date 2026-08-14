import type { SupabaseClient } from '@supabase/supabase-js';
import type { Blueprint, FactoryRow, PreflightCheck, PreflightReport } from './types';
import { resolveModules, requiredIntegrations } from './modules';
import { integrationStatus } from './connectors';
import { checkModules, checkValueAction, type PlanRow } from './plans';
import { getValueAction } from './value-actions';
import { TOOLS } from './tools';
import { unknownVariables } from './campaigns';

/**
 * PREFLIGHT: may this blueprint go live?
 *
 * Structural validity is zod's job (lib/factory/blueprint.ts). This file asks
 * the harder question: is everything it depends on actually there. A sender
 * that does not exist, a price the AI is allowed to quote but nobody defined, a
 * calendar that is switched on and unconnected, a variable no renderer can
 * fill, a module the plan does not include, a regulated vertical nobody
 * reviewed. Each of those ships as a working-looking Factory and fails in front
 * of a prospect.
 *
 * BLOCKER VS WARNING. A blocker means ACTIVATE is not offered, full stop. A
 * warning means the Factory can go live but somebody should know. The
 * distinction is per-check and deliberate: missing lifetime value is a warning
 * because acquisition still works without it; a missing postal address is a
 * blocker because sending without one is not ours to decide.
 */

const pass = (key: string, label: string, detail: string): PreflightCheck => ({ key, label, status: 'pass', detail, blocker: false });
const warn = (key: string, label: string, detail: string): PreflightCheck => ({ key, label, status: 'warn', detail, blocker: false });
const fail = (key: string, label: string, detail: string, blocker = true): PreflightCheck => ({ key, label, status: 'fail', detail, blocker });

export type PreflightContext = {
  supabase: SupabaseClient;
  tenantId: string;
  factory: FactoryRow | null;
  blueprint: Blueprint;
  plan: PlanRow | null;
};

export async function preflight(ctx: PreflightContext): Promise<PreflightReport> {
  const { blueprint: bp } = ctx;
  const checks: PreflightCheck[] = [];

  /* ── business knowledge ── */
  const services = bp.business.services.length;
  checks.push(
    !bp.business.name
      ? fail('business.name', 'Business', 'No business name.')
      : services === 0
        ? warn('business.services', 'Business', 'No services listed. The agent will have little to talk about.')
        : pass('business', 'Business', `${bp.business.name}, ${services} service${services === 1 ? '' : 's'}.`),
  );
  checks.push(
    bp.business.approved_claims.length === 0
      ? fail('claims', 'Approved claims', 'Nothing is approved for the AI to say. It would have to improvise, and it must not.')
      : pass('claims', 'Approved claims', `${bp.business.approved_claims.length} approved, ${bp.business.prohibited_claims.length} prohibited.`),
  );

  /* ── offer and pricing ── */
  checks.push(
    !bp.offer.headline
      ? fail('offer', 'Offer', 'No offer.')
      : bp.offer.ai_may_quote_price && bp.offer.packages.every((p) => p.price_cents === null || p.price_cents === undefined)
        ? fail('offer.price', 'Offer', 'The agent is allowed to quote a price and no package carries one. It would have to invent the number.')
        : pass('offer', 'Offer', `${bp.offer.headline}${bp.offer.packages.length ? `, ${bp.offer.packages.length} package(s)` : ''}.`),
  );
  if (bp.offer.ai_may_discount) {
    checks.push(warn('offer.discount', 'Discounts', 'The agent may discount. Confirm this is intended: it is the most common way an AI commits a business to a number nobody approved.'));
  }

  /* ── ICP and economics ── */
  const icp = bp.icp[0];
  const icpSpecific = (icp?.industries.length ?? 0) + (icp?.geographies.length ?? 0) + (icp?.business_signals.length ?? 0);
  checks.push(
    icpSpecific === 0
      ? fail('icp', 'Ideal customer', 'The ICP has no industries, geographies or signals. Sourcing would return noise.')
      : pass('icp', 'Ideal customer', `${bp.icp.length} profile(s), ${icpSpecific} criteria on the primary.`),
  );
  const econ = bp.economics;
  const hasEcon = econ.avg_first_sale_cents || econ.lifetime_value_cents || econ.qualified_lead_value_cents;
  checks.push(
    hasEcon
      ? pass('economics', 'Economics', 'Customer value captured. ROI and budget are computable.')
      : warn('economics', 'Economics', 'No customer value captured. ROI, acquisition budget and the value-action ceiling will all be blank rather than wrong.'),
  );

  /* ── pain ── */
  checks.push(
    !bp.pain.primary || bp.pain.primary === 'Not captured yet.'
      ? fail('pain', 'Buying pain', 'No primary pain. Every message would be about us instead of them.', false)
      : pass('pain', 'Buying pain', `${bp.pain.objections.length} objection(s) with approved responses.`),
  );

  /* ── modules and entitlements ── */
  const mods = resolveModules(bp.modules);
  if (mods.missing.length) checks.push(fail('modules.missing', 'Modules', `Unknown module(s): ${mods.missing.join(', ')}.`));
  if (mods.needsDevelopment.length) {
    checks.push(fail('modules.gap', 'Missing capability', `Needs development: ${mods.needsDevelopment.map((g) => g.name).join(', ')}. Build the module, remove the feature, or make it a manual step.`));
  }
  if (mods.unmetRequirements.length) {
    checks.push(fail('modules.requires', 'Modules', mods.unmetRequirements.map((u) => `${u.key} needs ${u.needs}`).join('; ')));
  }
  if (mods.ok) checks.push(pass('modules', 'Modules', `${mods.resolved.length} module(s) resolved.`));

  const ent = checkModules(ctx.plan, bp.modules);
  checks.push(
    ent.allowed
      ? pass('entitlements', 'Plan', `${ctx.plan?.name ?? 'No plan'} covers every module in this blueprint.`)
      : fail('entitlements', 'Plan', `${ctx.plan?.name ?? 'This account'} does not include: ${ent.denied.join(', ')}.`),
  );

  /* ── integrations ── */
  //
  // One check per connector rather than one line listing three keys. "Not
  // connected: email_sender, telephony, payments" is true and useless: it does
  // not say what the thing is, who owns the account, or whether MMS can simply
  // provide it. Each of these now names the connector, says who connects it,
  // and carries the last real error the provider gave us.
  const needed = requiredIntegrations(bp.modules);
  if (needed.length) {
    const { views } = await integrationStatus({ supabase: ctx.supabase, tenantId: ctx.tenantId, blueprint: bp });
    for (const view of views.filter((v) => v.required)) {
      if (view.status === 'connected') {
        checks.push(pass(`integrations.${view.provider}`, view.name, view.detail ?? 'Connected.'));
        continue;
      }
      if (!view.buildable) {
        checks.push(fail(`integrations.${view.provider}`, view.name, `${view.howToConnect} ${view.buildSpec ?? ''}`.trim()));
        continue;
      }
      const who =
        view.ownership === 'platform'
          ? 'Modern Mustard Seed provides this, so it connects with one click.'
          : 'This one is the customer\'s own account.';
      checks.push(
        fail(
          `integrations.${view.provider}`,
          view.name,
          view.needsReconnect
            ? `Was working and stopped. ${view.detail ?? ''} Reconnect it.`.trim()
            : `${view.detail ?? 'Not connected.'} ${who}`,
        ),
      );
    }
  }

  /* ── the agent ── */
  const toolKeys = new Set(TOOLS.map((t) => t.key));
  const unknownTools = bp.agent.tools.filter((t) => !toolKeys.has(t));
  checks.push(
    unknownTools.length
      ? fail('agent.tools', 'Agent toolbelt', `Unknown tool(s): ${unknownTools.join(', ')}.`)
      : pass('agent.tools', 'Agent toolbelt', `${bp.agent.tools.length} authorized tool(s).`),
  );
  checks.push(
    !bp.agent.disclosure || !/\bai\b|assistant|not a (person|human)/i.test(bp.agent.disclosure)
      ? fail('agent.disclosure', 'AI disclosure', 'The agent must state that it is an AI. This is not configurable away.')
      : pass('agent.disclosure', 'AI disclosure', 'Present.'),
  );
  checks.push(
    bp.agent.escalation_to.length === 0
      ? fail('agent.escalation', 'Human handoff', 'Nobody to escalate to. Every AI conversation needs an exit to a person.')
      : pass('agent.escalation', 'Human handoff', `${bp.agent.escalation_to.length} route(s).`),
  );
  if (bp.agent.voice_enabled && bp.compliance.consent.ai_call === 'forbidden') {
    checks.push(warn('agent.voice', 'Voice', 'Voice is enabled but AI calls are forbidden by the consent settings. It can only ever call a prospect who asked.'));
  }

  /* ── campaigns ── */
  for (const [i, c] of bp.campaigns.entries()) {
    const prefix = `campaign.${i}`;
    if (!c.sequence.length) {
      checks.push(fail(`${prefix}.sequence`, `Campaign: ${c.name}`, 'No sequence steps.'));
      continue;
    }
    const bad = c.sequence.flatMap((s) => [...unknownVariables(s.subject), ...unknownVariables(s.body)]);
    if (bad.length) {
      checks.push(fail(`${prefix}.vars`, `Campaign: ${c.name}`, `Unresolvable variable(s): ${[...new Set(bad)].join(', ')}. They would render as blanks.`));
    } else {
      checks.push(pass(`${prefix}`, `Campaign: ${c.name}`, `${c.sequence.length} step(s), cap ${c.daily_send_cap}/day, every variable resolvable.`));
    }
    if (c.channel !== 'email' && bp.compliance.consent[c.channel === 'sms' ? 'sms' : 'ai_call'] === 'forbidden') {
      checks.push(fail(`${prefix}.consent`, `Campaign: ${c.name}`, `Channel "${c.channel}" is forbidden by this Factory's consent settings.`));
    }
  }

  /* ── value actions ── */
  for (const va of bp.value_actions) {
    const def = getValueAction(va.key);
    if (!def) {
      checks.push(fail(`value.${va.key}`, 'Value action', `Unknown value action "${va.key}".`));
      continue;
    }
    const allowed = checkValueAction(ctx.plan, va.key);
    checks.push(
      allowed.allowed
        ? pass(`value.${va.key}`, 'Value action', `${def.name}: ${def.blurb}`)
        : fail(`value.${va.key}`, 'Value action', allowed.reason),
    );
    if (def.costCents > 0 && va.max_cost_cents > 0 && def.costCents > va.max_cost_cents) {
      checks.push(warn(`value.${va.key}.cost`, 'Value action cost', `${def.name} costs about ${def.costCents}c per run, above the ${va.max_cost_cents}c ceiling set here.`));
    }
  }
  if (!bp.value_actions.length) {
    checks.push(warn('value', 'Value action', 'No value action. This Factory asks for a meeting without doing anything for the prospect first, which is the part that makes a Client Factory different from a mail merge.'));
  }

  /* ── CRM, calendar, checkout ── */
  checks.push(
    bp.crm.pipeline.length < 2
      ? fail('crm', 'CRM', 'A pipeline needs at least two stages.')
      : pass('crm', 'CRM', `${bp.crm.pipeline.length} stages: ${bp.crm.pipeline.join(' → ')}.`),
  );
  if (bp.scheduling.enabled) {
    checks.push(
      bp.scheduling.provider !== 'mms' && !bp.scheduling.booking_url
        ? fail('scheduling', 'Calendar', `Scheduling is on with provider "${bp.scheduling.provider}" and no booking URL.`)
        : pass('scheduling', 'Calendar', `${bp.scheduling.provider}, ${bp.scheduling.duration_min} minutes.`),
    );
  }
  if (bp.checkout.enabled) {
    checks.push(
      bp.checkout.price_refs.length === 0
        ? fail('checkout', 'Checkout', 'Checkout is on with no canonical price ids. The agent would have nothing legitimate to send.')
        : pass('checkout', 'Checkout', `${bp.checkout.price_refs.length} approved price(s).`),
    );
  }

  /* ── compliance ── */
  checks.push(
    !bp.compliance.sender_from
      ? fail('sender', 'Sender', 'No sender identity.')
      : pass('sender', 'Sender', bp.compliance.sender_from),
  );
  checks.push(
    !bp.compliance.postal_address
      ? fail('postal', 'Postal address', 'Commercial email owes the recipient a physical address. It cannot be invented.')
      : pass('postal', 'Postal address', 'Set.'),
  );
  checks.push(
    !bp.compliance.unsubscribe_url
      ? warn('unsubscribe', 'Unsubscribe', 'No unsubscribe URL configured. The platform default will be used.')
      : pass('unsubscribe', 'Unsubscribe', bp.compliance.unsubscribe_url),
  );
  if (bp.compliance.regulated_vertical) {
    checks.push(
      bp.compliance.compliance_review_by
        ? pass('compliance.review', 'Compliance review', `Reviewed by ${bp.compliance.compliance_review_by}.`)
        : fail('compliance.review', 'Compliance review', 'This is a regulated vertical. Activation needs a named compliance review first.'),
    );
  }

  /* ── the test run ── */
  if (ctx.factory) {
    const [{ count: testMessages }, { data: sims }] = await Promise.all([
      ctx.supabase
        .from('factory_messages')
        .select('id', { count: 'exact', head: true })
        .eq('factory_id', ctx.factory.id)
        .eq('is_test', true),
      ctx.supabase.from('factory_simulations').select('score').eq('factory_id', ctx.factory.id).order('created_at', { ascending: false }).limit(1),
    ]);
    checks.push(
      (testMessages ?? 0) > 0
        ? pass('test.run', 'Test run', `${testMessages} test message(s) rendered end to end.`)
        : fail('test.run', 'Test run', 'This Factory has never run in test mode. Run a test prospect before it touches a real one.'),
    );
    const simScore = (sims as { score: number }[] | null)?.[0]?.score ?? null;
    checks.push(
      simScore === null
        ? fail('test.simulation', 'AI sales readiness', 'The agent has never been simulated. Run the scenarios before it talks to anyone.', false)
        : simScore < 70
          ? fail('test.simulation', 'AI sales readiness', `Readiness ${simScore}/100. Fix the failing scenarios before activation.`)
          : pass('test.simulation', 'AI sales readiness', `${simScore}/100.`),
    );
  }

  return report(checks);
}

/** Group the checks into the areas the setup score panel shows. */
const AREAS: Record<string, string[]> = {
  Business: ['business', 'claims', 'pain'],
  'Ideal customer': ['icp', 'economics'],
  Offer: ['offer'],
  Campaign: ['campaign'],
  AI: ['agent'],
  Demo: ['value'],
  CRM: ['crm'],
  Calendar: ['scheduling'],
  Sender: ['sender', 'postal', 'unsubscribe', 'compliance'],
  Plan: ['entitlements', 'modules', 'integrations', 'checkout'],
  Test: ['test'],
};

function report(checks: PreflightCheck[]): PreflightReport {
  const scores: Record<string, number> = {};
  for (const [area, prefixes] of Object.entries(AREAS)) {
    const mine = checks.filter((c) => prefixes.some((p) => c.key === p || c.key.startsWith(`${p}.`)));
    if (!mine.length) continue;
    const points = mine.reduce((sum, c) => sum + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
    scores[area] = Math.round((points / mine.length) * 100);
  }
  const values = Object.values(scores);
  const overall = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

  return {
    ok: !checks.some((c) => c.status === 'fail' && c.blocker),
    checks,
    scores,
    overall,
    at: new Date().toISOString(),
  };
}

/** The blockers, in the order somebody should fix them. */
export function blockers(rep: PreflightReport): PreflightCheck[] {
  return rep.checks.filter((c) => c.status === 'fail' && c.blocker);
}

export function warnings(rep: PreflightReport): PreflightCheck[] {
  return rep.checks.filter((c) => c.status === 'warn' || (c.status === 'fail' && !c.blocker));
}
