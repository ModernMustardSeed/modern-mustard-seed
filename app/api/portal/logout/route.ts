import { NextResponse } from 'next/server';
import { clearCcSessionCookie, clearClientSessionCookie, clearLookCookie } from '@/lib/client-auth';

export const runtime = 'nodejs';

export async function POST() {
  // One sign-in made both cookies, so one sign-out ends both.
  await clearClientSessionCookie();
  await clearCcSessionCookie();
  await clearLookCookie();
  return NextResponse.json({ ok: true });
}
