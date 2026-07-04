import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { clientEmail, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { nicheById } from '@/data/prompt-playbook';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * Lead capture for the public AI Prompt Playbook. Takes an email (and optional
 * phone) plus the chosen niche, records the lead, emails the requester their
 * branded PDF link, and pings Sarah. Never throws to the client: as long as we
 * captured the lead we return ok with the PDF url.
 */
export async function POST(req: Request) {
  let payload: { email?: unknown; phone?: unknown; niche?: unknown; company?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return NextResponse.json({ ok: true, pdfUrl: '/api/prompt-playbook/pdf?niche=general' });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  const phone = typeof payload.phone === 'string' && payload.phone.trim() ? payload.phone.trim() : null;
  const niche = nicheById(typeof payload.niche === 'string' ? payload.niche : 'general');
  const pdfUrl = `/api/prompt-playbook/pdf?niche=${niche.id}`;
  const fullPdfUrl = `${SITE.url}${pdfUrl}`;
  const firstName = email.split('@')[0];

  // 1) Record the lead (best-effort, never blocks the response).
  try {
    await insertLead({
      type: 'contact',
      email,
      phone,
      industry: niche.label,
      source: 'prompt-playbook',
    });
  } catch (e) {
    console.error('prompt-playbook insertLead', e);
  }

  // 2) Email the requester their playbook + notify Sarah (best-effort).
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

    if (AUDIENCE_ID) {
      try {
        await resend.contacts.create({ email, unsubscribed: false, audienceId: AUDIENCE_ID });
      } catch (e) {
        console.warn('prompt-playbook audience add', e);
      }
    }

    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'Your AI Prompt Playbook',
        html: clientEmail({
          preheader: `Ready-to-paste AI prompts, tailored for ${niche.label}. Start today, no experience needed.`,
          greeting: `Hi ${firstName},`,
          body:
            p(`Here is your AI Prompt Playbook, tailored for ${niche.label}. It is built for anyone who wants to use AI but never has. Open a free tool like Claude (claude.ai) or ChatGPT (chatgpt.com), paste one of the prompts, and watch it write the email, the week of social posts, the proposal, or the summary for you.`) +
            p('Every prompt is already customized to your work. Fill in the blanks in brackets, press enter, and if it is not quite right just tell it to make it shorter or more casual. You cannot break it.') +
            p('When you are ready for AI that answers your phone, books appointments, and follows up with every lead around the clock, that is exactly what we build.'),
          cta: { label: 'Download your playbook (PDF)', url: fullPdfUrl },
          secondary: { label: 'See what we build', url: `${SITE.url}/work-with-us` },
        }),
      });
    } catch (e) {
      console.error('prompt-playbook requester email', e);
    }

    try {
      await resend.emails.send({
        from: 'AI Prompt Playbook <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        subject: `New playbook lead: ${firstName} (${niche.label})`,
        html: `<p>New lead from the AI Prompt Playbook lead magnet.</p>
<ul>
  <li><strong>Email:</strong> ${email}</li>
  <li><strong>Phone:</strong> ${phone ?? 'not given'}</li>
  <li><strong>Niche:</strong> ${niche.label}</li>
</ul>`,
      });
    } catch (e) {
      console.warn('prompt-playbook notify', e);
    }
  }

  return NextResponse.json({ ok: true, pdfUrl });
}
