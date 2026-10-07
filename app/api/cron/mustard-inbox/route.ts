import { NextResponse } from 'next/server';
import { collectExtractions, runDueInbox } from '@/lib/mustard-inbox';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Mr. Mustard works his inbox: collect what the drainer read out of his
 * finished calls, then do whatever is due. Runs at :22 and :52, two minutes
 * no other MMS cron uses (the cron collision law). lib/mustard-inbox.ts has
 * the rules for what he does on his own and what waits for Sarah.
 */
export async function GET(req: Request) {
  // Vercel Cron sends Authorization: Bearer ${CRON_SECRET}
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const collected = await collectExtractions();
  const worked = await runDueInbox();
  if (worked.length) console.info('mustard-inbox', worked.join(' | '));
  return NextResponse.json({ ok: true, collected, worked, at: new Date().toISOString() });
}
