/**
 * The Switchboard lead magnet: a franchise operator runs the Command Board
 * projection and drops their email. Capture the lead (with their location count
 * and quote) and ping Sarah to reach out. Franchise deals are sales-led, so this
 * is a lead, not a checkout; Sarah closes with a proposal from /admin/switchboard.
 */

import { NextResponse } from 'next/server';
import { insertLead } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { quoteFor, usd } from '@/data/switchboard';

export const runtime = 'nodejs';
export const maxDuration = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; business?: string; locations?: number; ticket?: number; recoveredMonthly?: number; variant?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const business = (body.business || '').trim().slice(0, 120);
  const locations = Math.max(1, Math.min(9999, Math.round(Number(body.locations) || 1)));
  const recovered = Math.max(0, Math.round(Number(body.recoveredMonthly) || 0));
  // Which hero A/B variant this lead saw (blank if none): tags the lead for conversion.
  const variant = body.variant === 'A' || body.variant === 'B' ? body.variant : '';
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const quote = quoteFor(locations);

  try {
    await insertLead({
      type: 'contact',
      email,
      name: business || null,
      source: 'switchboard',
      status: 'new',
      notes: `[switchboard]${variant ? ` [hero:${variant}]` : ''} ${business || 'a brand'} · ${locations} locations · quote ${usd(quote.monthlyUsd)}/mo (${usd(quote.perLocationUsd)}/loc) + ${usd(quote.buildUsd)} build · projected recovered ${usd(recovered)}/mo. Mint proposal at /admin/switchboard.`,
    });
  } catch (err) {
    console.error('switchboard lead insert failed', err);
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'The Switchboard <hello@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: `SWITCHBOARD lead: ${business || email} · ${locations} locations · ${usd(quote.monthlyUsd)}/mo`,
        html: leadNotification({
          type: 'Contact',
          name: business || 'A brand',
          email,
          fields: [
            { label: 'Brand', value: business || 'not given' },
            { label: 'Locations', value: String(locations) },
            { label: 'Quote', value: `${usd(quote.monthlyUsd)}/mo (${usd(quote.perLocationUsd)}/loc) + ${usd(quote.buildUsd)} build` },
            { label: 'Annual', value: usd(quote.annualUsd) },
            { label: 'Projected recovered', value: `${usd(recovered)}/mo` },
          ],
          message: 'A multi-location brand ran the Command Board projection. This is a one-to-many deal, chase it.',
          suggestedAction: 'Mint their proposal at /admin/switchboard and book a walkthrough.',
        }),
      });
    } catch (err) {
      console.error('switchboard notify failed', err);
    }
  }

  return NextResponse.json({ ok: true, message: 'Your projection is on its way.' });
}
