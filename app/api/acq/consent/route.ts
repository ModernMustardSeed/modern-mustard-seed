import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordConsent, CURRENT_CONSENT, toE164 } from '@/lib/acq/consent';
import { placeDemoCall } from '@/lib/acq/call';
import { getAcqSettings, gate, getCampaign } from '@/lib/acq/settings';
import { recordEvent } from '@/lib/acq/events';
import { enqueue, cancelPendingFor } from '@/lib/acq/queue';
import type { AcqProspect, Trade } from '@/lib/acq/types';
import { keysFor } from '@/lib/acq/dedupe';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * "HAVE MR. MUSTARD CALL ME."
 *
 * The consent record is written FIRST and the call is placed second, in that
 * order, always. If the write fails nothing is dialled. If the dial fails the
 * consent still stands and the queue retries it, because the person asked and
 * is owed the call.
 *
 * A prospect id is optional. Somebody can arrive here from a forwarded email or
 * straight off the site, and a stranger who asks to be called is a lead, so we
 * create the row rather than turning them away.
 */
export async function POST(req: Request) {
  const db = getSupabase();
  if (!db) return NextResponse.json({ ok: false, error: 'We cannot take that right now. Try again in a minute.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  const str = (k: string, max = 200): string => String(body[k] ?? '').trim().slice(0, max);
  const firstName = str('firstName', 80);
  const businessName = str('businessName', 200);
  const phoneTyped = str('phone', 40);
  const website = str('website', 300);
  const leadId = /^[0-9a-f-]{36}$/i.test(str('leadId', 40)) ? str('leadId', 40) : null;
  const variant = str('variant', 40) || null;
  const consented = body.consent === true;
  const typedName = str('typedName', 120) || firstName || null;

  if (!businessName) return NextResponse.json({ ok: false, error: 'Tell us the business name so Mr. Mustard knows who he is calling.' }, { status: 400 });
  const phoneE164 = toE164(phoneTyped);
  if (!phoneE164) return NextResponse.json({ ok: false, error: 'That does not look like a US phone number. Enter 10 digits.' }, { status: 400 });
  if (!consented) return NextResponse.json({ ok: false, error: 'Please check the box so Mr. Mustard is allowed to call you.' }, { status: 400 });

  const campaign = await getCampaign();
  const settings = await getAcqSettings();

  /* ── find or create the prospect ── */

  let lead: AcqProspect | null = null;
  if (leadId) {
    const { data } = await db.from('outbound_leads').select('*').eq('id', leadId).maybeSingle();
    lead = (data as AcqProspect) ?? null;
  }
  if (!lead) {
    const digits = phoneE164.slice(2);
    const { data: byPhone } = await db.from('outbound_leads').select('*').eq('phone_digits', digits).limit(1);
    lead = ((byPhone ?? [])[0] as AcqProspect) ?? null;
  }
  if (!lead) {
    const keys = keysFor({ business_name: businessName, website, phone: phoneTyped });
    const { data: created, error } = await db
      .from('outbound_leads')
      .insert({
        business_name: businessName,
        contact_name: firstName || null,
        phone: phoneTyped,
        website: website || null,
        niche: 'home_service',
        trade: guessTrade(businessName),
        status: 'callback',
        source: 'meet-mr-mustard',
        acq_campaign_id: campaign?.id ?? null,
        acq_stage: 'consented',
        imported_at: new Date().toISOString(),
        notes: 'Walked up to /meet-mr-mustard and asked for the call themselves.',
        ...keys,
      })
      .select('*')
      .single();
    if (error || !created) {
      return NextResponse.json({ ok: false, error: 'We could not save that. Try again in a moment.' }, { status: 500 });
    }
    lead = created as AcqProspect;
  }

  /* ── the consent record, before anything dials ── */

  const consent = await recordConsent(db, {
    leadId: lead.id,
    campaignId: campaign?.id ?? null,
    phoneAsTyped: phoneTyped,
    businessName,
    contactName: firstName || null,
    website: website || null,
    checkboxChecked: true,
    typedName,
    versionId: str('consentVersion', 60) || CURRENT_CONSENT.id,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: req.headers.get('user-agent'),
    sourceCampaign: campaign?.slug ?? null,
    sourceEmailId: str('emailId', 120) || null,
    sourceVariant: variant,
    referer: req.headers.get('referer'),
  });
  if (!consent.ok) return NextResponse.json({ ok: false, error: consent.error }, { status: 400 });

  const now = new Date().toISOString();
  const { data: updated } = await db
    .from('outbound_leads')
    .update({
      contact_name: lead.contact_name || firstName || null,
      phone: phoneTyped,
      website: lead.website || website || null,
      consent_status: 'granted',
      consent_at: now,
      consent_id: consent.id,
      acq_stage: 'consented',
      acq_variant: lead.acq_variant ?? variant,
      call_stage: 'requested',
      phone_digits: phoneE164.slice(2),
      acq_campaign_id: lead.acq_campaign_id ?? campaign?.id ?? null,
    })
    .eq('id', lead.id)
    .select('*')
    .single();
  if (updated) lead = updated as AcqProspect;

  // They said yes. Stop the cold sequence immediately: nothing is worse than a
  // "should I leave you alone?" email landing after somebody opted in.
  await cancelPendingFor(db, lead.id, ['email'], 'They asked for the call, so the cold sequence stops.');

  /* ── the call ── */

  const calls = gate(settings, 'calls');
  if (!calls.allowed) {
    await enqueue(db, {
      kind: 'call',
      leadId: lead.id,
      campaignId: campaign?.id ?? null,
      step: 1,
      payload: { phone: phoneE164, consentId: consent.id },
    });
    await recordEvent(db, {
      leadId: lead.id,
      campaignId: campaign?.id ?? null,
      type: 'call_queued',
      label: 'Consent captured; the call is queued because calling is paused',
      detail: { reason: calls.reason },
    });
    return NextResponse.json({
      ok: true,
      queued: true,
      leadId: lead.id,
      message: 'You are on the list. Mr. Mustard will ring you shortly.',
    });
  }

  const placed = await placeDemoCall({
    lead,
    phoneE164,
    consentId: consent.id,
    consentAt: now,
    campaignId: campaign?.id ?? null,
    attempt: (lead.call_attempts ?? 0) + 1,
  });

  if (!placed.ok) {
    // The consent stands. Queue the retry rather than losing the moment.
    await enqueue(db, {
      kind: 'call',
      leadId: lead.id,
      campaignId: campaign?.id ?? null,
      step: 1,
      runAfter: new Date(Date.now() + 2 * 60_000),
      payload: { phone: phoneE164, consentId: consent.id },
    });
    return NextResponse.json({
      ok: true,
      queued: true,
      leadId: lead.id,
      message:
        placed.reason === 'duplicate'
          ? 'He is already calling that number. Check your phone.'
          : 'You are on the list. Mr. Mustard will ring you in the next few minutes.',
    });
  }

  return NextResponse.json({ ok: true, queued: false, leadId: lead.id, callId: placed.acqCallId });
}

function guessTrade(name: string): Trade {
  const n = name.toLowerCase();
  if (/roof|shingle|gutter/.test(n)) return 'roofing';
  if (/plumb|drain|sewer|rooter|septic/.test(n)) return 'plumbing';
  if (/hvac|heat|cool|air|furnace|climate/.test(n)) return 'hvac';
  return 'other';
}
