import { NextResponse } from 'next/server';
import { clearCcSessionCookie } from '@/lib/client-auth';

export const runtime = 'nodejs';

export async function POST() {
  await clearCcSessionCookie();
  return NextResponse.json({ ok: true });
}
