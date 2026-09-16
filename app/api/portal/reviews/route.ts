import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';
import { resendClient } from '@/lib/send-email';
import { sendSms, toE164 } from '@/lib/sms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ASK FOR A REVIEW. A job closes, the owner types the homeowner's name and
 * email (a phone too, when texts work), and one short note goes out from the
 * business with the places to leave a review, Google first. Every ask is
 * kept so nobody is asked twice by accident. Scoped by the signed-in email.
 */
type Ask = { id: string; name: string; email: string | null; phone: string | null; project: string | null; sent_email: boolean; sent_sms: boolean; error: string | null; created_at: string };

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project) return NextResponse.json({ reviews: null });
  let asks: Ask[] = [];
  try {
    const { data } = await sb.from('client_review_requests').select('id, name, email, phone, project, sent_email, sent_sms, error, created_at').eq('client_email', session.email).order('created_at', { ascending: false }).limit(50);
    asks = (data ?? []) as Ask[];
  } catch {
    /* not migrated */
  }
  return NextResponse.json({ reviews: { links: project.reviews, asks, projects: project.projects } });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project) return NextResponse.json({ error: 'Not on a project.' }, { status: 404 });
  let body: { name?: string; email?: string; phone?: string; project?: string; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const name = String(body.name ?? '').trim().slice(0, 120);
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 200) || null;
  const phone = String(body.phone ?? '').trim().slice(0, 40) || null;
  const which = String(body.project ?? '').trim().slice(0, 160) || null;
  const note = String(body.note ?? '').trim().slice(0, 600);
  if (!name) return NextResponse.json({ error: 'Their name, at least.' }, { status: 400 });
  if (!email && !phone) return NextResponse.json({ error: 'An email or a mobile number to send it to.' }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'That email does not look right.' }, { status: 400 });

  const first = name.split(/\s+/)[0];
  const google = project.reviews.find((r) => r.key === 'google');
  const others = project.reviews.filter((r) => r.key !== 'google');
  const owner = project.notify.emails[0] ?? 'sarah@modernmustardseed.com';
  const textLines = [
    `${first},`,
    '',
    note || `Thank you for building with us${which ? ` on ${which}` : ''}. It meant a lot to be trusted with your home.`,
    '',
    'If you have two minutes, a review helps the next family find us. Google matters most:',
    google?.url ?? '',
    '',
    others.length ? `If you would rather: ${others.map((r) => `${r.label} ${r.url}`).join(' or ')}` : '',
    '',
    'Thank you,',
    `Shan and Carmen, ${project.business}`,
    project.phone,
  ].filter((l, i, a) => !(l === '' && a[i - 1] === ''));
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const result: { sent_email: boolean; sent_sms: boolean; error: string | null } = { sent_email: false, sent_sms: false, error: null };
  if (email) {
    try {
      const resend = resendClient();
      const sent = await resend.emails.send({
        from: `${project.business} <sarah@modernmustardseed.com>`,
        to: [email],
        replyTo: [owner],
        subject: `A quick favor from ${project.business}`,
        html: `<div style="font:400 16px/1.6 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;"><p>${esc(first)},</p><p>${esc(note || `Thank you for building with us${which ? ` on ${which}` : ''}. It meant a lot to be trusted with your home.`)}</p><p>If you have two minutes, a review helps the next family find us. Google matters most:</p><p><a href="${google?.url ?? '#'}" style="display:inline-block;background:#48603c;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Leave a Google review</a></p>${others.length ? `<p style="opacity:.75;">If you would rather: ${others.map((r) => `<a href="${r.url}" style="color:#9b4f2f;">${esc(r.label)}</a>`).join(' or ')}</p>` : ''}<p>Thank you,<br>Shan and Carmen, ${esc(project.business)}<br>${esc(project.phone)}</p></div>`,
        text: textLines.join('\n'),
      });
      result.sent_email = !sent.error;
      if (sent.error) result.error = sent.error.message;
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }
  }
  if (phone && toE164(phone)) {
    const sms = await sendSms(phone, `${first}, thank you for building with ${project.business}. If you have two minutes, a Google review helps the next family find us: ${google?.url ?? ''} Shan and Carmen`);
    result.sent_sms = sms.ok;
    if (!sms.ok && !result.sent_email) result.error = sms.error ?? 'The text did not send.';
  }
  await sb.from('client_review_requests').insert({ client_email: session.email, name, email, phone, project: which, ...result });
  if (!result.sent_email && !result.sent_sms) return NextResponse.json({ error: result.error ?? 'Nothing went out.' }, { status: 502 });
  return NextResponse.json({ ok: true, ...result });
}
