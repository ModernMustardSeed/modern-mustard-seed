import { NextResponse } from 'next/server';
import { runAllProducers } from '@/lib/approvals';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily operator run (Vercel Cron). Runs every producer to draft follow-ups,
 * nurtures, and expansion offers into the approvals queue. Nothing is sent;
 * Sarah reviews + approves. Secured by CRON_SECRET (Vercel sends it as a
 * Bearer token on scheduled invocations).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    const token = new URL(req.url).searchParams.get('token') || '';
    if (auth !== `Bearer ${secret}` && token !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const created = await runAllProducers();
  return NextResponse.json({ ok: true, created });
}
