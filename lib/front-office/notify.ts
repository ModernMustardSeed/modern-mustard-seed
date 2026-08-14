/**
 * TELL THE OWNER, WHILE IT STILL MATTERS.
 *
 * The failure this exists to stop: an emergency arrives at 2am, the agent
 * handles it beautifully, writes needs_human to a dashboard, and nobody looks
 * at that dashboard until Tuesday. We will have caught the call and lost the
 * job, and the owner will conclude the product does not work. They would be
 * right. A caught call nobody is told about is not a caught call.
 *
 * ── SENT ONCE, EVEN WHEN THE WEBHOOK IS NOT ──────────────────────────────────
 * Vapi can deliver the same event twice, tools fire mid-call and again at the
 * end, and Vercel retries. `notified_at` is claimed with a conditional update
 * BEFORE the send, so two concurrent handlers cannot both win. Four emails
 * about one emergency trains an owner to ignore the alert that matters.
 *
 * ── NARROW BY DEFAULT ────────────────────────────────────────────────────────
 * Emergencies, calls needing a human, and bookings. Not every call. An owner
 * who gets a notification for a wrong number mutes the channel inside a week,
 * and a muted channel is the same as no channel at all.
 *
 * ── EMAIL TODAY, SMS SHAPED IN ───────────────────────────────────────────────
 * There is no SMS sender in this codebase yet, and inventing one here would be
 * a second half-built thing. `notify_sms` is captured and the dispatch is
 * written to fan out, so adding a sender is one function, not a refactor. For
 * a 2am emergency, email is genuinely weaker than a text, and that is stated
 * rather than papered over.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resendClient } from '@/lib/send-email';
import { clientEmail, escape, p } from '@/lib/email';
import { SITE } from '@/lib/seo';

export type CallForNotice = {
  id: string;
  office_id: string;
  vapi_call_id: string | null;
  from_number: string | null;
  started_at: string;
  intent: string | null;
  urgency: string | null;
  summary: string | null;
  booked: boolean;
  transferred: boolean;
  needs_human: boolean;
  notified_at: string | null;
};

export type OfficeForNotice = {
  id: string;
  business_name: string;
  client_email: string;
  notify_email: string | null;
  notify_on: string[];
  timezone: string;
};

/** Does this call clear the bar the owner set? */
export function shouldNotify(office: Pick<OfficeForNotice, 'notify_on'>, call: Pick<CallForNotice, 'urgency' | 'needs_human' | 'booked'>): boolean {
  const on = office.notify_on ?? [];
  if (call.urgency === 'emergency' && on.includes('emergency')) return true;
  if (call.needs_human && on.includes('needs_human')) return true;
  if (call.booked && on.includes('booked')) return true;
  if (on.includes('every_call')) return true;
  return false;
}

/** How loud the subject line should be. An emergency reads as an emergency. */
export function subjectFor(office: OfficeForNotice, call: CallForNotice): string {
  const who = call.from_number ?? 'Someone';
  if (call.urgency === 'emergency') return `EMERGENCY call for ${office.business_name} from ${who}`;
  if (call.needs_human) return `${office.business_name}: a caller needs you to ring back`;
  if (call.booked) return `${office.business_name}: a job just got booked`;
  return `${office.business_name}: a call was answered`;
}

export type NotifyResult = { ok: boolean; sent: boolean; reason?: string };

export async function notifyOwner(db: SupabaseClient, officeId: string, callId: string): Promise<NotifyResult> {
  const [{ data: office }, { data: call }] = await Promise.all([
    db.from('fo_offices').select('id, business_name, client_email, notify_email, notify_on, timezone').eq('id', officeId).maybeSingle(),
    db.from('fo_calls').select('*').eq('id', callId).maybeSingle(),
  ]);
  if (!office || !call) return { ok: false, sent: false, reason: 'office or call missing' };

  const o = office as OfficeForNotice;
  const c = call as CallForNotice;

  if (!shouldNotify(o, c)) return { ok: true, sent: false, reason: 'below the notification bar' };

  const to = (o.notify_email || o.client_email || '').trim();
  if (!to) return { ok: false, sent: false, reason: 'no address to notify' };

  // CLAIM IT FIRST. The conditional update is the lock: whichever handler
  // flips notified_at from null wins, and the loser sends nothing. Sending
  // first and stamping after is how one emergency becomes four emails.
  const stamp = new Date().toISOString();
  const { data: claimed } = await db
    .from('fo_calls')
    .update({ notified_at: stamp })
    .eq('id', callId)
    .is('notified_at', null)
    .select('id')
    .maybeSingle();
  if (!claimed) return { ok: true, sent: false, reason: 'already notified' };

  const resend = resendClient();
  if (!resend) {
    await db.from('fo_calls').update({ notified_at: null, notify_error: 'no mail transport configured' }).eq('id', callId);
    return { ok: false, sent: false, reason: 'no mail transport' };
  }

  const when = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: o.timezone || 'America/Denver',
  }).format(new Date(c.started_at));

  const rows: string[] = [];
  if (c.from_number) rows.push(`<strong>Number:</strong> ${escape(c.from_number)}`);
  rows.push(`<strong>When:</strong> ${escape(when)}`);
  if (c.intent) rows.push(`<strong>About:</strong> ${escape(c.intent)}`);
  if (c.booked) rows.push('<strong>Booked:</strong> yes, it is on your calendar');
  if (c.transferred) rows.push('<strong>Transferred:</strong> yes');

  const body =
    (c.urgency === 'emergency'
      ? p('<strong>This one was flagged as an emergency.</strong>')
      : c.needs_human
        ? p('Your receptionist took this one and could not finish it. Somebody needs to call them back.')
        : p('Your receptionist answered this call.')) +
    (c.summary ? p(escape(c.summary)) : '') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0"><tr>
      <td style="border:2px solid #161616;border-radius:14px;padding:16px 18px;background:#ffffff">
        <p style="margin:0;font-size:14px;line-height:1.9;color:#161616">${rows.join('<br>')}</p>
      </td>
    </tr></table>` +
    (c.from_number ? p(`<a href="tel:${escape(c.from_number.replace(/[^\d+]/g, ''))}" style="font-size:15px;font-weight:bold;color:#C2261A;text-decoration:none">Call them back &rarr;</a>`) : '');

  try {
    const { error } = await resend.emails.send({
      from: `${o.business_name} front desk <notifications@modernmustardseed.com>`,
      to,
      // Replying should reach a human at MMS, not a no-reply void.
      replyTo: 'sarah@modernmustardseed.com',
      subject: subjectFor(o, c),
      html: clientEmail({
        preheader: c.summary?.slice(0, 120) ?? 'A call was answered for you.',
        eyebrow: c.urgency === 'emergency' ? 'EMERGENCY' : 'YOUR FRONT DESK',
        greeting: 'Hi,',
        body,
        cta: { label: 'See the call', url: `${SITE.url}/portal/front-office` },
        signature: 'Modern Mustard Seed',
      }),
    });
    if (error) throw new Error(JSON.stringify(error));
    return { ok: true, sent: true };
  } catch (err) {
    // Release the claim so the next pass can retry. A notification that failed
    // and marked itself sent is the worst of both worlds.
    const msg = err instanceof Error ? err.message : String(err);
    await db.from('fo_calls').update({ notified_at: null, notify_error: msg.slice(0, 500) }).eq('id', callId);
    console.error('front office notify failed', msg);
    return { ok: false, sent: false, reason: msg };
  }
}

/**
 * The safety net.
 *
 * Anything that cleared the bar and still has no notified_at, because the
 * webhook died mid-flight or the mail transport was briefly down. Run from the
 * cron. Deliberately bounded to the last day: a week-old emergency is not
 * worth emailing about, it is worth apologising for.
 */
export async function sweepUnnotified(db: SupabaseClient, limit = 50): Promise<{ checked: number; sent: number }> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data } = await db
    .from('fo_calls')
    .select('id, office_id, urgency, needs_human, booked')
    .is('notified_at', null)
    .gte('started_at', since)
    .or('needs_human.eq.true,urgency.eq.emergency,booked.eq.true')
    .limit(limit);

  let sent = 0;
  for (const c of data ?? []) {
    const res = await notifyOwner(db, c.office_id as string, c.id as string);
    if (res.sent) sent++;
  }
  return { checked: (data ?? []).length, sent };
}
