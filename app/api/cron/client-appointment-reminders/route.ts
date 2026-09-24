import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { sendSms, toE164 } from '@/lib/sms';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { describeSlot, zoneLabel, KINDS, type SlotKind } from '@/lib/client-booking';
import { SITE } from '@/lib/seo';
import { hydrateDesks } from '@/lib/client-desks';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE REMINDER BEFORE AN APPOINTMENT.
 *
 * A booking made three weeks out and never mentioned again is a no-show
 * waiting to happen, and a no-show costs the client a morning. Every
 * appointment gets one reminder, roughly a day ahead: an email always, and a
 * text as well when the visitor asked for one.
 *
 * ── ONE REMINDER, NOT ONE PER RUN ────────────────────────────────────────────
 * `reminded_at` is the dedup, written before anything is sent rather than
 * after. Sending first and marking second means a timeout after the send
 * reminds the same person again on the next run, and a stranger being texted
 * twice about their appointment is worse than not being texted at all.
 *
 * ── AND IT NEVER SETS A STATUS ───────────────────────────────────────────────
 * Reminding somebody is not knowing what happened. done, no-show and cancelled
 * stay marks a person makes, so this touches `reminded_at` and nothing else.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Row = {
  id: string; project: string; kind: string; starts_at: string; place: string | null;
  name: string | null; phone: string | null; email: string | null; address: string | null;
  sms_consent: boolean; cancel_token: string;
};

export async function GET(req: Request) {
  await hydrateDesks();
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'no database' }, { status: 503 });

  // The window is wide enough that one daily run cannot miss anybody: every
  // appointment between 12 and 36 hours out, reminded once.
  const now = Date.now();
  const from = new Date(now + 12 * 3_600_000).toISOString();
  const to = new Date(now + 36 * 3_600_000).toISOString();

  let rows: Row[] = [];
  try {
    const { data } = await sb
      .from('client_appointments')
      .select('id, project, kind, starts_at, place, name, phone, email, address, sms_consent, cancel_token')
      .eq('status', 'booked')
      .is('reminded_at', null)
      .gte('starts_at', from)
      .lte('starts_at', to)
      .limit(200);
    rows = (data ?? []) as Row[];
  } catch {
    return NextResponse.json({ ok: true, skipped: 'client_appointments is not migrated yet' });
  }

  const out: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const project = CLIENT_PROJECTS[r.project];
    if (!project) continue;
    const rule = KINDS[r.kind as SlotKind];
    const at = new Date(r.starts_at);
    const when = `${describeSlot(at)} ${zoneLabel(at)}`;
    const placeLabel = rule?.places.find((p) => p.key === r.place)?.label ?? r.place ?? '';
    const first = (r.name ?? '').trim().split(/\s+/)[0] || 'Hello';
    const cancelUrl = `${SITE.url}/api/client-booking/cancel?t=${r.cancel_token}`;

    // Marked first. A timeout after sending must not send again.
    await sb.from('client_appointments').update({ reminded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', r.id);

    const result: Record<string, unknown> = { id: r.id, when };
    if (r.email) {
      try {
        const resend = resendClient();
        const sent = await resend.emails.send({
          from: `${project.business} <sarah@modernmustardseed.com>`,
          to: [r.email],
          replyTo: [project.notify.emails[0]],
          subject: `Tomorrow: ${when}`,
          html: `<div style="font:400 16px/1.6 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:520px;">
            <p style="margin:0 0 14px;">${esc(first)}, this is the reminder for tomorrow.</p>
            <p style="margin:0 0 6px;"><strong>${esc(rule?.label ?? 'Your appointment')}</strong></p>
            <p style="margin:0 0 6px;">${esc(when)}</p>
            <p style="margin:0 0 14px;">${esc(placeLabel)}${r.address ? `, ${esc(r.address)}` : ''}</p>
            <p style="margin:0 0 14px;">If something has changed, call ${esc(project.phone)} or <a href="${cancelUrl}">cancel here</a> and pick another time.</p>
            <p style="margin:0;color:#161616;opacity:.7;">${esc(project.answers)}<br>${esc(project.business)}<br>${esc(project.phone)}</p>
          </div>`,
          text: `${first}, this is the reminder for tomorrow.\n\n${rule?.label ?? 'Your appointment'}\n${when}\n${placeLabel}${r.address ? `, ${r.address}` : ''}\n\nIf something has changed, call ${project.phone} or cancel here: ${cancelUrl}\n\n${project.answers}\n${project.business}\n${project.phone}`,
        });
        result.email = { ok: !sent.error, error: sent.error?.message ?? null };
      } catch (err) {
        result.email = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    if (r.sms_consent && r.phone && toE164(r.phone)) {
      const sms = await sendSms(r.phone, `${first}, reminder: ${rule?.label ?? 'your appointment'} with ${project.business}, ${when}. ${placeLabel}. Call ${project.phone} if anything changed.`);
      result.sms = sms.ok ? { ok: true } : { ok: false, error: sms.error };
    }
    out.push(result);
  }

  return NextResponse.json({ ok: true, reminded: out.length, detail: out });
}
