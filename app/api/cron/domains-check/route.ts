import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { daysUntil, refreshDomains } from '@/lib/domains';
import { resendClient } from '@/lib/send-email';
import { hydrateDesks } from '@/lib/client-desks';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * MONDAY, 8:12 AM MOUNTAIN. Every domain every client owns, re-read from the
 * registry. Anything inside 45 days of expiry, expired, or gone is written to
 * Sarah in one email per client, with the days left, so a renewal is never a
 * surprise. Quiet weeks send nothing.
 */
export async function GET(req: Request) {
  await hydrateDesks();
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500 });

  const report: Record<string, string> = {};
  for (const p of Object.values(CLIENT_PROJECTS)) {
    const { checked, rows } = await refreshDomains(sb, p.clientEmail);
    const soon = rows
      .map((r) => ({ ...r, days: daysUntil(r.expires_on) }))
      .filter((r) => r.status === 'released' || r.status === 'expired' || (r.days != null && r.days <= 45))
      .sort((a, b) => (a.days ?? -999) - (b.days ?? -999));
    if (!soon.length) {
      report[p.key] = `${checked} checked, nothing due`;
      continue;
    }
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const line = (r: (typeof soon)[number]) =>
      r.status === 'released' ? `${r.domain}: no longer registered.` : r.status === 'expired' ? `${r.domain}: expired ${r.expires_on}.` : `${r.domain}: ${r.days} days, renews ${r.expires_on}${r.registrar ? ` at ${r.registrar}` : ''}.`;
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com'],
        subject: `${p.business}: ${soon.length} domain${soon.length === 1 ? '' : 's'} need${soon.length === 1 ? 's' : ''} a look`,
        html: `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;">${soon.map((r) => `<p style="margin:0 0 10px;">${esc(line(r))}</p>`).join('')}<p style="margin:16px 0 0;opacity:.6;font-size:13px;">${checked} domains checked. The whole list is on their card and in their portal.</p></div>`,
        text: soon.map(line).join('\n'),
      });
      report[p.key] = `${checked} checked, ${soon.length} flagged, Sarah emailed`;
    } catch (err) {
      report[p.key] = `${checked} checked, ${soon.length} flagged, email failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  return NextResponse.json({ ok: true, report });
}
