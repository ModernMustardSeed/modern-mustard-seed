import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { clientEmail, leadNotification, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }
    const resend = resendClient();
    const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

    const { email, firstName } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (AUDIENCE_ID) {
      try {
        await resend.contacts.create({
          email,
          firstName: firstName ?? undefined,
          unsubscribed: false,
          audienceId: AUDIENCE_ID,
        });
      } catch (e) {
        console.warn('Resend audience add:', e);
      }
    }

    const greetingName = firstName || email.split('@')[0];

    await insertLead({
      type: 'newsletter',
      name: firstName ?? null,
      email,
    });

    // Subscriber welcome
    const { error: welcomeError } = await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'Welcome to Modern Mustard Seed',
      html: clientEmail({
        preheader: 'One short email a week. Real plays. No fluff.',
        greeting: `Hi ${greetingName},`,
        body:
          p('You are now on the Modern Mustard Seed list. Here is what to expect:') +
          `<ul style="margin:0 0 18px;padding-left:22px;color:#e9e1cf;line-height:1.75;font-size:16px">
            <li style="margin-bottom:10px"><strong style="color:#fff">One email a week.</strong> A real playbook, a live build, or a teardown of something we shipped.</li>
            <li style="margin-bottom:10px"><strong style="color:#fff">No fluff.</strong> If I do not have something useful to say, I will not send.</li>
            <li><strong style="color:#fff">Subscriber-only PDFs</strong> on the playbooks we publish.</li>
          </ul>` +
          p('Want to start with something concrete? Run the free AI audit and get a 60-second readout on the highest-leverage moves you could make in your business.'),
        cta: { label: 'Run the free AI audit', url: 'https://modernmustardseed.com/audit' },
        secondary: { label: 'See recent work', url: 'https://modernmustardseed.com/work' },
      }),
    });

    if (welcomeError) {
      return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
    }

    // Sarah notification
    await resend.emails.send({
      from: 'Newsletter Signups <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `New subscriber: ${greetingName}`,
      html: leadNotification({
        type: 'Newsletter',
        name: firstName || greetingName,
        email,
        fields: [{ label: 'Audience', value: AUDIENCE_ID ? 'Added to Resend audience' : 'Not in audience (set RESEND_AUDIENCE_ID)' }],
      }),
    });

    return NextResponse.json({ success: true, message: 'You are in. Check your inbox.' });
  } catch (err) {
    console.error('Newsletter error:', err);
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
