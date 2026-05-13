import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/admin-auth';

export const config = {
  matcher: ['/admin/:path*'],
};

export function middleware(req: NextRequest) {
  // Allow the login page through
  if (req.nextUrl.pathname === '/admin/login') {
    return NextResponse.next();
  }
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) {
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
