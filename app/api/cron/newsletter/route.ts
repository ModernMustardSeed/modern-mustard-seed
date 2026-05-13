import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { listContent } from '@/lib/content';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Weekly newsletter cron. Picks a playbook on rotation and broadcasts it
// to the Resend audience. Schedule via vercel.json crons (Tuesdays 10am UTC).
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

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    return NextResponse.json(
      { error: 'Missing RESEND_API_KEY or RESEND_AUDIENCE_ID' },
      { status: 500 }
    );
  }
  const resend = new Resend(apiKey);

  const playbooks = listContent('playbooks');
  if (playbooks.length === 0) {
    return NextResponse.json({ error: 'No playbooks available' }, { status: 500 });
  }

  // Predictable weekly rotation through the playbook library
  const week = isoWeek(new Date());
  const playbook = playbooks[week % playbooks.length];

  const playbookUrl = `https://modernmustardseed.com/playbooks/${playbook.slug}`;
  const subject = `${playbook.title}`;

  const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;line-height:1.65;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <p style="font-size:11px;letter-spacing:3px;color:#C8A415;text-transform:uppercase;font-weight:700">
    Playbook of the Week
  </p>
  <h1 style="font-size:28px;margin:8px 0 16px;color:#0a0804">${playbook.title}</h1>
  <p style="font-size:16px;color:#555;margin-bottom:24px">${playbook.description}</p>
  <p style="margin:24px 0">
    <a href="${playbookUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#C8A415,#FFE082);color:#0a0804;text-decoration:none;font-weight:700;border-radius:999px;font-size:12px;letter-spacing:2px;text-transform:uppercase">Read the playbook</a>
  </p>
  <p style="font-size:14px;color:#777">Free to read. Free to run yourself. The whole point.</p>
  <p style="font-size:14px;color:#777">If you would rather have us ship the thing for you, the <a href="https://modernmustardseed.com/build-queue" style="color:#C8A415">Build Queue</a> is open. Four slots a quarter.</p>
  <hr style="border:0;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#888">Modern Mustard Seed. Apps, sites, and specialty AI tools.<br>
  Reply to this email to talk to Sarah directly.</p>
  <p style="font-size:11px;color:#aaa">You are getting this because you subscribed at modernmustardseed.com.
  <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#aaa">Unsubscribe</a>.</p>
</body></html>
  `;

  // Create the broadcast tied to the audience
  let broadcastId: string | undefined;
  try {
    const create = await resend.broadcasts.create({
      audienceId,
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
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
