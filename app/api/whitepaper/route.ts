import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { clientEmail, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

const PDF_URL = '/downloads/ai-voice-agents-whitepaper.pdf';

/**
 * Lead capture for the AI Voice Agent whitepaper. Records the lead (into the
 * CRM/tracker), emails them the PDF link plus a booking CTA, adds them to the
 * Resend audience, and pings Sarah. Returns the PDF url so the page can reveal
 * the download immediately. Never throws to the client once the lead is saved.
 */
export async function POST(req: Request) {
  let payload: { name?: unknown; email?: unknown; phone?: unknown; company?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return NextResponse.json({ ok: true, pdfUrl: PDF_URL });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : null;
  const phone = typeof payload.phone === 'string' && payload.phone.trim() ? payload.phone.trim() : null;
  const firstName = (name || email.split('@')[0]).split(' ')[0];
  const fullPdfUrl = `${SITE.url}${PDF_URL}`;

  try {
    await insertLead({
      type: 'contact',
      name,
      email,
      phone,
      source: 'whitepaper-voice-agents',
      message: 'Downloaded the AI voice agent whitepaper',
    });
  } catch (e) {
    console.error('whitepaper insertLead', e);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = resendClient();
    const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
    if (AUDIENCE_ID) {
      try { await resend.contacts.create({ email, unsubscribed: false, audienceId: AUDIENCE_ID }); } catch (e) { console.warn('whitepaper audience add', e); }
    }
    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'Your AI Voice Agent whitepaper',
        html: clientEmail({
          preheader: 'The full field guide to AI voice agents that answer every call, in any language.',
          greeting: `Hi ${firstName},`,
          body:
            p('Here is the whitepaper, the full picture of what an AI voice agent can do for your business: answer every call 24/7, remember every caller, speak over 100 languages, run inbound and outbound, book appointments, take orders, and upsell.') +
            p('The best part is you can hear it. Talk to our agent live on the voice-agents page, in the language of your choice, then book a short call and we will scope one to your business.'),
          cta: { label: 'Read the whitepaper (PDF)', url: fullPdfUrl },
          secondary: { label: 'Hear the live demo', url: `${SITE.url}/voice-agents` },
        }),
      });
    } catch (e) {
      console.error('whitepaper requester email', e);
    }
    try {
      await resend.emails.send({
        from: 'Whitepaper <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        subject: `New whitepaper lead: ${firstName}`,
        html: `<p>New lead from the AI voice agent whitepaper.</p><ul><li><strong>Name:</strong> ${name ?? 'not given'}</li><li><strong>Email:</strong> ${email}</li><li><strong>Phone:</strong> ${phone ?? 'not given'}</li></ul><p>Speed to lead: a quick call or a Mr. Mustard callback while it is warm.</p>`,
      });
    } catch (e) {
      console.warn('whitepaper notify', e);
    }
  }

  return NextResponse.json({ ok: true, pdfUrl: PDF_URL });
}
