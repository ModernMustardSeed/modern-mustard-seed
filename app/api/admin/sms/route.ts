import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { loadThread, recordSms, isOptedOut, toE164, numberFor } from '@/lib/sms-thread';
import { smsHref, toAscii, displayPhone } from '@/lib/tap-text';
import { sendSms, smsConfigured } from '@/lib/sms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ONE HANDSET, THE WHOLE CONVERSATION.
 *
 * GET  ?phone=+1406...  the thread, who it belongs to, and which of the two
 *                       send paths is actually open right now.
 * POST                  send it, or log that a handset sent it.
 *
 * ── WHY THERE ARE TWO SEND PATHS AND NOT ONE ─────────────────────────────────
 * Outbound application texting needs an approved A2P 10DLC campaign, and this
 * business has been through that queue once already (lib/tap-text.ts). Until the
 * campaign clears, `sendSms` would hand every message to a carrier that drops
 * it, and the cockpit would report success.
 *
 * So the composer reports the truth instead. When the number we would send from
 * is marked outbound_ready, it sends. When it is not, it hands back the same
 * `sms:` deep link tap-to-text has always used, and POST mode 'log' records what
 * the handset sent. Either way the message lands on the thread, and the thread
 * is the point: replies now come back to a number we own, so both halves of the
 * conversation are in one place for the first time.
 */

type Mode = 'provider' | 'handset';

/** Which number we speak from, and whether it may speak yet. */
async function outgoing(sb: ReturnType<typeof getSupabase>) {
  const configured = smsConfigured();
  const from = toE164(process.env.TWILIO_SMS_NUMBER || '');
  const row = from ? await numberFor(sb, from) : null;

  // A number we have never registered in sms_numbers is treated as not ready.
  // Assuming ready would be the one assumption that silently loses messages.
  const ready = Boolean(configured && row?.outbound_ready && row?.active !== false);
  return { configured, from, row, mode: (ready ? 'provider' : 'handset') as Mode };
}

export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const phone = toE164(new URL(req.url).searchParams.get('phone') || '');
  if (!phone) return NextResponse.json({ error: 'A US phone number is required.' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const [{ rows, owner, optedOut }, out] = await Promise.all([loadThread(sb, phone), outgoing(sb)]);

  return NextResponse.json({
    phone,
    display: displayPhone(phone),
    owner,
    optedOut,
    messages: rows,
    send: {
      mode: out.mode,
      from: out.from,
      fromLabel: out.row?.label ?? null,
      configured: out.configured,
      // Said plainly, because a disabled Send box with no reason is a bug report.
      blockedReason:
        out.mode === 'provider'
          ? null
          : !out.configured
            ? 'Twilio is not configured, so nothing can send from the app yet.'
            : !out.from
              ? 'No TWILIO_SMS_NUMBER is set, so there is no number to send from.'
              : 'This number is not cleared for outbound yet (A2P 10DLC pending), so sending from the app would be filtered by the carrier.',
    },
  });
}

export async function POST(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: { phone?: string; body?: string; mode?: Mode } = {};
  try {
    payload = await req.json();
  } catch {
    /* validated below */
  }

  const phone = toE164(payload.phone || '');
  const body = toAscii((payload.body || '').trim());
  if (!phone) return NextResponse.json({ error: 'A US phone number is required.' }, { status: 400 });
  if (!body) return NextResponse.json({ error: 'Nothing to send.' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  // The opt-out gate is checked here as well as inside sendSms, because the
  // handset path never touches sendSms and a STOP has to stop that one too.
  // Telling a person to text somebody who opted out is the same violation as
  // doing it automatically.
  if (await isOptedOut(sb, phone)) {
    return NextResponse.json({ error: `${displayPhone(phone)} replied STOP. They cannot be texted again unless they reply START.` }, { status: 409 });
  }

  const out = await outgoing(sb);
  const mode: Mode = payload.mode ?? out.mode;

  if (mode === 'provider') {
    if (out.mode !== 'provider') {
      return NextResponse.json({ error: 'That number is not cleared for outbound sending yet.' }, { status: 409 });
    }
    const result = await sendSms(phone, body, { viaNumber: out.from });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
    // sendSms already wrote the row, with the SID the status webhook needs.
    return NextResponse.json({ ok: true, mode, sid: result.sid });
  }

  // Handset mode. The text has already left a real phone by the time this is
  // called, so this is a record, not a send.
  const id = await recordSms(sb, {
    phoneE164: phone,
    direction: 'outbound',
    body,
    fromHandset: true,
    status: 'sent',
  });

  return NextResponse.json({ ok: true, mode, id, href: smsHref(phone, body) });
}
