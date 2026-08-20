import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/acq/events';
import { mintLink } from '@/lib/mustard/links';
import { classifyHit, verdictDetail } from '@/lib/acq/bots';
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
        // Most of what reaches this route is a mail security gateway following
        // the link before the recipient has seen the message. It gets its row,
        // labelled for what it is, and it never moves the lead or the funnel.
        const hit = await classifyHit(db, leadId, req.headers);
        await recordEvent(db, {
          leadId,
          type: 'link_clicked',
          label: hit.machine
            ? `Security scanner followed the link${step ? ` in email ${step}` : ''}`
            : `Clicked the Mr. Mustard button${step ? ` from email ${step}` : ''}`,
          detail: { step, variant, referer: req.headers.get('referer'), ...verdictDetail(hit) },
        });
        // `engaged` is a claim about a person. Only a person earns it.
        await db
          .from('outbound_leads')
          .update(
            hit.machine
              ? { last_scanned_at: new Date().toISOString() }
              : { last_seen_at: new Date().toISOString(), reservoir_state: 'engaged' },
          )
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
