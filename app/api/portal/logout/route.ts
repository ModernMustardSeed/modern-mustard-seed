import { NextResponse } from 'next/server';
import { clearClientSessionCookie, clearLookCookie } from '@/lib/client-auth';

export const runtime = 'nodejs';

export async function POST() {
  await clearClientSessionCookie();
  await clearLookCookie();
  return NextResponse.json({ ok: true });
}
