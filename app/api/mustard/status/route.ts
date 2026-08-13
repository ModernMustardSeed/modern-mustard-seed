import { NextResponse } from 'next/server';
import { demoCallStatus } from '@/lib/mustard/request';

export const runtime = 'nodejs';

/**
 * What the "he is calling you" screen polls while it waits.
 *
 * Returns only what the person on the other end of the phone is already
 * entitled to know about their own call: whether it connected, how long it ran,
 * and the link to their demo once one exists. It deliberately returns nothing
 * about the prospect record, so a guessed request id leaks nothing.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });

  const status = await demoCallStatus(id);
  if (!status) return NextResponse.json({ ok: false }, { status: 404 });

  return NextResponse.json({
    ok: true,
    status: status.status,
    durationSec: status.durationSec,
    demoUrl: status.demoUrl,
    checkoutReady: status.checkoutReady,
  });
}
