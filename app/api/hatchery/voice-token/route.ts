/**
 * Mint a short-lived, PUBLIC-scoped Vapi JWT that authorizes an in-browser call
 * to Huck, and only to Huck.
 *
 * Why this exists: the MMS public key (NEXT_PUBLIC_VAPI_PUBLIC_KEY) is locked to
 * Mr. Mustard and returns 403 for any other assistant ("Key doesn't allow
 * assistantId ..."). Rather than loosen that key (which would let the whole
 * internet start any of our assistants), we sign a token here with the PRIVATE
 * key, restricted to Huck's assistant id and our own origins, expiring in
 * minutes. The browser fetches it, then `new Vapi(token).start(assistantId)`.
 * Verified: this exact payload returns 201 from POST /call/web for Huck.
 *
 * See lib/vapi-web.ts for the Krisp mic fix the widget also applies.
 */

import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { HUCK } from '@/data/hatchery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORG_ID = 'a2b0604f-99f9-4f5c-ad6c-ba5f8dfecce1'; // Modern Mustard Seed Vapi org

const b64url = (obj: unknown): string =>
  Buffer.from(JSON.stringify(obj)).toString('base64url');

export async function GET() {
  const privateKey = process.env.VAPI_API_KEY;
  if (!privateKey) {
    // Fail soft: the widget hides itself, the phone number still works.
    return NextResponse.json({ error: 'voice_not_configured' }, { status: 503 });
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    orgId: ORG_ID,
    token: {
      tag: 'public',
      restrictions: {
        enabled: true,
        allowedAssistantIds: [HUCK.assistantId],
        allowTransientAssistant: false,
      },
    },
    iat: now,
    exp: now + 15 * 60, // 15 minutes: long enough for a call, short enough to leak nothing
  };

  const data = `${b64url(header)}.${b64url(payload)}`;
  const signature = createHmac('sha256', privateKey).update(data).digest('base64url');
  const token = `${data}.${signature}`;

  return NextResponse.json(
    { token, assistantId: HUCK.assistantId },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
