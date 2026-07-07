/**
 * Pack generation for a PAID GEO session, in its own long-budget function
 * (ship-gate blocker fix: generation must never run inside the Stripe
 * webhook or an SSR page render). Idempotent: an existing pack returns
 * immediately and rerunsUsed is never reset.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { getGeoPack, saveGeoPack } from '@/lib/geo-store';
import { generateArtifacts } from '@/lib/geo-fix-pack';

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
  return hit.count <= 10;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

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

  // Idempotency first: an existing pack is never regenerated or reset here.
  const existing = await getGeoPack(supabase, sessionId);
  if (existing) return NextResponse.json({ ok: true, ready: true });

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: 'bad_session' }, { status: 400 });
  }
  if (session.payment_status !== 'paid' || session.metadata?.kind !== 'geo') {
    return NextResponse.json({ error: 'not_paid' }, { status: 402 });
  }
  if (!['geo-fixpack', 'geo-fulldesk', 'geo-installed'].includes(session.metadata?.slug || '')) {
    return NextResponse.json({ error: 'watch_only' }, { status: 400 });
  }
  const url = session.metadata?.url || '';
  if (!url) return NextResponse.json({ error: 'no_url' }, { status: 400 });

  const generated = await generateArtifacts(url);
  if (!generated) {
    return NextResponse.json({ error: 'scan_failed', message: 'The site would not scan just now. Refresh in a minute; your purchase is safe and this retries free.' }, { status: 502 });
  }

  // Guard the race: if a parallel request finished first, keep theirs.
  const raced = await getGeoPack(supabase, sessionId);
  if (raced) return NextResponse.json({ ok: true, ready: true });

  await saveGeoPack(supabase, sessionId, {
    url,
    email: session.customer_details?.email || '',
    business: generated.business,
    artifacts: generated.artifacts,
    generatedAt: new Date().toISOString(),
    rerunsUsed: 0,
    lastScore: generated.score,
    lastGrade: generated.grade,
  });
  return NextResponse.json({ ok: true, ready: true });
}
