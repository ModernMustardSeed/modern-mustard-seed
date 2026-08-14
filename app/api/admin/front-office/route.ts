import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { syncAssistant, assistantConfig, buildInstructions, type OfficeRow, type TransferRow } from '@/lib/front-office/agent';
import { recordOfficeEvent } from '@/lib/front-office/provision';
import { availableSlots } from '@/lib/front-office/calendar';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE FRONT OFFICE BOARD.
 *
 * Every office we owe somebody, and how far along it is. The whole reason this
 * exists: provisioning deliberately stops short of buying a phone number and
 * pointing a business's calls at it, because both are real-world irreversible
 * and a bad automatic one takes a customer's phone down. Those are buttons
 * here, pressed by a person who can see the whole account.
 */
export async function GET() {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;

  const { data: offices } = await db.from('fo_offices').select('*').order('created_at', { ascending: false }).limit(200);
  const ids = (offices ?? []).map((o) => o.id);

  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const [calls, transfers] = await Promise.all([
    ids.length ? db.from('fo_calls').select('office_id, booked, needs_human, started_at').in('office_id', ids).gte('started_at', since) : Promise.resolve({ data: [] }),
    ids.length ? db.from('fo_transfers').select('office_id, name').in('office_id', ids).eq('active', true) : Promise.resolve({ data: [] }),
  ]);

  const callsBy = new Map<string, { total: number; booked: number; needsHuman: number }>();
  for (const c of (calls.data ?? []) as { office_id: string; booked: boolean; needs_human: boolean }[]) {
    const cur = callsBy.get(c.office_id) ?? { total: 0, booked: 0, needsHuman: 0 };
    cur.total++;
    if (c.booked) cur.booked++;
    if (c.needs_human) cur.needsHuman++;
    callsBy.set(c.office_id, cur);
  }
  const teamBy = new Map<string, number>();
  for (const t of (transfers.data ?? []) as { office_id: string }[]) teamBy.set(t.office_id, (teamBy.get(t.office_id) ?? 0) + 1);

  return NextResponse.json({
    offices: (offices ?? []).map((o) => ({
      ...o,
      week: callsBy.get(o.id) ?? { total: 0, booked: 0, needsHuman: 0 },
      teamSize: teamBy.get(o.id) ?? 0,
      // What is still missing before this can answer a real phone. This list is
      // the actual work queue, so it is computed rather than tracked by hand.
      blocking: blockersFor(o as OfficeRow),
    })),
  });
}

/** Everything standing between this office and a ringing phone, in order. */
export function blockersFor(o: OfficeRow & { agent_phone?: string | null; forward_from?: string | null; status?: string }): string[] {
  const out: string[] = [];
  if (!o.greeting?.trim()) out.push('No greeting');
  if (!Object.keys(o.hours ?? {}).length) out.push('No hours, so it cannot book anything');
  if (!o.vapi_assistant_id) out.push('Agent not built yet');
  if (!o.agent_phone) out.push('No phone number assigned');
  if (!o.forward_from) out.push('Their number is not forwarding to us');
  return out;
}

export async function POST(req: Request) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? '');
  const officeId = String(body.officeId ?? '');
  if (!officeId) return NextResponse.json({ error: 'officeId is required.' }, { status: 400 });

  const { data: office } = await db.from('fo_offices').select('*').eq('id', officeId).maybeSingle();
  if (!office) return NextResponse.json({ error: 'No such office.' }, { status: 404 });

  switch (action) {
    /** Build or update the agent from whatever the office says right now. */
    case 'sync': {
      const res = await syncAssistant(db, officeId);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
      await db.from('fo_offices').update({ status: office.status === 'provisioning' ? 'configuring' : office.status }).eq('id', officeId);
      await recordOfficeEvent(db, officeId, { type: 'sync', label: res.created ? 'Agent built' : 'Agent updated', actor: 'admin' });
      return NextResponse.json({ ok: true, assistantId: res.assistantId, created: res.created });
    }

    /**
     * Read the agent exactly as it will behave, without calling anybody.
     * A receptionist is prose, and prose has to be read before it is live.
     */
    case 'preview': {
      const { data: team } = await db.from('fo_transfers').select('name, role, phone, when_to_transfer, priority').eq('office_id', officeId).eq('active', true).order('priority');
      const slots = await availableSlots(db, office as OfficeRow, { limit: 4 });
      return NextResponse.json({
        instructions: buildInstructions(office as OfficeRow, (team ?? []) as TransferRow[]),
        config: assistantConfig(office as OfficeRow, (team ?? []) as TransferRow[]),
        nextSlots: slots,
      });
    }

    /** Attach the number we bought. Typed by a human who can see the account. */
    case 'assign-phone': {
      const phone = String(body.phone ?? '').trim();
      const vapiPhoneId = body.vapiPhoneNumberId ? String(body.vapiPhoneNumberId).trim() : null;
      if (phone.replace(/\D/g, '').length < 10) return NextResponse.json({ error: 'That is not a phone number.' }, { status: 400 });
      await db.from('fo_offices').update({ agent_phone: phone, vapi_phone_number_id: vapiPhoneId }).eq('id', officeId);
      await recordOfficeEvent(db, officeId, { type: 'phone', label: `Number assigned: ${phone}`, actor: 'admin' });
      return NextResponse.json({ ok: true });
    }

    /**
     * Put it live. Refuses while anything is still missing rather than
     * flipping a status that would tell the customer their phone is answered
     * when it is not.
     */
    case 'go-live': {
      const blocking = blockersFor(office as OfficeRow);
      if (blocking.length) return NextResponse.json({ error: `Not ready: ${blocking.join('; ')}.` }, { status: 409 });
      await db.from('fo_offices').update({ status: 'live', live_at: new Date().toISOString() }).eq('id', officeId);
      await recordOfficeEvent(db, officeId, { type: 'live', label: 'Went live', actor: 'admin' });
      return NextResponse.json({ ok: true });
    }

    case 'pause': {
      await db.from('fo_offices').update({ status: 'paused' }).eq('id', officeId);
      await recordOfficeEvent(db, officeId, { type: 'pause', label: 'Paused', actor: 'admin' });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
}
