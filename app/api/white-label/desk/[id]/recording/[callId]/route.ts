import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { wlClientKeyValid } from '@/lib/white-label/key';
import { getClient } from '@/lib/white-label/store';
import { callBelongs } from '@/lib/white-label/desk';

export const runtime = 'nodejs';

/**
 * Plays one call on a client desk. Recordings sit in Vapi's private storage
 * and the stored URL answers a browser with a 400, so this asks Vapi for the
 * call fresh and redirects to the short-lived presigned copy it issues. The
 * client key and the call's own assistant both have to match, so one office
 * can never play another's calls.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; callId: string }> }) {
  const { id, callId } = await params;
  const k = new URL(req.url).searchParams.get('k');
  if (!wlClientKeyValid(id, k)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const client = await getClient(id);
  if (!client || client.status === 'cancelled' || !(await callBelongs(client, callId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const key = env('VAPI_API_KEY') ?? env('VAPI_PRIVATE_KEY');
  if (!key) return NextResponse.json({ error: 'Recording unavailable' }, { status: 503 });
  const res = await fetch(`https://api.vapi.ai/call/${callId}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!res.ok) return NextResponse.json({ error: 'Recording unavailable' }, { status: 502 });
  const call = (await res.json()) as { assistantId?: string; artifact?: Record<string, unknown> };
  if (call.assistantId !== client.vapi_assistant_id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const a = call.artifact ?? {};
  const url = [a.presignedMonoUrl, a.presignedStereoUrl].find((u): u is string => typeof u === 'string' && u.startsWith('https://'));
  if (!url) return NextResponse.json({ error: 'No recording for this call' }, { status: 404 });
  return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}
