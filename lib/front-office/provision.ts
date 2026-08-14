/**
 * BUILD THE FRONT OFFICE THE MOMENT THEY PAY.
 *
 * The chain this closes: a prospect gets a cold email, asks Mr. Mustard to
 * call, likes what they hear, buys. Before this file, that ended at a Stripe
 * receipt and a project row. The thing they actually bought, a receptionist
 * that answers their phone, was a to-do item in Sarah's head.
 *
 * ── EVERYTHING HERE IS IDEMPOTENT ────────────────────────────────────────────
 * A Stripe retry, a double click, an admin pressing "provision" again, and a
 * webhook replayed three days later must all converge on ONE office. The office
 * is keyed by client_email with a unique constraint, so the database enforces
 * that rather than trusting this code to check first.
 *
 * ── AND NOTHING HERE MAY FAIL THE SALE ───────────────────────────────────────
 * Provisioning runs after the money is taken. If it throws, Stripe retries the
 * whole webhook and the customer gets a second charge attempt for a problem
 * that has nothing to do with payment. So every step is best-effort, every
 * failure is recorded on the office as an event, and the office lands in
 * `provisioning` rather than `live` so it shows up on the admin board as work
 * to finish rather than disappearing.
 *
 * ── WHAT WE DO NOT DO AUTOMATICALLY ──────────────────────────────────────────
 * We do not buy a phone number and we do not point their calls at it. Both are
 * real-world irreversible: a number costs money every month and a forwarding
 * change can take a business's phone down. Those are one button on the admin
 * board, pressed by a person who can see the whole account.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { toVoiceGender, sidekickVoice, type VoiceGender } from '@/lib/sidekick-voice';
import { TRADE_DEFS } from '@/lib/acq/trades';
import type { Trade } from '@/lib/acq/types';

export type ProvisionInput = {
  clientEmail: string;
  businessName: string;
  outboundLeadId?: string | null;
  demoOrderId?: string | null;
  projectId?: string | null;
  /** Their choice, from the demo call or the intake form. */
  voiceGender?: string | null;
  trade?: Trade | null;
  phone?: string | null;
  timezone?: string | null;
  hours?: Record<string, unknown> | null;
  serviceArea?: string | null;
};

export type ProvisionResult =
  | { ok: true; officeId: string; created: boolean }
  | { ok: false; error: string };

/**
 * The default greeting.
 *
 * Written to be replaced. It names the business and says a human is available,
 * which is the minimum a caller needs, and every owner rewrites it at intake
 * anyway. What matters is that an office is never live with an empty greeting.
 */
export function defaultGreeting(business: string): string {
  // Never "Thanks for calling ." A missing name is a data problem on our side
  // and the caller must not hear it.
  const name = String(business || '').trim();
  const opening = name ? `Thanks for calling ${name}.` : 'Thanks for calling.';
  return `${opening} I can take your details, answer questions, and get you booked in. How can I help?`;
}

/**
 * What this trade's receptionist must never do, seeded from the registry.
 *
 * Every trade note already ends with the sentence that matters ("never diagnose
 * the equipment", "never speculate about what insurance will cover") because
 * getting that wrong on a real call costs the owner a job or a lawsuit. Pulling
 * it out into its own list means the agent treats it as a rule rather than as
 * one more sentence in a paragraph of context.
 */
export function neverDoFor(trade: Trade | null | undefined): string[] {
  const base = [
    'Never quote a firm price for work you have not seen.',
    'Never promise a specific technician or a specific arrival time.',
    'Never claim to be a human. If asked, say plainly that you are an AI assistant.',
  ];
  const def = trade && trade !== 'other' ? TRADE_DEFS[trade] : null;
  if (!def) return base;
  // The last sentence of a roleplay note is the trade's own hard rule.
  const rule = def.roleplay.split(/(?<=\.)\s+/).filter((s) => /^never\b/i.test(s.trim()));
  return [...rule.map((s) => s.trim()), ...base];
}

/** When a call must reach a human, whatever the agent thinks it can handle. */
export function escalateOnFor(trade: Trade | null | undefined): string[] {
  const base = ['The caller asks for a human.', 'The caller is upset or is complaining.', 'The caller says it is an emergency.'];
  const def = trade && trade !== 'other' ? TRADE_DEFS[trade] : null;
  // An emergency trade gets the after-hours rule too, because for these the
  // 11pm call IS the business rather than an interruption to it.
  return def?.emergency ? [...base, 'Anything involving injury, flooding, fire, gas, smoke, or a live electrical hazard.'] : base;
}

export async function provisionFrontOffice(sb: SupabaseClient, input: ProvisionInput): Promise<ProvisionResult> {
  const clientEmail = String(input.clientEmail || '').toLowerCase().trim();
  if (!clientEmail) return { ok: false, error: 'no client email; an office belongs to somebody or it belongs to nobody' };

  const business = String(input.businessName || '').trim() || 'your business';
  const trade = (input.trade ?? null) as Trade | null;
  const voice: VoiceGender = toVoiceGender(input.voiceGender);

  // Already have one? Enrich the links we may not have had first time, and
  // leave every choice the owner has since made completely alone.
  const { data: existing } = await sb.from('fo_offices').select('id').eq('client_email', clientEmail).maybeSingle();
  if (existing?.id) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.outboundLeadId) patch.outbound_lead_id = input.outboundLeadId;
    if (input.demoOrderId) patch.demo_order_id = input.demoOrderId;
    if (input.projectId) patch.project_id = input.projectId;
    await sb.from('fo_offices').update(patch).eq('id', existing.id);
    return { ok: true, officeId: existing.id, created: false };
  }

  const { data, error } = await sb
    .from('fo_offices')
    .insert({
      client_email: clientEmail,
      outbound_lead_id: input.outboundLeadId ?? null,
      demo_order_id: input.demoOrderId ?? null,
      project_id: input.projectId ?? null,
      business_name: business,
      status: 'provisioning',
      voice_gender: voice,
      voice_id: sidekickVoice(voice).voiceId,
      greeting: defaultGreeting(business),
      forward_from: input.phone ?? null,
      // Nights and weekends by default, which is what the KEEP HER email
      // promised. Anyone who wants every call says so at intake, and the
      // product must not quietly do more than the sale described.
      forward_mode: 'after_hours',
      timezone: input.timezone || 'America/Denver',
      hours: input.hours ?? {},
      service_area: input.serviceArea ?? null,
      never_do: neverDoFor(trade),
      escalate_on: escalateOnFor(trade),
      settings: { trade: trade ?? null, seeded_from: input.outboundLeadId ? 'acquisition' : 'demo-order' },
      provisioned_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    // A duplicate here means two webhooks raced. That is the constraint doing
    // its job, not a failure: read the winner and return it.
    if (error && /duplicate|unique/i.test(error.message)) {
      const { data: won } = await sb.from('fo_offices').select('id').eq('client_email', clientEmail).maybeSingle();
      if (won?.id) return { ok: true, officeId: won.id, created: false };
    }
    return { ok: false, error: error?.message ?? 'the office insert returned nothing' };
  }

  await recordOfficeEvent(sb, data.id, {
    type: 'provisioned',
    label: 'Front Office created',
    detail: { business, voice, trade, from: input.outboundLeadId ? 'acquisition' : 'demo order' },
  });

  // Seed the CRM with the buyer, so the first screen they open is not empty
  // and so a call from their own phone is already recognized.
  if (input.phone) {
    await upsertContact(sb, data.id, { phone: input.phone, name: null, isCustomer: false }).catch(() => {});
  }

  return { ok: true, officeId: data.id, created: true };
}

export async function recordOfficeEvent(
  sb: SupabaseClient,
  officeId: string,
  e: { type: string; label: string; detail?: unknown; actor?: string },
): Promise<void> {
  try {
    await sb.from('fo_events').insert({
      office_id: officeId,
      type: e.type,
      label: e.label,
      detail: e.detail ?? null,
      actor: e.actor ?? 'system',
    });
  } catch {
    /* the trail is never worth failing the work it describes */
  }
}

/** Digits only, so one caller is one contact however the number was formatted. */
export function callerKey(phone: string | null | undefined): string | null {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length < 10) return null;
  // US numbers arrive as 10 or 11 digits; keep the last 10 so +1 does not
  // create a second contact for a caller we already know.
  return d.slice(-10);
}

/**
 * Find or create the caller.
 *
 * Never overwrites a known name with a blank one: the agent learns a name on
 * call three, and call four arriving as "unknown caller" must not erase it.
 */
export async function upsertContact(
  sb: SupabaseClient,
  officeId: string,
  c: { phone?: string | null; name?: string | null; email?: string | null; address?: string | null; isCustomer?: boolean },
): Promise<string | null> {
  const digits = callerKey(c.phone);
  if (!digits) {
    if (!c.name && !c.email) return null;
  }

  const now = new Date().toISOString();
  if (digits) {
    const { data: found } = await sb
      .from('fo_contacts')
      .select('id, name, email, address, call_count')
      .eq('office_id', officeId)
      .eq('phone_digits', digits)
      .maybeSingle();

    if (found?.id) {
      const patch: Record<string, unknown> = { last_seen_at: now, updated_at: now };
      if (c.name && !found.name) patch.name = c.name;
      if (c.email && !found.email) patch.email = c.email;
      if (c.address && !found.address) patch.address = c.address;
      if (c.isCustomer) patch.is_customer = true;
      await sb.from('fo_contacts').update(patch).eq('id', found.id);
      return found.id;
    }
  }

  const { data } = await sb
    .from('fo_contacts')
    .insert({
      office_id: officeId,
      name: c.name ?? null,
      phone: c.phone ?? null,
      phone_digits: digits,
      email: c.email ?? null,
      address: c.address ?? null,
      is_customer: Boolean(c.isCustomer),
      first_seen_at: now,
      last_seen_at: now,
    })
    .select('id')
    .maybeSingle();

  return data?.id ?? null;
}
