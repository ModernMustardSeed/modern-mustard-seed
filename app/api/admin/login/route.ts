import { NextResponse } from 'next/server';
import { signInCandidates, checkCredentials, setSessionCookie } from '@/lib/admin-auth';
import { checkTeamCredentials } from '@/lib/team-password';

export const runtime = 'nodejs';

// Naive in-memory rate limit. Resets on cold start; enough to slow basic brute force.
const attempts: Map<string, { count: number; first: number }> = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
    return true;
  }
  a.count += 1;
  return a.count <= MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 5 minutes.' }, { status: 429 });
  }

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  // Env credentials first (owner + legacy ADMIN_TEAM), then the DB team_members
  // (unified identity). The DB check is node-only and kept out of admin-auth.
  //
  // A teammate with a second address gets every one of them tried, the typed
  // one first, so an old address they still reach for opens the same account
  // and moving their roster row between addresses never locks them out. The
  // session is minted for the address the account is actually filed under, so
  // roles, stats, and the roster stay single-rowed.
  let user: Awaited<ReturnType<typeof checkTeamCredentials>> = null;
  for (const candidate of signInCandidates(email)) {
    user = checkCredentials(candidate, password) ?? (await checkTeamCredentials(candidate, password));
    if (user) break;
  }
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  await setSessionCookie(user.email);
  return NextResponse.json({ success: true });
}
