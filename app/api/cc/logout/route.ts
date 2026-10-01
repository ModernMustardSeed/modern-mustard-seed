import { NextResponse } from 'next/server';
import { clearCcSessionCookie, clearClientSessionCookie } from '@/lib/client-auth';

export const runtime = 'nodejs';

export async function POST() {
  // One sign-in made both cookies, so one sign-out ends both.
  await clearCcSessionCookie();
  await clearClientSessionCookie();
  return NextResponse.json({ ok: true });
}
