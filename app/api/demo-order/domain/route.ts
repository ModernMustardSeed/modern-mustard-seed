import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { normalizeDomain, quoteDomain } from '@/lib/vercel-platform';

export const runtime = 'nodejs';
export const maxDuration = 20;

/**
 * IS THE DOMAIN THEY JUST TYPED ACTUALLY GETTABLE?
 *
 * The intake asks for "your website domain" and accepts whatever string arrives.
 * A buyer on 2026-08-03 typed one and nothing checked it: not that it was
 * available, not that it was theirs, not that it was spelled right. The first
 * time anyone would find out is the day we try to launch them.
 *
 * Gated on a PAID order, exactly like the intake upload route, for the same
 * reason: this reaches a third-party registrar API, and an ungated version is a
 * free domain-availability service with our token behind it.
 */
export async function POST(req: Request) {
  let body: { hubId?: string; sessionId?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const hubId = (body.hubId || '').trim();
  const sessionId = (body.sessionId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(hubId) || !sessionId || sessionId.length > 100) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const { data: order } = await sb
    .from('demo_orders')
    .select('id, status')
    .eq('hub_demo_id', hubId)
    .eq('stripe_session_id', sessionId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'unknown_order' }, { status: 404 });
  if (!['paid', 'intake_done', 'delivered'].includes(order.status)) {
    return NextResponse.json({ error: 'not_paid' }, { status: 409 });
  }

  const domain = normalizeDomain(body.domain || '');
  if (!domain) {
    return NextResponse.json({ ok: true, state: 'unknown', message: 'That does not look like a domain yet.' });
  }

  const quote = await quoteDomain(domain);

  // NEVER a hard error in the buyer's face. This is a helper on a form they are
  // in the middle of, and a registrar hiccup must not read as "your domain is
  // bad". Anything we cannot answer degrades to a quiet, honest shrug.
  if ('error' in quote) {
    return NextResponse.json({
      ok: true,
      domain,
      state: 'unknown',
      message: 'We could not check that one just now. Leave it with us and we will sort it.',
    });
  }

  if (quote.available === false) {
    return NextResponse.json({
      ok: true,
      domain,
      state: 'taken',
      message: `${domain} is taken. If it is yours, perfect, we will point it at your new site. If not, tell us and we will find you one.`,
    });
  }

  return NextResponse.json({
    ok: true,
    domain,
    state: 'available',
    priceUsd: quote.priceUsd ?? null,
    message: quote.priceUsd
      ? `${domain} is available for $${quote.priceUsd}/year. We will buy it and set it up for you.`
      : `${domain} is available. We will buy it and set it up for you.`,
  });
}
