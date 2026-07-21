import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { clientEmail, p } from '@/lib/email';
import { insertLead } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Waitlist capture for CELEBRATE (gifting on autopilot). Takes an email,
 * an optional business name, and the parade the visitor built (a compact
 * list of "Name · MAR 14 · Birthday" strings), records the lead, confirms
 * to the requester, and pings Sarah. Never throws to the client: as long
 * as we captured the lead we return ok.
 */
export async function POST(req: Request) {
  let payload: { email?: unknown; business?: unknown; people?: unknown; company?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  const business =
    typeof payload.business === 'string' && payload.business.trim() ? payload.business.trim().slice(0, 120) : null;
  const people = Array.isArray(payload.people)
    ? payload.people
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .slice(0, 24)
        .map((x) => x.slice(0, 80))
    : [];
  const firstName = email.split('@')[0];

  // 1) Record the lead (best-effort, never blocks the response).
  try {
    await insertLead({
      type: 'contact',
      email,
      business_name: business,
      industry: 'celebrate',
      source: 'celebrate-waitlist',
      message:
        people.length > 0
          ? `CELEBRATE waitlist. Parade (${people.length}): ${people.join(' | ')}`
          : 'CELEBRATE waitlist. No parade built.',
    });
  } catch (e) {
    console.error('celebrate insertLead', e);
  }

  // 2) Confirm to the requester + notify Sarah (best-effort).
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = resendClient();
    const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

    if (AUDIENCE_ID) {
      try {
        await resend.contacts.create({ email, unsubscribed: false, audienceId: AUDIENCE_ID });
      } catch (e) {
        console.warn('celebrate audience add', e);
      }
    }

    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'You are on the parade route',
        html: clientEmail({
          preheader: 'Celebrate: real cakes, fresh flowers, and handwritten cards on autopilot, from local shops.',
          greeting: `Hi ${firstName},`,
          body:
            p(
              people.length > 0
                ? `Your parade is saved: ${people.length} ${people.length === 1 ? 'person' : 'people'} who will never go uncelebrated. When Celebrate opens on your route, your year is already loaded and the first dispatch is one click away.`
                : 'You are on the Celebrate waitlist. Load your people once, set a budget, and real cakes, fresh flowers, and handwritten cards from local shops go out on every date that matters.'
            ) +
            p(
              'The founding route is the Flathead Valley, Montana, and corporate pilots are running now. If you want your team or your best clients celebrated starting this month, grab a pilot slot below.'
            ),
          cta: { label: 'Book a corporate pilot', url: `${SITE.url}/book` },
          secondary: { label: 'See how Celebrate works', url: `${SITE.url}/celebrate` },
        }),
      });
    } catch (e) {
      console.error('celebrate requester email', e);
    }

    try {
      await resend.emails.send({
        from: 'Celebrate Waitlist <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `New Celebrate waitlist: ${firstName}${business ? ` (${business})` : ''}`,
        html: `<p>New lead from the Celebrate parade builder.</p>
<ul>
  <li><strong>Email:</strong> ${escapeHtml(email)}</li>
  <li><strong>Business:</strong> ${business ? escapeHtml(business) : 'not given'}</li>
  <li><strong>Parade:</strong> ${people.length > 0 ? escapeHtml(people.join(' | ')) : 'none built'}</li>
</ul>`,
      });
    } catch (e) {
      console.warn('celebrate notify', e);
    }
  }

  return NextResponse.json({ ok: true });
}
