import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { runFrontOfficeTool, type ToolContext } from '@/lib/front-office/tools';
import { upsertContact, recordOfficeEvent, callerKey } from '@/lib/front-office/provision';
import { notifyOwner } from '@/lib/front-office/notify';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * EVERY CUSTOMER'S FRONT DESK, ON ONE ENDPOINT.
 *
 * ── HOW WE KNOW WHOSE CALL THIS IS ───────────────────────────────────────────
 * By the ASSISTANT ID in the payload, looked up against fo_offices. Never by an
 * office id in the URL or the body. Vapi assigns assistant ids; a caller cannot
 * choose one, and a stranger posting here with a made-up id resolves to no
 * office and is dropped. Putting the office id in the server URL would have
 * meant anybody who guessed one could write calls into another business's CRM.
 *
 * ── AND WHY WE STILL CHECK A SECRET ──────────────────────────────────────────
 * The assistant id is not a secret; it appears in configuration and logs. So
 * when VAPI_WEBHOOK_SECRET is set the header must match, and the assistant
 * lookup is the second gate rather than the only one. If no secret is
 * configured we still serve, because a half-configured environment that
 * silently stops answering a customer's phone is worse than the alternative,
 * and the lookup still bounds the damage to writing a call row.
 *
 * ── NOTHING HERE MAY THROW ───────────────────────────────────────────────────
 * A 500 to Vapi mid-call is dead air on a real customer's phone. Every failure
 * becomes a sentence the receptionist can say out loud.
 */

type VapiToolCall = { id: string; function?: { name?: string; arguments?: unknown } };

function parseArgs(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try {
    return JSON.parse(String(raw)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const given = req.headers.get('x-vapi-secret') ?? req.headers.get('x-vapi-signature') ?? '';
    if (given !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  if (!db) return NextResponse.json({ results: [] });

  const body = (await req.json().catch(() => ({}))) as { message?: Record<string, unknown> };
  const message = body.message ?? {};
  const type = String(message.type ?? '');

  const call = (message.call ?? {}) as Record<string, unknown>;
  const assistantId = String((message.assistant as Record<string, unknown>)?.id ?? call.assistantId ?? '');
  const callId = String(call.id ?? '') || null;

  if (!assistantId) return NextResponse.json({ results: [] });

  const { data: office } = await db.from('fo_offices').select('*').eq('vapi_assistant_id', assistantId).maybeSingle();
  if (!office) {
    // Not ours, or an office that has been deleted. Say nothing and write
    // nothing rather than guessing which customer this belonged to.
    console.warn('front-office webhook: no office for assistant', assistantId);
    return NextResponse.json({ results: [] });
  }

  /* ── IS THIS A REHEARSAL? ──
     placeTestCall tags its calls with metadata.testCall. Without this check a
     test rings up in the customer's own dashboard as a real customer call,
     inflating the "calls answered" number we invoice against and confusing the
     one screen they trust. The metadata is ours, set server-side when we place
     the call, so it is not something a caller can fake. */
  const meta = (call.metadata ?? (message.metadata as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const isTestCall = meta.testCall === true;

  const customer = (call.customer ?? {}) as Record<string, unknown>;
  const fromNumber = (customer.number as string | undefined) ?? (message.phoneNumber as string | undefined) ?? null;

  const ctx: ToolContext = {
    db,
    office: {
      id: office.id,
      business_name: office.business_name,
      hours: office.hours ?? {},
      timezone: office.timezone ?? 'America/Denver',
      transfers_enabled: Boolean(office.transfers_enabled),
    },
    callId,
    fromNumber,
  };

  /* ── the call row exists before any tool writes to it ──
     Tools update fo_calls by vapi_call_id, so the row has to be there first or
     a booking made in the first ten seconds updates nothing at all. */
  if (callId && !isTestCall) {
    const { data: existing } = await db.from('fo_calls').select('id').eq('vapi_call_id', callId).maybeSingle();
    if (!existing) {
      const contactId = await upsertContact(db, office.id, { phone: fromNumber });
      await db.from('fo_calls').insert({
        office_id: office.id,
        contact_id: contactId,
        vapi_call_id: callId,
        direction: 'inbound',
        from_number: fromNumber,
        to_number: (call.phoneNumber as Record<string, string> | undefined)?.number ?? null,
        started_at: new Date().toISOString(),
      });
      if (fromNumber && callerKey(fromNumber)) {
        // Count the call on the contact now, not at end-of-call: a dropped
        // end-of-call report would otherwise lose the fact they rang at all.
        const { data: c } = await db.from('fo_contacts').select('id, call_count').eq('office_id', office.id).eq('phone_digits', callerKey(fromNumber)!).maybeSingle();
        if (c) await db.from('fo_contacts').update({ call_count: (c.call_count ?? 0) + 1 }).eq('id', c.id);
      }
    }
  }

  if (type === 'tool-calls') {
    const raw = (message.toolCallList ?? message.toolCalls ?? []) as VapiToolCall[];
    const results: { toolCallId: string; result: string }[] = [];
    for (const t of raw) {
      const name = t.function?.name ?? '';
      const result = await runFrontOfficeTool(ctx, name, parseArgs(t.function?.arguments));
      results.push({ toolCallId: t.id, result });
    }
    return NextResponse.json({ results });
  }

  if (type === 'end-of-call-report' && isTestCall) {
    // A rehearsal is recorded on the OFFICE, where the person who ordered it
    // is looking, and nowhere near the customer's call history.
    await recordOfficeEvent(db, office.id, {
      type: 'test_call_ended',
      label: `Test call finished (${message.endedReason ?? 'ended'})`,
      detail: { callId, durationSeconds: message.durationSeconds ?? null },
      actor: 'admin',
    });
    return NextResponse.json({ ok: true });
  }

  if (type === 'end-of-call-report') {
    const artifact = (message.artifact ?? {}) as Record<string, unknown>;
    const analysis = (message.analysis ?? {}) as Record<string, unknown>;
    const durationSec = Number(message.durationSeconds ?? call.duration ?? 0) || null;

    if (callId) {
      const { data: row } = await db.from('fo_calls').select('id, summary, intent').eq('vapi_call_id', callId).maybeSingle();
      await db
        .from('fo_calls')
        .update({
          ended_at: new Date().toISOString(),
          duration_sec: durationSec,
          ended_reason: String(message.endedReason ?? '') || null,
          // The agent's own log_call summary is better than the generic
          // post-call one, so it is never overwritten by it.
          summary: row?.summary ?? (typeof analysis.summary === 'string' ? analysis.summary.slice(0, 2000) : null),
          transcript: typeof artifact.transcript === 'string' ? artifact.transcript.slice(0, 60_000) : null,
          recording_url: (artifact.recordingUrl as string | undefined) ?? null,
          cost_cents: Number.isFinite(Number(message.cost)) ? Math.round(Number(message.cost) * 100) : null,
          raw: { endedReason: message.endedReason ?? null },
        })
        .eq('vapi_call_id', callId);
    }

    await recordOfficeEvent(db, office.id, {
      type: 'call',
      label: `Call handled${durationSec ? ` (${Math.round(durationSec)}s)` : ''}`,
      detail: { callId, from: fromNumber, endedReason: message.endedReason ?? null },
      actor: 'agent',
    });

    // TELL THE OWNER. This is the difference between catching a call and
    // catching a call that matters. Best-effort and idempotent inside
    // notifyOwner; a failure here must never 500 back at Vapi.
    if (callId) {
      const { data: row } = await db.from('fo_calls').select('id').eq('vapi_call_id', callId).maybeSingle();
      if (row?.id) await notifyOwner(db, office.id, row.id).catch((e) => console.error('front office notify threw', e));
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
