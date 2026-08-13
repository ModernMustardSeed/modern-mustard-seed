/**
 * CONSENT TO BE CALLED BY AN AI.
 *
 * Mr. Mustard is an artificial voice placing a commercial call. That is exactly
 * the call the TCPA cares most about, so the record of what a person agreed to
 * has to be stronger than a boolean:
 *
 *   - the exact sentence is stored WHOLE on the row, not referenced by id, so a
 *     future edit to the copy can never rewrite what a past person agreed to;
 *   - the version string is stored beside it, so a batch can be audited;
 *   - the box is never pre-checked, and a submission without it is refused
 *     server-side, not just hidden in the UI;
 *   - the phone number is stored both as typed and as dialed;
 *   - revocation writes revoked_at and stops the calls, it never deletes.
 *
 * Adding a new version means adding an entry below and pointing CURRENT at it.
 * Never edit a shipped version's text.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/acq/events';

export type ConsentVersion = {
  id: string;
  effectiveFrom: string;
  /** The exact words beside the checkbox. */
  text: string;
};

export const CONSENT_VERSIONS: ConsentVersion[] = [
  {
    id: 'mms-ai-call-v1',
    effectiveFrom: '2026-08-13',
    text:
      'By checking this box and clicking "Have Mr. Mustard Call Me," I agree that Modern Mustard Seed may call the phone number I provided with marketing or telemarketing messages using an artificial, prerecorded, or AI-generated voice. Consent is not a condition of purchasing any goods or services. I may revoke my consent at any time by telling Mr. Mustard to stop, replying to any email from us, or emailing sarah@modernmustardseed.com.',
  },
];

export const CURRENT_CONSENT = CONSENT_VERSIONS[CONSENT_VERSIONS.length - 1];

export function consentVersion(id: string): ConsentVersion | undefined {
  return CONSENT_VERSIONS.find((v) => v.id === id);
}

/** US 10-digit to E.164. A malformed number is a stranger's phone, so refuse it. */
export function toE164(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export type ConsentInput = {
  leadId?: string | null;
  campaignId?: string | null;
  phoneAsTyped: string;
  businessName?: string | null;
  contactName?: string | null;
  website?: string | null;
  checkboxChecked: boolean;
  typedName?: string | null;
  versionId: string;
  ip?: string | null;
  userAgent?: string | null;
  sourceCampaign?: string | null;
  sourceEmailId?: string | null;
  sourceVariant?: string | null;
  referer?: string | null;
};

export type ConsentResult =
  | { ok: true; id: string; phoneE164: string; version: ConsentVersion }
  | { ok: false; error: string };

/**
 * Write the consent record. Everything about this function is deliberately
 * unforgiving: an unchecked box, an unknown version and a bad phone number are
 * all hard refusals, because the alternative is a call we cannot defend.
 */
export async function recordConsent(
  db: SupabaseClient | null,
  input: ConsentInput,
): Promise<ConsentResult> {
  const client = db ?? getSupabase();
  if (!client) return { ok: false, error: 'Consent cannot be recorded right now. Please try again in a minute.' };

  if (!input.checkboxChecked) {
    return { ok: false, error: 'Please check the consent box so Mr. Mustard is allowed to call you.' };
  }
  const version = consentVersion(input.versionId);
  if (!version) {
    return { ok: false, error: 'That form is out of date. Refresh the page and try again.' };
  }
  const phoneE164 = toE164(input.phoneAsTyped);
  if (!phoneE164) {
    return { ok: false, error: 'That does not look like a US phone number. Enter 10 digits.' };
  }

  const { data, error } = await client
    .from('acq_consents')
    .insert({
      lead_id: input.leadId ?? null,
      campaign_id: input.campaignId ?? null,
      phone_e164: phoneE164,
      phone_as_typed: String(input.phoneAsTyped).slice(0, 40),
      business_name: input.businessName?.slice(0, 200) ?? null,
      contact_name: input.contactName?.slice(0, 200) ?? null,
      website: input.website?.slice(0, 300) ?? null,
      seller: 'Modern Mustard Seed',
      consent_version: version.id,
      consent_text: version.text,
      checkbox_checked: true,
      typed_name: input.typedName?.slice(0, 200) ?? null,
      ip: input.ip?.slice(0, 64) ?? null,
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      source_campaign: input.sourceCampaign?.slice(0, 120) ?? null,
      source_email_id: input.sourceEmailId?.slice(0, 120) ?? null,
      source_variant: input.sourceVariant?.slice(0, 40) ?? null,
      referer: input.referer?.slice(0, 500) ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Consent could not be saved.' };
  }

  await recordEvent(client, {
    leadId: input.leadId ?? null,
    campaignId: input.campaignId ?? null,
    type: 'consent_captured',
    label: `Consent captured for ${phoneE164} (${version.id})`,
    detail: { consentId: data.id, version: version.id, typedName: input.typedName ?? null, ip: input.ip ?? null },
  });

  return { ok: true, id: data.id as string, phoneE164, version };
}

/** Stop calling. Revocation is honored immediately and never deleted. */
export async function revokeConsent(
  db: SupabaseClient | null,
  args: { consentId?: string; phoneE164?: string; leadId?: string; reason: string },
): Promise<number> {
  const client = db ?? getSupabase();
  if (!client) return 0;
  let q = client
    .from('acq_consents')
    .update({ revoked_at: new Date().toISOString(), revoke_reason: args.reason.slice(0, 300) })
    .is('revoked_at', null);
  if (args.consentId) q = q.eq('id', args.consentId);
  else if (args.phoneE164) q = q.eq('phone_e164', args.phoneE164);
  else if (args.leadId) q = q.eq('lead_id', args.leadId);
  else return 0;
  const { data } = await q.select('id');
  return (data ?? []).length;
}

/** Is there a live, unrevoked consent for this number? The call gate. */
export async function hasLiveConsent(db: SupabaseClient | null, phoneE164: string): Promise<boolean> {
  const client = db ?? getSupabase();
  if (!client) return false;
  const { data } = await client
    .from('acq_consents')
    .select('id')
    .eq('phone_e164', phoneE164)
    .is('revoked_at', null)
    .limit(1);
  return (data ?? []).length > 0;
}
