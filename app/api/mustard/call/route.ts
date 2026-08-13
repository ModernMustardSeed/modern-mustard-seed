import { NextResponse } from 'next/server';
import { requestMustardDemoCall } from '@/lib/mustard/request';
import { readAttribution } from '@/lib/mustard/surface';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * CALL ME NOW.
 *
 * The browser posts here and nowhere else. Vapi credentials never leave the
 * server, and every check that matters (consent, suppression, cooldown, rate
 * limits, idempotency) happens on this side of the wire where a determined
 * visitor cannot skip it.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  const str = (k: string, max = 200): string => String(body[k] ?? '').trim().slice(0, max);

  // Attribution is read from the landing URL the browser reports, because by
  // the time this POST happens the query string is long gone from the address
  // bar on a client-side transition.
  let landing: URL;
  try {
    landing = new URL(str('landingUrl', 500) || req.url);
  } catch {
    landing = new URL(req.url);
  }

  const result = await requestMustardDemoCall({
    surfaceSlug: str('surface', 60) || undefined,
    phone: str('phone', 40),
    businessName: str('businessName', 200) || null,
    contactName: str('contactName', 200) || null,
    consent: body.consent === true,
    consentVersionId: str('consentVersion', 60) || undefined,
    typedName: str('typedName', 200) || null,
    token: str('token', 200) || null,
    attribution: readAttribution(landing, req.headers),
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: req.headers.get('user-agent'),
    sessionId: str('sessionId', 80) || null,
    idempotencyKey: str('idempotencyKey', 120) || null,
  });

  if (!result.ok) {
    const status = result.code === 'rate-limited' || result.code === 'cooldown' ? 429 : result.code === 'server' ? 500 : 400;
    return NextResponse.json(result, {
      status,
      ...(result.retryAfterSeconds ? { headers: { 'Retry-After': String(result.retryAfterSeconds) } } : {}),
    });
  }

  return NextResponse.json(result);
}
