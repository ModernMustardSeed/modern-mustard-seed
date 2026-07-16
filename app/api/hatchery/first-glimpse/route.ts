/**
 * The free First Glimpse: the /hatchery lead magnet. A visitor drops their shop
 * name and email to reserve a hand-made "first sketch" of what their mascot
 * could be. This captures the lead (hard-capped one per email forever) and
 * pings Sarah to make the glimpse by hand. The glimpse is fulfilled by a human.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { insertLead } from '@/lib/supabase';
import { claimGlimpse } from '@/lib/hatchery-store';
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';
export const maxDuration = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; business?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const business = (body.business || '').trim().slice(0, 120);
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  // Hard cap: one First Glimpse per email, forever. A repeat is not an error to
  // the visitor; they already have one coming.
  const supabase = getSupabase();
  if (supabase) {
    const claim = await claimGlimpse(supabase, email);
    if (claim === 'taken') {
      return NextResponse.json({ ok: true, repeat: true, message: 'Your First Glimpse is already on its way.' });
    }
  }

  try {
    await insertLead({
      type: 'contact',
      email,
      name: null,
      source: 'hatchery-first-glimpse',
      status: 'new',
      notes: `[hatchery] First Glimpse requested${business ? ` for ${business}` : ''}. MAKE by hand.`,
    });
  } catch (err) {
    console.error('first-glimpse lead insert failed', err);
  }

  // Best-effort notify. Never fail the visitor's request on an email hiccup.
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'The Mustard Hatchery <hello@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `First Glimpse requested: ${business || email}`,
        html: leadNotification({
          type: 'Contact',
          name: business || 'A shop',
          email,
          fields: [
            { label: 'Business', value: business || 'not given' },
            { label: 'Email', value: email },
          ],
          message: 'Someone wants to see what their mascot could be. Make them a First Glimpse sketch by hand and send it.',
          suggestedAction: 'Reply with a candlelit first sketch, then invite them to hatch their mascot.',
        }),
      });
    } catch (err) {
      console.error('first-glimpse notify failed', err);
    }
  }

  return NextResponse.json({ ok: true, message: 'Your First Glimpse is on its way.' });
}
