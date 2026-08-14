/**
 * BUY AND RELEASE THE LINE.
 *
 * The only place in this codebase that spends money on a recurring basis
 * without a human typing a card number, so it is written defensively:
 *
 *   NEVER BUY TWICE. An office that already has a number is refused before a
 *   request is made, not after. A duplicate here is not a bad row, it is a
 *   second monthly bill nobody notices for a year.
 *
 *   NEVER BUY FOR A NON-CUSTOMER. The caller passes a readiness gate it must
 *   have already evaluated. This module re-reads the office and checks again
 *   anyway, because the cost of being wrong is recurring and the cost of
 *   checking twice is a database read.
 *
 *   RELEASE IS AS IMPORTANT AS BUY. A cancelled customer whose number is never
 *   released is a bill that outlives the relationship. Release records when
 *   and why, so the ledger and the provider can be reconciled.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { readiness, type OfficeReadiness } from '@/lib/front-office/readiness';
import { recordOfficeEvent } from '@/lib/front-office/provision';

const VAPI_BASE = 'https://api.vapi.ai';
const real = (v?: string | null) => (v && !/^\[SENSITIVE\]$/i.test(v) ? v : null);
const apiKey = () => real(process.env.VAPI_API_KEY) || real(process.env.VAPI_PRIVATE_KEY);

/** What Vapi charges for a number, in cents, for the ledger. */
const MONTHLY_CENTS = 200;

export type BuyResult =
  | { ok: true; phone: string; vapiPhoneNumberId: string }
  | { ok: false; error: string; blockers?: string[] };

/**
 * Buy a number and attach it to the office's agent.
 *
 * `areaCode` is the owner's own area code when we know it, because a local
 * number gets answered and an out-of-state one gets screened. That is not a
 * nicety: it is the difference between the product working and not.
 */
export async function buyNumberFor(
  db: SupabaseClient,
  officeId: string,
  opts: { areaCode?: string | null; actor?: string } = {},
): Promise<BuyResult> {
  const key = apiKey();
  if (!key) return { ok: false, error: 'No Vapi API key configured, so nothing can be purchased.' };

  const { data: office } = await db.from('fo_offices').select('*').eq('id', officeId).maybeSingle();
  if (!office) return { ok: false, error: 'No such office.' };

  // THE GATE, RE-EVALUATED SERVER SIDE. The board already checked; a button is
  // not a control and anybody can POST. Being wrong here starts a monthly bill.
  const gate = readiness(office as OfficeReadiness);
  if (!gate.canBuyNumber.ok) {
    return { ok: false, error: 'Not allowed to buy a number yet.', blockers: gate.canBuyNumber.blockers };
  }

  const areaCode = normalizeAreaCode(opts.areaCode ?? office.forward_from ?? null);

  try {
    const res = await fetch(`${VAPI_BASE}/phone-number`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'vapi',
        ...(areaCode ? { numberDesiredAreaCode: areaCode } : {}),
        assistantId: office.vapi_assistant_id,
        name: `${office.business_name} front desk`,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; number?: string; message?: unknown };

    if (!res.ok) {
      const msg = typeof json.message === 'string' ? json.message : JSON.stringify(json.message ?? {});
      await recordOfficeEvent(db, officeId, { type: 'phone_failed', label: 'Could not buy a number', detail: { status: res.status, msg, areaCode }, actor: opts.actor });
      return { ok: false, error: `Vapi ${res.status}: ${msg}` };
    }
    if (!json.id || !json.number) {
      return { ok: false, error: 'Vapi accepted the purchase but returned no number.' };
    }

    // Written immediately. A number we own and have not recorded is the one
    // that bills forever with nothing pointing at it.
    await db
      .from('fo_offices')
      .update({
        agent_phone: json.number,
        vapi_phone_number_id: json.id,
        agent_phone_provider: 'vapi',
        phone_purchased_at: new Date().toISOString(),
        phone_monthly_cents: MONTHLY_CENTS,
        phone_released_at: null,
      })
      .eq('id', officeId);

    await recordOfficeEvent(db, officeId, {
      type: 'phone_bought',
      label: `Bought ${json.number}`,
      detail: { vapiPhoneNumberId: json.id, areaCode, monthlyCents: MONTHLY_CENTS },
      actor: opts.actor,
    });

    return { ok: true, phone: json.number, vapiPhoneNumberId: json.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'The purchase request failed.' };
  }
}

/** Hand the number back. A cancelled customer's line must not bill forever. */
export async function releaseNumberFor(db: SupabaseClient, officeId: string, reason: string, actor?: string): Promise<{ ok: boolean; error?: string }> {
  const key = apiKey();
  const { data: office } = await db.from('fo_offices').select('id, vapi_phone_number_id, agent_phone').eq('id', officeId).maybeSingle();
  if (!office?.vapi_phone_number_id) return { ok: true };

  if (key) {
    try {
      await fetch(`${VAPI_BASE}/phone-number/${office.vapi_phone_number_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${key}` } });
    } catch (err) {
      // Record it and clear our side anyway. A number we cannot reach at the
      // provider is a reconciliation problem; leaving the office pointing at a
      // dead line is a customer-facing one.
      console.error('front office: number release failed at the provider', err);
    }
  }

  await db
    .from('fo_offices')
    .update({ agent_phone: null, vapi_phone_number_id: null, phone_released_at: new Date().toISOString(), status: 'paused' })
    .eq('id', officeId);
  await recordOfficeEvent(db, officeId, { type: 'phone_released', label: `Released ${office.agent_phone ?? 'the number'}`, detail: { reason }, actor });
  return { ok: true };
}

/**
 * A local area code from their own number.
 *
 * Returns null rather than guessing when the number is not a plain US one:
 * buying a Denver number for a Montana contractor because we misread a country
 * code is worse than buying whatever the provider offers.
 */
export function normalizeAreaCode(from: string | null): string | null {
  const d = String(from ?? '').replace(/\D/g, '');
  if (d.length === 10) return d.slice(0, 3);
  if (d.length === 11 && d.startsWith('1')) return d.slice(1, 4);
  return null;
}

export type TestCallResult = { ok: true; callId: string } | { ok: false; error: string };

/**
 * Ring a number with THEIR agent, so a person can hear it before a customer does.
 *
 * Placed to whoever is testing, never to the customer's own line, and it uses
 * the studio's outbound number rather than one we have bought for the office,
 * because the whole point is that this happens BEFORE we buy anything.
 */
export async function placeTestCall(db: SupabaseClient, officeId: string, toNumber: string, actor?: string): Promise<TestCallResult> {
  const key = apiKey();
  if (!key) return { ok: false, error: 'No Vapi API key configured.' };

  const { data: office } = await db.from('fo_offices').select('*').eq('id', officeId).maybeSingle();
  if (!office) return { ok: false, error: 'No such office.' };

  const gate = readiness(office as OfficeReadiness);
  if (!gate.canTest.ok) return { ok: false, error: gate.canTest.blockers.join('; ') };

  const digits = String(toNumber).replace(/\D/g, '');
  if (digits.length < 10) return { ok: false, error: 'That is not a number we can call.' };
  const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`;

  const fromId = real(process.env.VAPI_CALLBACK_NUMBER_ID) || real(process.env.VAPI_PHONE_NUMBER_ID);
  if (!fromId) return { ok: false, error: 'No outbound number configured to place the test from.' };

  try {
    const res = await fetch(`${VAPI_BASE}/call`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumberId: fromId,
        assistantId: office.vapi_assistant_id,
        customer: { number: e164 },
        // Tagged so the Front Office webhook can tell a rehearsal apart from a
        // real customer and keep it out of the customer's own call history.
        metadata: { officeId, testCall: true },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: unknown };
    if (!res.ok || !json.id) {
      const msg = typeof json.message === 'string' ? json.message : JSON.stringify(json.message ?? {});
      return { ok: false, error: `Vapi ${res.status}: ${msg}` };
    }

    await db.from('fo_offices').update({ test_call_id: json.id, test_call_at: new Date().toISOString(), test_call_passed: null, test_call_by: actor ?? null }).eq('id', officeId);
    await recordOfficeEvent(db, officeId, { type: 'test_call', label: `Test call placed to ${e164}`, detail: { callId: json.id }, actor });
    return { ok: true, callId: json.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'The test call failed to start.' };
  }
}
