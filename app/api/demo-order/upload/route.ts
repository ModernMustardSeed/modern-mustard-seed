import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { uploadIntakeFile } from '@/lib/intake-storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Upload one intake file (logo, photo, price list) for a PAID demo order.
 *
 * This exists instead of reusing /api/intake/upload because that route accepts a
 * file from anyone at all, with no order and no session, straight into a public
 * bucket. That was survivable while the only door was a hand-sent proposal link.
 * It is not survivable with paid ads pointed at the funnel: it is an open, free,
 * public file host with our name on the URL.
 *
 * So the gate is the order itself. You must present a hub id and the Stripe
 * session id for an order that has actually been PAID. Both are unguessable, and a
 * session id is only ever handed to the person who completed checkout.
 */

const MAX_BYTES = 9 * 1024 * 1024;

// What a logo, a job photo, or a price list actually is. Everything else is
// somebody using us as a CDN or trying to plant something executable.
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/postscript', // .ai / .eps, which is how small businesses store logos
]);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const hubId = String(form.get('hubId') || '').trim();
    const sessionId = String(form.get('sessionId') || '').trim();
    const file = form.get('file');

    if (!/^[0-9a-f-]{36}$/i.test(hubId) || !sessionId || sessionId.length > 100) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'That file is too big (9MB max). Try a photo instead of a raw scan.' }, { status: 413 });
    }
    if (file.type && !ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'We can take images, PDFs, and documents.' }, { status: 415 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

    // The money gate, same as the intake route: a Stripe session id is minted
    // BEFORE the card is charged, so its existence proves nothing on its own.
    const { data: order } = await supabase
      .from('demo_orders')
      .select('id, status')
      .eq('hub_demo_id', hubId)
      .eq('stripe_session_id', sessionId)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: 'unknown_order' }, { status: 404 });
    if (!['paid', 'intake_done', 'delivered'].includes(order.status)) {
      return NextResponse.json({ error: 'not_paid' }, { status: 409 });
    }

    const kind = String(form.get('kind') || 'file').replace(/[^a-z]/gi, '').slice(0, 12) || 'file';
    const res = await uploadIntakeFile(file, `demo-order/${order.id}/${kind}`);
    if (!res) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

    return NextResponse.json({ url: res.url, path: res.path });
  } catch (err) {
    console.error('demo-order upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
