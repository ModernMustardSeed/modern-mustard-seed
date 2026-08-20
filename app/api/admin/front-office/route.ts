import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { syncAssistant, assistantConfig, buildInstructions, type OfficeRow, type TransferRow } from '@/lib/front-office/agent';
import { recordOfficeEvent } from '@/lib/front-office/provision';
import { availableSlots } from '@/lib/front-office/calendar';
import { readiness, type OfficeReadiness } from '@/lib/front-office/readiness';
import { buyNumberFor, releaseNumberFor, placeTestCall, normalizeAreaCode } from '@/lib/front-office/phone';
import { sendViaResend } from '@/lib/send-email';

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
      // The board renders from the SAME gate the routes enforce, so the screen
      // can never offer a button the API would refuse.
      readiness: readiness(o as OfficeReadiness),
      suggestedAreaCode: normalizeAreaCode(o.forward_from),
    })),
  });
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
      // Stamped so readiness() can tell "tested" from "tested, then changed".
      await db
        .from('fo_offices')
        .update({ status: office.status === 'provisioning' ? 'configuring' : office.status, agent_synced_at: new Date().toISOString() })
        .eq('id', officeId);
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

    /**
     * RING IT, so a person hears the agent before a customer does.
     * Placed to whoever is testing, never to the customer's own line, and it
     * happens BEFORE we have bought anything.
     */
    case 'test-call': {
      const to = String(body.to ?? '').trim();
      if (!to) return NextResponse.json({ error: 'Which number should it call?' }, { status: 400 });
      const res = await placeTestCall(db, officeId, to, 'admin');
      return res.ok ? NextResponse.json({ ok: true, callId: res.callId }) : NextResponse.json({ error: res.error }, { status: 409 });
    }

    /**
     * The judgement. A human says whether it was good enough for a real
     * customer, and that verdict is what unlocks spending money.
     */
    case 'judge-test': {
      const passed = body.passed === true;
      await db
        .from('fo_offices')
        .update({
          test_call_passed: passed,
          test_call_notes: body.notes ? String(body.notes).slice(0, 2000) : null,
          test_call_at: office.test_call_at ?? new Date().toISOString(),
          test_call_by: 'admin',
        })
        .eq('id', officeId);
      await recordOfficeEvent(db, officeId, {
        type: 'test_judged',
        label: passed ? 'Test call passed' : 'Test call failed',
        detail: { notes: body.notes ?? null },
        actor: 'admin',
      });
      return NextResponse.json({ ok: true });
    }

    /**
     * SPEND MONEY. Refused unless they are a live paying customer AND the
     * agent has passed a test that is still current. The gate is re-evaluated
     * inside buyNumberFor as well: a hidden button is not a control.
     */
    case 'buy-number': {
      const res = await buyNumberFor(db, officeId, { areaCode: body.areaCode ? String(body.areaCode) : null, actor: 'admin' });
      if (!res.ok) return NextResponse.json({ error: res.error, blockers: res.blockers ?? [] }, { status: 409 });
      return NextResponse.json({ ok: true, phone: res.phone });
    }

    case 'release-number': {
      await releaseNumberFor(db, officeId, String(body.reason ?? 'released by admin'), 'admin');
      return NextResponse.json({ ok: true });
    }

    /** A number bought elsewhere, typed in by a human who can see the account. */
    case 'assign-phone': {
      const phone = String(body.phone ?? '').trim();
      if (phone.replace(/\D/g, '').length < 10) return NextResponse.json({ error: 'That is not a phone number.' }, { status: 400 });
      await db
        .from('fo_offices')
        .update({ agent_phone: phone, vapi_phone_number_id: body.vapiPhoneNumberId ? String(body.vapiPhoneNumberId).trim() : null, agent_phone_provider: 'manual' })
        .eq('id', officeId);
      await recordOfficeEvent(db, officeId, { type: 'phone', label: `Number assigned by hand: ${phone}`, actor: 'admin' });
      return NextResponse.json({ ok: true });
    }

    /** Record which of THEIR numbers forwards to us. */
    case 'set-forwarding': {
      const from = String(body.forwardFrom ?? '').trim();
      if (from.replace(/\D/g, '').length < 10) return NextResponse.json({ error: 'That is not a phone number.' }, { status: 400 });
      await db.from('fo_offices').update({ forward_from: from }).eq('id', officeId);
      await recordOfficeEvent(db, officeId, { type: 'forwarding', label: `Forwarding confirmed from ${from}`, actor: 'admin' });
      return NextResponse.json({ ok: true });
    }

    /**
     * Point real customers at it. Refuses while anything is missing rather
     * than flipping a status that tells a customer their phone is covered
     * when it is not.
     */
    case 'go-live': {
      const gate = readiness(office as OfficeReadiness);
      if (!gate.canGoLive.ok) return NextResponse.json({ error: `Not ready: ${gate.canGoLive.blockers.join('; ')}.`, blockers: gate.canGoLive.blockers }, { status: 409 });
      await db.from('fo_offices').update({ status: 'live', live_at: new Date().toISOString() }).eq('id', officeId);
      await recordOfficeEvent(db, officeId, { type: 'live', label: 'Went live', actor: 'admin' });

      // The voice "You are live." (loop audit, break #2). Until 2026-08-20 a
      // website going live emailed the client and a voice agent going live
      // told nobody, and a voice-only order could never reach 'delivered'
      // because only site-publish wrote it. Both fail-soft: the flip above is
      // the product truth and stands even if the mail bounces.
      try {
        const { data: full } = await db
          .from('fo_offices')
          .select('client_email, business_name, agent_phone, forward_from')
          .eq('id', officeId)
          .maybeSingle();
        if (full?.client_email) {
          await sendViaResend({
            from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
            to: full.client_email,
            replyTo: 'sarah@modernmustardseed.com',
            subject: `Your voice agent is live. Call it right now`,
            text:
              `It is on.\n\n` +
              `Your AI front desk for ${full.business_name ?? 'your business'} is answering as of this minute` +
              (full.agent_phone ? ` at ${full.agent_phone}` : '') +
              `. Call it yourself first: ask it what a customer would ask, try to stump it, hear it book something.\n\n` +
              `Every call it takes lands in your portal with the full transcript: modernmustardseed.com/portal (just enter this email address at the door).\n\n` +
              `Sarah`,
          });
        }
        const { data: ord } = await db
          .from('demo_orders')
          .select('id, products, status')
          .eq('front_office_id', officeId)
          .maybeSingle();
        const prods = Array.isArray(ord?.products) ? (ord!.products as string[]) : [];
        const voiceOnly = prods.includes('voice') && !prods.includes('site') && !prods.includes('bundle');
        if (ord && voiceOnly && ord.status !== 'delivered' && ord.status !== 'canceled') {
          await db.from('demo_orders').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', ord.id);
        }
      } catch (err) {
        console.error('go-live client notice failed (office is live regardless)', err);
      }
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
