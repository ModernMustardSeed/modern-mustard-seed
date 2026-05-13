import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { clientEmail, leadNotification, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }
    const resend = new Resend(apiKey);
    const { name, email, message, source } = await req.json();

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
        cta: { label: 'Book a 30-min call', url: 'https://modernmustardseed.zohobookings.com/#/4764600000000052054' },
        secondary: { label: 'Run the free AI audit', url: 'https://modernmustardseed.com/audit' },
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
