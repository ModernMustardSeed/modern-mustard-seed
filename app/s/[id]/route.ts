import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordEventOnce } from '@/lib/acq/events';
import { classifyAgent } from '@/lib/acq/bots';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE SCAN. What the QR square on a door-drop flyer actually points at.
 *
 * A printed flyer gives nothing back. It is handed across a counter and then it
 * is out of sight, and the only moment it ever reports on itself is the second
 * somebody holds up a phone. That moment is the hottest signal in the whole
 * acquisition engine: not a mail gateway rendering a link, not a form half
 * filled, a business owner standing in his own shop deciding he wants to know
 * what we found. So it gets its own route rather than a query string on the
 * report, for three reasons.
 *
 *   1. It writes. A page render should not have a side effect, and a redirect
 *      handler is the honest place to put one.
 *   2. It is short. `/s/<uuid>` is 45 characters against 65 for the report URL,
 *      which is four fewer rows of modules in the printed square and a faster
 *      lock in a dim restaurant.
 *   3. It works with no JavaScript, which matters when the reader is a camera
 *      app's in-app browser on a phone with one bar in Bigfork.
 *
 * WHAT IT DOES NOT DO. It does not set `contacted`. That mark means a person
 * spoke to a person and nothing automated may ever write it. A scan puts the
 * business on the Follow Up list, where a human decides.
 *
 * Crawlers are classified and recorded as machines rather than dropped, so the
 * count of real scans stays clean and a leaked URL is visible instead of silent
 * (lib/acq/bots.ts, the same reader that caught the cold-email scanner traffic).
 *
 * NOT A NAV ENTRY, and deliberately so. The repo rule that a new public route
 * ships with Footer, Navbar and sitemap links in the same commit is about pages
 * a visitor can be sent to. This is a turnstile: it has no content, it is
 * reachable only by scanning a printed square, and it is disallowed in
 * robots.txt. Linking it anywhere would be the bug.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every answer this route gives is a temporary, uncached, unindexed redirect. */
function send(target: URL) {
  const res = NextResponse.redirect(target, 307);
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // A bad code goes to the free-audit door rather than a 404. Somebody is
  // holding paper with our name on it; the worst answer is a dead end.
  if (!UUID.test(id)) return send(new URL('/website-audit', SITE.url));

  const sb = getSupabase();
  if (!sb) return send(new URL(`/audit/${id}`, SITE.url));

type ScanLead = { id: string; business_name: string; city: string | null; audit_score: number | null };
  let lead: ScanLead | null = null;
  try {
    const { data } = await sb
      .from('outbound_leads')
      .select('id, business_name, city, audit_score')
      .eq('id', id)
      .maybeSingle();
    lead = (data ?? null) as ScanLead | null;
  } catch {
    /* fall through to the report, which handles a missing row on its own */
  }

  /**
   * Two flyers, two destinations.
   *
   * A graded business gets its own report. A business with no website has no
   * report to get, and sending it to a page that says "your report is being
   * prepared" would be a lie told to the one person who reached for the door
   * handle. It goes to the free-build door instead, which is what its flyer
   * offered.
   */
  const target =
    lead && lead.audit_score == null
      ? new URL('/demos', SITE.url)
      : new URL(`/audit/${id}`, SITE.url);

  const res = send(target);
  if (!lead) return res;

  try {
    const ua = req.headers.get('user-agent');
    const { machine, why } = classifyAgent(ua);

    /**
     * One line per scan per hour, scoped to machine or human so a crawler's row
     * can never swallow the owner's. Somebody who scans, reads, and scans again
     * to show his wife is one event; a crawler hammering the URL is one too.
     */
    await recordEventOnce(
      sb,
      {
        leadId: id,
        type: 'flyer_scanned',
        label: machine
          ? `A crawler followed the flyer code for ${lead.business_name}`
          : `${lead.business_name} scanned the flyer`,
        detail: {
          machine,
          why,
          source: 'door-drop',
          city: lead.city ?? null,
          referer: req.headers.get('referer') ?? null,
        },
      },
      60,
      { machine },
    );

    // A human scan is a fresh sighting. `last_seen_at` is the column every other
    // surface already reads for "when did this lead last do something real", and
    // it is the only lead field a scan is allowed to touch.
    if (!machine) {
      await sb.from('outbound_leads').update({ last_seen_at: new Date().toISOString() }).eq('id', id);
    }
  } catch {
    /* The redirect is the product. Telemetry never stands between a man with a
       phone and the report he was promised. */
  }

  return res;
}
