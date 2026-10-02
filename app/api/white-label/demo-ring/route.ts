/**
 * RING THEIR REAL PHONE. The agency owner types their cell, and their
 * client's receptionist calls them. After the call, the summary the owner
 * would get arrives by text (and by email if given): see
 * lib/white-label/after-call.ts, fired from the end-of-call webhook.
 *
 * Dialing costs money and can be abused, so: US and Canada numbers only via
 * lib/phone-nanp (no Caribbean revenue-share codes), two rings per number a
 * day, three per IP an hour, and a white label ring cap of six a day. The
 * line it dials from has a hard ten-outbound-a-day ceiling shared with Mr.
 * Mustard's callbacks, which is why six and not more.
 */

import { NextResponse } from 'next/server';
import { toE164 } from '@/lib/phone-nanp';
import { ringDemoCall } from '@/lib/demo-agent';
import { buildWhiteLabelCall, bumpCounter } from '@/lib/white-label/call';

export const runtime = 'nodejs';
export const maxDuration = 30;

const RING_CAP = 6;
const PER_PHONE = 2;

const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 3;
}

type Body = { agency?: string; client?: string; sample?: string; city?: string; siteKey?: string; phone?: string; email?: string; website?: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  if (body.website) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited', message: 'That is a lot of calls from here in an hour. Use the browser call instead.' }, { status: 429 });

  const to = toE164(body.phone);
  if (!to) return NextResponse.json({ error: 'bad_phone', message: 'Enter a US or Canadian mobile number.' }, { status: 400 });
  const email = (body.email || '').trim().toLowerCase();
  const notifyEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;

  const perPhone = await bumpCounter(`white-label:ringphone:${to}:${new Date().toISOString().slice(0, 10)}`);
  if (perPhone === null) return NextResponse.json({ error: 'unavailable', message: 'The phone line is offline right now.' }, { status: 503 });
  if (perPhone > PER_PHONE) return NextResponse.json({ error: 'cooling', message: 'That number has had its demo calls today. Use the browser call instead.' }, { status: 429 });

  const built = await buildWhiteLabelCall({ ...body, ip, mode: 'phone', ringTo: to, notifyEmail }, RING_CAP);
  if (!built.ok) return NextResponse.json({ error: built.error, message: built.message }, { status: built.status });

  const rang = await ringDemoCall(built.call, to);
  if (!rang.ok) {
    console.error('white label ring failed', rang.error);
    const daily = /daily|limit/i.test(rang.error);
    return NextResponse.json(
      { error: 'ring_failed', message: daily ? 'The phone line has made its calls for today. Use the browser call instead.' : 'The call could not be placed. Try the browser call instead.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, runId: built.runId, client: built.client });
}
