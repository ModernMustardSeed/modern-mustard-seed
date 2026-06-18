import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/**
 * Recent delivery failures, pulled live from Resend. Lets the back office see
 * bounced, complained, or suppressed emails so a partner who never got their
 * welcome (a mistyped address, a hard bounce) never stays silently stranded.
 */
const BAD_EVENTS = new Set(['bounced', 'complained', 'suppressed', 'failed']);

function cleanKey(k?: string): string {
  return (k || '').replace(/\\r|\\n/g, '').replace(/[\r\n]/g, '').trim();
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = cleanKey(process.env.RESEND_API_KEY);
  if (!apiKey) return NextResponse.json({ failures: [], configured: false });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return NextResponse.json({ failures: [], configured: true, error: `Resend ${res.status}` });
    const body = await res.json().catch(() => null);
    const arr = Array.isArray(body?.data) ? body.data : [];
    const failures = arr
      .filter((e: { last_event?: string }) => e.last_event && BAD_EVENTS.has(e.last_event))
      .map((e: { id?: string; to?: string | string[]; subject?: string; last_event?: string; created_at?: string }) => ({
        id: e.id,
        to: Array.isArray(e.to) ? e.to : e.to ? [e.to] : [],
        subject: e.subject ?? '',
        last_event: e.last_event,
        created_at: e.created_at,
      }));
    return NextResponse.json({ failures, configured: true });
  } catch (err) {
    return NextResponse.json({ failures: [], configured: true, error: err instanceof Error ? err.message : 'error' });
  }
}
