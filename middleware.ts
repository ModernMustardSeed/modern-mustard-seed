import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/admin-auth';
import { verifyClientToken, CLIENT_COOKIE_NAME } from '@/lib/client-auth';

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ── Client portal ──
  if (path.startsWith('/portal')) {
    if (path === '/portal/login') return NextResponse.next();
    const token = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
    const session = token ? await verifyClientToken(token) : null;
    if (!session) {
      const url = new URL('/portal/login', req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Admin ──
  if (path === '/admin/login') return NextResponse.next();
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
