import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

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
      }
    } catch {
      /* tracking must never break the pixel */
    }
  }
  return pixel();
}
