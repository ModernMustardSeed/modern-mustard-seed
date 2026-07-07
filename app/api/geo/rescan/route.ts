/**
 * Metered re-scan for a paid GEO Fix Pack: re-audits the live site,
 * regenerates every artifact, re-grades. GEO.freeRerunsPerPack per purchase,
 * enforced against the stored pack (fail closed).
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { getGeoPack, saveGeoPack } from '@/lib/geo-store';
import { generateArtifacts } from '@/lib/geo-fix-pack';
import { GEO } from '@/data/geo';

export const runtime = 'nodejs';
export const maxDuration = 300;

const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 6;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited', message: 'The examiner needs a breather. Try again shortly.' }, { status: 429 });

  let body: { session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const sessionId = (body.session_id || '').trim();
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'bad_session' }, { status: 400 });
  }

  const stripe = getStripe();
  const supabase = getSupabase();
  if (!stripe || !supabase) return NextResponse.json({ error: 'desk_dark' }, { status: 503 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid' || session.metadata?.kind !== 'geo') {
      return NextResponse.json({ error: 'not_paid' }, { status: 402 });
    }
  } catch {
    return NextResponse.json({ error: 'bad_session' }, { status: 400 });
  }

  const pack = await getGeoPack(supabase, sessionId);
  if (!pack) return NextResponse.json({ error: 'no_pack' }, { status: 404 });
  if ((pack.rerunsUsed ?? 0) >= GEO.freeRerunsPerPack) {
    return NextResponse.json(
      { error: 'reruns_spent', message: `All ${GEO.freeRerunsPerPack} included re-scans are used. THE WATCH re-grades monthly, or reply to your receipt for a one-off.` },
      { status: 402 }
    );
  }

  // Meter BEFORE the expensive work (parallel requests cannot blow the cap),
  // refund the credit on scan failure.
  const metered = { ...pack, rerunsUsed: (pack.rerunsUsed ?? 0) + 1 };
  if (!(await saveGeoPack(supabase, sessionId, metered))) {
    return NextResponse.json({ error: 'desk_dark' }, { status: 503 });
  }

  const generated = await generateArtifacts(pack.url);
  if (!generated) {
    await saveGeoPack(supabase, sessionId, pack); // refund the credit
    return NextResponse.json({ error: 'scan_failed', message: 'The site would not scan just now (it happens: slow hosts, firewalls). Your re-scan was NOT used; try again in a few minutes.' }, { status: 502 });
  }

  const next = {
    ...metered,
    artifacts: generated.artifacts,
    business: generated.business || pack.business,
    generatedAt: new Date().toISOString(),
    lastScore: generated.score,
    lastGrade: generated.grade,
  };
  if (!(await saveGeoPack(supabase, sessionId, next))) {
    return NextResponse.json({ error: 'desk_dark' }, { status: 503 });
  }
  return NextResponse.json({ pack: next });
}
