import { NextRequest, NextResponse } from 'next/server';
import { placeInstantCallback } from '@/lib/instant-callback';

/**
 * Ring a visitor who just asked to be rung.
 *
 * Same-origin only, and rate limited per IP. This endpoint dials real phones,
 * so an open version of it is a harassment tool: the guard is not ceremony.
 *
 * Always returns 200 with `{ called: boolean }`. The form must not fail because
 * telephony did; their lead is already saved by the caller, and a visitor who
 * gets an email instead of a call is a mild disappointment, not an error state.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_IP = 3;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const seen = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  seen.push(now);
  hits.set(ip, seen);
  // Bound the map so a long-lived instance cannot grow one entry per attacker IP.
  if (hits.size > 5000) for (const k of hits.keys()) { if (hits.size <= 2500) break; hits.delete(k); }
  return seen.length > MAX_PER_IP;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ called: false, reason: 'cross-origin' }, { status: 403 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) return NextResponse.json({ called: false, reason: 'rate-limited' });

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
