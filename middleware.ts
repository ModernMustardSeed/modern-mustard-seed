import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/admin-auth';
import { verifyClientToken, verifyLookToken, verifyCcToken, CLIENT_COOKIE_NAME, CLIENT_LOOK_COOKIE_NAME, CC_COOKIE_NAME } from '@/lib/client-auth';

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*', '/cc/:path*', '/Mustard', '/MUSTARD', '/Contact', '/Terms', '/Privacy'],
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Exact path checks prevent redirect loops on canonical lowercase pages.
  // Cloning preserves campaign and referral query parameters.
  const legacyPages: Record<string, string> = {
    '/Contact': '/contact',
    '/Terms': '/terms',
    '/Privacy': '/privacy',
  };
  if (Object.hasOwn(legacyPages, path)) {
    const url = req.nextUrl.clone();
    url.pathname = legacyPages[path];
    return NextResponse.redirect(url, 308);
  }

  // ── /Mustard, as Sarah says it out loud ──
  // This lives here rather than in next.config because config redirects match
  // case-INSENSITIVELY: a `/Mustard -> /mustard` rule also matches `/mustard`
  // and redirects the canonical page to itself forever. An exact string
  // comparison is the only way to catch the capital and leave the real page
  // alone. The query string carries through, so ?source= and a magic-link
  // token survive.
  if (path !== '/mustard' && path.toLowerCase() === '/mustard') {
    const url = req.nextUrl.clone();
    url.pathname = '/mustard';
    return NextResponse.redirect(url);
  }

  // ── Command Center ──
  // Its own door, its own key. A portal session is deliberately not enough:
  // the two are sold apart and entered apart. Sarah's look pass opens it so a
  // Command Center can be perfected before the client is ever handed a code.
  if (path.startsWith('/cc')) {
    if (path === '/cc/login') return NextResponse.next();
    const token = req.cookies.get(CC_COOKIE_NAME)?.value;
    let session = token ? await verifyCcToken(token) : null;
    if (!session) {
      const look = req.cookies.get(CLIENT_LOOK_COOKIE_NAME)?.value;
      const admin = req.cookies.get(COOKIE_NAME)?.value;
      if (look && admin && (await verifyToken(admin))) session = await verifyLookToken(look);
    }
    if (!session) return NextResponse.redirect(new URL('/cc/login', req.url));
    return NextResponse.next();
  }

  // ── Client portal ──
  // Also guarded by prefix, for the same reason as the admin block below.
  if (path.startsWith('/portal')) {
    if (path === '/portal/login') return NextResponse.next();
    const token = req.cookies.get(CLIENT_COOKIE_NAME)?.value;
    let session = token ? await verifyClientToken(token) : null;
    // Sarah looking as a client: the look pass and her own admin session, both valid.
    if (!session) {
      const look = req.cookies.get(CLIENT_LOOK_COOKIE_NAME)?.value;
      const admin = req.cookies.get(COOKIE_NAME)?.value;
      if (look && admin && (await verifyToken(admin))) session = await verifyLookToken(look);
    }
    if (!session) {
      const url = new URL('/portal/login', req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Admin ──
  // Only the login page is public. Sign-in is password only.
  //
  // ⚠️ THE `startsWith` GUARD IS LOAD-BEARING. This block used to assume that
  // anything reaching it was an /admin path, which was true while the matcher
  // held only /admin and /portal. The moment /Mustard was added to the matcher,
  // Vercel matched it case-INSENSITIVELY, `/mustard` fell through both blocks
  // above, hit this one, found no admin cookie, and bounced every visitor to
  // the public doorway into the admin login. Live, on the page we were about to
  // promote. Any future matcher entry must be gated the same way.
  if (path.startsWith('/admin')) {
    if (path === '/admin/login') return NextResponse.next();
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      const url = new URL('/admin/login', req.url);
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
