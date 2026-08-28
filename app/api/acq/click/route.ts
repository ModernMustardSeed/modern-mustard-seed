import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordEventOnce } from '@/lib/acq/events';
import { mintLink } from '@/lib/mustard/links';
import { classifyHit, verdictDetail } from '@/lib/acq/bots';
import { getSurface } from '@/lib/mustard/surface';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * THE CTA REDIRECT.
 *
 * Every campaign button points here, so a click is a measured fact rather than
 * an inference from an open. Then it hands them to the door the button named.
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

  // The three doors.
  //
  // `demos` is now the campaign's front door: since 2026-08-25 the sequence
  // stops asking for permission to call and hands people the free build
  // instead. `talking-website` is the second link under it, for the reader who
  // wants the website as well as the agent. `mustard` stays because the
  // permission page is still reachable from the /mustard QR, Sarah reading the
  // URL down the phone, and every link minted before the change.
  //
  // A WHITELIST, NEVER A URL. This target rides in a query string on a link we
  // mail to strangers, so accepting an arbitrary destination would turn our own
  // domain into somebody else's phishing redirect. Anything unrecognised falls
  // back to the free build rather than erroring.
  const DOORS: Record<string, string> = { mustard: '/mustard', demos: '/demos', 'talking-website': '/talking-website' };
  const doorKey = DOORS[url.searchParams.get('d') ?? ''] ? (url.searchParams.get('d') as string) : 'mustard';

  const target = new URL(`${SITE.url}${DOORS[doorKey]}`);
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
        const hit = await classifyHit(db, { leadId, type: 'link_clicked', headers: req.headers });
        await recordEventOnce(
          db,
          {
            leadId,
            type: 'link_clicked',
            label: hit.machine
              ? `Security scanner followed the link${step ? ` in email ${step}` : ''}`
              : doorKey === 'demos'
                ? `Went for the free build${step ? ` from email ${step}` : ''}`
                : doorKey === 'talking-website'
                  ? `Went for the Talking Website${step ? ` from email ${step}` : ''}`
                  : `Clicked the Mr. Mustard button${step ? ` from email ${step}` : ''}`,
            detail: { step, variant, door: doorKey, referer: req.headers.get('referer'), ...verdictDetail(hit) },
          },
          // Gateways fetch the same URL twice in the same second. A person who
          // taps the button twice in two minutes tapped it once.
          2,
          { machine: hit.machine },
        );
        // `engaged` is a claim about a person. Only a person earns it.
        await db
          .from('outbound_leads')
          .update(
            hit.machine
              ? { last_scanned_at: new Date().toISOString() }
              : { last_seen_at: new Date().toISOString(), reservoir_state: 'engaged' },
          )
          .eq('id', leadId);

        // The magic link prefills /mustard so the recipient types nothing. The
        // demo suite has no such slot, and a live token nobody consumes is just
        // a credential sitting in a URL, so that door does not get one.
        if (doorKey === 'mustard') {
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
        }
      } catch {
        /* never block the redirect */
      }
    }
  }

  return NextResponse.redirect(target.toString(), { status: 302 });
}
