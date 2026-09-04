import { NextResponse } from 'next/server';
import { getAffiliateByCode } from '@/lib/affiliate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WHO SENT YOU.
 *
 * A visitor who scanned a partner's card lands on /demos with ?ref=CODE. The
 * demo station asks this route for the partner's first name so it can say
 * "Easton sent you" above the form: a small thing that turns a QR scan into a
 * handshake, and tells the visitor the credit is going where they expect.
 *
 * Public by design, and deliberately thin: approved codes only, first name
 * only. A code is already printed on a card in someone's hand; the first name
 * is the least the person who handed it over already said out loud.
 */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code')?.trim().slice(0, 64) ?? '';
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });
  const aff = await getAffiliateByCode(code);
  if (!aff?.code) return NextResponse.json({ found: false }, { status: 404 });
  const firstName = (aff.name || '').trim().split(/\s+/)[0] || null;
  return NextResponse.json({ found: true, code: aff.code, firstName }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
