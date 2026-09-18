import { NextResponse } from 'next/server';
import { listContent } from '@/lib/content';
import { resendClient } from '@/lib/send-email';
import { OUTREACH_FROM } from '@/lib/outreach-domain';
import { renderNewsletter } from '@/lib/newsletter';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Weekly newsletter. Picks a playbook on rotation and broadcasts it to the
// Resend audience.
//
// ⚠️ DELIBERATELY NOT SCHEDULED. Do not put this back in vercel.json crons
// without Sarah saying so. It ran Tuesdays 17:00 UTC, but CRON_SECRET was never
// set in production, so it 401'd on every invocation and quietly never sent. The
// moment the secret was set (2026-07-14) this became a live weekly broadcast to
// the whole list, on a rotation nobody had reviewed. Sarah wants to set the
// newsletter up deliberately, so the schedule is removed until she does.
//
// The only other thing standing between this route and a real send is an unset
// RESEND_AUDIENCE_ID, which is an accident, not a guard. Adding that env var
// while a schedule exists is enough to mail the entire audience.
//
// Preview without sending: GET /api/cron/newsletter?preview=1 with the same
// Bearer CRON_SECRET returns the rendered issue as HTML and stops there.
//
// Required env:
//   RESEND_API_KEY
//   RESEND_AUDIENCE_ID  (audience to broadcast to)
//   CRON_SECRET         (shared secret to authenticate the cron caller)

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return auth === `Bearer ${expected}`;
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const playbooks = listContent('playbooks');
  if (playbooks.length === 0) {
    return NextResponse.json({ error: 'No playbooks available' }, { status: 500 });
  }

  // Predictable weekly rotation through the playbook library
  const week = isoWeek(new Date());
  const playbook = playbooks[week % playbooks.length];

  const subject = `${playbook.title}`;
  // The issue itself, the playbook plus every block in NEWSLETTER_FEATURES
  // (lib/newsletter.ts). Featured now: the Free Online Presence Audit.
  const html = renderNewsletter(playbook);

  // ?preview=1 returns this week's issue as a page and stops there. It never
  // reaches Resend, so the issue can be read before anybody schedules it.
  if (new URL(req.url).searchParams.get('preview') === '1') {
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    return NextResponse.json(
      { error: 'Missing RESEND_API_KEY or RESEND_AUDIENCE_ID' },
      { status: 500 }
    );
  }
  const resend = resendClient();

  // Create the broadcast tied to the audience
  let broadcastId: string | undefined;
  try {
    const create = await resend.broadcasts.create({
      audienceId,
      from: OUTREACH_FROM,
      replyTo: 'sarah@modernmustardseed.com',
      subject,
      html,
      name: `Week ${week}: ${playbook.title}`,
    });
    broadcastId = create.data?.id;
  } catch (err) {
    console.error('Broadcast create error:', err);
    return NextResponse.json({ error: 'Broadcast create failed' }, { status: 500 });
  }

  if (!broadcastId) {
    return NextResponse.json({ error: 'No broadcast id returned' }, { status: 500 });
  }

  // Send the broadcast immediately
  try {
    await resend.broadcasts.send(broadcastId);
  } catch (err) {
    console.error('Broadcast send error:', err);
    return NextResponse.json({ error: 'Broadcast send failed', broadcastId }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    week,
    playbook: playbook.slug,
    broadcastId,
  });
}
