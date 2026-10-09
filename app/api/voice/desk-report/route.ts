import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { resendClient } from '@/lib/send-email';
import { sendLoud } from '@/lib/mustard-send';
import { recordEndOfCall } from '@/lib/voice-calls';
import { buildDeskReport, deskMetaFrom } from '@/lib/desk-report';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * END-OF-CALL REPORTS FOR HAND-BUILT FRONT DESKS.
 *
 * Vapi posts here when a call on a front desk agent ends (the assistant's
 * server.url, serverMessages ['end-of-call-report'] only). The call is written
 * to the call log at once, then the intake goes out as one email: see
 * lib/desk-report.ts for what is in it and why it is filed after the call.
 *
 * Its own secret, VAPI_DESK_SECRET, rather than Mr. Mustard's: these agents
 * belong to other businesses, and rotating one line's secret must never take
 * the studio line's tools down with it. With no secret configured the route
 * refuses everything, because an open endpoint that emails on demand is a
 * spam cannon with our domain on it.
 */
export async function POST(req: Request) {
  const secret = env('VAPI_DESK_SECRET');
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  if (req.headers.get('x-vapi-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { message?: Record<string, unknown> };
  try {
    body = (await req.json()) as { message?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const message = body.message ?? {};
  if (message.type !== 'end-of-call-report') return NextResponse.json({ ok: true });

  // The log first and best effort: a database hiccup must not cost the email.
  const loggedId = await recordEndOfCall(message).catch((err) => {
    console.error('desk-report log failed', err);
    return null;
  });

  const meta = deskMetaFrom(message);
  if (!meta) {
    console.error('desk-report: assistant carries no deskReport metadata, nothing sent');
    return NextResponse.json({ ok: true, sent: false });
  }

  const report = buildDeskReport(message, meta, {
    listenUrl: loggedId ? `https://modernmustardseed.com/admin/calls?call=${loggedId}` : null,
  });
  if (!report.worthSending) return NextResponse.json({ ok: true, sent: false });

  const to = Array.from(new Set([...OWNER_NOTIFY_TO, ...(meta.notifyTo ?? [])]));
  const sent = await sendLoud(resendClient(), 'desk-report', {
    from: `${meta.business} Front Desk <sarah@modernmustardseed.com>`,
    to,
    subject: report.subject,
    html: report.html,
    text: report.text,
  });
  // 200 either way: a retry from Vapi would only send a duplicate when it
  // works, and sendLoud has already logged the reason when it does not.
  return NextResponse.json({ ok: true, sent: sent.ok });
}
