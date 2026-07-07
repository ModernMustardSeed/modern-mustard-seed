/**
 * The press PDF, two auth paths:
 *   GET ?runId=<uuid>        -> the watermarked PROOF (free, requires knowing
 *                               the unguessable run id from your own session)
 *   GET ?session_id=cs_...   -> the CLEAN file, verified against Stripe: the
 *                               checkout session must be paid, kind=press,
 *                               and carry the run in its metadata.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getPressRun } from '@/lib/press-store';
import { renderPressPdf } from '@/lib/press-pdf';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Unauthenticated route where every hit costs a Stripe read or a PDF render;
// give it its own generous per-instance throttle.
const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 30;
}

export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const url = new URL(req.url);
  const runIdParam = (url.searchParams.get('runId') || '').trim();
  const sessionId = (url.searchParams.get('session_id') || '').trim();

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'press_dark' }, { status: 503 });

  let runId = runIdParam;
  let watermark = true;

  if (sessionId) {
    if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) {
      return NextResponse.json({ error: 'bad_session' }, { status: 400 });
    }
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: 'press_dark' }, { status: 503 });
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid' || session.metadata?.kind !== 'press') {
        return NextResponse.json({ error: 'not_paid' }, { status: 402 });
      }
      runId = session.metadata?.run_id || '';
      watermark = false;
    } catch {
      return NextResponse.json({ error: 'bad_session' }, { status: 400 });
    }
  }

  if (!runId) return NextResponse.json({ error: 'no_run' }, { status: 400 });
  const run = await getPressRun(supabase, runId);
  if (!run) return NextResponse.json({ error: 'no_run' }, { status: 404 });

  const bytes = await renderPressPdf(run.profile, run.catalog, { watermark });
  const slug = run.profile.business.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'piece';
  const filename = watermark ? `${slug}-proof.pdf` : `${slug}-print-ready.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
