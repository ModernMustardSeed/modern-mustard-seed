import { NextResponse } from 'next/server';
import { recordClick } from '@/lib/affiliate';

export const runtime = 'nodejs';

/** Logs an affiliate referral click. Fire-and-forget from RefCapture. */
export async function POST(req: Request) {
  try {
    const { code, path } = await req.json();
    if (typeof code === 'string' && code) await recordClick(code, typeof path === 'string' ? path : '/');
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
