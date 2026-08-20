import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordEventOnce } from '@/lib/acq/events';
import { classifyHit, verdictDetail } from '@/lib/acq/bots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Email open tracking pixel. The audit/follow-up emails embed
 * <img src="/api/track/open?p=<prospectId>">; when the recipient's mail client
 * loads it, we count the open and stamp the first-open time (via the
 * record_email_open function). Always returns a 1x1 transparent GIF, and never
 * lets a tracking error fail the response.
 *
 * Note: open tracking is directional, not exact. Apple Mail Privacy Protection
 * pre-loads images (can show an open that did not happen) and image-blocking
 * clients hide real opens. Treat it as a strong signal, not proof.
 */

// 1x1 transparent GIF.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pixel() {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    },
  });
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get('p');
  if (p && UUID.test(p)) {
    try {
      const sb = getSupabase();
      if (sb) {
        // The id may belong to rep_prospects OR outbound_leads; fire both
        // recorders, only the owning table's row updates.
        await sb.rpc('record_email_open', { pid: p });
        await sb.rpc('record_outbound_email_open', { oid: p });
        await noteAcqOpen(sb, p, req.headers);
      }
    } catch {
      /* tracking must never break the pixel */
    }
  }
  return pixel();
}

/**
 * An open on an acquisition prospect is a line on their timeline, so the
 * engagement board can name who is reading. One line per prospect per six
 * hours: Apple Mail prefetches and a client re-rendering the same message must
 * not read as a person coming back five times. The counters on the lead row
 * still take every hit.
 */
async function noteAcqOpen(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  leadId: string,
  reqHeaders: Headers,
): Promise<void> {
  const { data } = await sb
    .from('outbound_leads')
    .select('acq_campaign_id,email_stage,email_open_count')
    .eq('id', leadId)
    .maybeSingle();
  if (!data || !data.acq_campaign_id) return;
  const count = Number(data.email_open_count ?? 0);
  const step = Number(data.email_stage ?? 0);
  // A gateway that renders the message to scan it loads this pixel exactly the
  // way a reader does, so the same two tests apply: the agent, and the clock.
  // An "open" logged ninety seconds after we pressed send is the delivery
  // pipeline rendering the message, not a contractor who happened to be
  // staring at their inbox.
  const hit = await classifyHit(sb, { leadId, type: 'email_opened', headers: reqHeaders });
  await recordEventOnce(
    sb,
    {
      leadId,
      campaignId: data.acq_campaign_id as string,
      type: 'email_opened',
      label: hit.machine
        ? `A scanner rendered our email${step ? ` (email ${step})` : ''}`
        : count <= 1
          ? `Opened our email${step ? ` (email ${step})` : ''}`
          : `Opened our email again (${count} opens so far)`,
      detail: { step, count, ...verdictDetail(hit) },
    },
    360,
    // Six hours is a long window to let a scanner hold on its own.
    { machine: hit.machine },
  );
}
