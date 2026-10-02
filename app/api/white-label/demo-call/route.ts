/**
 * THE WHITE LABEL DEMO CALL, in the browser.
 *
 * POST builds the agent (lib/white-label/call.ts) and returns the overrides
 * for the Vapi web call. GET returns what a run actually booked, which is
 * what the owner's text on the demo page is built from.
 *
 * Every gate fails CLOSED, because minutes cost money: honeypot, a
 * per-instance IP throttle, its own daily cap (separate from the public
 * build's), five minute calls.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getRun } from '@/lib/demo-run-store';
import { demoAppointmentsFor } from '@/lib/demo-booking';
import { buildWhiteLabelCall, WL_RUN_EMAIL } from '@/lib/white-label/call';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DAILY_CAP = 40;

const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 8;
}

type Body = { agency?: string; client?: string; sample?: string; city?: string; siteKey?: string; website?: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  if (body.website) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited', message: 'That is a lot of demo calls in an hour. Try again shortly.' }, { status: 429 });

  const r = await buildWhiteLabelCall({ ...body, ip, mode: 'web' }, DAILY_CAP);
  if (!r.ok) return NextResponse.json({ error: r.error, message: r.message }, { status: r.status });
  return NextResponse.json({ ok: true, call: r.call });
}

export async function GET(req: Request) {
  const runId = new URL(req.url).searchParams.get('run') || '';
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return NextResponse.json({ error: 'bad_run' }, { status: 400 });
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const run = await getRun(db, runId);
  if (!run || run.email !== WL_RUN_EMAIL) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const booked = await demoAppointmentsFor(db, runId, 5);
  return NextResponse.json({
    ok: true,
    business: run.business,
    booked: booked.map((b) => ({
      name: b.customer_name,
      phone: b.customer_phone,
      service: b.service,
      when: new Date(b.starts_at).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' }),
    })),
  });
}
