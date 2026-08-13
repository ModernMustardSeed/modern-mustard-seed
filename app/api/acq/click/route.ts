import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/acq/events';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * THE CTA REDIRECT.
 *
 * Every "yes, have Mr. Mustard call me" button in the campaign points here so a
 * click is a measured fact rather than an inference from an open. It records
 * the click, then sends them straight to the permission page with their
 * prospect id attached so the form arrives prefilled.
 *
 * It never blocks on the write: a slow database must not sit between a curious
 * contractor and the page they clicked toward.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const leadId = url.searchParams.get('p');
  const step = url.searchParams.get('s');
  const variant = url.searchParams.get('v');

  const target = new URL(`${SITE.url}/meet-mr-mustard`);
  if (leadId) target.searchParams.set('p', leadId);
  if (variant) target.searchParams.set('v', variant);
  if (step) target.searchParams.set('s', step);

  if (leadId && /^[0-9a-f-]{36}$/i.test(leadId)) {
    const db = getSupabase();
    if (db) {
      try {
        await recordEvent(db, {
          leadId,
          type: 'link_clicked',
          label: `Clicked the Mr. Mustard button${step ? ` from email ${step}` : ''}`,
          detail: { step, variant, referer: req.headers.get('referer') },
        });
        // A click is real intent, so the lead leaves the "cold" bucket now
        // rather than when the form is submitted.
        await db.from('outbound_leads').update({ last_seen_at: new Date().toISOString() }).eq('id', leadId);
      } catch {
        /* never block the redirect */
      }
    }
  }

  return NextResponse.redirect(target.toString(), { status: 302 });
}
