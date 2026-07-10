import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { CADENCE_WAIT_DAYS, personalizeTouch } from '@/lib/outreach';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily: advance the three-touch email cadence. Touch 1 -> 2 after 3 days,
 * 2 -> 3 after 4 days, then stop. Only prospects still in `sent` status advance,
 * so anyone who replied, joined, declined, or opted out is left alone.
 *
 * Auto-send requires OUTREACH_FROM (a separate sending domain) so this never
 * touches the deliverability of buyer and partner mail. Without it, the cron is
 * a safe no-op.
 */
function authed(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return req.headers.get('authorization') === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const from = process.env.OUTREACH_FROM;
  const apiKey = process.env.RESEND_API_KEY;
  if (!from || !apiKey) return NextResponse.json({ ok: true, disabled: true, reason: 'Set OUTREACH_FROM (separate domain) to enable auto-advance.' });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 500 });

  const resend = resendClient();
  let advanced = 0;

  try {
    const { data: prospects } = await supabase
      .from('prospects')
      .select('id, name, contact, status')
      .eq('channel_type', 'email')
      .eq('status', 'sent');

    for (const p of prospects ?? []) {
      if (!p.contact) continue;
      const { data: msgs } = await supabase
        .from('outreach_messages')
        .select('touch, status, sent_at')
        .eq('prospect_id', p.id)
        .eq('status', 'sent')
        .order('touch', { ascending: false });

      const lastSent = (msgs ?? [])[0];
      if (!lastSent || !lastSent.sent_at) continue;
      const lastTouch = Number(lastSent.touch) || 1;
      if (lastTouch >= 3) continue; // sequence complete

      const nextTouch = lastTouch + 1;
      const waitDays = CADENCE_WAIT_DAYS[nextTouch] ?? 4;
      const ageDays = (Date.now() - new Date(lastSent.sent_at as string).getTime()) / 86400000;
      if (ageDays < waitDays) continue;

      const firstName = (p.name as string)?.split(' ')[0] || 'there';
      const { subject, body } = personalizeTouch(nextTouch, firstName);
      const unsub = `${SITE.url}/api/outreach/unsubscribe?c=${encodeURIComponent(p.contact as string)}`;
      const html = `${body.replace(/\n/g, '<br>')}<br><br><span style="font-size:12px;color:#888"><a href="${unsub}">Unsubscribe</a> and I will never contact you again.</span>`;

      try {
        const { error } = await resend.emails.send({ from, to: p.contact as string, replyTo: 'sarah@modernmustardseed.com', subject, html });
        if (error) {
          console.error('cadence send failed for', p.id, error);
          continue;
        }
        await supabase.from('outreach_messages').insert({ prospect_id: p.id, touch: nextTouch, channel: 'email', subject, body, status: 'sent', sent_at: new Date().toISOString() });
        advanced += 1;
      } catch (err) {
        console.error('cadence send failed for', p.id, err);
      }
    }
    return NextResponse.json({ ok: true, advanced });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
