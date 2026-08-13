import { NextRequest, NextResponse } from 'next/server';
import { placeInstantCallback } from '@/lib/instant-callback';
import { callerIp, callRateLimited, isCrossOrigin } from '@/lib/callback-guard';

/**
 * Ring a visitor who just asked to be rung.
 *
 * Same-origin only, and rate limited per IP (lib/callback-guard.ts). This
 * endpoint dials real phones, so an open version of it is a harassment tool:
 * the guard is not ceremony.
 *
 * Always returns 200 with `{ called: boolean }`. The form must not fail because
 * telephony did; their lead is already saved by the caller, and a visitor who
 * gets an email instead of a call is a mild disappointment, not an error state.
 *
 * The phone-only hero box posts to /api/ring-me instead, because that one has
 * to save the lead itself.
 */

export async function POST(req: NextRequest) {
  if (isCrossOrigin(req)) {
    return NextResponse.json({ called: false, reason: 'cross-origin' }, { status: 403 });
  }

  if (callRateLimited(callerIp(req))) {
    return NextResponse.json({ called: false, reason: 'rate-limited' });
  }

  let body: { name?: string; phone?: string; email?: string; need?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ called: false, reason: 'bad-body' });
  }
  if (!body?.phone) return NextResponse.json({ called: false, reason: 'no-phone' });

  const result = await placeInstantCallback({
    name: body.name,
    phone: body.phone,
    email: body.email,
    need: body.need,
    source: body.source || 'website form',
  });

  if (!result.ok) {
    // Loud in the log, quiet to the visitor: they were never promised a reason.
    console.error('instant-callback failed', result.reason, result.detail ?? '');
    return NextResponse.json({ called: false, reason: result.reason });
  }
  return NextResponse.json({ called: true });
}
