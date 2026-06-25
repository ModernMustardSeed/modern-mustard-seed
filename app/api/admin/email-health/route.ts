import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/**
 * Recent delivery health, pulled live from Resend. Reports each recipient whose
 * MOST RECENT send failed (bounced, complained, suppressed, or failed), so a
 * partner who never got their welcome never stays silently stranded.
 *
 * We key on the latest event per recipient, not "ever failed": an address that
 * bounced once but delivered on the corrected retry is healthy and should not
 * keep showing as a problem. Each failure carries its Resend email id so the UI
 * can deep-link to the exact email, where "Remove from suppression list" lives.
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
    const res = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return NextResponse.json({ failures: [], configured: true, error: `Resend ${res.status}` });
    const body = await res.json().catch(() => null);
    const arr = Array.isArray(body?.data) ? body.data : [];

    // Latest event per recipient (the list comes newest-first, but compare
    // timestamps to be safe).
    type Latest = { to: string; id?: string; subject: string; last_event: string; created_at?: string; ts: number };
    const latest = new Map<string, Latest>();
    for (const e of arr as Array<{ id?: string; to?: string | string[]; subject?: string; last_event?: string; created_at?: string }>) {
      if (!e.last_event) continue;
      const tos = Array.isArray(e.to) ? e.to : e.to ? [e.to] : [];
      const ts = Date.parse(e.created_at ?? '') || 0;
      for (const to of tos) {
        const key = String(to).toLowerCase();
        const cur = latest.get(key);
        if (!cur || ts > cur.ts) {
          latest.set(key, { to: key, id: e.id, subject: e.subject ?? '', last_event: e.last_event, created_at: e.created_at, ts });
        }
      }
    }

    const failures = [...latest.values()]
      .filter((f) => BAD_EVENTS.has(f.last_event))
      .map((f) => ({ id: f.id, to: [f.to], subject: f.subject, last_event: f.last_event, created_at: f.created_at }));

    return NextResponse.json({ failures, configured: true });
  } catch (err) {
    return NextResponse.json({ failures: [], configured: true, error: err instanceof Error ? err.message : 'error' });
  }
}
