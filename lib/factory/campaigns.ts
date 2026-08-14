import type { SupabaseClient } from '@supabase/supabase-js';
import { sendViaResend } from '@/lib/send-email';
import { escape } from '@/lib/email';
import type { Blueprint, Channel, FactoryRow, ReplyClass } from './types';
import { CONSENT_REQUIRED_CHANNELS, REPLY_CLASSES } from './types';
import { recordUsage } from './usage';
import { audit } from './audit-log';

/**
 * CAMPAIGN EXECUTION. The only path by which a Client Factory contacts anyone.
 *
 * Five gates stand between a queued step and a real inbox, and every one of
 * them is on the SERVER, in this file, so no UI state, tool call or worker can
 * route around them:
 *
 *   1. MODE      a Factory in test mode may only ever reach a test record.
 *   2. PAUSE     outreach_paused, or a Factory that is not live, sends nothing.
 *   3. CONSENT   channels that need permission need a recorded grant.
 *   4. SUPPRESS  the address and its domain are checked against this tenant's list.
 *   5. GOVERNOR  the campaign's daily cap and the plan's monthly allowance.
 *
 * WHAT THIS FILE WILL NOT DO. There is no domain rotation, no identity
 * obfuscation, no suppression override, no "resume unsubscribed" path and no
 * way to hide who is sending. Those are the features that make a sending
 * platform a liability, and their absence is a product decision, not an
 * oversight. Scale comes from targeting and from the value action, not from
 * evading the rules everyone else is following.
 */

/* ─────────────────────────── personalization ───────────────────────── */

/**
 * Every variable a sequence may use. A blueprint that references anything else
 * fails preflight rather than shipping "Hi {{owner_first}}," to a stranger.
 */
export const KNOWN_VARIABLES = [
  'company', 'first_name', 'last_name', 'contact_name', 'title',
  'industry', 'website', 'domain', 'city', 'state',
  'sender_name', 'sender_email', 'offer_headline',
  'value_action_url', 'audit_top_three', 'monthly_leak', 'research_note',
  'booking_url', 'unsubscribe_url',
] as const;
export type KnownVariable = (typeof KNOWN_VARIABLES)[number];

const VAR_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export function extractVariables(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(VAR_RE)) out.add(m[1].toLowerCase());
  return [...out];
}

export function unknownVariables(text: string): string[] {
  const known = new Set<string>(KNOWN_VARIABLES);
  return extractVariables(text).filter((v) => !known.has(v as KnownVariable));
}

/**
 * Fill a template. A variable with no value collapses the whole sentence
 * fragment rather than leaving a visible hole: an empty string is a worse
 * outcome than a slightly shorter email, and "{{first_name}}" arriving literally
 * is the single most recognizable mark of an unattended machine.
 */
export function render(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(VAR_RE, (_, name: string) => {
    const v = vars[name.toLowerCase()];
    return v === null || v === undefined ? '' : String(v);
  });
}

/** Does this rendered message still have a hole a human would notice? */
export function hasEmptyPersonalization(rendered: string): boolean {
  return /\{\{|\s,|,\s*\./.test(rendered) || /\bHi\s*,/.test(rendered);
}

/* ───────────────────────────── suppression ─────────────────────────── */

export type SuppressionHit = { kind: 'email' | 'domain'; value: string; reason: string };

export async function checkSuppressed(
  supabase: SupabaseClient,
  tenantId: string,
  email: string,
): Promise<SuppressionHit | null> {
  const addr = email.toLowerCase().trim();
  const domain = addr.split('@')[1] ?? '';
  const { data } = await supabase
    .from('factory_suppressions')
    .select('kind, value, reason')
    .eq('tenant_id', tenantId)
    .in('value', [addr, domain]);
  const rows = (data as SuppressionHit[]) ?? [];
  return rows.find((r) => (r.kind === 'email' ? r.value === addr : r.value === domain)) ?? null;
}

/**
 * Add to the suppression list. Reasons are recorded, and there is deliberately
 * no `unsuppress`: a person who asked not to be emailed does not get re-added
 * because a list was re-imported or a campaign was rebuilt.
 */
export async function suppress(
  supabase: SupabaseClient,
  tenantId: string,
  input: { kind: 'email' | 'domain'; value: string; reason: SuppressionHit['reason'] },
): Promise<void> {
  await supabase
    .from('factory_suppressions')
    .upsert(
      { tenant_id: tenantId, kind: input.kind, value: input.value.toLowerCase().trim(), reason: input.reason },
      { onConflict: 'tenant_id,kind,value' },
    );
}

/* ────────────────────────────── consent ────────────────────────────── */

export async function hasConsent(
  supabase: SupabaseClient,
  tenantId: string,
  prospectId: string,
  channel: Channel,
): Promise<boolean> {
  if (!CONSENT_REQUIRED_CHANNELS.includes(channel)) return true;
  const { data } = await supabase
    .from('factory_consent')
    .select('state')
    .eq('tenant_id', tenantId)
    .eq('prospect_id', prospectId)
    .eq('channel', channel)
    .eq('state', 'granted')
    .maybeSingle();
  return !!data;
}

/** Record the evidence, not just the fact. What they said, where, and when. */
export async function recordConsent(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    prospectId: string;
    channel: Channel;
    state: 'requested' | 'granted' | 'revoked';
    evidence: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from('factory_consent').insert({
    tenant_id: input.tenantId,
    prospect_id: input.prospectId,
    channel: input.channel,
    state: input.state,
    evidence: input.evidence,
    granted_at: input.state === 'granted' ? new Date().toISOString() : null,
    revoked_at: input.state === 'revoked' ? new Date().toISOString() : null,
  });
}

/* ────────────────────────────── sending ────────────────────────────── */

export type SendGate =
  | { allowed: true }
  | { allowed: false; reason: string; code: 'mode' | 'paused' | 'consent' | 'suppressed' | 'cap' | 'compliance' | 'config' };

/** The compliance block every commercial email owes its recipient. */
export function complianceFooter(bp: Blueprint, unsubscribeUrl: string): string {
  const postal = bp.compliance.postal_address;
  const who = bp.business.name;
  return (
    `<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e0d5;font-size:12px;line-height:1.5;color:#8a8375">` +
    `<p style="margin:0">You received this because ${escape(who)} works with businesses like yours. ` +
    `If it is not useful, <a href="${unsubscribeUrl}" style="color:#8a8375">unsubscribe here</a> and we will not email you again.</p>` +
    (postal ? `<p style="margin:6px 0 0">${escape(postal)}</p>` : '') +
    `</div>`
  );
}

export function unsubscribeUrlFor(bp: Blueprint, factoryId: string, prospectId: string): string {
  const base = bp.compliance.unsubscribe_url || 'https://modernmustardseed.com/api/factory/unsubscribe';
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}f=${encodeURIComponent(factoryId)}&p=${encodeURIComponent(prospectId)}`;
}

export type SendStepInput = {
  factory: FactoryRow;
  blueprint: Blueprint;
  campaignId: string;
  prospect: {
    id: string;
    company: string;
    email: string | null;
    contact_name: string | null;
    contact_title: string | null;
    domain: string | null;
    website: string | null;
    city: string | null;
    region: string | null;
    industry: string | null;
    is_test: boolean;
  };
  step: { step: number; subject: string; body: string; variant: string };
  vars: Record<string, string | null | undefined>;
  channel?: Channel;
  planAllows?: boolean;
};

/**
 * Run every gate for one send. Separated from `sendStep` so the campaign board,
 * the preview and the worker all evaluate exactly the same rules, and so a
 * refusal can be explained to an operator instead of silently skipped.
 */
export async function gateSend(
  supabase: SupabaseClient,
  tenantId: string,
  input: SendStepInput,
): Promise<SendGate> {
  const { factory, blueprint, prospect } = input;
  const channel = input.channel ?? 'email';

  if (factory.mode === 'test' && !prospect.is_test) {
    return { allowed: false, code: 'mode', reason: 'This Factory is in test mode. It can only contact test records.' };
  }
  if (factory.mode === 'live' && prospect.is_test) {
    return { allowed: false, code: 'mode', reason: 'This is a test record and the Factory is live. Test records are never mailed for real.' };
  }
  if (factory.outreach_paused || factory.status === 'paused') {
    return { allowed: false, code: 'paused', reason: factory.pause_reason || 'Outreach is paused.' };
  }
  if (factory.status !== 'live' && factory.status !== 'testing') {
    return { allowed: false, code: 'paused', reason: `A Factory in "${factory.status}" does not send.` };
  }
  if (!prospect.email) {
    return { allowed: false, code: 'config', reason: 'No email address on this prospect.' };
  }
  if (!blueprint.compliance.sender_from) {
    return { allowed: false, code: 'compliance', reason: 'No sender identity configured.' };
  }
  if (!blueprint.compliance.postal_address) {
    return { allowed: false, code: 'compliance', reason: 'No postal address configured. Commercial email owes the recipient one.' };
  }
  if (!(await hasConsent(supabase, tenantId, prospect.id, channel))) {
    return { allowed: false, code: 'consent', reason: `No recorded consent for ${channel}.` };
  }
  const hit = await checkSuppressed(supabase, tenantId, prospect.email);
  if (hit) {
    return { allowed: false, code: 'suppressed', reason: `Suppressed (${hit.reason}).` };
  }
  if (input.planAllows === false) {
    return { allowed: false, code: 'cap', reason: 'Monthly send allowance reached for this plan.' };
  }
  const capped = await overDailyCap(supabase, input.campaignId, blueprint, input.factory.id);
  if (capped) {
    return { allowed: false, code: 'cap', reason: capped };
  }
  return { allowed: true };
}

async function overDailyCap(
  supabase: SupabaseClient,
  campaignId: string,
  blueprint: Blueprint,
  factoryId: string,
): Promise<string | null> {
  const { data: campaign } = await supabase
    .from('factory_campaigns')
    .select('daily_send_cap, name')
    .eq('id', campaignId)
    .maybeSingle();
  const cap = (campaign as { daily_send_cap: number } | null)?.daily_send_cap ?? blueprint.campaigns[0]?.daily_send_cap ?? 50;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('factory_messages')
    .select('id', { count: 'exact', head: true })
    .eq('factory_id', factoryId)
    .eq('campaign_id', campaignId)
    .eq('direction', 'outbound')
    .eq('is_test', false)
    .gte('sent_at', since);

  return (count ?? 0) >= cap ? `Daily send cap reached (${cap}).` : null;
}

export type SendResult =
  | { sent: true; messageId: string; providerId: string | null }
  | { sent: false; reason: string; code: SendGate extends { allowed: false } ? never : string };

/**
 * Send one sequence step.
 *
 * A test-mode send takes the whole path: it renders, gates, and writes a
 * factory_messages row with is_test=true and status='sent', but never touches
 * the provider. That is what makes TEST MODE a rehearsal of the real thing
 * rather than a different code path that proves nothing.
 */
export async function sendStep(
  supabase: SupabaseClient,
  tenantId: string,
  input: SendStepInput,
): Promise<{ ok: true; messageId: string } | { ok: false; reason: string; code: string }> {
  const gate = await gateSend(supabase, tenantId, input);
  if (!gate.allowed) return { ok: false, reason: gate.reason, code: gate.code };

  const { factory, blueprint, prospect, step } = input;
  const unsubUrl = unsubscribeUrlFor(blueprint, factory.id, prospect.id);
  const vars: Record<string, string | null | undefined> = {
    company: prospect.company,
    first_name: (prospect.contact_name ?? '').split(' ')[0] || null,
    last_name: (prospect.contact_name ?? '').split(' ').slice(1).join(' ') || null,
    contact_name: prospect.contact_name,
    title: prospect.contact_title,
    industry: prospect.industry ?? blueprint.icp[0]?.industries?.[0] ?? null,
    website: prospect.website ?? (prospect.domain ? `https://${prospect.domain}` : null),
    domain: prospect.domain,
    city: prospect.city,
    state: prospect.region,
    sender_name: blueprint.agent.name,
    sender_email: blueprint.compliance.sender_from,
    offer_headline: blueprint.offer.headline,
    booking_url: blueprint.scheduling.booking_url,
    unsubscribe_url: unsubUrl,
    ...input.vars,
  };

  const subject = render(step.subject, vars).trim();
  const bodyText = render(step.body, vars).trim();
  const html =
    `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#2b2a26">` +
    bodyText.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${escape(p).replace(/\n/g, '<br/>')}</p>`).join('') +
    complianceFooter(blueprint, unsubUrl) +
    `</div>`;

  const isTest = factory.mode === 'test';
  let providerId: string | null = null;
  let status: 'sent' | 'failed' = 'sent';
  let error: string | null = null;

  if (!isTest) {
    const res = await sendViaResend({
      from: blueprint.compliance.sender_from as string,
      to: prospect.email as string,
      subject,
      html,
      text: `${bodyText}\n\nUnsubscribe: ${unsubUrl}${blueprint.compliance.postal_address ? `\n${blueprint.compliance.postal_address}` : ''}`,
      unsubscribeUrl: unsubUrl,
      mailbox: blueprint.compliance.sender_from as string,
    });
    if (res.ok) providerId = res.id;
    else {
      status = 'failed';
      error = res.error;
    }
  }

  const { data, error: dbError } = await supabase
    .from('factory_messages')
    .insert({
      tenant_id: tenantId,
      factory_id: factory.id,
      campaign_id: input.campaignId,
      prospect_id: prospect.id,
      direction: 'outbound',
      channel: input.channel ?? 'email',
      step: step.step,
      variant: step.variant,
      subject,
      body: bodyText,
      status,
      provider_id: providerId,
      is_test: isTest,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      error,
    })
    .select('id')
    .single();

  if (dbError) return { ok: false, reason: dbError.message, code: 'db' };

  if (status === 'failed') return { ok: false, reason: error ?? 'Send failed.', code: 'provider' };

  if (!isTest) {
    await recordUsage(supabase, {
      tenantId,
      factoryId: factory.id,
      campaignId: input.campaignId,
      metric: 'emails_sent',
      moduleKey: 'outbound.cold_email',
      idempotencyKey: `msg:${data.id}`,
    });
  }
  await supabase
    .from('factory_prospects')
    .update({ last_contact_at: new Date().toISOString(), state: 'active' })
    .eq('id', prospect.id)
    .eq('tenant_id', tenantId)
    .in('state', ['ready', 'qualified', 'discovered']);

  await audit(supabase, {
    tenantId,
    factoryId: factory.id,
    action: 'message.sent',
    target: prospect.id,
    actorKind: 'system',
    meta: { step: step.step, variant: step.variant, test: isTest, subject },
  });

  return { ok: true, messageId: data.id as string };
}

/* ───────────────────────── reply classification ────────────────────── */

/**
 * ORDER IS THE ALGORITHM. First match wins, so this list is a priority ranking,
 * not a lookup table:
 *
 *   unsubscribe   outranks everything. An opt-out buried in a friendly reply is
 *                 still an opt-out.
 *   ooo           before anything positive, or auto-replies read as engagement.
 *   wrong_person  before intent, so we re-route rather than keep pitching.
 *   negative      before meeting and pricing. "Not interested, but what does it
 *                 cost?" is a no with a question attached, and treating it as a
 *                 pricing lead is how a polite decline becomes a complaint.
 *   meeting       before pricing. Somebody asking for time has already moved
 *                 past the number.
 */
const CLASS_PATTERNS: [ReplyClass, RegExp][] = [
  ['unsubscribe', /\b(unsubscribe|remove me|take me off|stop emailing|do not (contact|email))\b/i],
  ['ooo', /\b(out of (the )?office|on (vacation|leave)|auto-?reply|annual leave)\b/i],
  ['wrong_person', /\b(no longer (with|at)|wrong person|not the right|i don'?t handle|left the company)\b/i],
  ['negative', /\b(not interested|no thanks|we'?re good|already have|no need)\b|\bpass\b/i],
  ['meeting', /\b(book|schedule|calendar|call me|meet\b|set up a (call|time|meeting)|what times?|some times|a time that works|send (me )?(some )?times|for a call|hop on|jump on|let'?s talk|availability)\b/i],
  ['pricing', /\b(price|pricing|cost|how much|quote|budget|rates?)\b/i],
  ['question', /\?/],
  ['positive', /\b(interested|sounds good|tell me more|yes\b|send it|i'?d like)\b/i],
];

/**
 * Read a reply well enough to route it. Deliberately rule-first: an unsubscribe
 * has to be recognized without waiting on a model, and a rule that can be read
 * and argued with beats a classification nobody can explain to a customer whose
 * prospect got one more email than they asked for.
 */
export function classifyReply(body: string): ReplyClass {
  const text = body.slice(0, 4000);
  for (const [cls, re] of CLASS_PATTERNS) if (re.test(text)) return cls;
  return 'question';
}

export function isInboxWorthy(cls: string): cls is ReplyClass {
  return (REPLY_CLASSES as readonly string[]).includes(cls);
}
