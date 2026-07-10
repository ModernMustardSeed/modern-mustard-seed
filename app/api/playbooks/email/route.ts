import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { marked } from 'marked';
import { getContent } from '@/lib/content';
import { clientEmail, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * "Email this to me" for a free playbook. Sends the full playbook content to the
 * reader so they keep it permanently in their inbox, captures them as a lead,
 * and adds them to the Resend audience when configured.
 */
export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email is not configured yet.' }, { status: 500 });

  let body: { email?: string; slug?: string; firstName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = (body.email || '').trim();
  const slug = (body.slug || '').trim();
  const firstName = (body.firstName || '').trim() || undefined;
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  if (!slug) return NextResponse.json({ error: 'Missing playbook.' }, { status: 400 });

  const pb = getContent('playbooks', slug);
  if (!pb || pb.meta.draft) return NextResponse.json({ error: 'Playbook not found.' }, { status: 404 });

  const contentHtml = await marked.parse(pb.body);
  const url = `https://modernmustardseed.com/playbooks/${slug}`;
  const greetingName = firstName || email.split('@')[0];
  const resend = resendClient();

  try {
    const { error } = await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: pb.meta.title,
      html: clientEmail({
        preheader: `Your copy of ${pb.meta.title}. Yours to keep.`,
        greeting: `Hi ${greetingName},`,
        body:
          p(`Here is the full playbook, <strong>${pb.meta.title}</strong>, to keep forever. ${pb.meta.description}`) +
          `<div style="margin-top:10px">${contentHtml}</div>`,
        cta: { label: 'Read it online', url },
        secondary: { label: 'Browse more playbooks', url: 'https://modernmustardseed.com/playbooks' },
      }),
    });
    if (error) {
      console.error('playbook email send failed', error);
      return NextResponse.json({ error: 'Could not send. Try again in a moment.' }, { status: 500 });
    }
  } catch (err) {
    console.error('playbook email send failed', err);
    return NextResponse.json({ error: 'Could not send. Try again in a moment.' }, { status: 500 });
  }

  // Capture the reader (best effort, never blocks the send).
  try {
    await insertLead({ type: 'newsletter', name: firstName ?? null, email, source: `playbook:${slug}` });
  } catch {
    /* lead capture optional */
  }
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (audienceId) {
    try {
      await resend.contacts.create({ email, firstName, unsubscribed: false, audienceId });
    } catch {
      /* already a contact, or audience not reachable */
    }
  }

  return NextResponse.json({ success: true, message: 'Sent. Check your inbox, it is yours to keep.' });
}
