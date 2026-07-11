import { NextResponse } from 'next/server';
import { verifyMagicToken, isKnownAdmin, setSessionCookie } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/**
 * Consume a magic sign-in link: verify the token, confirm the email is still a
 * known teammate (so a removed person's old link stops working), mint a normal
 * session, and land them in the command center.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  const fail = () => NextResponse.redirect(new URL('/admin/login?e=link', req.url));

  if (!token) return fail();
  const email = await verifyMagicToken(token);
  if (!email || !(await isKnownAdmin(email))) return fail();

  await setSessionCookie(email);
  return NextResponse.redirect(new URL('/admin', req.url));
}
