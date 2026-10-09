import { NextResponse } from 'next/server';
import { wlClientKeyValid } from '@/lib/white-label/key';
import { getClient } from '@/lib/white-label/store';
import { callBelongs, markHandled } from '@/lib/white-label/desk';

export const runtime = 'nodejs';

/** The office marks a call handled, or puts it back on the list. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { k?: string; callId?: string; handled?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  if (!wlClientKeyValid(id, body.k)) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const client = await getClient(id);
  const callId = String(body.callId ?? '');
  if (!client || client.status === 'cancelled' || !(await callBelongs(client, callId))) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
  const handled = await markHandled(client, callId, body.handled !== false);
  return NextResponse.json({ ok: true, handledAt: handled[callId] ?? null });
}
