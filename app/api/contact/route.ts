import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { clientEmail, leadNotification, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { trackServerConversion } from '@/lib/meta-capi';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }
    const resend = resendClient();
    const { name, email, message, source, metaEventId, fbp, fbc } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    await insertLead({
      type: 'contact',
      name,
      email,
      message,
      source: source ?? null,
    });

    // Meta Conversions API (server-side), deduped against the browser Pixel
    // via the shared metaEventId. No-op until the Meta env vars are set.
    await trackServerConversion(req, {
      eventName: 'Lead',
      email,
      eventId: metaEventId,
      fbp,
      fbc,
      customData: { lead_source: source || 'contact-form' },
    });

    const firstName = String(name).split(' ')[0];
    const fields = [
      { label: 'Email', value: email, isLink: false },
      ...(source ? [{ label: 'Package interest', value: source }] : []),
    ];

    // Sarah notification
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      replyTo: email,
      subject: source ? `New ${source} inquiry from ${name}` : `New Inquiry from ${name}`,
      html: leadNotification({
        type: 'Contact',
        name,
        email,
        fields,
        message,
        suggestedAction: 'Reply within 24-48 hours',
      }),
    });

    // Applicant auto-reply
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'Thanks for reaching out',
      html: clientEmail({
        preheader: 'I got your note and will reply within 24-48 hours.',
        greeting: `Hi ${firstName},`,
        body:
          p('Thanks for reaching out. I got your message and will personally reply within 24-48 hours.') +
          p('In the meantime, two useful links:'),
        cta: { label: 'Book a 30-min call', url: 'https://modernmustardseed.com/?book=1' },
        secondary: { label: 'Run the free AI audit', url: 'https://modernmustardseed.com/audit' },
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
