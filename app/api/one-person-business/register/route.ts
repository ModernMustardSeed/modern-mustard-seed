import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { clientEmail, escape, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

type RegistrationPayload = {
  name?: unknown;
  email?: unknown;
  idea?: unknown;
  company?: unknown;
};

export async function POST(request: Request) {
  let payload: RegistrationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (typeof payload.company === 'string' && payload.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 100) : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase().slice(0, 254) : '';
  const idea = typeof payload.idea === 'string' ? payload.idea.trim().slice(0, 2000) : '';

  if (!name) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  await insertLead({
    type: 'contact',
    name,
    email,
    idea_description: idea || null,
    source: 'one-person-business-webinar',
    message: 'Registered for The One-Person Business Engine live class.',
  });

  if (process.env.RESEND_API_KEY) {
    const resend = resendClient();
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (audienceId) {
      try {
        await resend.contacts.create({
          email,
          firstName: name.split(/\s+/)[0],
          unsubscribed: false,
          audienceId,
        });
      } catch (error) {
        console.warn('one-person-business audience add', error);
      }
    }

    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'You are in: The One-Person Business Engine',
        html: clientEmail({
          preheader: 'Your seat is saved for the free One-Person Business Engine class.',
          greeting: `Hi ${name.split(/\s+/)[0]},`,
          body:
            p('You are on the list.') +
            p('In this class I will show you the five jobs I build before I hire five people, and the order matters more than the tools.') +
            p('Bring one idea you cannot quite get out of your head. You do not need a logo, a following, or a technical plan.') +
            p('I will email you first with the live date, private room link, and the one-page Engine Map before we begin.'),
          cta: { label: 'See what we will build', url: `${SITE.url}/one-person-business` },
          secondary: { label: 'Meet SEED TO SYSTEM', url: `${SITE.url}/seed-to-system` },
        }),
      });
    } catch (error) {
      console.error('one-person-business confirmation email', error);
    }

    try {
      await resend.emails.send({
        from: 'Webinar Registration <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: email,
        subject: `Engine class registration: ${name}`,
        html: `<p><strong>${escape(name)}</strong> registered for The One-Person Business Engine.</p>
<ul>
  <li><strong>Email:</strong> ${escape(email)}</li>
  <li><strong>Idea:</strong> ${idea ? escape(idea) : 'Not provided'}</li>
</ul>`,
      });
    } catch (error) {
      console.warn('one-person-business owner notify', error);
    }
  }

  return NextResponse.json({ ok: true });
}
