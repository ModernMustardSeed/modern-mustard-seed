import { NextResponse, type NextRequest } from 'next/server';
import { SITE } from '@/lib/seo';
import { bumpHostClicks } from '@/lib/bootcamp/store';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A HOST'S LINK. /bootcamp/r/<code> sets the 180-day referral cookie, counts
 * the click best-effort, and lands on the offer page with ?via=<code> so the
 * masterclass form can carry it even if the cookie is refused. The redirect
 * is the product: a failed count never stands between a reader and the page.
 */

const CODE = /^[a-z0-9-]{1,48}$/;
const DAYS_180 = 180 * 24 * 60 * 60;

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  const code = decodeURIComponent(raw || '').trim().toLowerCase();
  const base = process.env.NODE_ENV === 'development' ? req.nextUrl.origin : SITE.url;

  if (!CODE.test(code)) {
    const res = NextResponse.redirect(new URL('/bootcamp', base), 302);
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  const target = new URL('/bootcamp', base);
  target.searchParams.set('via', code);
  const res = NextResponse.redirect(target, 302);
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'no-store');
  res.cookies.set('mms_bc_ref', code, {
    maxAge: DAYS_180,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });

  try {
    await bumpHostClicks(getSupabase(), code);
  } catch {
    /* counted later or not at all; the reader still gets the page */
  }

  return res;
}
