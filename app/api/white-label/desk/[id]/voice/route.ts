import { NextResponse } from 'next/server';
import { wlClientKeyValid } from '@/lib/white-label/key';
import { getClient } from '@/lib/white-label/store';
import { setVoice } from '@/lib/white-label/voice';

export const runtime = 'nodejs';

/** The office picks its receptionist's voice from the desk. It takes effect on the next call. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { k?: string; voice?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  if (!wlClientKeyValid(id, body.k)) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const client = await getClient(id);
  if (!client || client.status === 'cancelled' || !client.vapi_assistant_id) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
  try {
    const v = await setVoice(client.vapi_assistant_id, String(body.voice ?? ''));
    return NextResponse.json({ ok: true, voice: v.key });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'The voice did not switch' }, { status: 400 });
  }
}
