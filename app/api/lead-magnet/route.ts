import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { clientEmail, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { verticalById } from '@/data/launch-checklist';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * Lead capture for the public New Business Launch Checklist. Takes an email
 * (and optional phone) plus the chosen industry vertical, records the lead,
 * emails the requester their branded PDF link, and pings Sarah. Never throws
 * to the client: as long as we captured the lead we return ok with the PDF url.
 */
export async function POST(req: Request) {
  let payload: { email?: unknown; phone?: unknown; vertical?: unknown; company?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return NextResponse.json({ ok: true, pdfUrl: '/api/launch-checklist/pdf?vertical=general' });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  const phone = typeof payload.phone === 'string' && payload.phone.trim() ? payload.phone.trim() : null;
  const vertical = verticalById(typeof payload.vertical === 'string' ? payload.vertical : 'general');
  const pdfUrl = `/api/launch-checklist/pdf?vertical=${vertical.id}`;
  const fullPdfUrl = `${SITE.url}${pdfUrl}`;
  const firstName = email.split('@')[0];

  // 1) Record the lead (best-effort, never blocks the response).
  try {
    await insertLead({
      type: 'contact',
      email,
      phone,
      industry: vertical.label,
      source: 'launch-checklist',
    });
  } catch (e) {
    console.error('lead-magnet insertLead', e);
  }

  // 2) Email the requester their checklist + notify Sarah (best-effort).
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

    if (AUDIENCE_ID) {
      try {
        await resend.contacts.create({ email, unsubscribed: false, audienceId: AUDIENCE_ID });
      } catch (e) {
        console.warn('lead-magnet audience add', e);
      }
    }

    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'Your New Business Launch Checklist',
        html: clientEmail({
          preheader: `Every step to open and digitize your business, tailored for ${vertical.label}.`,
          greeting: `Hi ${firstName},`,
          body:
            p(`Here is your New Business Launch Checklist, tailored for ${vertical.label}. It walks you through every step to get open, online, and bringing in customers: the legal foundation, the money setup, getting found on Google and Maps, your website and brand, the CRM and AI agents that answer and book for you, and the funnels that turn attention into paying work.`) +
            p('Work through it at your own pace. When you want any of it handled for you, properly and fast, that is exactly what we build.'),
          cta: { label: 'Download your checklist (PDF)', url: fullPdfUrl },
          secondary: { label: 'Have us set it all up', url: `${SITE.url}/work-with-us` },
        }),
      });
    } catch (e) {
      console.error('lead-magnet requester email', e);
    }

    try {
      await resend.emails.send({
        from: 'Launch Checklist <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        subject: `New checklist lead: ${firstName} (${vertical.label})`,
        html: `<p>New lead from the Launch Checklist lead magnet.</p>
<ul>
  <li><strong>Email:</strong> ${email}</li>
  <li><strong>Phone:</strong> ${phone ?? 'not given'}</li>
  <li><strong>Industry:</strong> ${vertical.label}</li>
</ul>`,
      });
    } catch (e) {
      console.warn('lead-magnet notify', e);
    }
  }

  return NextResponse.json({ ok: true, pdfUrl });
}
