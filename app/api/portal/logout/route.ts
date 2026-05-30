import { NextResponse } from 'next/server';
import { clearClientSessionCookie } from '@/lib/client-auth';

export const runtime = 'nodejs';

export async function POST() {
  await clearClientSessionCookie();
  return NextResponse.json({ ok: true });
}
