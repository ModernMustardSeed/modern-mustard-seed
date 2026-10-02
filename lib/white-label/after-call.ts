import { getSupabase } from '@/lib/supabase';
import { demoAppointmentsFor } from '@/lib/demo-booking';
import { sendSms, trimForSms } from '@/lib/sms';
import { sendViaResend } from '@/lib/send-email';
import { clientEmail, p } from '@/lib/email';

/**
 * AFTER A WHITE LABEL PHONE DEMO: send the person the summary the owner
 * would get, in the agency's name. Fired from the end-of-call report in
 * /api/voice for calls whose metadata carries `whiteLabel` and `ringTo`.
 *
 * The text goes through lib/sms.ts (the A2P messaging service, never a raw
 * number). The email is the copy that always lands. Neither may throw: the
 * call already happened, and its report to Sarah must still go out.
 */
export async function afterWhiteLabelCall(meta: Record<string, unknown>, durationSeconds: number | null | undefined): Promise<void> {
  const ringTo = typeof meta.ringTo === 'string' ? meta.ringTo : null;
  const agency = typeof meta.whiteLabel === 'string' ? meta.whiteLabel : null;
  const runId = typeof meta.runId === 'string' ? meta.runId : null;
  if (!ringTo || !agency || !runId) return;
  const client = typeof meta.business === 'string' ? meta.business : 'your client';
  const email = typeof meta.notifyEmail === 'string' ? meta.notifyEmail : null;

  try {
    const db = getSupabase();
    const booked = db ? await demoAppointmentsFor(db, runId, 3) : [];
    const minutes = Math.max(1, Math.round((durationSeconds ?? 60) / 60));
    const lines = booked.length
      ? booked.map((b) => {
          const when = new Date(b.starts_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' });
          return `New booking: ${b.customer_name || 'a caller'}, ${when}${b.service ? `. ${b.service}` : ''}.`;
        })
      : [`Your AI receptionist took a ${minutes} minute call. No booking this time; the details are in the transcript.`];

    const text = trimForSms(`${agency} · ${client}\n${lines.join('\n')}\nThis is the text the owner gets after every call.`, 300);
    const sms = await sendSms(ringTo, text);
    if (!sms.ok) console.error('white label demo text failed', sms.error);

    if (email) {
      await sendViaResend({
        from: `${agency.replace(/[<>"]/g, '')} <sarah@modernmustardseed.com>`,
        to: email,
        subject: `${client}: your call summary`,
        replyTo: 'sarah@modernmustardseed.com',
        html: clientEmail({
          eyebrow: 'CALL SUMMARY',
          greeting: `${client}, after your call.`,
          body: lines.map((l) => p(l)).join('') + p('This is the summary the owner gets after every call, with the full transcript attached in a live setup.'),
          signature: agency,
        }),
      });
    }
  } catch (err) {
    console.error('white label after-call failed', err);
  }
}
