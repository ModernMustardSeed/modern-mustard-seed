import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/acq/events';
import { mintLink } from '@/lib/mustard/links';
import { getSurface } from '@/lib/mustard/surface';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * THE CTA REDIRECT.
 *
 * Every "yes, have Mr. Mustard call me" button in the campaign points here, so
 * a click is a measured fact rather than an inference from an open. Then it
 * hands them to the ONE doorway.
 *
 * It mints a signed magic link on the way through rather than putting the
 * prospect id in the URL. Two reasons: the recipient types nothing because
 * their number is already known, and a forwarded email cannot be used to look
 * up a stranger's record by editing a query parameter.
 *
 * It never blocks: a slow database must not sit between a curious contractor
 * and the page they clicked toward, so a failed mint still lands them on
 * /mustard with the source attached.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const leadId = url.searchParams.get('p');
  const step = url.searchParams.get('s');
  const variant = url.searchParams.get('v');

  const target = new URL(`${SITE.url}/mustard`);
  target.searchParams.set('source', 'cold-email');
  if (variant) target.searchParams.set('utm_content', variant);
  if (step) target.searchParams.set('utm_campaign', `meet-mr-mustard-${step}`);

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
        await db
          .from('outbound_leads')
          .update({ last_seen_at: new Date().toISOString(), reservoir_state: 'engaged' })
          .eq('id', leadId);

        const surface = await getSurface();
        const link = await mintLink(db, {
          leadId,
          source: 'cold-email',
          campaign: step ? `meet-mr-mustard-${step}` : null,
          createdBy: 'campaign',
          // Short, because this is a click that just happened. A campaign link
          // that stays live for a week is a link that outlives its context.
          ttlHours: 24,
          surfaceId: surface.id || null,
        });
        if (link) target.searchParams.set('t', link.token);
      } catch {
        /* never block the redirect */
      }
    }
  }

  return NextResponse.redirect(target.toString(), { status: 302 });
}
